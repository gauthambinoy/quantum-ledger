"""
Historical data fetcher - Downloads and caches historical prices
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
import yfinance as yf
import pandas as pd
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from .. import models

logger = logging.getLogger(__name__)


class HistoricalDataFetcher:
    """Fetch and cache historical price data from multiple sources"""

    # CoinGecko cryptocurrency IDs
    CRYPTO_COINGECKO_IDS = {
        "BTC": "bitcoin",
        "ETH": "ethereum",
        "BNB": "binancecoin",
        "XRP": "ripple",
        "ADA": "cardano",
        "SOL": "solana",
        "DOGE": "dogecoin",
        "MATIC": "matic-network",
        "LINK": "chainlink",
        "UNI": "uniswap",
    }

    def __init__(self):
        self.client = httpx.Client()

    async def fetch_stock_history(
        self, symbol: str, days: int = 5 * 365, db: Session = None
    ) -> pd.DataFrame:
        """
        Fetch stock historical data using yfinance
        Args:
            symbol: Stock symbol (e.g., AAPL)
            days: Number of days of history to fetch (default 5 years)
            db: Database session for caching
        Returns:
            DataFrame with OHLCV data
        """
        try:
            # Check cache first if db provided
            if db:
                cached_data = self._get_cached_prices(symbol, "stock", days, db)
                if len(cached_data) > 0:
                    logger.info(f"Using cached data for {symbol}")
                    return cached_data

            # Fetch from yfinance
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)

            ticker = yf.Ticker(symbol)
            df = ticker.history(start=start_date, end=end_date)

            if df.empty:
                logger.error(f"No data found for {symbol}")
                return pd.DataFrame()

            # Normalize columns
            df = df[["Open", "High", "Low", "Close", "Volume"]]
            df.columns = ["open", "high", "low", "close", "volume"]
            df.index.name = "date"
            df = df.reset_index()

            # Cache if db provided
            if db:
                self._cache_prices(symbol, "stock", df, db)

            return df

        except Exception as e:
            logger.error(f"Error fetching stock history for {symbol}: {e}")
            return pd.DataFrame()

    async def fetch_crypto_history(
        self, symbol: str, days: int = 5 * 365, db: Session = None
    ) -> pd.DataFrame:
        """
        Fetch cryptocurrency historical data using CoinGecko
        Args:
            symbol: Crypto symbol (e.g., BTC, ETH)
            days: Number of days of history to fetch
            db: Database session for caching
        Returns:
            DataFrame with OHLCV data
        """
        try:
            # Check cache first if db provided
            if db:
                cached_data = self._get_cached_prices(symbol, "crypto", days, db)
                if len(cached_data) > 0:
                    logger.info(f"Using cached crypto data for {symbol}")
                    return cached_data

            # Get CoinGecko ID
            coin_id = self.CRYPTO_COINGECKO_IDS.get(symbol)
            if not coin_id:
                logger.error(f"Unknown cryptocurrency: {symbol}")
                return pd.DataFrame()

            # Fetch from CoinGecko
            url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
            params = {
                "vs_currency": "usd",
                "days": min(days, 365 * 4),  # API limit is ~4 years at daily granularity
                "interval": "daily"
            }

            response = self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            # Parse prices (CoinGecko returns [timestamp_ms, price])
            prices = data.get("prices", [])

            if not prices:
                logger.error(f"No price data found for {symbol}")
                return pd.DataFrame()

            # For simplicity, use close price for OHLC
            # (CoinGecko free tier doesn't provide full OHLC)
            df_data = []
            for timestamp_ms, price in prices:
                date = datetime.fromtimestamp(timestamp_ms / 1000)
                df_data.append({
                    "date": date,
                    "open": price,
                    "high": price,
                    "low": price,
                    "close": price,
                    "volume": 0  # Not available from free API
                })

            df = pd.DataFrame(df_data)

            # Cache if db provided
            if db:
                self._cache_prices(symbol, "crypto", df, db)

            return df

        except Exception as e:
            logger.error(f"Error fetching crypto history for {symbol}: {e}")
            return pd.DataFrame()

    def _get_cached_prices(
        self, symbol: str, asset_type: str, days: int, db: Session
    ) -> pd.DataFrame:
        """Get cached prices from database"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days)

            query = db.query(models.HistoricalPrice).filter(
                and_(
                    models.HistoricalPrice.symbol == symbol,
                    models.HistoricalPrice.asset_type == asset_type,
                    models.HistoricalPrice.date >= cutoff_date
                )
            ).order_by(models.HistoricalPrice.date)

            prices = query.all()

            if not prices:
                return pd.DataFrame()

            data = []
            for price in prices:
                data.append({
                    "date": price.date,
                    "open": price.open,
                    "high": price.high,
                    "low": price.low,
                    "close": price.close,
                    "volume": price.volume
                })

            return pd.DataFrame(data)

        except Exception as e:
            logger.error(f"Error retrieving cached prices: {e}")
            return pd.DataFrame()

    def _cache_prices(self, symbol: str, asset_type: str, df: pd.DataFrame, db: Session):
        """Cache prices to database"""
        try:
            # Clear old data for this symbol
            db.query(models.HistoricalPrice).filter(
                and_(
                    models.HistoricalPrice.symbol == symbol,
                    models.HistoricalPrice.asset_type == asset_type
                )
            ).delete()
            db.commit()

            # Insert new data
            for _, row in df.iterrows():
                price_record = models.HistoricalPrice(
                    symbol=symbol,
                    asset_type=asset_type,
                    date=pd.to_datetime(row["date"]),
                    open=float(row["open"]),
                    high=float(row["high"]),
                    low=float(row["low"]),
                    close=float(row["close"]),
                    volume=float(row.get("volume", 0))
                )
                db.add(price_record)

            db.commit()
            logger.info(f"Cached {len(df)} prices for {symbol}")

        except Exception as e:
            logger.error(f"Error caching prices: {e}")
            db.rollback()

    def get_cached_or_fetch(
        self, symbol: str, asset_type: str, days: int = 5 * 365, db: Session = None
    ) -> pd.DataFrame:
        """
        Synchronous wrapper for getting cached or fetching data
        """
        import asyncio
        loop = asyncio.new_event_loop()
        try:
            if asset_type == "stock":
                return loop.run_until_complete(self.fetch_stock_history(symbol, days, db))
            else:  # crypto
                return loop.run_until_complete(self.fetch_crypto_history(symbol, days, db))
        finally:
            loop.close()
