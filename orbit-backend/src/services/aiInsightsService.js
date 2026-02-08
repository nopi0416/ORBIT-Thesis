import supabase from '../config/database.js';
import { OpenRouter } from '@openrouter/sdk';
import ApprovalRequestService from './approvalRequestService.js';
import { BudgetConfigService } from './budgetConfigService.js';

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const sanitizeText = (value, maxLength = 240) => {
  if (!value) return '';
  const text = String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b\d{6,}\b/g, '[redacted-number]')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

const normalizeRole = (value) => String(value || '').toLowerCase();

const buildLatestUpdates = (requests) => {
  if (!Array.isArray(requests)) return [];
  const filtered = requests.filter((row) => {
    const stage = String(row.stage_status || '').toLowerCase();
    const overall = String(row.overall_status || '').toLowerCase();
    return stage === 'pending_payroll_approval' || overall === 'approved' || overall === 'completed';
  });

  return filtered
    .sort((a, b) => {
      const aDate = new Date(a.latest_action_at || a.created_at || 0).getTime();
      const bDate = new Date(b.latest_action_at || b.created_at || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 6)
    .map((row) => ({
      id: row.request_id || 'unknown',
      request_number: row.request_number || row.request_id || 'unknown',
      budget_name: row.budget_name || 'Unknown Budget',
      title: row.title || row.budget_name || 'Budget request',
      status: String(row.stage_status || row.overall_status || 'unknown').toLowerCase(),
      amount: Number(row.total_request_amount || 0),
      created_at: row.latest_action_at || row.created_at || null,
      requested_by: row.requested_by || row.submitted_by || 'Unknown',
      action: String(row.overall_status || row.stage_status || 'pending').toLowerCase(),
      action_by: row.latest_action_by || 'System',
      message: `Request ${row.request_number || row.request_id || 'unknown'} is ${String(row.overall_status || row.stage_status || 'pending').toLowerCase().replace(/_/g, ' ')}`,
    }));
};

const extractJson = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    const sliced = raw.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {
      return null;
    }
  }
};

const buildFallbackInsights = (metrics) => {
  const status = metrics?.statusCounts || {};
  const stage = metrics?.stageCounts || {};
  const totals = metrics?.totals || {};

  return {
    summary: `Analyzed ${metrics.totalRequests} request(s) within scope. Total amount ₱${metrics.totalAmount.toLocaleString()}.`,
    insights: [
      `Pending payroll approval: ${stage.pending_payroll_approval || 0}.`,
      `Pending payment completion: ${stage.pending_payment_completion || 0}.`,
      `Completed approvals: ${stage.completed || 0}.`,
    ],
    risks: [
      stage.pending_payment_completion > 0
        ? 'Some requests are approved but still pending payment completion.'
        : 'No pending payment completion items detected.',
      status.rejected > 0 ? 'Rejected requests require review for recurring issues.' : 'No rejection trend detected.',
    ],
    actions: [
      'Review payroll queue and prioritize high-value requests.',
      'Confirm budgets with highest utilization before approving additional requests.',
    ],
    charts: metrics?.charts || {},
    totals,
    latest_updates: buildLatestUpdates(metrics?.requests_sample || []),
    scope: metrics?.scope || {},
    generated_at: new Date().toISOString(),
    generated_by: 'fallback',
  };
};

export class AiInsightsService {
  static async generateInsights({
    userId,
    role,
    orgId,
    fromDate,
    toDate,
  }) {
    const hasApiKey = Boolean(process.env.OPENROUTER_API_KEY);

    try {
      const roleNormalized = normalizeRole(role);
      const scope = {
        role: roleNormalized || 'unknown',
        org_id: orgId || null,
        user_id: userId || null,
      };

      let budgetIds = null;
      if (orgId) {
        const allowedBudgets = await BudgetConfigService.getBudgetIdsByOrgId(orgId);
        budgetIds = allowedBudgets.data || [];
      }

      const query = supabase
        .from('tblbudgetapprovalrequests')
        .select('request_id, request_number, budget_id, overall_status, submission_status, total_request_amount, description, created_at, submitted_by, approved_date, completed_date')
        .order('created_at', { ascending: false });

      if (fromDate) query.gte('created_at', fromDate);
      if (toDate) query.lte('created_at', toDate);

      if (roleNormalized.includes('requestor')) {
        query.eq('submitted_by', userId);
      } else if (Array.isArray(budgetIds)) {
        if (!budgetIds.length) {
          return { success: true, data: buildFallbackInsights({ totalRequests: 0, totalAmount: 0, charts: {}, totals: {}, scope, requests_sample: [] }) };
        }
        query.in('budget_id', budgetIds);
      }

      const { data: requests, error } = await query;
      if (error) throw error;

      const requestRows = requests || [];
      const requestUserIds = requestRows.map((row) => row.submitted_by).filter(Boolean);
      let userNameMap = new Map();
      try {
        userNameMap = await ApprovalRequestService.getUserNameMap(requestUserIds);
      } catch (lookupError) {
        console.warn('[aiInsights] User lookup failed:', lookupError?.message || lookupError);
      }
      const requestIds = requestRows.map((row) => row.request_id).filter(Boolean);
      const budgetIdSet = new Set(requestRows.map((row) => row.budget_id).filter(Boolean));

      let budgetMap = new Map();
      if (budgetIdSet.size > 0) {
        const { data: budgets, error: budgetError } = await supabase
          .from('tblbudgetconfiguration')
          .select('budget_id, budget_name')
          .in('budget_id', Array.from(budgetIdSet));

        if (!budgetError && budgets) {
          budgetMap = new Map(budgets.map((b) => [b.budget_id, b.budget_name]));
        }
      }

      let approvalsMap = new Map();
      if (requestIds.length > 0) {
        const { data: approvals, error: approvalsError } = await supabase
          .from('tblbudgetapprovalrequests_approvals')
          .select('request_id, approval_level, status, approval_date, approver_name, approved_by, updated_at')
          .in('request_id', requestIds);

        if (approvalsError) throw approvalsError;

        (approvals || []).forEach((row) => {
          const existing = approvalsMap.get(row.request_id) || [];
          existing.push(row);
          approvalsMap.set(row.request_id, existing);
        });
      }

      const statusCounts = {};
      const stageCounts = {};
      const statusAmounts = {};
      const stageAmounts = {};
      const budgetTotals = new Map();
      const budgetBreakdowns = new Map();
      const monthlyTotals = new Map();
      let totalAmount = 0;

      const safeRequests = requestRows.slice(0, 120).map((row) => {
        const amount = Number(row.total_request_amount || 0);
        totalAmount += amount;

        const statusKey = String(row.overall_status || row.submission_status || 'unknown').toLowerCase();
        statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
        statusAmounts[statusKey] = (statusAmounts[statusKey] || 0) + amount;

        const approvals = approvalsMap.get(row.request_id) || [];
        const stageStatus = ApprovalRequestService.computeApprovalStageStatus(approvals, row.overall_status);
        stageCounts[stageStatus] = (stageCounts[stageStatus] || 0) + 1;
        stageAmounts[stageStatus] = (stageAmounts[stageStatus] || 0) + amount;

        const latestApproval = approvals
          .filter((item) => item.approval_date || item.updated_at)
          .sort((a, b) => new Date(b.approval_date || b.updated_at).getTime() - new Date(a.approval_date || a.updated_at).getTime())[0];

        const latestActionAt =
          latestApproval?.approval_date ||
          latestApproval?.updated_at ||
          row.completed_date ||
          row.approved_date ||
          row.created_at;

        const latestActionBy = latestApproval?.approver_name || latestApproval?.approved_by || null;

        const budgetId = row.budget_id || 'unknown';
        const current = budgetTotals.get(budgetId) || { amount: 0, count: 0 };
        budgetTotals.set(budgetId, { amount: current.amount + amount, count: current.count + 1 });

        const budgetBreakdown = budgetBreakdowns.get(budgetId) || {
          total_amount: 0,
          completed_amount: 0,
          ongoing_amount: 0,
        };
        budgetBreakdown.total_amount += amount;
        if (stageStatus === 'completed') budgetBreakdown.completed_amount += amount;
        if (stageStatus === 'ongoing_approval') budgetBreakdown.ongoing_amount += amount;
        budgetBreakdowns.set(budgetId, budgetBreakdown);

        const createdAt = row.created_at ? new Date(row.created_at) : null;
        if (createdAt && !Number.isNaN(createdAt.getTime())) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          const monthly = monthlyTotals.get(monthKey) || 0;
          const approvedLike = ['approved', 'completed'].includes(statusKey);
          if (approvedLike) {
            monthlyTotals.set(monthKey, monthly + amount);
          }
        }

        const requestedBy = userNameMap.get(row.submitted_by) || row.submitted_by || 'Unknown';

        return {
          request_id: row.request_id,
          request_number: row.request_number,
          title: sanitizeText(row.description) || budgetMap.get(row.budget_id) || 'Budget request',
          budget_id: row.budget_id,
          budget_name: budgetMap.get(row.budget_id) || 'Unknown Budget',
          overall_status: row.overall_status || row.submission_status || 'unknown',
          stage_status: stageStatus,
          total_request_amount: amount,
          description: sanitizeText(row.description),
          created_at: row.created_at,
          latest_action_at: latestActionAt,
          latest_action_by: latestActionBy,
          requested_by: requestedBy,
          submitted_by: row.submitted_by,
        };
      });

      const topBudgets = Array.from(budgetTotals.entries())
        .map(([budgetId, stats]) => {
          const breakdown = budgetBreakdowns.get(budgetId) || {
            total_amount: stats.amount,
            completed_amount: 0,
            ongoing_amount: 0,
          };
          return {
            budget_id: budgetId,
            budget_name: budgetMap.get(budgetId) || 'Unknown Budget',
            total_amount: breakdown.total_amount,
            completed_amount: breakdown.completed_amount,
            ongoing_amount: breakdown.ongoing_amount,
            request_count: stats.count,
          };
        })
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 5);

      const monthlySeries = Array.from(monthlyTotals.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => (a.month > b.month ? 1 : -1))
        .slice(-3);

      const metrics = {
        totalRequests: requestRows.length,
        totalAmount,
        averageAmount: requestRows.length ? totalAmount / requestRows.length : 0,
        statusCounts,
        stageCounts,
        statusAmounts,
        stageAmounts,
        charts: {
          status_breakdown: Object.entries(statusCounts).map(([label, value]) => ({ label, value })),
          stage_breakdown: Object.entries(stageCounts).map(([label, value]) => ({ label, value })),
          status_amounts: Object.entries(statusAmounts).map(([label, value]) => ({ label, value })),
          stage_amounts: Object.entries(stageAmounts).map(([label, value]) => ({ label, value })),
          top_budgets: topBudgets,
          monthly_series: monthlySeries,
        },
        scope,
      };

      const totals = {
        completed_amount: Number(stageAmounts.completed || 0),
        pending_payroll_amount: Number(stageAmounts.pending_payroll_approval || 0),
        pending_payment_amount: Number(stageAmounts.pending_payment_completion || 0),
        upcoming_amount:
          Number(stageAmounts.pending_payroll_approval || 0) +
          Number(stageAmounts.pending_payment_completion || 0),
        ongoing_amount: Number(stageAmounts.ongoing_approval || 0),
        total_amount: totalAmount,
      };

      metrics.totals = totals;
      metrics.requests_sample = safeRequests;

      const prompt = {
        scope,
        metrics: {
          total_requests: metrics.totalRequests,
          total_amount: metrics.totalAmount,
          average_amount: metrics.averageAmount,
          status_counts: metrics.statusCounts,
          stage_counts: metrics.stageCounts,
        },
        top_budgets: topBudgets,
        requests_sample: safeRequests,
        latest_updates: buildLatestUpdates(safeRequests),
        data_policy: 'Do NOT include personal data. Use UUIDs only. Do NOT infer employee identities.',
      };

      let parsed = null;
      if (hasApiKey) {
        const response = await openrouter.chat.send({
          chatGenerationParams: {
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are an analytics assistant for budget approval workflows. Return JSON only. Required keys: summary (string), insights (array of 3 short strings), risks (array of 2 short strings), actions (array of 2 short strings), latest_updates (array of objects: {id,title,status,amount,created_at,message}), charts (object with status_breakdown, status_amounts, top_budgets, monthly_series), totals (object), scope (object), generated_at (ISO string). Never include personal data or employee identifiers; use UUIDs only. Keep responses concise.'
              },
              {
                role: 'user',
                content: JSON.stringify(prompt),
              },
            ],
            temperature: 0.2,
          },
        });

        const raw = response?.choices?.[0]?.message?.content || '';
        console.log('[AI Insights] Raw response:', raw);
        parsed = extractJson(raw);
      }

      const fallback = buildFallbackInsights(metrics);
      const merged = parsed
        ? {
            ...fallback,
            ...parsed,
            charts: parsed.charts || metrics.charts,
            scope: parsed.scope || scope,
            totals: parsed.totals || totals,
            latest_updates: Array.isArray(parsed.latest_updates) && parsed.latest_updates.length
              ? parsed.latest_updates
              : fallback.latest_updates,
            generated_at: parsed.generated_at || new Date().toISOString(),
          }
        : fallback;

      merged.summary = merged.summary && String(merged.summary).trim()
        ? merged.summary
        : fallback.summary;
      merged.insights = Array.isArray(merged.insights) && merged.insights.length
        ? merged.insights
        : fallback.insights;
      merged.risks = Array.isArray(merged.risks) && merged.risks.length
        ? merged.risks
        : fallback.risks;
      merged.actions = Array.isArray(merged.actions) && merged.actions.length
        ? merged.actions
        : fallback.actions;

      return {
        success: true,
        data: merged,
      };
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return {
        success: true,
        data: buildFallbackInsights({
          totalRequests: 0,
          totalAmount: 0,
          charts: {},
          totals: {},
          requests_sample: [],
          scope: {
            role: normalizeRole(role),
            org_id: orgId || null,
            user_id: userId || null,
          },
        }),
      };
    }
  }

  static async getRealtimeMetrics({
    userId,
    role,
    orgId,
    fromDate,
    toDate,
  }) {
    try {
      const roleNormalized = normalizeRole(role);
      const scope = {
        role: roleNormalized || 'unknown',
        org_id: orgId || null,
        user_id: userId || null,
      };

      let budgetIds = null;
      if (orgId) {
        const allowedBudgets = await BudgetConfigService.getBudgetIdsByOrgId(orgId);
        budgetIds = allowedBudgets.data || [];
      }

      const query = supabase
        .from('tblbudgetapprovalrequests')
        .select('request_id, request_number, budget_id, overall_status, submission_status, total_request_amount, description, created_at, submitted_by, approved_date, completed_date')
        .order('created_at', { ascending: false });

      if (fromDate) query.gte('created_at', fromDate);
      if (toDate) query.lte('created_at', toDate);

      if (roleNormalized.includes('requestor')) {
        query.eq('submitted_by', userId);
      } else if (Array.isArray(budgetIds)) {
        if (!budgetIds.length) {
          return {
            success: true,
            data: {
              charts: {},
              totals: {},
              latest_updates: [],
              scope,
              generated_at: new Date().toISOString(),
            },
          };
        }
        query.in('budget_id', budgetIds);
      }

      const { data: requests, error } = await query;
      if (error) throw error;

      const requestRows = requests || [];
      const requestUserIds = requestRows.map((row) => row.submitted_by).filter(Boolean);
      let userNameMap = new Map();
      try {
        userNameMap = await ApprovalRequestService.getUserNameMap(requestUserIds);
      } catch (lookupError) {
        console.warn('[realtimeMetrics] User lookup failed:', lookupError?.message || lookupError);
      }
      const requestIds = requestRows.map((row) => row.request_id).filter(Boolean);
      const budgetIdSet = new Set(requestRows.map((row) => row.budget_id).filter(Boolean));

      let budgetMap = new Map();
      if (budgetIdSet.size > 0) {
        const { data: budgets, error: budgetError } = await supabase
          .from('tblbudgetconfiguration')
          .select('budget_id, budget_name')
          .in('budget_id', Array.from(budgetIdSet));

        if (!budgetError && budgets) {
          budgetMap = new Map(budgets.map((b) => [b.budget_id, b.budget_name]));
        }
      }

      let approvalsMap = new Map();
      if (requestIds.length > 0) {
        const { data: approvals, error: approvalsError } = await supabase
          .from('tblbudgetapprovalrequests_approvals')
          .select('request_id, approval_level, status, approval_date, approver_name, approved_by, updated_at')
          .in('request_id', requestIds);

        if (approvalsError) throw approvalsError;

        (approvals || []).forEach((row) => {
          const existing = approvalsMap.get(row.request_id) || [];
          existing.push(row);
          approvalsMap.set(row.request_id, existing);
        });
      }

      const statusCounts = {};
      const stageCounts = {};
      const statusAmounts = {};
      const stageAmounts = {};
      const budgetTotals = new Map();
      const budgetBreakdowns = new Map();
      const monthlyTotals = new Map();
      let totalAmount = 0;

      const safeRequests = requestRows.slice(0, 120).map((row) => {
        const amount = Number(row.total_request_amount || 0);
        totalAmount += amount;

        const statusKey = String(row.overall_status || row.submission_status || 'unknown').toLowerCase();
        statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
        statusAmounts[statusKey] = (statusAmounts[statusKey] || 0) + amount;

        const approvals = approvalsMap.get(row.request_id) || [];
        const stageStatus = ApprovalRequestService.computeApprovalStageStatus(approvals, row.overall_status);
        stageCounts[stageStatus] = (stageCounts[stageStatus] || 0) + 1;
        stageAmounts[stageStatus] = (stageAmounts[stageStatus] || 0) + amount;

        const latestApproval = approvals
          .filter((item) => item.approval_date || item.updated_at)
          .sort((a, b) => new Date(b.approval_date || b.updated_at).getTime() - new Date(a.approval_date || a.updated_at).getTime())[0];

        const latestActionAt =
          latestApproval?.approval_date ||
          latestApproval?.updated_at ||
          row.completed_date ||
          row.approved_date ||
          row.created_at;

        const latestActionBy = latestApproval?.approver_name || latestApproval?.approved_by || null;

        const budgetId = row.budget_id || 'unknown';
        const current = budgetTotals.get(budgetId) || { amount: 0, count: 0 };
        budgetTotals.set(budgetId, { amount: current.amount + amount, count: current.count + 1 });

        const budgetBreakdown = budgetBreakdowns.get(budgetId) || {
          total_amount: 0,
          completed_amount: 0,
          ongoing_amount: 0,
        };
        budgetBreakdown.total_amount += amount;
        if (stageStatus === 'completed') budgetBreakdown.completed_amount += amount;
        if (stageStatus === 'ongoing_approval') budgetBreakdown.ongoing_amount += amount;
        budgetBreakdowns.set(budgetId, budgetBreakdown);

        const createdAt = row.created_at ? new Date(row.created_at) : null;
        if (createdAt && !Number.isNaN(createdAt.getTime())) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
          const monthly = monthlyTotals.get(monthKey) || 0;
          const approvedLike = ['approved', 'completed'].includes(statusKey);
          if (approvedLike) {
            monthlyTotals.set(monthKey, monthly + amount);
          }
        }

        const requestedBy = userNameMap.get(row.submitted_by) || row.submitted_by || 'Unknown';

        return {
          request_id: row.request_id,
          request_number: row.request_number,
          title: sanitizeText(row.description) || budgetMap.get(row.budget_id) || 'Budget request',
          budget_id: row.budget_id,
          budget_name: budgetMap.get(row.budget_id) || 'Unknown Budget',
          overall_status: row.overall_status || row.submission_status || 'unknown',
          stage_status: stageStatus,
          total_request_amount: amount,
          description: sanitizeText(row.description),
          created_at: row.created_at,
          latest_action_at: latestActionAt,
          latest_action_by: latestActionBy,
          requested_by: requestedBy,
          submitted_by: row.submitted_by,
        };
      });

      const topBudgets = Array.from(budgetTotals.entries())
        .map(([budgetId, stats]) => {
          const breakdown = budgetBreakdowns.get(budgetId) || {
            total_amount: stats.amount,
            completed_amount: 0,
            ongoing_amount: 0,
          };
          return {
            budget_id: budgetId,
            budget_name: budgetMap.get(budgetId) || 'Unknown Budget',
            total_amount: breakdown.total_amount,
            completed_amount: breakdown.completed_amount,
            ongoing_amount: breakdown.ongoing_amount,
            request_count: stats.count,
          };
        })
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 5);

      const monthlySeries = Array.from(monthlyTotals.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => (a.month > b.month ? 1 : -1));

      const charts = {
        status_breakdown: Object.entries(statusCounts).map(([label, value]) => ({ label, value })),
        status_amounts: Object.entries(statusAmounts).map(([label, value]) => ({ label, value })),
        top_budgets: topBudgets,
        monthly_series: monthlySeries,
      };

      const totals = {
        completed_amount: Number(stageAmounts.completed || 0),
        pending_payroll_amount: Number(stageAmounts.pending_payroll_approval || 0),
        pending_payment_amount: Number(stageAmounts.pending_payment_completion || 0),
        upcoming_amount:
          Number(stageAmounts.pending_payroll_approval || 0) +
          Number(stageAmounts.pending_payment_completion || 0),
        ongoing_amount: Number(stageAmounts.ongoing_approval || 0),
        total_amount: totalAmount,
      };

      return {
        success: true,
        data: {
          charts,
          totals,
          latest_updates: buildLatestUpdates(safeRequests),
          scope,
          generated_at: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error generating realtime metrics:', error);
      return {
        success: true,
        data: {
          charts: {},
          totals: {},
          latest_updates: [],
          scope: {
            role: normalizeRole(role),
            org_id: orgId || null,
            user_id: userId || null,
          },
          generated_at: new Date().toISOString(),
        },
      };
    }
  }
}

export default AiInsightsService;
