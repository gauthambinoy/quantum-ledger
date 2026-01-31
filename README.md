# 📈 CryptoStock Pro

A professional real-time Stock & Cryptocurrency Portfolio Tracker with advanced analytics, secure authentication, and beautiful UI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-green.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)

## ✨ Features

### 📊 Dashboard
- Real-time price updates via WebSocket
- Portfolio value & daily profit/loss
- Top gainers/losers of the day
- Market overview with key indices

### 💼 Portfolio Management
- Add/remove holdings with buy price, quantity, and date
- Track multiple portfolios
- Cost basis & profit/loss per asset
- Total ROI calculation

### 📈 Real-Time Data
- Live price updates (WebSocket streaming)
- Interactive charts (1D, 1W, 1M, 1Y)
- Volume & market cap tracking
- 52-week high/low indicators

### 🔥 Trade Finder
- Today's top gaining stocks
- 24h top gaining crypto
- Volume spike detection
- Trending assets

### 📉 Analytics
- Portfolio allocation charts
- Performance vs benchmark (S&P 500, BTC)
- Historical portfolio value
- Best/worst performers

### 🔔 Alerts
- Price target notifications
- Percentage change alerts
- Daily portfolio summary

### 🔐 Security
- JWT authentication
- Password hashing (bcrypt)
- HTTPS ready
- Rate limiting
- Input validation & sanitization

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TailwindCSS |
| Backend | Python FastAPI |
| Database | PostgreSQL |
| Real-time | WebSockets |
| APIs | Yahoo Finance, CoinGecko |
| Auth | JWT + bcrypt |
| Charts | Recharts |

## 📁 Project Structure

```
cryptostock-pro/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # Database connection
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth.py              # Authentication logic
│   │   ├── routers/
│   │   │   ├── auth.py          # Auth endpoints
│   │   │   ├── portfolio.py     # Portfolio endpoints
│   │   │   ├── market.py        # Market data endpoints
│   │   │   └── alerts.py        # Alert endpoints
│   │   └── services/
│   │       ├── market_data.py   # Stock/crypto data fetching
│   │       └── websocket.py     # Real-time updates
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Helper functions
│   │   ├── styles/              # CSS files
│   │   ├── App.jsx
│   │   └── index.jsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Backend `.env`:
```
DATABASE_URL=postgresql://user:password@localhost/cryptostock
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## 📱 Screenshots

*Coming soon*

## 🔒 Security Features

1. **JWT Authentication**: Secure token-based auth with expiration
2. **Password Hashing**: bcrypt with salt for secure storage
3. **Rate Limiting**: Prevents brute force attacks
4. **Input Validation**: Pydantic schemas validate all input
5. **CORS Protection**: Configurable allowed origins
6. **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Get access token
- `GET /api/auth/me` - Get current user

### Portfolio
- `GET /api/portfolio` - Get user portfolio
- `POST /api/portfolio/holdings` - Add holding
- `DELETE /api/portfolio/holdings/{id}` - Remove holding
- `GET /api/portfolio/performance` - Get performance metrics

### Market
- `GET /api/market/stocks/gainers` - Top gaining stocks
- `GET /api/market/crypto/gainers` - Top gaining crypto
- `GET /api/market/quote/{symbol}` - Get quote
- `WS /api/market/ws` - Real-time price stream

### Alerts
- `GET /api/alerts` - Get user alerts
- `POST /api/alerts` - Create alert
- `DELETE /api/alerts/{id}` - Delete alert

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 👨‍💻 Author

**Gautham Binoy**

---

Built with ❤️ and ☕
