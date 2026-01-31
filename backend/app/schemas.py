"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============== Enums ==============

class AssetType(str, Enum):
    STOCK = "stock"
    CRYPTO = "crypto"


class AlertType(str, Enum):
    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    PERCENT_CHANGE = "percent_change"


# ============== Auth Schemas ==============

class UserCreate(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT Token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded token data"""
    user_id: Optional[int] = None


# ============== Portfolio Schemas ==============

class PortfolioCreate(BaseModel):
    """Schema for creating a portfolio"""
    name: str = Field(default="Main Portfolio", max_length=100)


class PortfolioResponse(BaseModel):
    """Schema for portfolio response"""
    id: int
    name: str
    created_at: datetime
    total_value: Optional[float] = None
    total_gain_loss: Optional[float] = None
    total_gain_loss_percent: Optional[float] = None
    
    class Config:
        from_attributes = True


# ============== Holding Schemas ==============

class HoldingCreate(BaseModel):
    """Schema for adding a holding"""
    symbol: str = Field(..., max_length=20)
    name: Optional[str] = None
    asset_type: AssetType
    quantity: float = Field(..., gt=0)
    buy_price: float = Field(..., gt=0)
    buy_date: datetime
    notes: Optional[str] = Field(None, max_length=500)


class HoldingUpdate(BaseModel):
    """Schema for updating a holding"""
    quantity: Optional[float] = Field(None, gt=0)
    buy_price: Optional[float] = Field(None, gt=0)
    buy_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)


class HoldingResponse(BaseModel):
    """Schema for holding response with current data"""
    id: int
    symbol: str
    name: Optional[str]
    asset_type: AssetType
    quantity: float
    buy_price: float
    buy_date: datetime
    notes: Optional[str]
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    gain_loss: Optional[float] = None
    gain_loss_percent: Optional[float] = None
    
    class Config:
        from_attributes = True


# ============== Market Data Schemas ==============

class QuoteResponse(BaseModel):
    """Schema for price quote response"""
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    asset_type: AssetType


class GainerResponse(BaseModel):
    """Schema for top gainer/loser"""
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    asset_type: AssetType


class MarketOverview(BaseModel):
    """Schema for market overview data"""
    sp500: Optional[QuoteResponse] = None
    nasdaq: Optional[QuoteResponse] = None
    btc: Optional[QuoteResponse] = None
    eth: Optional[QuoteResponse] = None
    top_stock_gainers: List[GainerResponse] = []
    top_crypto_gainers: List[GainerResponse] = []


# ============== Alert Schemas ==============

class AlertCreate(BaseModel):
    """Schema for creating an alert"""
    symbol: str = Field(..., max_length=20)
    asset_type: AssetType
    alert_type: AlertType
    target_value: float


class AlertResponse(BaseModel):
    """Schema for alert response"""
    id: int
    symbol: str
    asset_type: AssetType
    alert_type: AlertType
    target_value: float
    is_active: bool
    is_triggered: bool
    triggered_at: Optional[datetime]
    created_at: datetime
    current_price: Optional[float] = None
    
    class Config:
        from_attributes = True


# ============== Performance Schemas ==============

class PerformanceData(BaseModel):
    """Schema for portfolio performance data"""
    date: datetime
    value: float


class PortfolioPerformance(BaseModel):
    """Schema for detailed portfolio performance"""
    total_invested: float
    current_value: float
    total_gain_loss: float
    total_gain_loss_percent: float
    best_performer: Optional[HoldingResponse] = None
    worst_performer: Optional[HoldingResponse] = None
    allocation: dict  # symbol -> percentage
    history: List[PerformanceData] = []
