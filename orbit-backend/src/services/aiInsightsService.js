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
    .replace(/<[^>]*>/g, ' ')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b\d{6,}\b/g, '[redacted-number]')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
};

const STATIC_INSTRUCTIONS = [
  'Return JSON only.',
  'Summary <= 60 words.',
  'Insights: 3 short bullets.',
  'Risks: 2 short bullets w/ severity (low/med/high).',
  'Include at least one operational risk (queue/approvals/bottlenecks).',
  'Actions: 2 short bullets.',
  'No HTML/markdown. No personal data. Use UUIDs only.',
  'Never mention tables, columns, rows, schemas, or field names.',
].join(' ');

const roleInstructions = (role) => {
  const normalized = normalizeRole(role);
  if (normalized.includes('payroll')) {
    return 'Focus on payroll completion, pending payment items, and budget-control compliance.';
  }
  if (normalized.includes('requestor')) {
    return 'Focus on the user’s submissions, current approval stages, and next steps. Avoid field/column labels and use PHP or ₱ for currency.';
  }
  if (normalized.includes('l1')) {
    return 'Focus on what the L1 approver can do: submit requests and approve/reject requests, with light financial context (amounts/approvals).';
  }
  if (normalized.includes('l1') || normalized.includes('l2') || normalized.includes('l3') || normalized.includes('approver')) {
    return 'Focus on approval queues, bottlenecks, and aging items by stage.';
  }
  return 'Focus on overall workflow health and approval throughput.';
};

const buildDeltaMetrics = (currentMetrics, latestInsight) => {
  if (!latestInsight) return null;
  const current = currentMetrics || {};
  const previous = latestInsight || {};

  const coerceChartArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
      return Object.entries(value).map(([label, rawValue]) => ({
        label,
        value: Number(rawValue || 0),
      }));
    }
    return [];
  };

  const prevStatusBreakdown = coerceChartArray(previous?.charts?.status_breakdown);
  const prevStageBreakdown = coerceChartArray(previous?.charts?.stage_breakdown);

  const delta = {
    total_amount_delta: Number(current.totalAmount || 0) - Number(previous?.totals?.total_amount || 0),
    status_counts_delta: {},
    stage_counts_delta: {},
  };

  Object.entries(current.statusCounts || {}).forEach(([key, value]) => {
    const prev = Number(prevStatusBreakdown.find((row) => row.label === key)?.value || 0);
    delta.status_counts_delta[key] = Number(value || 0) - prev;
  });

  Object.entries(current.stageCounts || {}).forEach(([key, value]) => {
    const prev = Number(prevStageBreakdown.find((row) => row.label === key)?.value || 0);
    delta.stage_counts_delta[key] = Number(value || 0) - prev;
  });

  return delta;
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
    let rawResponse = '';

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
          .select('budget_id, budget_name, budget_limit, budget_control')
          .in('budget_id', Array.from(budgetIdSet));

        if (!budgetError && budgets) {
          budgetMap = new Map(
            budgets.map((b) => [
              b.budget_id,
              {
                budget_name: b.budget_name,
                budget_limit: b.budget_limit,
                budget_control: b.budget_control,
              },
            ])
          );
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



      let approverTables = null;
      if (userId && (roleNormalized.includes('l1') || roleNormalized.includes('l2') || roleNormalized.includes('l3'))) {
        const approvalQuery = supabase
          .from('tblbudgetapprovalrequests_approvals')
          .select('request_id, approval_level, status, approved_by, assigned_to_primary, assigned_to_backup');

        if (requestIds.length > 0) {
          approvalQuery.in('request_id', requestIds);
        }

        const { data: approverRows, error: approverRowsError } = await approvalQuery
          .or(`assigned_to_primary.eq.${userId},assigned_to_backup.eq.${userId},approved_by.eq.${userId}`);

        if (approverRowsError) throw approverRowsError;

        const requestById = new Map(requestRows.map((row) => [row.request_id, row]));
        const submittedStatusByBudget = new Map();
        const submittedAmountByBudget = new Map();
        const approvedStatusByBudget = new Map();
        const approvedAmountByBudget = new Map();

        (approverRows || []).forEach((row) => {
          const request = requestById.get(row.request_id);
          if (!request) return;

          const budgetId = request.budget_id || 'unknown';
          const budgetName = budgetMap.get(budgetId) || 'Unknown Budget';
          const overallStatus = String(request.overall_status || request.submission_status || '').toLowerCase();
          const amount = Number(request.total_request_amount || 0);

          const submittedEntry = submittedStatusByBudget.get(budgetId) || {
            budget_id: budgetId,
            budget_name: budgetName,
            approved_count: 0,
            rejected_count: 0,
            total_requests: 0,
          };

          if (overallStatus === 'approved' || overallStatus === 'completed') {
            submittedEntry.approved_count += 1;
            submittedEntry.total_requests += 1;
            submittedStatusByBudget.set(budgetId, submittedEntry);

            const submittedAmount = submittedAmountByBudget.get(budgetId) || {
              budget_id: budgetId,
              budget_name: budgetName,
              approved_amount: 0,
            };
            submittedAmount.approved_amount += amount;
            submittedAmountByBudget.set(budgetId, submittedAmount);
          } else if (overallStatus === 'rejected') {
            submittedEntry.rejected_count += 1;
            submittedEntry.total_requests += 1;
            submittedStatusByBudget.set(budgetId, submittedEntry);
          }

          if (String(row.approved_by || '') === String(userId)) {
            const actionStatus = String(row.status || '').toLowerCase();
            const approvedEntry = approvedStatusByBudget.get(budgetId) || {
              budget_id: budgetId,
              budget_name: budgetName,
              approved_count: 0,
              rejected_count: 0,
              total_actions: 0,
            };

            if (actionStatus === 'approved' || actionStatus === 'completed') {
              approvedEntry.approved_count += 1;
              approvedEntry.total_actions += 1;
              approvedStatusByBudget.set(budgetId, approvedEntry);

              const approvedAmount = approvedAmountByBudget.get(budgetId) || {
                budget_id: budgetId,
                budget_name: budgetName,
                approved_amount: 0,
              };
              approvedAmount.approved_amount += amount;
              approvedAmountByBudget.set(budgetId, approvedAmount);
            } else if (actionStatus === 'rejected') {
              approvedEntry.rejected_count += 1;
              approvedEntry.total_actions += 1;
              approvedStatusByBudget.set(budgetId, approvedEntry);
            }
          }
        });

        approverTables = {
          submitted_counts: Array.from(submittedStatusByBudget.values()),
          submitted_amounts: Array.from(submittedAmountByBudget.values()),
          approved_counts: Array.from(approvedStatusByBudget.values()),
          approved_amounts: Array.from(approvedAmountByBudget.values()),
        };
      }

      let requestorTables = null;
      if (roleNormalized.includes('requestor') && userId) {
        const { data: createdBudgets, error: createdBudgetsError } = await supabase
          .from('tblbudgetconfiguration')
          .select('budget_id, budget_name')
          .eq('created_by', userId);

        if (createdBudgetsError) throw createdBudgetsError;

        const createdBudgetIds = (createdBudgets || []).map((row) => row.budget_id).filter(Boolean);
        const createdBudgetMap = new Map((createdBudgets || []).map((row) => [row.budget_id, row.budget_name]));

        let createdRequests = [];
        if (createdBudgetIds.length > 0) {
          const { data: createdRequestsData, error: createdRequestsError } = await supabase
            .from('tblbudgetapprovalrequests')
            .select('request_id, budget_id, overall_status, total_request_amount')
            .in('budget_id', createdBudgetIds);

          if (createdRequestsError) throw createdRequestsError;
          createdRequests = createdRequestsData || [];
        }

        const statusByBudget = new Map();
        const approvedAmountByBudget = new Map();

        (createdRequests || []).forEach((request) => {
          const budgetId = request.budget_id || 'unknown';
          const status = String(request.overall_status || '').toLowerCase();
          const approvedLike = status === 'approved' || status === 'completed';
          const rejected = status === 'rejected';
          const amount = Number(request.total_request_amount || 0);

          const current = statusByBudget.get(budgetId) || { approved: 0, rejected: 0, total: 0 };
          if (approvedLike) current.approved += 1;
          if (rejected) current.rejected += 1;
          current.total += 1;
          statusByBudget.set(budgetId, current);

          if (approvedLike) {
            const existingAmount = approvedAmountByBudget.get(budgetId) || 0;
            approvedAmountByBudget.set(budgetId, existingAmount + amount);
          }
        });

        requestorTables = {
          approval_counts: Array.from(statusByBudget.entries()).map(([budgetId, stats]) => ({
            budget_id: budgetId,
            budget_name: createdBudgetMap.get(budgetId) || 'Unknown Budget',
            approved_count: stats.approved,
            rejected_count: stats.rejected,
            total_requests: stats.total,
          })),
          approved_amounts: Array.from(approvedAmountByBudget.entries()).map(([budgetId, amount]) => ({
            budget_id: budgetId,
            budget_name: createdBudgetMap.get(budgetId) || 'Unknown Budget',
            approved_amount: amount,
          })),
        };
      }

      const statusCounts = {};
      const stageCounts = {};
      const statusAmounts = {};
      const stageAmounts = {};
      const budgetTotals = new Map();
      const budgetBreakdowns = new Map();
      const monthlyTotals = new Map();
      let totalAmount = 0;

      const safeRequests = requestRows.slice(0, 20).map((row) => {
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
        const budgetInfo = budgetMap.get(row.budget_id) || {};
        const budgetName = budgetInfo.budget_name || 'Unknown Budget';
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
          budget_id: row.budget_id,
          budget_name: budgetName,
          overall_status: row.overall_status || row.submission_status || 'unknown',
          stage_status: stageStatus,
          total_request_amount: amount,
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
          const budgetInfo = budgetMap.get(budgetId) || {};
          return {
            budget_id: budgetId,
            budget_name: budgetInfo.budget_name || 'Unknown Budget',
            total_amount: breakdown.total_amount,
            completed_amount: breakdown.completed_amount,
            ongoing_amount: breakdown.ongoing_amount,
            request_count: stats.count,
            budget_limit: budgetInfo.budget_limit || null,
            budget_control: Boolean(budgetInfo.budget_control),
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

      const latestStored = await this.getLatestInsights({ userId });
      const deltaMetrics = buildDeltaMetrics(metrics, latestStored?.data);

      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
      const currentMonthTotal = Number(monthlyTotals.get(currentMonthKey) || 0);
      const lastMonthTotal = Number(monthlyTotals.get(lastMonthKey) || 0);
      const hasMonthBaseline = lastMonthTotal > 0;

      const budgetLimitSummary = {
        limited_count: topBudgets.filter((b) => b.budget_control && Number(b.budget_limit || 0) > 0).length,
        unlimited_count: topBudgets.filter((b) => !b.budget_control || Number(b.budget_limit || 0) <= 0).length,
        limited_budgets: topBudgets
          .filter((b) => b.budget_control && Number(b.budget_limit || 0) > 0)
          .map((b) => ({ budget_id: b.budget_id, budget_name: b.budget_name, budget_limit: b.budget_limit })),
      };

      const prompt = {
        scope,
        deltas_only: Boolean(deltaMetrics),
        delta_metrics: deltaMetrics,
        metrics: {
          total_requests: metrics.totalRequests,
          total_amount: metrics.totalAmount,
          average_amount: Math.round(metrics.averageAmount || 0),
          status_counts: metrics.statusCounts,
          stage_counts: metrics.stageCounts,
        },
        top_budgets: topBudgets.map((b) => ({
          budget_id: b.budget_id,
          budget_name: b.budget_name,
          total_amount: b.total_amount,
          budget_limit: b.budget_limit,
          budget_control: b.budget_control,
        })),
        budget_limit_summary: budgetLimitSummary,
        month_over_month: {
          current_month_total: currentMonthTotal,
          last_month_total: lastMonthTotal,
          has_baseline: hasMonthBaseline,
        },
        requests_sample: safeRequests.map((row) => ({
          request_number: row.request_number,
          budget_name: row.budget_name,
          status: row.stage_status || row.overall_status,
          amount: row.total_request_amount,
          created_at: row.created_at,
        })),
        data_policy: 'No personal data. UUIDs only.',
      };

      let parsed = null;
      if (hasApiKey) {
        const response = await openrouter.chat.send({
          chatGenerationParams: {
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are an analytics assistant for budget approval workflows. ${STATIC_INSTRUCTIONS} ${roleInstructions(scope.role)} Budget rule: only flag budget overruns if budget_control is true and budget_limit is set. For unlimited budgets (no limit), only warn if has_baseline is true and current_month_total is significantly higher than last_month_total; if has_baseline is false, do not mention month-over-month at all. Do NOT mention tables, columns, or field names; refer to data/metrics instead. Use PHP or ₱ for currency values. Required keys: summary (string), insights (array of 3 short strings), risks (array of 2 short strings), actions (array of 2 short strings), latest_updates (array of objects: {id,request_number,budget_name,status,amount,requested_by,action,action_by,created_at,message}), charts (object with status_breakdown, status_amounts, top_budgets, monthly_series), totals (object), scope (object), generated_at (ISO string). If deltas_only is true, focus on changes since last insight.`
              },
              {
                role: 'user',
                content: JSON.stringify(prompt),
              },
            ],
            temperature: 0.15,
            max_tokens: 650,
          },
        });

        const raw = response?.choices?.[0]?.message?.content || '';
        rawResponse = raw;
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

      const persistPayload = {
        created_by: userId,
        role_scope: scope.role,
        org_id: scope.org_id,
        summary: merged.summary,
        insights: merged.insights,
        risks: merged.risks,
        actions: merged.actions,
        charts: merged.charts,
        totals: merged.totals,
        latest_updates: merged.latest_updates,
        raw_response: rawResponse || null,
      };

      try {
        await supabase.from('tblai_insights').insert(persistPayload);
      } catch (persistError) {
        console.warn('[aiInsights] Failed to store insights:', persistError?.message || persistError);
      }

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

      let approverTables = null;
      if (userId && (roleNormalized.includes('l1') || roleNormalized.includes('l2') || roleNormalized.includes('l3'))) {
        const approvalQuery = supabase
          .from('tblbudgetapprovalrequests_approvals')
          .select('request_id, approval_level, status, approved_by, assigned_to_primary, assigned_to_backup');

        if (requestIds.length > 0) {
          approvalQuery.in('request_id', requestIds);
        }

        const { data: approverRows, error: approverRowsError } = await approvalQuery
          .or(`assigned_to_primary.eq.${userId},assigned_to_backup.eq.${userId},approved_by.eq.${userId}`);

        if (approverRowsError) throw approverRowsError;

        const requestById = new Map(requestRows.map((row) => [row.request_id, row]));
        const submittedStatusByBudget = new Map();
        const submittedAmountByBudget = new Map();
        const approvedStatusByBudget = new Map();
        const approvedAmountByBudget = new Map();

        (approverRows || []).forEach((row) => {
          const request = requestById.get(row.request_id);
          if (!request) return;

          const budgetId = request.budget_id || 'unknown';
          const budgetName = budgetMap.get(budgetId) || 'Unknown Budget';
          const overallStatus = String(request.overall_status || request.submission_status || '').toLowerCase();
          const amount = Number(request.total_request_amount || 0);

          const submittedEntry = submittedStatusByBudget.get(budgetId) || {
            budget_id: budgetId,
            budget_name: budgetName,
            approved_count: 0,
            rejected_count: 0,
            total_requests: 0,
          };

          if (overallStatus === 'approved' || overallStatus === 'completed') {
            submittedEntry.approved_count += 1;
            submittedEntry.total_requests += 1;
            submittedStatusByBudget.set(budgetId, submittedEntry);

            const submittedAmount = submittedAmountByBudget.get(budgetId) || {
              budget_id: budgetId,
              budget_name: budgetName,
              approved_amount: 0,
            };
            submittedAmount.approved_amount += amount;
            submittedAmountByBudget.set(budgetId, submittedAmount);
          } else if (overallStatus === 'rejected') {
            submittedEntry.rejected_count += 1;
            submittedEntry.total_requests += 1;
            submittedStatusByBudget.set(budgetId, submittedEntry);
          }

          if (String(row.approved_by || '') === String(userId)) {
            const actionStatus = String(row.status || '').toLowerCase();
            const approvedEntry = approvedStatusByBudget.get(budgetId) || {
              budget_id: budgetId,
              budget_name: budgetName,
              approved_count: 0,
              rejected_count: 0,
              total_actions: 0,
            };

            if (actionStatus === 'approved' || actionStatus === 'completed') {
              approvedEntry.approved_count += 1;
              approvedEntry.total_actions += 1;
              approvedStatusByBudget.set(budgetId, approvedEntry);

              const approvedAmount = approvedAmountByBudget.get(budgetId) || {
                budget_id: budgetId,
                budget_name: budgetName,
                approved_amount: 0,
              };
              approvedAmount.approved_amount += amount;
              approvedAmountByBudget.set(budgetId, approvedAmount);
            } else if (actionStatus === 'rejected') {
              approvedEntry.rejected_count += 1;
              approvedEntry.total_actions += 1;
              approvedStatusByBudget.set(budgetId, approvedEntry);
            }
          }
        });

        approverTables = {
          submitted_counts: Array.from(submittedStatusByBudget.values()),
          submitted_amounts: Array.from(submittedAmountByBudget.values()),
          approved_counts: Array.from(approvedStatusByBudget.values()),
          approved_amounts: Array.from(approvedAmountByBudget.values()),
        };
      }

      let requestorTables = null;
      if (roleNormalized.includes('requestor') && userId) {
        const { data: createdBudgets, error: createdBudgetsError } = await supabase
          .from('tblbudgetconfiguration')
          .select('budget_id, budget_name')
          .eq('created_by', userId);

        if (createdBudgetsError) throw createdBudgetsError;

        const createdBudgetIds = (createdBudgets || []).map((row) => row.budget_id).filter(Boolean);
        const createdBudgetMap = new Map((createdBudgets || []).map((row) => [row.budget_id, row.budget_name]));

        let createdRequests = [];
        if (createdBudgetIds.length > 0) {
          const { data: createdRequestsData, error: createdRequestsError } = await supabase
            .from('tblbudgetapprovalrequests')
            .select('request_id, budget_id, overall_status, total_request_amount')
            .in('budget_id', createdBudgetIds);

          if (createdRequestsError) throw createdRequestsError;
          createdRequests = createdRequestsData || [];
        }

        const statusByBudget = new Map();
        const approvedAmountByBudget = new Map();

        (createdRequests || []).forEach((request) => {
          const budgetId = request.budget_id || 'unknown';
          const status = String(request.overall_status || '').toLowerCase();
          const approvedLike = status === 'approved' || status === 'completed';
          const rejected = status === 'rejected';
          const amount = Number(request.total_request_amount || 0);

          const current = statusByBudget.get(budgetId) || { approved: 0, rejected: 0, total: 0 };
          if (approvedLike) current.approved += 1;
          if (rejected) current.rejected += 1;
          current.total += 1;
          statusByBudget.set(budgetId, current);

          if (approvedLike) {
            const existingAmount = approvedAmountByBudget.get(budgetId) || 0;
            approvedAmountByBudget.set(budgetId, existingAmount + amount);
          }
        });

        requestorTables = {
          approval_counts: Array.from(statusByBudget.entries()).map(([budgetId, stats]) => ({
            budget_id: budgetId,
            budget_name: createdBudgetMap.get(budgetId) || 'Unknown Budget',
            approved_count: stats.approved,
            rejected_count: stats.rejected,
            total_requests: stats.total,
          })),
          approved_amounts: Array.from(approvedAmountByBudget.entries()).map(([budgetId, amount]) => ({
            budget_id: budgetId,
            budget_name: createdBudgetMap.get(budgetId) || 'Unknown Budget',
            approved_amount: amount,
          })),
        };
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
          requestor_tables: requestorTables,
          approver_tables: approverTables,
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

  static async getLatestInsights({ userId }) {
    if (!userId) {
      return { success: false, error: 'Missing user id.' };
    }

    try {
      const { data, error } = await supabase
        .from('tblai_insights')
        .select('summary, insights, risks, actions, charts, totals, latest_updates, created_at, role_scope, org_id')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return {
        success: true,
        data: data
          ? {
              ...data,
              generated_at: data.created_at,
            }
          : null,
      };
    } catch (error) {
      console.error('Error fetching latest AI insights:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch latest AI insights',
      };
    }
  }
}

export default AiInsightsService;
