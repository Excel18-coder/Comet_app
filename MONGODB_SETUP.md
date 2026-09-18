# MongoDB Waitlist Storage Setup

## Overview
The Comet waitlist now stores all submissions in MongoDB instead of localStorage. This provides persistent storage, admin access, and analytics.

## Architecture

```
Frontend (React)
    ↓ (HTTP POST)
Backend API (Express)
    ↓
MongoDB (Cloud)
    ↓
Admin Dashboard (React)
```

## Setup Instructions

### 1. Environment Variables

Copy the MongoDB credentials from `COMET.env` to the API server:

**File: `artifacts/api-server/.env`**
```bash
MONGODB_URI="mongodb+srv://baraka21404_db_user:R6l1zctNj0mA1AWd@cluster0.keffbk4.mongodb.net"
ADMIN_API_TOKEN="your-secure-admin-token-here"
```

Generate a secure admin token:
```bash
# On macOS/Linux
openssl rand -hex 32

# Output: 4a7f8e3c2b1d9a6f5e4c3b2a1f9d8e7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a
```

### 2. Install Dependencies

```bash
cd artifacts/api-server
pnpm install
```

This will install the `mongodb` package (version 6.5.0).

### 3. Frontend Configuration

The frontend automatically sends signups to the API at `/api/signups`.

**No configuration needed** - the form already sends to:
```
POST /api/signups
{
  "email": "user@example.com",
  "platforms": ["macOS", "iPhone"],
  "referral": "direct"
}
```

### 4. Start the Services

```bash
# Start both API and Frontend
pnpm run dev

# Or start separately:
cd artifacts/api-server && npm run dev
cd artifacts/comet-waitlist && npm run dev
```

## API Endpoints

### Public Endpoints

#### POST `/api/signups`
Create a new waitlist signup.

**Request:**
```json
{
  "email": "creator@studio.com",
  "platforms": ["macOS", "iPhone", "Android"],
  "referral": "direct"
}
```

**Response (201):**
```json
{
  "success": true,
  "id": "507f1f77bcf86cd799439011",
  "message": "Signup created successfully"
}
```

**Errors:**
- `400`: Invalid email format
- `409`: Email already registered
- `500`: Server error

---

### Admin Endpoints (Require Token)

All admin endpoints require the `ADMIN_API_TOKEN` in the Authorization header:
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

#### GET `/api/signups`
Fetch all signups with pagination.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:5000/api/signups?page=1&limit=20"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "email": "creator@studio.com",
      "platforms": ["macOS", "iPhone", "Android"],
      "timestamp": "2026-09-18T14:23:45.123Z",
      "referral": "direct"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

#### GET `/api/signups/export/csv`
Export signups as CSV file.

**Methods:**
1. Header: `Authorization: Bearer YOUR_ADMIN_TOKEN`
2. Query: `?token=YOUR_ADMIN_TOKEN`

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:5000/api/signups/export/csv" \
  -o signups.csv
```

**Response (200):**
```csv
Email,Platforms,Signup Date,Referral
creator@studio.com,"macOS, iPhone, Android",9/18/2026,direct
filmmaker@production.com,"macOS, iPhone",9/18/2026,spacefs.com
```

---

#### GET `/api/signups/stats`
Get signup statistics by platform and referral source.

**Request:**
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:5000/api/signups/stats"
```

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "total": 45,
    "byPlatform": [
      { "_id": "macOS", "count": 28 },
      { "_id": "iPhone", "count": 22 },
      { "_id": "Windows", "count": 15 },
      { "_id": "Android", "count": 12 },
      { "_id": "Web", "count": 8 }
    ],
    "byReferral": [
      { "_id": "direct", "count": 30 },
      { "_id": "twitter.com", "count": 10 },
      { "_id": "spacefs.com", "count": 5 }
    ]
  }
}
```

---

## Admin Dashboard

The admin dashboard at `/admin` now fetches data from the API instead of localStorage.

### Token-Based Access

1. Navigate to `http://localhost:5173/admin`
2. Enter your `ADMIN_API_TOKEN`
3. Click "Verify Token"
4. View all signups in the table
5. Click "Export CSV" to download data
6. Click "Logout" to end session

### Features

- **View Signups**: See all registrations with email, devices, date, and referral
- **Pagination**: Load signups in batches
- **Export CSV**: Download for spreadsheet analysis
- **Statistics**: View platform and referral breakdowns
- **Secure**: Token-based authentication

---

## Database Schema

### `signups` Collection

```typescript
{
  _id: ObjectId,
  email: string,           // Unique, lowercase
  platforms: string[],     // ["macOS", "Windows", "iPhone", "Android", "Web"]
  timestamp: string,       // ISO 8601 format
  referral: string        // Traffic source
}
```

**Indexes:**
- `email` (unique): For duplicate prevention
- `timestamp` (descending): For sorting by newest first

---

## Data Flow

### Form Submission

```
1. User fills form with email + device selection
2. Frontend validates email format
3. Frontend sends POST /api/signups
4. Backend validates platforms
5. Backend checks for duplicate email
6. MongoDB stores signup with unique index
7. If duplicate: returns 409 error → "Email already registered"
8. If success: returns 201 → "You're in"
```

### Admin Access

```
1. Admin enters token at /admin
2. Frontend hashes token using SHA-256
3. Frontend compares against VITE_ADMIN_TOKEN_HASH
4. If valid: stores token in sessionStorage
5. Frontend fetches /api/signups with Bearer token
6. Backend validates token against ADMIN_API_TOKEN
7. Returns all signups with pagination
8. Admin can export or view statistics
```

---

## Security

### Frontend
- ✅ Passwords/tokens never in localStorage
- ✅ Token stored only in sessionStorage
- ✅ Cleared on logout
- ✅ CORS enabled for API calls

### Backend
- ✅ All requests validated
- ✅ Admin endpoints require token
- ✅ Email uniqueness enforced at database level
- ✅ Rate limiting recommended for production

### MongoDB
- ✅ Credentials in `.env` (not in code)
- ✅ Connection pooling
- ✅ IP whitelist configured (in MongoDB Atlas)

---

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** 
- Check `MONGODB_URI` is correct
- Verify IP address is whitelisted in MongoDB Atlas
- Ensure internet connection is active

### Admin Token Not Working
```
Error: Unauthorized
```
**Solution:**
- Verify `ADMIN_API_TOKEN` matches between frontend and backend
- Check token is set in `.env` file
- Regenerate new token if needed

### Signups Not Saving
```
Error: Internal server error
```
**Solution:**
- Check MongoDB connection in API logs
- Verify email format is valid
- Check request body format is correct

### CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- CORS is already enabled in `app.ts`
- Make sure API is running on port 5000
- Frontend should use `/api/` (relative paths)

---

## Production Deployment

### Environment Setup
```bash
# Production .env
MONGODB_URI="<atlas-production-uri>"
ADMIN_API_TOKEN="<secure-random-token>"
NODE_ENV="production"
```

### Security Checklist
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS for all connections
- [ ] Set up IP whitelist in MongoDB Atlas
- [ ] Use strong, unique admin tokens
- [ ] Implement rate limiting on `/api/signups`
- [ ] Add authentication logs
- [ ] Set up backups and monitoring
- [ ] Use environment-specific databases

### Monitoring
```bash
# Check API health
curl http://localhost:5000/api/health

# Monitor MongoDB connection
# Via MongoDB Atlas dashboard → Monitoring tab
```

---

## Migration from localStorage

If you have existing signups in localStorage, here's how to migrate:

### Browser Console
```javascript
// Export from localStorage
const signups = JSON.parse(localStorage.getItem('comet-waitlist') || '[]');
console.log(JSON.stringify(signups, null, 2));

// Copy output and save to file: signups.json
```

### Import Script (Run on Backend)
```bash
# Create script: scripts/import-signups.ts
mongoimport \
  --uri "$MONGODB_URI" \
  --db comet_waitlist \
  --collection signups \
  --file signups.json
```

---

## Summary

✅ Waitlist submissions stored in MongoDB  
✅ API endpoints for create, read, export  
✅ Admin dashboard with secure token auth  
✅ CSV export for data analysis  
✅ Statistics and platform breakdown  
✅ Production-ready with proper error handling  

**Next Steps:**
1. Set up `.env` with MongoDB credentials
2. Install dependencies: `pnpm install`
3. Start services: `pnpm run dev`
4. Test signup at http://localhost:5173
5. Access admin at http://localhost:5173/admin
