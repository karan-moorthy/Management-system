# Production Deployment Guide

## Overview
This guide will help you deploy your PMS application to production:
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vercel (Next.js)

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - **Project Name**: pms-production
   - **Database Password**: (Choose a strong password - save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project" (takes ~2 minutes)

### 1.2 Get Database Connection String
1. In Supabase Dashboard, go to **Project Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **Connection Pooling** tab (Important!)
4. Copy the connection string that looks like:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password

### 1.3 Export Local Database to Supabase
Run these commands to export your local data:

```powershell
# Export your local database
pg_dump -U postgres -h localhost -d pmsdb -f production-backup.sql

# Import to Supabase (replace with your connection string)
psql "postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f production-backup.sql
```

Or use the provided script:
```powershell
.\export-to-supabase.ps1
```

## Step 2: Deploy to Vercel

### 2.1 Prepare for Deployment
1. Ensure your code is pushed to GitHub/GitLab/Bitbucket
2. Commit any uncommitted changes:
   ```powershell
   git add .
   git commit -m "Prepare for production deployment"
   git push
   ```

### 2.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub (or your Git provider)
3. Click "Add New..." → "Project"
4. Import your repository
5. Configure project:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: ./
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### 2.3 Configure Environment Variables
Before deploying, add these environment variables in Vercel:

Click **Environment Variables** and add:

```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
NEXTAUTH_SECRET=[Generate new secret - see below]
NEXTAUTH_URL=https://your-app.vercel.app
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@yourdomain.com
NODE_ENV=production
```

**Generate NEXTAUTH_SECRET:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2.4 Deploy
1. Click **Deploy**
2. Wait for deployment to complete (~2-5 minutes)
3. Your app will be live at: `https://your-app.vercel.app`

## Step 3: Post-Deployment

### 3.1 Run Database Migrations on Supabase
After first deployment, ensure schema is up to date:

```powershell
# Temporarily use production DATABASE_URL
$env:DATABASE_URL="your-supabase-connection-string"
npx drizzle-kit push
```

### 3.2 Test Your Production App
1. Visit your Vercel URL
2. Test authentication (sign in/sign up)
3. Create test data (workspace, tasks, etc.)
4. Verify all features work

### 3.3 Custom Domain (Optional)
In Vercel:
1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Environment Variables Reference

### Required for Production
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase connection string | `postgresql://postgres.xxx...` |
| `NEXTAUTH_SECRET` | Auth secret (min 32 chars) | Generated random string |
| `NEXTAUTH_URL` | Your production URL | `https://yourapp.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `https://yourapp.vercel.app` |
| `NODE_ENV` | Environment | `production` |

### Email Service (Choose One)
| Variable | Description |
|----------|-------------|
| `GMAIL_USER` + `GMAIL_APP_PASSWORD` | For Gmail SMTP |
| `RESEND_API_KEY` + `EMAIL_FROM` | For Resend service |

## Troubleshooting

### Database Connection Issues
- Ensure you're using **Connection Pooling** URL from Supabase
- Verify password is correct in DATABASE_URL
- Check Supabase project is not paused (free tier)

### Build Failures
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify no TypeScript errors: `npm run build` locally

### Authentication Issues
- Verify `NEXTAUTH_URL` matches your actual Vercel URL
- Ensure `NEXTAUTH_SECRET` is set and not the default
- Check cookies are enabled in browser

## Monitoring

### Vercel Dashboard
- View deployment logs
- Monitor function execution
- Check build status

### Supabase Dashboard
- Monitor database usage
- View query performance
- Check connection pooling stats

## Updating Your App

After making changes:
```powershell
git add .
git commit -m "Your update message"
git push
```

Vercel will automatically rebuild and deploy!

## Security Checklist
- [ ] Changed `NEXTAUTH_SECRET` from default
- [ ] Using strong database password
- [ ] Environment variables set in Vercel (not in code)
- [ ] `.env.local` in `.gitignore` (not committed)
- [ ] Email credentials secured
- [ ] Database has backups enabled

## Cost Estimates
- **Vercel**: Free tier (includes 100GB bandwidth, unlimited deployments)
- **Supabase**: Free tier (500MB database, 2GB bandwidth/month)
- Upgrade when needed based on usage

## Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
