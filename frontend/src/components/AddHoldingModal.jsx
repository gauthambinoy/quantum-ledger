import React, { useState } from 'react';
import { X, Search, Bitcoin, BarChart3 } from 'lucide-react';
import { marketAPI } from '../utils/api';

const AddHoldingModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    asset_type: 'stock',
    quantity: '',
    buy_price: '',
    buy_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (query) => {
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await marketAPI.search(query, formData.asset_type);
      setSearchResults(response.data.slice(0, 5));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectAsset = (asset) => {
    setFormData({
      ...formData,
      symbol: asset.symbol,
      name: asset.name
    });
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.symbol || !formData.quantity || !formData.buy_price) {
      setError('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const success = await onAdd({
        ...formData,
        quantity: parseFloat(formData.quantity),
        buy_price: parseFloat(formData.buy_price),
        buy_date: new Date(formData.buy_date).toISOString()
      });
      
      if (success) {
        onClose();
        setFormData({
          symbol: '',
          name: '',
          asset_type: 'stock',
          quantity: '',
          buy_price: '',
          buy_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
      } else {
        setError('Failed to add holding');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">Add Holding</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Asset Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, asset_type: 'stock' })}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                formData.asset_type === 'stock'
                  ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, asset_type: 'crypto' })}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                formData.asset_type === 'crypto'
                  ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <Bitcoin className="w-5 h-5" />
              <span>Crypto</span>
            </button>
          </div>

          {/* Symbol Search */}
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">Symbol *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => {
                  setFormData({ ...formData, symbol: e.target.value.toUpperCase() });
                  handleSearch(e.target.value);
                }}
                placeholder="Search symbol..."
                className="input-field pl-10"
              />
            </div>
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute w-full mt-2 glass-card py-2 z-10">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    type="button"
                    onClick={() => selectAsset(result)}
                    className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                  >
                    <span className="font-medium">{result.symbol}</span>
                    <span className="text-gray-400 ml-2">{result.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Quantity *</label>
              <input
                type="number"
                step="any"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0.00"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Buy Price (USD) *</label>
              <input
                type="number"
                step="any"
                value={formData.buy_price}
                onChange={(e) => setFormData({ ...formData, buy_price: e.target.value })}
                placeholder="0.00"
                className="input-field"
              />
            </div>
          </div>

          {/* Buy Date */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Buy Date</label>
            <input
              type="date"
              value={formData.buy_date}
              onChange={(e) => setFormData({ ...formData, buy_date: e.target.value })}
              className="input-field"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {error && (
            <p className="text-danger-400 text-sm">{error}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Holding'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddHoldingModal;
