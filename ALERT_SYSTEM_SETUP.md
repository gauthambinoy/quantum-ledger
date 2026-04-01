# AssetPulse Email/SMS Alerts System - Setup Guide

## Overview

The Email/SMS Alerts system provides users with real-time notifications for price movements, daily market digests, and sentiment changes. The system includes:

- **Email Service**: SendGrid integration with HTML templates
- **SMS Service**: Twilio integration for critical alerts (premium users only)
- **Scheduler**: APScheduler for background jobs
- **API Endpoints**: Full CRUD operations with notification preferences
- **Frontend UI**: Enhanced alert creation and management

---

## Prerequisites

### External Services

1. **SendGrid Account** (for email)
   - Create account at https://sendgrid.com
   - Generate API key from Settings → API Keys
   - Verify sender email address

2. **Twilio Account** (for SMS)
   - Create account at https://www.twilio.com
   - Get Account SID and Auth Token from Console
   - Purchase or verify phone number for sending SMS

### Database Migrations

Run these migrations to add new columns:

```sql
-- Add columns to users table
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;

-- Add columns to alerts table
ALTER TABLE alerts ADD COLUMN notify_email BOOLEAN DEFAULT TRUE;
ALTER TABLE alerts ADD COLUMN notify_sms BOOLEAN DEFAULT FALSE;
ALTER TABLE alerts ADD COLUMN frequency VARCHAR(20) DEFAULT 'immediately';
```

---

## Installation & Configuration

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

The following packages were added:
- `sendgrid==6.11.0`
- `twilio==9.0.4`
- `apscheduler==3.10.4`
- `pytz==2024.1`

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# Email Service (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@assetpulse.ai

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # E.164 format (country code required)
```

### 3. Update User Model

When creating users, add optional fields:

```python
# In signup/user creation
user.phone_number = None  # Optional
user.is_premium = False   # Default
```

---

## API Documentation

### Create Alert with Notifications

**Endpoint:** `POST /api/alerts`

**Request Body:**
```json
{
  "symbol": "AAPL",
  "asset_type": "stock",
  "alert_type": "price_above",
  "target_value": 185.50,
  "notify_email": true,
  "notify_sms": false,
  "frequency": "immediately"
}
```

**Parameters:**
- `symbol`: Stock/crypto symbol (required)
- `asset_type`: "stock" or "crypto" (required)
- `alert_type`: "price_above", "price_below", or "percent_change" (required)
- `target_value`: Price threshold (required)
- `notify_email`: Send email alerts (default: true)
- `notify_sms`: Send SMS alerts - premium only (default: false)
- `frequency`: "immediately", "daily", "weekly", or "never" (default: "immediately")

**Response:**
```json
{
  "id": 1,
  "symbol": "AAPL",
  "asset_type": "stock",
  "alert_type": "price_above",
  "target_value": 185.50,
  "is_active": true,
  "is_triggered": false,
  "notify_email": true,
  "notify_sms": false,
  "frequency": "immediately",
  "created_at": "2026-04-02T10:30:00Z",
  "current_price": 184.25
}
```

### Update Alert Settings

**Endpoint:** `PUT /api/alerts/{alert_id}`

**Request Body (all optional):**
```json
{
  "target_value": 190.00,
  "notify_email": true,
  "notify_sms": true,
  "frequency": "daily",
  "is_active": true
}
```

### Get All Alerts

**Endpoint:** `GET /api/alerts?active_only=true`

Returns all user's alerts with current prices and notification settings.

### Delete Alert

**Endpoint:** `DELETE /api/alerts/{alert_id}`

### Send Daily Digest (Manual)

**Endpoint:** `POST /api/alerts/send-digest`

Sends a daily market digest email to the current user. Normally sent automatically at 8 AM UTC.

---

## How It Works

### Email Alerts

1. **Trigger**: Price alert matches condition OR scheduled digest time
2. **Validation**: Check user preferences (notify_email = true)
3. **Template**: Render HTML email with SendGrid
4. **Send**: Queue through SendGrid API
5. **Result**: HTML email delivered to user inbox

**Email Types:**
- Price Alert: Current/target prices, trigger direction
- Daily Digest: Top 5 opportunities with sentiment analysis
- Price Movement: Significant moves (>5% change)
- Sentiment Spike: Market sentiment changes

### SMS Alerts

1. **Trigger**: Price alert matches condition (SMS only for critical)
2. **Validation**: 
   - Check SMS enabled (notify_sms = true)
   - Verify user is premium (is_premium = true)
   - Validate phone number format
3. **Message**: Create concise SMS (160 char)
4. **Send**: Queue through Twilio API
5. **Result**: SMS delivered to user phone

**SMS Types:**
- Price Alert: Price above/below target
- Critical SMS: Major price moves, sentiment spikes
- Portfolio Alert: Generic alerts

### Background Scheduler

The scheduler runs three periodic jobs:

**1. Daily Digest (8 AM UTC)**
```
- Query users with daily frequency alerts
- Fetch top 5 opportunities
- Send email via SendGrid
```

**2. Price Alert Checker (Every 5 minutes)**
```
- Check all active, untriggered alerts
- Compare current price to target
- If triggered:
  - Send email (if enabled)
  - Send SMS (if enabled + premium)
  - Mark alert as triggered
  - Respect frequency setting
```

**3. Sentiment Spike (Every 10 minutes)**
```
- Check for sentiment changes
- Send alerts for spikes
- Ready for sentiment integration
```

---

## Frontend Usage

### Create Alert Modal

Users can create alerts with:
1. Choose asset type (Stock/Crypto)
2. Enter symbol
3. Select alert type (Above/Below)
4. Set target price
5. **[NEW]** Toggle email notifications
6. **[NEW]** Toggle SMS notifications (shows "Premium" label)
7. **[NEW]** Select frequency (Immediately/Daily/Weekly/Never)

### Alert List Display

Each alert shows:
- Asset symbol and type
- Alert condition (price above/below target)
- Current price
- Created date
- **[NEW]** Notification badges:
  - 📧 Email (if enabled)
  - 📱 SMS (if enabled)
- **[NEW]** Frequency setting
- Delete button

### Premium Features

SMS notifications show a "Premium" badge, indicating the feature is only for paid subscribers.

---

## Testing

### Test Email Service

```python
from backend.app.services.email_service import get_email_service

email_service = get_email_service()

# Test alert email
await email_service.send_alert_email(
    to_email="test@example.com",
    alert_type="price_above",
    symbol="AAPL",
    asset_type="stock",
    current_price=184.25,
    target_price=185.50,
    trigger_type="above"
)

# Test digest email
await email_service.send_daily_digest(
    to_email="test@example.com",
    user_name="Test User",
    opportunities=[...],
    market_summary={...}
)
```

### Test SMS Service

```python
from backend.app.services.sms_service import get_sms_service

sms_service = get_sms_service()

# Test SMS (premium user only)
await sms_service.send_critical_sms(
    phone_number="+1234567890",
    symbol="AAPL",
    message_type="price_crash",
    details="Down 10%",
    is_premium_user=True
)
```

### Test Scheduler

```python
from backend.app.tasks.alert_scheduler import get_scheduler

scheduler = get_scheduler()

# Manually trigger daily digest
await scheduler._daily_digest_job()

# Manually check alerts
await scheduler._check_price_alerts_job()
```

---

## Monitoring & Debugging

### Check Scheduler Status

```python
from backend.app.tasks.alert_scheduler import get_scheduler

scheduler = get_scheduler()
print(f"Scheduler running: {scheduler.scheduler.running}")
print(f"Jobs: {scheduler.scheduler.get_jobs()}")
```

### View Logs

The system logs to stdout. Look for:
- `Alert scheduler started successfully`
- `Sending daily digest to [email]`
- `Alert email sent to [email]`
- `Critical SMS sent to [phone]`
- Error messages with traceback

### Database Queries

Check triggered alerts:
```sql
SELECT id, symbol, target_value, current_price, is_triggered, triggered_at
FROM alerts
WHERE is_triggered = TRUE
ORDER BY triggered_at DESC
LIMIT 10;
```

Check SMS-enabled users:
```sql
SELECT id, email, phone_number, is_premium
FROM users
WHERE is_premium = TRUE AND phone_number IS NOT NULL;
```

---

## Troubleshooting

### "Email service not configured" warning

**Problem**: SendGrid API key not set
**Solution**: 
```bash
export SENDGRID_API_KEY=your_key
# Or add to .env file
```

### "SMS service not configured" warning

**Problem**: Twilio credentials not set
**Solution**:
```bash
export TWILIO_ACCOUNT_SID=your_sid
export TWILIO_AUTH_TOKEN=your_token
export TWILIO_PHONE_NUMBER=+1234567890
```

### Emails not sending

**Check:**
1. SendGrid API key is valid
2. Sender email is verified in SendGrid
3. Email address is not in suppression list
4. Check SendGrid activity dashboard
5. Look for error logs in app

### SMS not sending

**Check:**
1. User is marked as premium
2. Phone number is in E.164 format (+1234567890)
3. Twilio account has credits
4. Phone number is not in suppression list
5. Check Twilio logs

### Scheduler not running

**Check:**
1. App started without errors
2. "🔔 Alert scheduler initialized" appears in logs
3. APScheduler is installed: `pip show apscheduler`
4. Database connection is working
5. Check app logs for scheduler errors

---

## Performance Considerations

- Scheduler runs in background thread
- Email/SMS services use connection pooling
- Singleton pattern prevents duplicate connections
- Batch email sending supported for digests
- Alert checking optimized with indexes
- Frequency settings reduce unnecessary notifications

---

## Security Notes

- API keys stored in environment variables only
- SMS restricted to premium users
- Phone numbers validated before sending
- Email addresses validated
- User ID checks on all operations
- Rate limiting on API endpoints
- Audit logs for notification sending (recommended)

---

## Future Enhancements

1. **User Timezone Support**: Schedule digests at user's local 8 AM
2. **Sentiment Integration**: Connect sentiment spike job to analysis engine
3. **Macro Events**: Economic calendar and major news alerts
4. **Notification History**: UI for viewing sent notifications
5. **SMS Management**: Reply processing and SMS-based controls
6. **Webhook Integrations**: Integrate with external services
7. **Notification Templates**: Custom email templates per user
8. **A/B Testing**: Test different email formats

---

## Support

For issues with:
- **SendGrid**: https://support.sendgrid.com
- **Twilio**: https://www.twilio.com/help
- **APScheduler**: https://apscheduler.readthedocs.io

For AssetPulse issues: Create an issue on GitHub

---

## Summary

The Email/SMS Alert System is production-ready and provides:
✓ Real-time price alerts via email/SMS
✓ Scheduled daily market digests
✓ User notification preferences
✓ Premium SMS features
✓ Professional email templates
✓ Background job scheduling
✓ Full API integration

Configuration is straightforward with environment variables, and the system gracefully handles missing credentials.
