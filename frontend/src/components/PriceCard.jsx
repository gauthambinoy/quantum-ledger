import React from 'react';
import { formatCurrency, formatPercent, getChangeColor, formatCompact } from '../utils/helpers';
import { TrendingUp, TrendingDown } from 'lucide-react';

const PriceCard = ({ 
  symbol, 
  name, 
  price, 
  change, 
  changePercent,
  volume,
  marketCap,
  assetType,
  onClick
}) => {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <div 
      onClick={onClick}
      className="glass-card-hover p-4 cursor-pointer animate-fade-in"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
            ${assetType === 'crypto' 
              ? 'bg-gradient-to-br from-orange-500 to-yellow-500' 
              : 'bg-gradient-to-br from-primary-500 to-blue-500'
            }`}
          >
            {symbol.slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold">{symbol}</p>
            <p className="text-xs text-gray-400 truncate max-w-[120px]">{name}</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="font-bold">{formatCurrency(price)}</p>
          <div className={`flex items-center gap-1 justify-end ${getChangeColor(change)}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-sm">{formatPercent(changePercent)}</span>
          </div>
        </div>
      </div>
      
      {(volume || marketCap) && (
        <div className="flex justify-between text-xs text-gray-400 pt-3 border-t border-white/5">
          {volume && (
            <span>Vol: ${formatCompact(volume)}</span>
          )}
          {marketCap && (
            <span>MCap: ${formatCompact(marketCap)}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default PriceCard;
