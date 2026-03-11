# Production Deployment Guide

This guide covers configuring and deploying the Poker Wise application to Vercel production environment.

## Prerequisites

- Vercel account connected to GitHub repository
- Vercel project created (auto-created when repository is connected)

## 1. Database Setup

### Option A: Vercel Postgres (Recommended)
1. In Vercel dashboard, go to **Storage** → **Create Database** → **Postgres**
2. Name your database (e.g., `poker-wise-prod`)
3. Choose region closest to your users
4. Once created, Vercel will automatically add `POSTGRES_URL` environment variable

### Option B: External PostgreSQL
If using external PostgreSQL (Neon, Supabase, AWS RDS, etc.):
1. Create database and obtain connection string
2. Format: `postgresql://user:password@host:port/database`
3. Add as `POSTGRES_URL` environment variable

## 2. Environment Variables

Add the following environment variables in **Vercel Project Settings** → **Environment Variables**:

| Variable | Description | Example Value | Required |
|----------|-------------|---------------|----------|
| `POSTGRES_URL` | PostgreSQL connection URL | Auto-set by Vercel Postgres | ✅ |
| `ADMIN_EMAIL` | Initial admin account email | `admin@example.com` | ✅ |
| `ADMIN_PASSWORD` | Initial admin account password | `secure-password-123` | ✅ |
| `AUTH_SECRET` | Secret for session cookies (min 32 chars) | `auth-secret-01234567890123456789012345678901` | ✅ |
| `NODE_ENV` | Environment mode | `production` (auto-set by Vercel) | ✅ |

**Important**: Set these for **Production** environment (not just Preview).

## 3. Database Setup and Migrations

The application uses Drizzle ORM. For production, you need to initialize the database schema.

### First Deployment (Fresh Database)
If this is your first deployment and the database is empty:

1. After setting environment variables, deploy to production
2. Connect to your Vercel Postgres database via CLI or GUI
3. Run the database reset script **once** to create tables and seed admin:

```bash
# Set POSTGRES_URL environment variable first
export POSTGRES_URL="your-production-postgres-url"
npm run db:reset
```

**⚠️ Warning**: The `db:reset` script **drops all tables** before creating them. Only run this on a fresh/empty database or when you want to wipe all data.

### Safe Initialization (No Data Loss)
If you want to initialize tables without risking data loss (e.g., if database might have other data):

1. Generate SQL schema from the current Drizzle schema:
```bash
npx drizzle-kit generate
```

2. Review the generated SQL in `server/db/migrations/` folder
3. Apply only the CREATE TABLE statements (skip DROP TABLE if they exist)

### Future Schema Updates
When you make changes to `server/db/schema.ts`:

1. Generate migrations locally against a test database:
```bash
# Set up a local test database with same schema as production
# Generate migration
npx drizzle-kit generate
```

2. Apply migrations to production:
```bash
npx drizzle-kit migrate
```

**Note**: Always backup production database before running migrations.

## 4. Verifying Deployment

After deployment:

1. **Visit your production URL** (e.g., `https://poker-wise.vercel.app`)
2. **Log in as admin** using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` set in environment variables
3. **Create a test group** to verify server-backed groups work
4. **Add players** to verify basic functionality

## 5. Troubleshooting

### Common Issues

#### "Failed to connect to database"
- Verify `POSTGRES_URL` is correctly set in Vercel environment variables
- Check database is running and accessible
- For Vercel Postgres, ensure database is in same region as deployment

#### "Authentication failed" or login issues
- Verify `AUTH_SECRET` is at least 32 characters
- Ensure `ADMIN_EMAIL` and `ADMIN_PASSWORD` match what you're using to login
- Check browser console for errors

#### "Tables don't exist"
- Database migrations haven't been run
- Run `db:reset` or apply migrations as described above

### Checking Logs
- Vercel dashboard → Project → Functions → Edge/Serverless Functions logs
- Check for runtime errors

## 6. Maintenance

### Adding New Admins
Currently, only the seeded admin from environment variables exists. To add more admins:

1. Connect to production database
2. Insert into `admins` table:
```sql
INSERT INTO admins (email, password_hash) 
VALUES ('newadmin@example.com', 'bcrypt-hashed-password');
```

### Backup Database
- Vercel Postgres: Use Vercel dashboard → Storage → Database → Backups
- External PostgreSQL: Use provider's backup tools

## 7. Security Notes

1. **Never commit environment variables** to git
2. **Use strong passwords** for admin accounts
3. **Rotate `AUTH_SECRET`** periodically
4. **Enable Vercel Security** features if available
5. **Monitor access logs** for suspicious activity

## 8. Next Steps After Deployment

Once production is verified working:
- Continue with PR 4: Group Players migration
- Test all user flows in production
- Set up monitoring and alerts