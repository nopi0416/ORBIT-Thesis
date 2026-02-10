import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resolveUserRole, getRoleDisplayName } from '../utils/roleUtils';
import aiInsightsService from '../services/aiInsightsService';
import approvalRequestService from '../services/approvalRequestService';
import { fetchWithCache } from '../utils/dataCache';

const getToken = () => localStorage.getItem('authToken') || '';

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const userRole = resolveUserRole(user);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const cacheKey = `aiInsightsCache:${user?.id || 'anon'}`;
  const cacheTtlMs = 5 * 60 * 1000;
  const metricsCacheKey = `dashboardMetrics:${user?.id || 'anon'}`;
  const notificationsCacheKey = `dashboardNotifications:${user?.id || 'anon'}`;
  const showNotifications = ['requestor', 'l1', 'l2', 'l3'].includes(userRole);

  const handleGenerateInsights = async () => {
    setAiLoading(true);
    try {
      const data = await aiInsightsService.getAiInsights({}, getToken());
      setAiData(data);
      localStorage.setItem(cacheKey, JSON.stringify({ data, cachedAt: Date.now() }));
    } catch (error) {
      toast.error(error.message || 'Failed to generate AI insights.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleLoadMetrics = async () => {
    try {
      const data = await fetchWithCache(
        'dashboardMetrics',
        metricsCacheKey,
        () => aiInsightsService.getRealtimeMetrics({ role: userRole }, getToken()),
        2 * 60 * 1000
      );
      setMetricsData(data);
    } catch (error) {
      toast.error(error.message || 'Failed to load realtime metrics.');
    }
  };

  React.useEffect(() => {
    handleLoadMetrics();
  }, []);

  React.useEffect(() => {
    if (!showNotifications) return;

    const loadNotifications = async () => {
      try {
        const data = await fetchWithCache(
          'dashboardNotifications',
          notificationsCacheKey,
          () => approvalRequestService.getUserNotifications({ role: userRole }, getToken()),
          2 * 60 * 1000
        );
        setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(error.message || 'Failed to load notifications.');
        setNotifications([]);
      }
    };

    loadNotifications();
  }, [showNotifications, notificationsCacheKey, userRole]);

  React.useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.data && Date.now() - (parsed.cachedAt || 0) < cacheTtlMs) {
          setAiData(parsed.data);
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    const loadLatest = async () => {
      try {
        const latest = await fetchWithCache(
          'aiInsightsLatest',
          cacheKey,
          () => aiInsightsService.getLatestAiInsights(getToken()),
          cacheTtlMs
        );
        if (latest) {
          setAiData(latest);
          localStorage.setItem(cacheKey, JSON.stringify({ data: latest, cachedAt: Date.now() }));
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load latest AI insights.');
      }
    };

    loadLatest();
  }, [cacheKey]);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name || "User"}`}
        description={`Your ${getRoleDisplayName(userRole)} dashboard`}
      />

      <div className="p-6 space-y-6">
        {userRole === 'payroll' ? (
          <>
            <PayrollInsightsLayout
              loading={aiLoading}
              data={aiData}
              metrics={metricsData}
              onGenerate={handleGenerateInsights}
            />
            <LatestUpdatesTable updates={metricsData?.latest_updates} />
          </>
        ) : (
          <>
            <RoleInsightsLayout
              loading={aiLoading}
              data={aiData}
              role={userRole}
              metrics={metricsData}
              onGenerate={handleGenerateInsights}
            />
            {userRole === 'requestor' && (
              <RequestorSubmissionTables
                tables={metricsData?.requestor_tables}
              />
            )}
            {userRole === 'l1' && (
              <ApproverSubmissionCharts
                tables={metricsData?.approver_tables}
              />
            )}
            {showNotifications && (
              <ApprovalNotificationsTable
                items={notifications}
                role={userRole}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ApprovalNotificationsTable({ items = [], role }) {
  const rows = Array.isArray(items) ? items : [];
  const formatLabel = (value) => String(value || 'pending').replace(/_/g, ' ');
  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).replace(', ', ' ');
    } catch {
      return value;
    }
  };

  return (
    <Card className="bg-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Approval Notifications</CardTitle>
        <p className="text-xs text-slate-400">
          {role === 'requestor'
            ? 'Your submitted approvals and approvals tied to configurations you created.'
            : 'Approvals assigned to you and requests you already approved.'}
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 && (
          <div className="text-sm text-slate-400">No approval notifications available.</div>
        )}

        {rows.length > 0 && (
          <div className="border border-slate-700 rounded-md overflow-auto">
            <table className="w-full text-sm text-slate-300 border-collapse">
              <thead className="bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Request #
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-right text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="border-b border-slate-600 px-4 py-3 text-left text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Context
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {rows.map((item) => (
                  <tr key={item.request_id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {item.request_number || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{item.budget_name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {item.submitted_by_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-200">
                        {formatLabel(item.overall_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {formatLabel(item.approval_stage_status)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                      ₱{Number(item.total_request_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {formatDate(item.updated_at || item.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {(item.context_tags || []).length ? item.context_tags.join(' • ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoleInsightsLayout({ loading, data, role, metrics, onGenerate }) {
  const charts = metrics?.charts || {};
  const statusBreakdown = Array.isArray(charts.status_breakdown)
    ? charts.status_breakdown
    : [];

  const roleTitle = role === 'requestor'
    ? 'Requestor Dashboard'
    : role?.includes('l')
      ? 'Approver Dashboard'
      : 'Operations Dashboard';

  return (
    <Card className="bg-slate-800">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-white">{roleTitle}</CardTitle>
          <p className="text-xs text-gray-400">
            AI insights tailored to your role scope.
          </p>
        </div>
        <Button
          onClick={onGenerate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Run AI Insights'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data && !loading && (
          <div className="text-sm text-gray-400">
            Click “Run AI Insights” to generate the latest summary.
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <InsightCard title="Executive Summary" content={data?.summary} />
            <InsightList title="Key Insights" items={data?.insights} emptyLabel="No insights available." />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InsightList title="Risk Signals" items={data?.risks} emptyLabel="No risks flagged." />
            <InsightList title="Recommended Actions" items={data?.actions} emptyLabel="No actions available." />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PayrollInsightsLayout({ loading, data, metrics, onGenerate }) {
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

  const charts = metrics?.charts || {};
  const statusBreakdown = coerceChartArray(charts.status_breakdown);
  const statusAmounts = coerceChartArray(charts.status_amounts);
  const topBudgets = Array.isArray(charts.top_budgets) ? charts.top_budgets : [];
  const monthlySeries = Array.isArray(charts.monthly_series) ? charts.monthly_series : [];

  const generatedAt = data?.generated_at ? new Date(data.generated_at) : null;
  const generatedLabel = generatedAt && !Number.isNaN(generatedAt.getTime())
    ? generatedAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
    : '—';

  return (
    <Card className="bg-slate-800">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-white">Payroll AI Dashboard</CardTitle>
          <p className="text-xs text-gray-400">
            Financial insights based on your role scope · Generated: {generatedLabel}
          </p>
        </div>
        <Button
          onClick={onGenerate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={loading}
        >
          {loading ? 'Generating…' : 'Run AI Insights'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data && !loading && (
          <div className="text-sm text-gray-400">
            Click “Run AI Insights” to generate the latest summary.
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <InsightCard title="Executive Summary" content={data?.summary} />
            <InsightList title="Key Insights" items={data?.insights} emptyLabel="No insights available." />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InsightList title="Risk Signals" items={data?.risks} emptyLabel="No risks flagged." />
            <InsightList title="Recommended Actions" items={data?.actions} emptyLabel="No actions available." />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PieChartCard
              title="Approvals Status Breakdown"
              data={statusBreakdown}
              totalLabel="Total"
            />
            <PieChartCard
              title="Approvals Amount Breakdown"
              data={statusAmounts}
              totalLabel="Total"
              valueFormatter={(value) => `₱${Number(value || 0).toLocaleString()}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1.2fr]">
            <TopBudgetsBarChart data={topBudgets} />
            <MonthlyApprovalsChart data={monthlySeries} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ title, content }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="text-sm text-white font-semibold mb-2">{title}</div>
      <p className="text-sm text-slate-300">{content || 'No data available.'}</p>
    </div>
  );
}

function InsightList({ title, items = [], emptyLabel }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="text-sm text-white font-semibold mb-2">{title}</div>
      {Array.isArray(items) && items.length ? (
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-slate-400">{emptyLabel}</div>
      )}
    </div>
  );
}

function PieChartCard({ title, data, valueFormatter, totalLabel }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const sections = data.filter((item) => Number(item.value || 0) > 0);

  const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];
  const coloredSections = sections.map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
  }));
  const gradient = coloredSections.length
    ? coloredSections.reduce((acc, item) => {
        const start = acc.offset;
        const value = Number(item.value || 0);
        const percent = total ? (value / total) * 100 : 0;
        const nextOffset = start + percent;
        return {
          offset: nextOffset,
          stops: [...acc.stops, `${item.color} ${start}% ${nextOffset}%`],
        };
      }, { offset: 0, stops: [] }).stops.join(', ')
    : '#1f2937';

  const formatValue = (value) => (valueFormatter ? valueFormatter(value) : value);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="text-sm text-white font-semibold mb-2">{title}</div>
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div
          className="h-36 w-36 rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        />
        <div className="flex-1 space-y-1 text-sm text-slate-300">
          <div className="flex items-center justify-between font-semibold text-white">
            <span>{totalLabel}</span>
            <span>{formatValue(total)}</span>
          </div>
          {coloredSections.length ? (
            coloredSections.map((item) => {
              const percent = total ? (Number(item.value || 0) / total) * 100 : 0;
              return (
              <div key={item.label} className="flex items-center justify-between">
                <span className="capitalize" style={{ color: item.color }}>
                  {String(item.label || '').replace(/_/g, ' ')} · {percent.toFixed(1)}%
                </span>
                <span style={{ color: item.color }}>
                  {formatValue(item.value)}
                </span>
              </div>
            );
            })
          ) : (
            <div className="text-xs text-slate-400">No data</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopBudgetsBarChart({ data }) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
        <div className="text-sm text-white font-semibold mb-2">Top Budgets</div>
        <div className="text-xs text-slate-400">No budget data available.</div>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((item) => Number(item.total_amount || 0)), 1);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="text-sm text-white font-semibold mb-2">Top 5 Budgets by Amount</div>
      <div className="space-y-3">
        {data.map((item) => {
          const total = Number(item.total_amount || 0);
          const completed = Number(item.completed_amount || 0);
          const ongoing = Number(item.ongoing_amount || 0);
          const totalPercent = (total / maxAmount) * 100;

          return (
            <div key={item.budget_id} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span className="truncate max-w-[240px]">{item.budget_name}</span>
                <span className="text-white font-semibold">₱{total.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-700">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${totalPercent}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Completed: ₱{completed.toLocaleString()}</span>
                <span>Ongoing: ₱{ongoing.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyApprovalsChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const maxValue = Math.max(...safeData.map((item) => Number(item.amount || 0)), 1);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="text-sm text-white font-semibold mb-2">Monthly Approval Amounts</div>
      {safeData.length ? (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            {safeData.map((item) => (
              <div key={item.month} className="flex flex-col items-center gap-2">
                <div
                  className="w-8 rounded bg-emerald-500"
                  style={{ height: `${(Number(item.amount || 0) / maxValue) * 120}px` }}
                />
                <span className="text-xs text-slate-400">{item.month}</span>
                <span className="text-[10px] text-slate-500">₱{Number(item.amount || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400">No historical data available.</div>
      )}
    </div>
  );
}

function LatestUpdatesTable({ updates = [] }) {
  const rows = Array.isArray(updates) ? updates : [];

  return (
    <Card className="bg-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Latest Payroll Updates</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead className="text-xs uppercase text-slate-400">
                <tr className="border-b border-slate-700">
                  <th className="py-2 text-left">Budget Config Name</th>
                  <th className="py-2 text-left">Request ID</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Amount</th>
                  <th className="py-2 text-left">Requested By</th>
                  <th className="py-2 text-left">Action</th>
                  <th className="py-2 text-left">Action By</th>
                  <th className="py-2 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-700/40">
                    <td className="py-2">{row.budget_name || 'Unknown Budget'}</td>
                    <td className="py-2 font-medium text-white">{row.request_number || row.id}</td>
                    <td className="py-2 capitalize">{String(row.status || '').replace(/_/g, ' ')}</td>
                    <td className="py-2">₱{Number(row.amount || 0).toLocaleString()}</td>
                    <td className="py-2">{row.requested_by || 'Unknown'}</td>
                    <td className="py-2 capitalize">{String(row.action || '').replace(/_/g, ' ')}</td>
                    <td className="py-2">{row.action_by || 'System'}</td>
                    <td className="py-2 text-slate-400">
                      {row.created_at ? new Date(row.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-slate-400">No recent payroll updates available.</div>
        )}
      </CardContent>
    </Card>
  );
}

function RequestorSubmissionTables({ tables }) {
  const approvalCounts = Array.isArray(tables?.approval_counts) ? tables.approval_counts : [];
  const approvedAmounts = Array.isArray(tables?.approved_amounts) ? tables.approved_amounts : [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Approved vs Rejected by Configuration</CardTitle>
          <p className="text-xs text-slate-400">Counts for requests under configurations you created.</p>
        </CardHeader>
        <CardContent>
          {approvalCounts.length === 0 && (
            <div className="text-sm text-slate-400">No configuration submissions available.</div>
          )}
          {approvalCounts.length > 0 && (
            <RequestorCountsBarChart data={approvalCounts} />
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Approved Amounts by Configuration</CardTitle>
          <p className="text-xs text-slate-400">Approved value totals for your created configurations.</p>
        </CardHeader>
        <CardContent>
          {approvedAmounts.length === 0 && (
            <div className="text-sm text-slate-400">No approved amounts available.</div>
          )}
          {approvedAmounts.length > 0 && (
            <RequestorAmountsBarChart data={approvedAmounts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestorCountsBarChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const maxValue = Math.max(
    ...safeData.map((row) => Math.max(Number(row.approved_count || 0), Number(row.rejected_count || 0))),
    1
  );

  return (
    <div className="space-y-3">
      {safeData.map((row) => {
        const approved = Number(row.approved_count || 0);
        const rejected = Number(row.rejected_count || 0);
        const approvedPercent = (approved / maxValue) * 100;
        const rejectedPercent = (rejected / maxValue) * 100;

        return (
          <div key={row.budget_id} className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span className="truncate max-w-[240px] text-white">{row.budget_name || '—'}</span>
              <span className="text-xs text-slate-400">Total: {Number(row.total_requests || 0)}</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Approved</span>
                  <span className="text-emerald-400 font-semibold">{approved}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${approvedPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Rejected</span>
                  <span className="text-rose-400 font-semibold">{rejected}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-700">
                  <div className="h-2 rounded-full bg-rose-500" style={{ width: `${rejectedPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RequestorAmountsBarChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const maxValue = Math.max(...safeData.map((row) => Number(row.approved_amount || 0)), 1);

  return (
    <div className="space-y-3">
      {safeData.map((row) => {
        const amount = Number(row.approved_amount || 0);
        const percent = (amount / maxValue) * 100;

        return (
          <div key={row.budget_id} className="space-y-1">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span className="truncate max-w-[260px] text-white">{row.budget_name || '—'}</span>
              <span className="text-emerald-400 font-semibold">₱{amount.toLocaleString()}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-700">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApproverSubmissionCharts({ tables }) {
  const submittedCounts = Array.isArray(tables?.submitted_counts) ? tables.submitted_counts : [];
  const submittedAmounts = Array.isArray(tables?.submitted_amounts) ? tables.submitted_amounts : [];
  const approvedCounts = Array.isArray(tables?.approved_counts) ? tables.approved_counts : [];
  const approvedAmounts = Array.isArray(tables?.approved_amounts) ? tables.approved_amounts : [];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Submitted Requests: Approved vs Rejected</CardTitle>
            <p className="text-xs text-slate-400">Counts per submitted configuration in your queue.</p>
          </CardHeader>
          <CardContent>
            {submittedCounts.length === 0 && (
              <div className="text-sm text-slate-400">No submitted approvals available.</div>
            )}
            {submittedCounts.length > 0 && (
              <ApproverStackedBarChart data={submittedCounts} />
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Submitted Requests: Approved Amounts</CardTitle>
            <p className="text-xs text-slate-400">Approved value per submitted configuration.</p>
          </CardHeader>
          <CardContent>
            {submittedAmounts.length === 0 && (
              <div className="text-sm text-slate-400">No approved amounts available.</div>
            )}
            {submittedAmounts.length > 0 && (
              <ApproverVerticalAmountsBarChart data={submittedAmounts} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Approved Requests: Approved vs Rejected</CardTitle>
            <p className="text-xs text-slate-400">Your approval decisions by configuration.</p>
          </CardHeader>
          <CardContent>
            {approvedCounts.length === 0 && (
              <div className="text-sm text-slate-400">No approval actions recorded.</div>
            )}
            {approvedCounts.length > 0 && (
              <ApproverStackedBarChart data={approvedCounts} />
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Approved Requests: Amounts Approved</CardTitle>
            <p className="text-xs text-slate-400">Approved value totals by configuration.</p>
          </CardHeader>
          <CardContent>
            {approvedAmounts.length === 0 && (
              <div className="text-sm text-slate-400">No approved amounts recorded.</div>
            )}
            {approvedAmounts.length > 0 && (
              <ApproverAmountsPieChart data={approvedAmounts} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApproverStackedBarChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const maxTotal = Math.max(
    ...safeData.map((row) => Number(row.approved_count || 0) + Number(row.rejected_count || 0)),
    1
  );

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {safeData.map((row) => {
          const approved = Number(row.approved_count || 0);
          const rejected = Number(row.rejected_count || 0);
          const total = approved + rejected;
          const totalWidth = (total / maxTotal) * 100;
          const approvedWidth = total ? (approved / total) * totalWidth : 0;
          const rejectedWidth = total ? (rejected / total) * totalWidth : 0;

          return (
            <div key={row.budget_id} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="text-slate-200 truncate max-w-[220px]">{row.budget_name || '—'}</span>
                <span>A {approved} · R {rejected}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <div className="flex h-full">
                  <div className="bg-emerald-500" style={{ width: `${approvedWidth}%` }} />
                  <div className="bg-rose-500" style={{ width: `${rejectedWidth}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" /> Rejected</span>
      </div>
    </div>
  );
}

function ApproverVerticalAmountsBarChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];
  const maxValue = Math.max(...safeData.map((row) => Number(row.approved_amount || 0)), 1);
  const chartHeight = 180;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3 overflow-x-auto pb-2">
        {safeData.map((row) => {
          const amount = Number(row.approved_amount || 0);
          const height = (amount / maxValue) * chartHeight;

          return (
            <div key={row.budget_id} className="flex flex-col items-center min-w-[90px]">
              <div className="flex flex-col justify-end w-10 rounded bg-slate-800 border border-slate-700" style={{ height: chartHeight }}>
                <div className="w-full bg-emerald-500" style={{ height: `${height}px` }} />
              </div>
              <div className="mt-2 text-[10px] text-slate-300 text-center truncate max-w-[90px]">
                {row.budget_name || '—'}
              </div>
              <div className="text-[10px] text-emerald-400">₱{amount.toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApproverAmountsPieChart({ data }) {
  const sections = Array.isArray(data)
    ? data.map((row) => ({
        label: row.budget_name || '—',
        value: Number(row.approved_amount || 0),
      }))
    : [];

  return (
    <PieChartCard
      title="Approved Amounts by Configuration"
      data={sections}
      totalLabel="Total Approved"
      valueFormatter={(value) => `₱${Number(value || 0).toLocaleString()}`}
    />
  );
}