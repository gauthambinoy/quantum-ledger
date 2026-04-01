"""
Backtesting service - Core backtesting and analysis engine
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import json
import pandas as pd
import numpy as np
from scipy import stats
from sqlalchemy.orm import Session
from .. import models
from .historical_fetcher import HistoricalDataFetcher

logger = logging.getLogger(__name__)


class BacktestService:
    """Service for running backtests and calculating performance metrics"""

    def __init__(self):
        self.fetcher = HistoricalDataFetcher()

    def backtest_strategy(
        self,
        symbol: str,
        asset_type: str,
        start_date: datetime,
        end_date: datetime,
        strategy: str = "buy_and_hold",
        db: Session = None
    ) -> Dict:
        """
        Run a backtest on a symbol with specified strategy
        Args:
            symbol: Asset symbol (e.g., AAPL, BTC)
            asset_type: 'stock' or 'crypto'
            start_date: Start date for backtest
            end_date: End date for backtest
            strategy: Strategy type ('buy_and_hold', 'sma_crossover', etc.)
            db: Database session
        Returns:
            Dictionary with backtest results
        """
        try:
            # Fetch historical data
            days = (end_date - start_date).days + 30  # Extra days for warmup
            df = self.fetcher.get_cached_or_fetch(symbol, asset_type, days, db)

            if df.empty:
                return {
                    "error": f"No data found for {symbol}",
                    "symbol": symbol
                }

            # Filter to date range
            df["date"] = pd.to_datetime(df["date"])
            df = df[(df["date"] >= start_date) & (df["date"] <= end_date)].copy()

            if df.empty:
                return {
                    "error": f"No data in date range for {symbol}",
                    "symbol": symbol
                }

            # Apply strategy
            if strategy == "buy_and_hold":
                trades, equity_curve = self._buy_and_hold_strategy(df)
            elif strategy == "sma_crossover":
                trades, equity_curve = self._sma_crossover_strategy(df)
            else:
                return {"error": f"Unknown strategy: {strategy}"}

            # Calculate metrics
            returns = self._calculate_returns(equity_curve)
            sharpe = self.calculate_sharpe_ratio(returns)
            max_dd = self.calculate_max_drawdown(equity_curve)
            win_rate = self.calculate_win_rate(trades)
            total_return = ((equity_curve[-1] - 1) * 100) if len(equity_curve) > 0 else 0

            # Annual return
            days_in_backtest = (end_date - start_date).days
            years = days_in_backtest / 365.25
            annual_return = (((equity_curve[-1] - 1) ** (1 / years)) - 1) * 100 if years > 0 else 0

            # Get benchmark comparison
            benchmark_result = self.compare_to_benchmark(returns, "SPY", asset_type, start_date, end_date, db)

            # Monte Carlo simulation
            monte_carlo = self.monte_carlo_simulation(returns, num_simulations=1000)

            # Monthly returns heatmap
            monthly_returns = self._calculate_monthly_returns(df, equity_curve)

            return {
                "symbol": symbol,
                "asset_type": asset_type,
                "strategy": strategy,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "total_return_percent": round(total_return, 2),
                "annual_return_percent": round(annual_return, 2),
                "sharpe_ratio": round(sharpe, 4),
                "max_drawdown_percent": round(max_dd, 2),
                "win_rate_percent": round(win_rate * 100, 2),
                "total_trades": len(trades),
                "equity_curve": equity_curve,
                "trades": trades,
                "benchmark_return_percent": round(benchmark_result.get("benchmark_return", 0), 2),
                "outperformance_percent": round(benchmark_result.get("outperformance", 0), 2),
                "monthly_returns": monthly_returns,
                "monte_carlo_stats": monte_carlo
            }

        except Exception as e:
            logger.error(f"Error running backtest: {e}")
            return {
                "error": str(e),
                "symbol": symbol
            }

    def _buy_and_hold_strategy(self, df: pd.DataFrame) -> Tuple[List[Dict], List[float]]:
        """
        Simple buy and hold strategy
        Returns: (trades, equity_curve)
        """
        if df.empty:
            return [], []

        df = df.sort_values("date").reset_index(drop=True)
        initial_price = df.iloc[0]["close"]

        # Single trade: buy at start, sell at end
        trades = [{
            "entry_date": df.iloc[0]["date"].strftime("%Y-%m-%d"),
            "exit_date": df.iloc[-1]["date"].strftime("%Y-%m-%d"),
            "entry_price": initial_price,
            "exit_price": df.iloc[-1]["close"],
            "return_percent": ((df.iloc[-1]["close"] - initial_price) / initial_price) * 100,
            "duration_days": (df.iloc[-1]["date"] - df.iloc[0]["date"]).days
        }]

        # Equity curve (normalized to 1.0 at start)
        equity_curve = (df["close"] / initial_price).tolist()

        return trades, equity_curve

    def _sma_crossover_strategy(self, df: pd.DataFrame, fast: int = 20, slow: int = 50) -> Tuple[List[Dict], List[float]]:
        """
        SMA Crossover strategy: Buy when fast > slow, Sell when fast < slow
        """
        if len(df) < slow:
            return [], []

        df = df.sort_values("date").reset_index(drop=True)
        df["sma_fast"] = df["close"].rolling(window=fast).mean()
        df["sma_slow"] = df["close"].rolling(window=slow).mean()

        initial_price = df.iloc[0]["close"]
        initial_capital = 1.0
        position = False
        entry_price = 0
        entry_date = None
        trades = []

        equity_values = [initial_capital]

        for i in range(1, len(df)):
            current_price = df.iloc[i]["close"]

            # Check for signals
            if df.iloc[i]["sma_fast"] > df.iloc[i]["sma_slow"] and not position:
                # Buy signal
                position = True
                entry_price = current_price
                entry_date = df.iloc[i]["date"]

            elif df.iloc[i]["sma_fast"] < df.iloc[i]["sma_slow"] and position:
                # Sell signal
                position = False
                trade_return = ((current_price - entry_price) / entry_price)
                trades.append({
                    "entry_date": entry_date.strftime("%Y-%m-%d"),
                    "exit_date": df.iloc[i]["date"].strftime("%Y-%m-%d"),
                    "entry_price": entry_price,
                    "exit_price": current_price,
                    "return_percent": trade_return * 100,
                    "duration_days": (df.iloc[i]["date"] - entry_date).days
                })
                initial_capital *= (1 + trade_return)

            # Track equity
            if position:
                current_equity = initial_capital * (current_price / entry_price)
            else:
                current_equity = initial_capital

            equity_values.append(current_equity)

        equity_curve = equity_values
        return trades, equity_curve

    def _calculate_returns(self, equity_curve: List[float]) -> np.ndarray:
        """Calculate daily returns from equity curve"""
        if len(equity_curve) < 2:
            return np.array([0])

        equity_array = np.array(equity_curve)
        returns = np.diff(equity_array) / equity_array[:-1]
        return returns

    def calculate_sharpe_ratio(self, returns: np.ndarray, risk_free_rate: float = 0.02) -> float:
        """
        Calculate Sharpe Ratio
        """
        if len(returns) < 2:
            return 0.0

        excess_returns = returns - (risk_free_rate / 252)  # 252 trading days
        if np.std(excess_returns) == 0:
            return 0.0

        sharpe = np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)
        return float(sharpe)

    def calculate_max_drawdown(self, equity_curve: List[float]) -> float:
        """
        Calculate maximum drawdown percentage
        """
        if len(equity_curve) < 2:
            return 0.0

        equity_array = np.array(equity_curve)
        cummax = np.maximum.accumulate(equity_array)
        drawdown = (equity_array - cummax) / cummax

        return float(np.min(drawdown) * 100)

    def calculate_win_rate(self, trades: List[Dict]) -> float:
        """
        Calculate win rate (percentage of profitable trades)
        """
        if len(trades) == 0:
            return 0.0

        winning_trades = sum(1 for trade in trades if trade.get("return_percent", 0) > 0)
        return winning_trades / len(trades)

    def compare_to_benchmark(
        self,
        returns: np.ndarray,
        benchmark: str = "SPY",
        asset_type: str = "stock",
        start_date: datetime = None,
        end_date: datetime = None,
        db: Session = None
    ) -> Dict:
        """
        Compare strategy returns to benchmark (S&P 500 or similar)
        """
        try:
            if start_date is None:
                start_date = datetime.now() - timedelta(days=365*5)
            if end_date is None:
                end_date = datetime.now()

            # Fetch benchmark data
            bench_df = self.fetcher.get_cached_or_fetch(benchmark, "stock",
                                                        (end_date - start_date).days, db)

            if bench_df.empty:
                return {"benchmark_return": 0, "outperformance": 0}

            bench_df["date"] = pd.to_datetime(bench_df["date"])
            bench_df = bench_df[(bench_df["date"] >= start_date) & (bench_df["date"] <= end_date)]

            if bench_df.empty:
                return {"benchmark_return": 0, "outperformance": 0}

            bench_prices = bench_df["close"].values
            benchmark_return = ((bench_prices[-1] - bench_prices[0]) / bench_prices[0]) * 100

            # Strategy return
            strategy_return = ((np.prod(1 + returns) - 1) * 100) if len(returns) > 0 else 0

            outperformance = strategy_return - benchmark_return

            return {
                "benchmark_symbol": benchmark,
                "benchmark_return": benchmark_return,
                "strategy_return": strategy_return,
                "outperformance": outperformance
            }

        except Exception as e:
            logger.error(f"Error comparing to benchmark: {e}")
            return {"benchmark_return": 0, "outperformance": 0}

    def monte_carlo_simulation(
        self, returns: np.ndarray, num_simulations: int = 1000, time_horizon_years: float = 1
    ) -> Dict:
        """
        Run Monte Carlo simulation on returns
        Returns worst case, median, and best case scenarios
        """
        try:
            if len(returns) < 2:
                return {
                    "worst_case": 0,
                    "median": 0,
                    "best_case": 0,
                    "std_dev": 0
                }

            # Calculate parameters
            mean_return = np.mean(returns)
            std_return = np.std(returns)

            # Simulate future paths
            num_days = int(time_horizon_years * 252)  # 252 trading days per year
            simulations = np.zeros((num_simulations, num_days))

            for i in range(num_simulations):
                sim_returns = np.random.normal(mean_return, std_return, num_days)
                cumulative_return = np.prod(1 + sim_returns) - 1
                simulations[i, :] = cumulative_return * 100

            final_returns = simulations[:, -1]

            return {
                "worst_case": float(np.percentile(final_returns, 5)),
                "median": float(np.median(final_returns)),
                "best_case": float(np.percentile(final_returns, 95)),
                "std_dev": float(np.std(final_returns))
            }

        except Exception as e:
            logger.error(f"Error in Monte Carlo simulation: {e}")
            return {
                "worst_case": 0,
                "median": 0,
                "best_case": 0,
                "std_dev": 0
            }

    def _calculate_monthly_returns(self, df: pd.DataFrame, equity_curve: List[float]) -> Dict:
        """
        Calculate monthly returns for heatmap
        Returns dict: {year: {month: return_percent}}
        """
        try:
            if len(df) < 2 or len(equity_curve) < 2:
                return {}

            df = df.copy()
            df["date"] = pd.to_datetime(df["date"])
            df["equity"] = equity_curve

            monthly_returns = {}

            for year in df["date"].dt.year.unique():
                year_data = df[df["date"].dt.year == year]
                monthly_returns[str(year)] = {}

                for month in range(1, 13):
                    month_data = year_data[year_data["date"].dt.month == month]
                    if len(month_data) > 0:
                        month_return = (
                            (month_data["equity"].iloc[-1] - month_data["equity"].iloc[0])
                            / month_data["equity"].iloc[0] * 100
                        )
                        monthly_returns[str(year)][str(month)] = round(month_return, 2)

            return monthly_returns

        except Exception as e:
            logger.error(f"Error calculating monthly returns: {e}")
            return {}

    def save_backtest_results(self, user_id: int, results: Dict, db: Session) -> models.Backtest:
        """Save backtest results to database"""
        try:
            if "error" in results:
                return None

            backtest = models.Backtest(
                user_id=user_id,
                symbol=results["symbol"],
                asset_type=results["asset_type"],
                start_date=datetime.fromisoformat(results["start_date"]),
                end_date=datetime.fromisoformat(results["end_date"]),
                strategy=results.get("strategy", "buy_and_hold"),
                total_return_percent=results["total_return_percent"],
                annual_return_percent=results["annual_return_percent"],
                sharpe_ratio=results["sharpe_ratio"],
                max_drawdown_percent=results["max_drawdown_percent"],
                win_rate_percent=results["win_rate_percent"],
                total_trades=results["total_trades"],
                benchmark_symbol="SPY",
                benchmark_return_percent=results.get("benchmark_return_percent"),
                outperformance_percent=results.get("outperformance_percent"),
                equity_curve=json.dumps(results.get("equity_curve", [])),
                trades=json.dumps(results.get("trades", [])),
                monthly_returns=json.dumps(results.get("monthly_returns", {})),
                monte_carlo_stats=json.dumps(results.get("monte_carlo_stats", {}))
            )

            db.add(backtest)
            db.commit()
            db.refresh(backtest)

            return backtest

        except Exception as e:
            logger.error(f"Error saving backtest results: {e}")
            db.rollback()
            return None

    def get_backtest(self, backtest_id: int, db: Session) -> Optional[models.Backtest]:
        """Get backtest by ID"""
        return db.query(models.Backtest).filter(models.Backtest.id == backtest_id).first()

    def get_user_backtests(self, user_id: int, limit: int = 20, db: Session = None) -> List[models.Backtest]:
        """Get user's backtests"""
        if db is None:
            return []

        return db.query(models.Backtest).filter(
            models.Backtest.user_id == user_id
        ).order_by(models.Backtest.created_at.desc()).limit(limit).all()


# Global instance
_backtest_service = None


def get_backtest_service() -> BacktestService:
    """Get or create backtest service instance"""
    global _backtest_service
    if _backtest_service is None:
        _backtest_service = BacktestService()
    return _backtest_service
