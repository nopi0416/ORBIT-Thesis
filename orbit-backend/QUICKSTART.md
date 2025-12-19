# 🚀 Quick Start - ORBIT Backend Setup

## Prerequisites
- Node.js 16+
- npm/yarn installed
- Supabase account with ORBIT database

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd orbit-backend
npm install
```

### 2. Configure Environment
```bash
# Copy the template
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-anon-key-here
```

### 3. Start Development Server
```bash
npm run dev
```

✅ Server running at `http://localhost:3001`

## Test the API

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Create Budget Configuration
```bash
curl -X POST http://localhost:3001/api/budget-configurations \
  -H "Content-Type: application/json" \
  -d '{
    "budget_name": "Q1 2024 Bonus",
    "period_type": "Quarterly",
    "min_limit": 1000,
    "max_limit": 10000,
    "budget_control": true,
    "geo_scope": "Philippines",
    "location_scope": "Manila",
    "department_scope": "IT",
    "created_by": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Get All Configurations
```bash
curl http://localhost:3001/api/budget-configurations
```

## Project Structure

```
src/
├── config/          # Database & CORS setup
├── routes/          # API endpoints
├── controllers/     # HTTP handlers
├── services/        # Business logic
├── middleware/      # Auth & error handling
└── utils/          # Validators & helpers
```

## Available Scripts

```bash
npm run dev      # Development with auto-reload
npm start        # Production mode
npm test         # Run tests (coming soon)
```

## 📚 Important Files

- **[README.md](./README.md)** - Full API documentation
- **[DATABASE_ANALYSIS.md](./DATABASE_ANALYSIS.md)** - Database schema issues & solutions
- **.env.example** - Environment variables template

## ⚠️ Important Notes

### Database Schema Issue
⚠️ The current database table is **missing 19 columns** that the frontend collects.

See [DATABASE_ANALYSIS.md](./DATABASE_ANALYSIS.md) for details and recommendations.

### Next Steps
1. Review DATABASE_ANALYSIS.md
2. Decide on schema changes
3. Update database table
4. Connect frontend to backend API

## 🔗 Connected Endpoints

All endpoints are under `/api/budget-configurations`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/` | Create configuration |
| GET | `/` | List all configurations |
| GET | `/:id` | Get one configuration |
| PUT | `/:id` | Update configuration |
| DELETE | `/:id` | Delete configuration |
| GET | `/user/:userId` | Get user's configurations |

## 🆘 Troubleshooting

**"Cannot find module '@supabase/supabase-js'"**
```bash
npm install
```

**"SUPABASE_URL is not defined"**
- Check .env file exists
- Ensure SUPABASE_URL is set
- Restart npm run dev

**Port 3001 already in use**
```bash
# Change PORT in .env or kill process on port 3001
```

## 📞 Support

For issues or questions, check:
1. README.md - Full documentation
2. DATABASE_ANALYSIS.md - Schema details
3. src/ folders - Code examples

---

**Ready to start?** Run `npm run dev` and test with the curl examples above! 🎉
