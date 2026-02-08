import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { resolveUserRole, getRoleDisplayName } from '../utils/roleUtils';
import aiInsightsService from '../services/aiInsightsService';

const getToken = () => localStorage.getItem('authToken') || '';

export default function DashboardPage() {
  const { user } = useAuth();
  const userRole = resolveUserRole(user);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [metricsError, setMetricsError] = useState(null);

  const handleGenerateInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await aiInsightsService.getAiInsights({}, getToken());
      setAiData(data);
    } catch (error) {
      setAiError(error.message || 'Failed to generate AI insights.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleLoadMetrics = async () => {
    setMetricsError(null);
    try {
      const data = await aiInsightsService.getRealtimeMetrics({}, getToken());
      setMetricsData(data);
    } catch (error) {
      setMetricsError(error.message || 'Failed to load realtime metrics.');
    }
  };

  React.useEffect(() => {
    handleLoadMetrics();
  }, []);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name || "User"}`}
        description={`Your ${getRoleDisplayName(userRole)} dashboard`}
      />

      <div className="p-6 space-y-6">
        <PayrollInsightsLayout
          loading={aiLoading}
          error={aiError}
          data={aiData}
          metrics={metricsData}
          metricsError={metricsError}
          onGenerate={handleGenerateInsights}
        />
        <LatestUpdatesTable updates={metricsData?.latest_updates} error={metricsError} />
      </div>
    </div>
  );
}

function PayrollInsightsLayout({ loading, error, data, metrics, metricsError, onGenerate }) {
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
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {metricsError && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {metricsError}
          </div>
        )}

        {!data && !loading && !error && (
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

function LatestUpdatesTable({ updates = [], error }) {
  const rows = Array.isArray(updates) ? updates : [];

  return (
    <Card className="bg-slate-800">
      <CardHeader>
        <CardTitle className="text-white">Latest Payroll Updates</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 mb-3">
            {error}
          </div>
        )}
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