import React, { useState, useRef } from 'react';
import api from '../utils/api';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/helpers';
import {
  BarChart3,
  Calendar,
  Play,
  Loader,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
} from 'recharts';
import BacktestResults from '../components/BacktestResults';

const PRESET_PERIODS = [
  { label: '1 Year', days: 365 },
  { label: '3 Years', days: 365 * 3 },
  { label: '5 Years', days: 365 * 5 },
  { label: '10 Years', days: 365 * 10 },
  { label: '20 Years', days: 365 * 20 },
];

const STRATEGIES = [
  { value: 'buy_and_hold', label: 'Buy & Hold' },
  { value: 'sma_crossover', label: 'SMA Crossover' },
];

const Backtester = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [assetType, setAssetType] = useState('stock');
  const [strategy, setStrategy] = useState('buy_and_hold');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const resultsRef = useRef(null);

  // Set default dates (5 years back to today)
  React.useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 5);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const handlePresetPeriod = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const handleRunBacktest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/backtest/run', {
        symbol: symbol.toUpperCase(),
        asset_type: assetType,
        strategy: strategy,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
      });

      setResults(response.data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Failed to run backtest. Please check your inputs.'
      );
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-400" />
          Backtester
        </h1>
        <p className="text-gray-400">Test your investment strategies on historical data</p>
      </div>

      {/* Input Form */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Symbol */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL, BTC, SPY..."
              className="input-field w-full"
            />
          </div>

          {/* Asset Type */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Asset Type</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="input-field w-full"
            >
              <option value="stock">Stock</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="input-field w-full"
            >
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Placeholder */}
          <div></div>
        </div>

        {/* Date Range */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Date Range
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            {PRESET_PERIODS.map((period) => (
              <button
                key={period.days}
                onClick={() => handlePresetPeriod(period.days)}
                className="px-3 py-1 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={handleRunBacktest}
          disabled={isLoading || !symbol || !startDate || !endDate}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Running backtest...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Backtest
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && <BacktestResults ref={resultsRef} results={results} />}
    </div>
  );
};

export default Backtester;
