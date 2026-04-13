import React, { useEffect, useState, useMemo } from 'react';
import { usePortfolioStore, useMarketStore, useAuthStore, useAlertsStore } from '../utils/store';
import { formatCurrency, formatPercent, getChangeColor, formatCompact, timeAgo } from '../utils/helpers';
import { Link } from 'react-router-dom';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Zap,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Activity,
  MoreHorizontal,
  ChevronUp,
  Crown,
  Target,
  Briefcase,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight as ArrowRightIcon,
} from 'lucide-react';

const CHART_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#ef4444'];

const Dashboard = () => {
  const { user } = useAuthStore();
  const { portfolios, holdings, fetchPortfolios, isLoading: portfolioLoading } = usePortfolioStore();
  const { overview, stockGainers, cryptoGainers, fetchOverview, isLoading: marketLoading } = useMarketStore();
  const { alerts, fetchAlerts } = useAlertsStore();
  const [tradingAccount, setTradingAccount] = useState(null);

  const fetchTradingAccount = async () => {
    try {
      const response = await fetch('/api/trading/status', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.is_connected) {
          const accountResponse = await fetch('/api/trading/account', { credentials: 'include' });
          if (accountResponse.ok) {
            setTradingAccount(await accountResponse.json());
          }
        }
      }
    } catch (err) {
      // Trading account not available
    }
  };

  useEffect(() => {
    fetchPortfolios();
    fetchOverview();
    fetchAlerts();
    fetchTradingAccount();
  }, []);

  // Calculate totals
  const totalValue = portfolios.reduce((sum, p) => sum + (p.total_value || 0), 0);
  const totalGainLoss = portfolios.reduce((sum, p) => sum + (p.total_gain_loss || 0), 0);
  const totalGainLossPercent = totalValue > 0
    ? (totalGainLoss / (totalValue - totalGainLoss)) * 100
    : 0;
  const totalAssets = portfolios.reduce((sum, p) => sum + (p.holdings?.length || 0), 0);
  const activeAlerts = alerts.filter(a => a.is_active).length;

  // Build allocation data from holdings
  const allocationData = holdings.length > 0
    ? holdings.map((h, i) => ({
        name: h.symbol,
        value: h.current_value || h.quantity * (h.current_price || h.buy_price),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
    : portfolios.map((p, i) => ({
        name: p.name,
        value: p.total_value || 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }));

  const allocationTotal = allocationData.reduce((sum, d) => sum + d.value, 0);

  // Mini profit chart data (stable across re-renders)
  const profitChartData = useMemo(() => {
    // Use a seeded sequence for stable values
    const seed = Math.round(totalValue) || 1000;
    return Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      value: totalValue > 0
        ? totalValue * (0.85 + ((((seed * (i + 1) * 9301 + 49297) % 233280) / 233280) * 0.3)) * ((i + 1) / 12)
        : 1000 + ((((seed * (i + 1) * 9301 + 49297) % 233280) / 233280) * 500) * i,
    }));
  }, [totalValue]);

  // Build activity feed from real data
  const activityItems = [
    ...(overview?.btc ? [{
      icon: <TrendingUp className="w-4 h-4" />,
      iconBg: 'bg-success-500/20 text-success-400',
      text: `BTC at ${formatCurrency(overview.btc.price, 0)}`,
      time: 'Live',
    }] : []),
    ...(overview?.eth ? [{
      icon: <BarChart3 className="w-4 h-4" />,
      iconBg: 'bg-primary-500/20 text-primary-400',
      text: `ETH at ${formatCurrency(overview.eth.price, 0)}`,
      time: 'Live',
    }] : []),
    ...(portfolios.length > 0 ? [{
      icon: <Briefcase className="w-4 h-4" />,
      iconBg: 'bg-purple-500/20 text-purple-400',
      text: `${portfolios.length} portfolio${portfolios.length > 1 ? 's' : ''} tracked`,
      time: 'Active',
    }] : []),
    ...(activeAlerts > 0 ? [{
      icon: <Bell className="w-4 h-4" />,
      iconBg: 'bg-yellow-500/20 text-yellow-400',
      text: `${activeAlerts} active alert${activeAlerts > 1 ? 's' : ''}`,
      time: 'Monitoring',
    }] : []),
    {
      icon: <CheckCircle2 className="w-4 h-4" />,
      iconBg: 'bg-success-500/20 text-success-400',
      text: 'Market data synced',
      time: 'Just now',
    },
  ];

  // Notification items from market data
  const notificationItems = [
    ...(stockGainers.length > 0 ? [{
      icon: <TrendingUp className="w-4 h-4 text-success-400" />,
      text: `${stockGainers[0]?.symbol} up ${formatPercent(stockGainers[0]?.change_percent)}`,
      time: 'Top gainer',
    }] : []),
    ...(cryptoGainers.length > 0 ? [{
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      text: `${cryptoGainers[0]?.symbol} surging ${formatPercent(cryptoGainers[0]?.change_percent)}`,
      time: 'Crypto alert',
    }] : []),
    ...(overview?.sp500 ? [{
      icon: overview.sp500.change >= 0
        ? <ArrowUpRight className="w-4 h-4 text-success-400" />
        : <ArrowDownRight className="w-4 h-4 text-danger-400" />,
      text: `S&P 500 ${formatPercent(overview.sp500.change_percent)}`,
      time: 'Market update',
    }] : []),
    ...(overview?.nasdaq ? [{
      icon: overview.nasdaq.change >= 0
        ? <ArrowUpRight className="w-4 h-4 text-success-400" />
        : <ArrowDownRight className="w-4 h-4 text-danger-400" />,
      text: `NASDAQ ${formatPercent(overview.nasdaq.change_percent)}`,
      time: 'Market update',
    }] : []),
    {
      icon: <Bell className="w-4 h-4 text-primary-400" />,
      text: 'Dashboard refreshed',
      time: 'Just now',
    },
  ];

  // Top holdings (combine stock + crypto gainers for display)
  const topMovers = [
    ...stockGainers.slice(0, 3).map(s => ({ ...s, type: 'stock' })),
    ...cryptoGainers.slice(0, 3).map(c => ({ ...c, type: 'crypto' })),
  ].sort((a, b) => (b.change_percent || 0) - (a.change_percent || 0)).slice(0, 5);

  const handleRefresh = () => {
    fetchPortfolios();
    fetchOverview();
    fetchAlerts();
  };

  const isLoading = portfolioLoading || marketLoading;

  return (
    <div className="animate-fade-in">
      {/* Main grid: content + right sidebar */}
      <div className="flex gap-6">
        {/* Left/Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Overview</h1>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Welcome back, {user?.full_name || user?.username || 'Investor'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl
                         bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10
                         hover:bg-white/10 transition-all text-gray-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Today
            </button>
          </div>

          {/* Trading Account Banner */}
          {tradingAccount && (
            <div className="glass-card p-4 border-l-4 border-l-yellow-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Live Trading Active</p>
                    <p className="text-xs text-gray-400">Balance: {formatCurrency(tradingAccount.account_balance)}</p>
                  </div>
                </div>
                <Link to="/trading" className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 font-medium">
                  Open Panel <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Portfolio Value */}
            <div className="glass-card p-5">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">Portfolio Value</p>
              <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalValue, 0)}</p>
              <div className="flex items-center gap-1.5 mt-2">
                {totalGainLossPercent >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-success-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-danger-400" />
                )}
                <span className={`text-xs font-medium ${totalGainLossPercent >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                  {Math.abs(totalGainLossPercent).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            </div>

            {/* Total Gain/Loss */}
            <div className="glass-card p-5">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">Total P&L</p>
              <p className="text-2xl font-bold tracking-tight">
                {formatCurrency(Math.abs(totalGainLoss), 0)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                {totalGainLoss >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-success-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-danger-400" />
                )}
                <span className={`text-xs font-medium ${totalGainLoss >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                  {totalGainLoss >= 0 ? '+' : '-'}{formatPercent(Math.abs(totalGainLossPercent))}
                </span>
                <span className="text-xs text-gray-500">vs last quarter</span>
              </div>
            </div>

            {/* Portfolio Goal */}
            {(() => {
              const goalTarget = Math.max(totalValue * 1.3, 10000);
              const goalPercent = totalValue > 0 ? Math.min(Math.round((totalValue / goalTarget) * 100), 100) : 0;
              return (
                <div className="glass-card p-5">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">Portfolio Goal</p>
                  <p className="text-2xl font-bold tracking-tight">{goalPercent}%</p>
                  <div className="mt-2">
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-success-500 rounded-full transition-all duration-500"
                        style={{ width: `${goalPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Goal: {formatCurrency(goalTarget, 0)}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Active Holdings */}
            <div className="glass-card p-5">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">Active Holdings</p>
              <p className="text-2xl font-bold tracking-tight">
                {totalAssets.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-success-400" />
                <span className="text-xs font-medium text-success-400">
                  {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Portfolio Overview + Mini Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Portfolio Allocation (large card - 2 cols) */}
            <div className="lg:col-span-2 glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold">Portfolio Overview</h2>
                <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-8">
                {/* Donut Chart */}
                <div className="relative w-48 h-48 flex-shrink-0">
                  {allocationData.length > 0 && allocationTotal > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={allocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {allocationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '0.75rem',
                              color: '#fff',
                              fontSize: '12px',
                            }}
                            formatter={(value) => formatCurrency(value)}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-xl font-bold">{formatCompact(allocationTotal)}</p>
                        <p className="text-xs text-gray-400">Total Value</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-full border-2 border-dashed border-white/10">
                      <p className="text-xs text-gray-500 text-center px-4">Add holdings<br/>to see chart</p>
                    </div>
                  )}
                </div>

                {/* Market Index Breakdown */}
                <div className="flex-1 space-y-3">
                  {overview?.sp500 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" />
                        <span className="text-sm text-gray-400">S&P 500</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(overview.sp500.price, 0)}</span>
                    </div>
                  )}
                  {overview?.nasdaq && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                        <span className="text-sm text-gray-400">NASDAQ</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(overview.nasdaq.price, 0)}</span>
                    </div>
                  )}
                  {overview?.btc && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                        <span className="text-sm text-gray-400">Bitcoin</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(overview.btc.price, 0)}</span>
                    </div>
                  )}
                  {overview?.eth && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
                        <span className="text-sm text-gray-400">Ethereum</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(overview.eth.price, 0)}</span>
                    </div>
                  )}
                  {allocationData.filter(d => d.value > 0).slice(0, 4).map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-gray-400">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mini Metric Cards (1 col) */}
            <div className="space-y-4">
              {/* Mini Card: Market Movers */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Market Movers</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {stockGainers.length + cryptoGainers.length}
                  </p>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                    stockGainers.length > 0 ? 'bg-success-500/20 text-success-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    +{stockGainers.length}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Tracked gainers today</p>
              </div>

              {/* Mini Card: Total Profit */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Profit</p>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                    totalGainLoss >= 0 ? 'bg-success-500/20 text-success-400' : 'bg-danger-500/20 text-danger-400'
                  }`}>
                    {totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(Math.abs(totalGainLoss), 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Net Profit</p>
              </div>
            </div>
          </div>

          {/* Top Movers Table */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Top Movers</h2>
              <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 pb-3 border-b border-white/5 mb-1">
              <div className="flex items-center gap-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
                Name <ChevronUp className="w-3 h-3" />
              </div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Price</div>
              <div className="flex items-center gap-1 text-xs text-gray-500 font-medium uppercase tracking-wide justify-end">
                Change <ChevronUp className="w-3 h-3" />
              </div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide text-right">Volume</div>
            </div>

            {/* Table Rows */}
            <div className="space-y-0">
              {topMovers.map((item) => (
                <div key={item.symbol} className="grid grid-cols-4 gap-4 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white ${
                      item.type === 'crypto'
                        ? 'bg-gradient-to-br from-orange-500 to-yellow-500'
                        : 'bg-gradient-to-br from-primary-500 to-blue-600'
                    }`}>
                      {item.symbol?.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.symbol}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[100px]">{item.name}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-right self-center">{formatCurrency(item.price)}</p>
                  <div className="text-right self-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
                      (item.change_percent || 0) >= 0
                        ? 'bg-success-500/20 text-success-400'
                        : 'bg-danger-500/20 text-danger-400'
                    }`}>
                      {(item.change_percent || 0) >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {formatPercent(item.change_percent)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 text-right self-center">
                    {item.volume ? formatCompact(item.volume) : '-'}
                  </p>
                </div>
              ))}
              {topMovers.length === 0 && (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Loading market data...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="hidden xl:block w-80 flex-shrink-0 space-y-5">
          {/* Notifications */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Notifications</h3>
            <div className="space-y-3">
              {notificationItems.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{item.text}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Activities</h3>
            <div className="space-y-3">
              {activityItems.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{item.text}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Profit Chart */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Total Profit</p>
            </div>
            <p className="text-xl font-bold mb-3">
              {formatCurrency(totalValue, 2)}
            </p>
            <div className="h-24 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitChartData}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#profitGradient)"
                    dot={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [formatCurrency(value), 'Value']}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Premium Plan Card */}
          <div className="glass-card p-5 border border-primary-500/30 bg-gradient-to-br from-primary-500/10 to-purple-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-semibold text-primary-400 uppercase tracking-wide">Pro Plan</span>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-3xl font-bold">$30</span>
              <span className="text-sm text-gray-400">Per Month</span>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Unlock AI predictions, advanced analytics, real-time alerts and more 🚀
            </p>
            <Link
              to="/pricing"
              className="block w-full text-center py-2.5 px-4 bg-primary-500 hover:bg-primary-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Quick Links */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'AI Predictions', path: '/prediction', icon: Target },
                { label: 'Market Pulse', path: '/market-pulse', icon: Activity },
                { label: 'Leaderboard', path: '/leaderboard', icon: Users },
              ].map(({ label, path, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-primary-400 transition-colors" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <ArrowRightIcon className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
