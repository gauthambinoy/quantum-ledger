import React, { useEffect, useState } from 'react';
import { usePortfolioStore } from '../utils/store';
import { formatCurrency, formatPercent, getChangeColor } from '../utils/helpers';
import HoldingRow from '../components/HoldingRow';
import AddHoldingModal from '../components/AddHoldingModal';
import { 
  Plus, 
  RefreshCw, 
  Briefcase,
  TrendingUp,
  TrendingDown,
  PieChart
} from 'lucide-react';
import { PieChart as RechartsPlot, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const Portfolio = () => {
  const { 
    portfolios, 
    currentPortfolio, 
    holdings, 
    performance,
    fetchPortfolios, 
    fetchHoldings,
    fetchPerformance,
    addHolding,
    deleteHolding,
    setCurrentPortfolio,
    isLoading 
  } = usePortfolioStore();
  
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (currentPortfolio) {
      fetchHoldings(currentPortfolio.id);
      fetchPerformance(currentPortfolio.id);
    }
  }, [currentPortfolio]);

  const handleAddHolding = async (data) => {
    if (!currentPortfolio) return false;
    return await addHolding(currentPortfolio.id, data);
  };

  const handleDeleteHolding = async (holdingId) => {
    if (!currentPortfolio) return;
    if (confirm('Are you sure you want to delete this holding?')) {
      await deleteHolding(currentPortfolio.id, holdingId);
    }
  };

  // Prepare chart data
  const chartData = performance?.allocation 
    ? Object.entries(performance.allocation).map(([symbol, value]) => ({
        name: symbol,
        value: value
      }))
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-gray-400">Manage your investments</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Portfolio Selector */}
          {portfolios.length > 1 && (
            <select
              value={currentPortfolio?.id || ''}
              onChange={(e) => {
                const portfolio = portfolios.find(p => p.id === parseInt(e.target.value));
                if (portfolio) setCurrentPortfolio(portfolio);
              }}
              className="input-field bg-dark-300"
            >
              {portfolios.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Holding
          </button>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary-500/20">
                <Briefcase className="w-5 h-5 text-primary-400" />
              </div>
              <span className="text-gray-400">Total Invested</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(performance.total_invested)}</p>
          </div>
          
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-success-500/20">
                <TrendingUp className="w-5 h-5 text-success-400" />
              </div>
              <span className="text-gray-400">Current Value</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(performance.current_value)}</p>
          </div>
          
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${performance.total_gain_loss >= 0 ? 'bg-success-500/20' : 'bg-danger-500/20'}`}>
                {performance.total_gain_loss >= 0 
                  ? <TrendingUp className="w-5 h-5 text-success-400" />
                  : <TrendingDown className="w-5 h-5 text-danger-400" />
                }
              </div>
              <span className="text-gray-400">Total Gain/Loss</span>
            </div>
            <p className={`text-2xl font-bold ${getChangeColor(performance.total_gain_loss)}`}>
              {performance.total_gain_loss >= 0 ? '+' : ''}{formatCurrency(performance.total_gain_loss)}
            </p>
            <p className={`text-sm ${getChangeColor(performance.total_gain_loss_percent)}`}>
              {formatPercent(performance.total_gain_loss_percent)}
            </p>
          </div>
          
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <PieChart className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-gray-400">Assets</span>
            </div>
            <p className="text-2xl font-bold">{holdings.length}</p>
          </div>
        </div>
      )}

      {/* Holdings & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold">Holdings</h2>
          </div>
          
          {holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-white/5">
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium text-right">Quantity</th>
                    <th className="px-4 py-3 font-medium text-right">Buy Price</th>
                    <th className="px-4 py-3 font-medium text-right">Current</th>
                    <th className="px-4 py-3 font-medium text-right">Value</th>
                    <th className="px-4 py-3 font-medium text-right">Gain/Loss</th>
                    <th className="px-4 py-3 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <HoldingRow 
                      key={holding.id} 
                      holding={holding}
                      onDelete={handleDeleteHolding}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No holdings yet</h3>
              <p className="text-gray-400 mb-4">Add your first investment to get started</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add Holding
              </button>
            </div>
          )}
        </div>

        {/* Allocation Chart */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Allocation</h2>
          
          {chartData.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPlot>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value.toFixed(2)}%`, 'Allocation']}
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                  </RechartsPlot>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="space-y-2 mt-4">
                {chartData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm text-gray-400">{item.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Add holdings to see allocation
            </div>
          )}
        </div>
      </div>

      {/* Add Holding Modal */}
      <AddHoldingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddHolding}
      />
    </div>
  );
};

export default Portfolio;
