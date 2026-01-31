import React from 'react';
import { formatCurrency, formatPercent, formatNumber, getChangeColor, formatDate } from '../utils/helpers';
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react';

const HoldingRow = ({ 
  holding,
  onDelete
}) => {
  const { 
    symbol, 
    name, 
    quantity, 
    buy_price, 
    buy_date,
    current_price, 
    current_value, 
    gain_loss, 
    gain_loss_percent,
    asset_type 
  } = holding;
  
  const isPositive = gain_loss >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <tr className="table-row">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
            ${asset_type === 'crypto' 
              ? 'bg-gradient-to-br from-orange-500 to-yellow-500' 
              : 'bg-gradient-to-br from-primary-500 to-blue-500'
            }`}
          >
            {symbol.slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold">{symbol}</p>
            <p className="text-xs text-gray-400 truncate max-w-[150px]">{name}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <p className="font-medium">{formatNumber(quantity, 4)}</p>
      </td>
      <td className="px-4 py-4 text-right">
        <p>{formatCurrency(buy_price)}</p>
        <p className="text-xs text-gray-400">{formatDate(buy_date)}</p>
      </td>
      <td className="px-4 py-4 text-right">
        <p className="font-medium">{formatCurrency(current_price)}</p>
      </td>
      <td className="px-4 py-4 text-right">
        <p className="font-semibold">{formatCurrency(current_value)}</p>
      </td>
      <td className="px-4 py-4 text-right">
        <div className={`flex items-center gap-1 justify-end ${getChangeColor(gain_loss)}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="font-medium">{formatCurrency(Math.abs(gain_loss))}</span>
        </div>
        <p className={`text-sm ${getChangeColor(gain_loss_percent)}`}>
          {formatPercent(gain_loss_percent)}
        </p>
      </td>
      <td className="px-4 py-4 text-right">
        <button 
          onClick={() => onDelete(holding.id)}
          className="p-2 text-gray-400 hover:text-danger-400 hover:bg-danger-500/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export default HoldingRow;
