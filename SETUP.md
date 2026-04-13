# 🚀 QuantumLedger Pro - Local Setup Guide

## Prerequisites

1. **Python 3.9+**
2. **Node.js 18+** 
3. **PostgreSQL** (or use SQLite for testing)

## 📋 Step-by-Step Setup

### 1. Clone & Navigate
```bash
git clone https://github.com/gauthambinoy/quantum-ledger.git
cd quantum-ledger
```

### 2. Backend Setup (Terminal 1)
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

Edit `.env` file:
```
DATABASE_URL=sqlite:///./cryptostock.db
SECRET_KEY=your-super-secret-key-here-make-it-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

```bash
# Run the backend
uvicorn app.main:app --reload
```
✅ Backend running at: **http://localhost:8000**

### 3. Frontend Setup (Terminal 2)
```bash
cd frontend

# Install dependencies
npm install

# Run the frontend
npm run dev
```
✅ Frontend running at: **http://localhost:3000**

### 4. Access the App
- Open: **http://localhost:3000**
- Register a new account
- Start adding stocks/crypto to your portfolio!

## 🌟 Features You Can Test

1. **Register/Login** - Create your account
2. **Dashboard** - See market overview + top gainers
3. **Portfolio** - Add holdings (try AAPL, BTC, etc.)
4. **Markets** - Search any stock/crypto
5. **Top Gainers** - View today's best performers
6. **Alerts** - Set price notifications

## 🔧 Quick Test Data

Try adding these holdings:
- **Stocks:** AAPL, GOOGL, TSLA, MSFT
- **Crypto:** BTC, ETH, SOL, ADA

## 📱 What You'll See

- Beautiful dark theme with glassmorphism
- Real-time price updates
- Interactive charts
- Portfolio allocation pie chart
- Mobile responsive design

## 🛠 Troubleshooting

**Database issues:**
```bash
# Use SQLite for quick testing (no PostgreSQL needed)
DATABASE_URL=sqlite:///./cryptostock.db
```

**Port conflicts:**
- Backend: Change port with `uvicorn app.main:app --port 8001`
- Frontend: Change in `vite.config.js`