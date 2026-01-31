import React, { useState, useEffect } from 'react';
import { marketAPI } from '../utils/api';
import { formatCurrency, formatPercent, getChangeColor, formatCompact } from '../utils/helpers';
import { Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Markets = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetHistory, setAssetHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('stock');

  const handleSearch = async () => {
    if (!searchQuery) return;
    
    setIsLoading(true);
    try {
      const response = await marketAPI.search(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectAsset = async (asset) => {
    setSelectedAsset(asset);
    setSearchResults([]);
    setSearchQuery('');
    
    try {
      let quoteResponse, historyResponse;
      
      if (asset.asset_type === 'crypto') {
        quoteResponse = await marketAPI.getCryptoQuote(asset.symbol);
        historyResponse = await marketAPI.getCryptoHistory(asset.symbol, 30);
      } else {
        quoteResponse = await marketAPI.getStockQuote(asset.symbol);
        historyResponse = await marketAPI.getStockHistory(asset.symbol, '1mo');
      }
      
      setSelectedAsset(quoteResponse.data);
      setAssetHistory(historyResponse.data);
    } catch (error) {
      console.error('Failed to load asset:', error);
    }
  };

  const loadQuote = async (symbol, type) => {
    try {
      let quoteResponse, historyResponse;
      
      if (type === 'crypto') {
        quoteResponse = await marketAPI.getCryptoQuote(symbol);
        historyResponse = await marketAPI.getCryptoHistory(symbol, 30);
      } else {
        quoteResponse = await marketAPI.getStockQuote(symbol);
        historyResponse = await marketAPI.getStockHistory(symbol, '1mo');
      }
      
      setSelectedAsset(quoteResponse.data);
      setAssetHistory(historyResponse.data);
    } catch (error) {
      console.error('Failed to load:', error);
    }
  };

  // Quick access buttons
  const quickAccess = {
    stock: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA'],
    crypto: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE']
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Markets</h1>
        <p className="text-gray-400">Search and explore stocks & crypto</p>
      </div>

      {/* Search */}
      <div className="glass-card p-6">
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search stocks or crypto (e.g., AAPL, BTC)..."
              className="input-field pl-10"
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border border-white/10 rounded-xl overflow-hidden">
            {searchResults.map((result) => (
              <button
                key={`${result.symbol}-${result.asset_type}`}
                onClick={() => selectAsset(result)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                    ${result.asset_type === 'crypto' 
                      ? 'bg-gradient-to-br from-orange-500 to-yellow-500' 
                      : 'bg-gradient-to-br from-primary-500 to-blue-500'
                    }`}
                  >
                    {result.symbol.slice(0, 2)}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{result.symbol}</p>
                    <p className="text-sm text-gray-400">{result.name}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 uppercase">{result.asset_type}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Access */}
        <div className="mt-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'stock' 
                  ? 'bg-primary-500/20 text-primary-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Stocks
            </button>
            <button
              onClick={() => setActiveTab('crypto')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'crypto' 
                  ? 'bg-orange-500/20 text-orange-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Crypto
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {quickAccess[activeTab].map((symbol) => (
              <button
                key={symbol}
                onClick={() => loadQuote(symbol, activeTab)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Asset Details */}
      {selectedAsset && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Asset Info */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg
                ${selectedAsset.asset_type === 'crypto' 
                  ? 'bg-gradient-to-br from-orange-500 to-yellow-500' 
                  : 'bg-gradient-to-br from-primary-500 to-blue-500'
                }`}
              >
                {selectedAsset.symbol.slice(0, 2)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedAsset.symbol}</h2>
                <p className="text-gray-400">{selectedAsset.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold">{formatCurrency(selectedAsset.price)}</p>
                <div className={`flex items-center gap-2 mt-1 ${getChangeColor(selectedAsset.change)}`}>
                  {selectedAsset.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{selectedAsset.change >= 0 ? '+' : ''}{formatCurrency(selectedAsset.change)}</span>
                  <span>({formatPercent(selectedAsset.change_percent)})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                {selectedAsset.high_24h && (
                  <div>
                    <p className="text-sm text-gray-400">24h High</p>
                    <p className="font-medium">{formatCurrency(selectedAsset.high_24h)}</p>
                  </div>
                )}
                {selectedAsset.low_24h && (
                  <div>
                    <p className="text-sm text-gray-400">24h Low</p>
                    <p className="font-medium">{formatCurrency(selectedAsset.low_24h)}</p>
                  </div>
                )}
                {selectedAsset.volume && (
                  <div>
                    <p className="text-sm text-gray-400">Volume</p>
                    <p className="font-medium">${formatCompact(selectedAsset.volume)}</p>
                  </div>
                )}
                {selectedAsset.market_cap && (
                  <div>
                    <p className="text-sm text-gray-400">Market Cap</p>
                    <p className="font-medium">${formatCompact(selectedAsset.market_cap)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price Chart */}
          <div className="lg:col-span-2 glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Price History</h3>
            
            {assetHistory.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={assetHistory}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="#64748b"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `$${formatCompact(value)}`}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [formatCurrency(value), 'Price']}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={assetHistory[0]?.close ? "close" : "price"} 
                      stroke="#0ea5e9" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-400">
                Loading chart...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Markets;
