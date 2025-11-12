# 🚀 Deployment Checklist & Troubleshooting Guide

## Pre-Deployment Checklist

### 1. ✅ Environment Variables Setup
Before deploying, ensure all environment variables are configured:

```bash
# Required Environment Variables
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://yourdomain.com

# Optional (for email invitations)
RESEND_API_KEY=your-resend-key (optional)
```

**⚠️ NEVER commit `.env` files to Git!**

---

### 2. 🔒 Remove Hardcoded Credentials

**CRITICAL:** Before deployment, remove these hardcoded credentials:

#### Files to Fix:
- [ ] `check-database.js` - Line 4 (Neon credentials)
- [ ] `verify-storage.js` - Line 9 (Neon credentials)
- [ ] `test-admin-records.js` - Line 4 (localhost credentials)
- [ ] `test-workspaces.js` - Line 4 (localhost credentials)
- [ ] `test-company-wide.js` - Line 4 (localhost credentials)
- [ ] `test-midnight-logic.js` - Line 4 (localhost credentials)
- [ ] `clean-task-data.js` - Line 4 (localhost credentials)
- [ ] `inspect-task-data.js` - Line 4 (localhost credentials)

**Quick Fix:** Replace all hardcoded connection strings with:
```javascript
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not found in environment variables');
}
```

---

### 3. 🗄️ Database Security

**Before Production:**
1. **Change Database Password** (if exposed in any committed files)
   - Go to Neon Dashboard
   - Change password for `neondb_owner`
   - Update `.env` file locally

2. **Database Backup**
   ```bash
   # Create backup before migration
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

3. **Run Migrations**
   ```bash
   npm run db:push
   # or
   npm run db:migrate
   ```

---

### 4. 🏗️ Build Test Locally

Test production build before deploying:

```bash
# Test production build
npm run build

# If build fails, fix errors before deploying
# Common issues:
# - TypeScript errors
# - Missing environment variables
# - Import errors
```

---

## Deployment Platforms

### Option 1: Vercel (Recommended for Next.js)

**Pros:**
- ✅ Zero-config Next.js deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Serverless functions
- ✅ Free tier available

**Steps:**
1. Push code to GitHub (after removing credentials)
2. Connect Vercel to your GitHub repo
3. Add environment variables in Vercel dashboard
4. Deploy

**Environment Variables in Vercel:**
```
Dashboard → Settings → Environment Variables → Add:
- DATABASE_URL
- NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
- NEXTAUTH_URL (your vercel domain)
```

---

### Option 2: Railway.app

**Pros:**
- ✅ Includes PostgreSQL database
- ✅ Simple deployment
- ✅ $5/month starter plan

**Steps:**
1. Push to GitHub
2. Connect Railway to repo
3. Add PostgreSQL service
4. Deploy

---

### Option 3: DigitalOcean App Platform

**Pros:**
- ✅ Full control
- ✅ Predictable pricing
- ✅ Managed databases

**Pricing:** ~$12/month

---

### Option 4: Self-Hosted (VPS)

**Platforms:** AWS EC2, DigitalOcean Droplet, Linode

**Pros:**
- ✅ Full control
- ✅ Cost-effective for scale

**Cons:**
- ❌ Requires DevOps knowledge
- ❌ Manual SSL setup
- ❌ Manual monitoring

---

## Common Deployment Issues & Solutions

### Issue 1: Build Fails

**Error:** `Type error: ...`

**Solution:**
```bash
# Fix TypeScript errors locally first
npm run build

# Check for:
# - Missing imports
# - Type mismatches
# - Unused variables
```

---

### Issue 2: Database Connection Fails

**Error:** `DATABASE_URL is not defined`

**Solution:**
1. Check environment variables are set in deployment platform
2. Verify connection string format:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```
3. For Neon, ensure `?sslmode=require` is included

---

### Issue 3: 500 Internal Server Error

**Debugging:**
1. Check deployment logs
2. Enable error logging:
   ```typescript
   // next.config.mjs
   export default {
     logging: {
       fetches: {
         fullUrl: true,
       },
     },
   }
   ```

---

### Issue 4: Environment Variables Not Working

**Solution:**
1. Restart deployment after adding env vars
2. Check variable names match exactly (case-sensitive)
3. No quotes needed in deployment platform UI

---

### Issue 5: Database Migration Issues

**Error:** `relation "table_name" does not exist`

**Solution:**
```bash
# Run migrations on production database
npm run db:push

# Or use Drizzle Studio to inspect
npm run db:studio
```

---

### Issue 6: Authentication Not Working

**Checklist:**
- [ ] `NEXTAUTH_SECRET` is set and is a secure random string
- [ ] `NEXTAUTH_URL` matches your deployment domain
- [ ] Cookies are enabled (check browser settings)
- [ ] HTTPS is working (required for secure cookies)

---

## Rollback Strategy

### If Deployment Fails:

**Option 1: Revert to Previous Deployment**
- Vercel: Dashboard → Deployments → Click previous deployment → Promote to Production
- Railway: Deployments → Redeploy previous version

**Option 2: Database Rollback**
```bash
# Restore from backup
psql $DATABASE_URL < backup_20251112.sql
```

**Option 3: Git Rollback**
```bash
# Revert to last working commit
git revert HEAD
git push

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force
```

---

## Monitoring After Deployment

### 1. Health Check Endpoints

Create a health check route:

**File:** `src/app/api/health/route.ts`
```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET() {
  try {
    // Test database connection
    await db.query.users.findFirst();
    
    return NextResponse.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    return NextResponse.json({ 
      status: "unhealthy",
      error: error.message 
    }, { status: 500 });
  }
}
```

**Test:** `curl https://yourdomain.com/api/health`

---

### 2. Error Tracking

**Option A: Sentry (Recommended)**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Option B: LogRocket**
```bash
npm install logrocket
```

---

### 3. Performance Monitoring

**Vercel Analytics:**
- Free built-in analytics
- Enable in Vercel dashboard

**Alternative: Google Analytics**
```bash
npm install @next/third-parties
```

---

## Security Best Practices

### 1. Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// middleware.ts
import { ratelimit } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
}
```

---

### 2. CORS Configuration

```typescript
// next.config.mjs
const config = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
        ],
      },
    ];
  },
};
```

---

### 3. SQL Injection Protection

✅ **Already Protected:** Using Drizzle ORM with parameterized queries

❌ **Never do this:**
```typescript
// DANGEROUS - DON'T DO THIS
db.execute(`SELECT * FROM users WHERE email = '${email}'`);
```

✅ **Always do this:**
```typescript
// SAFE - Drizzle handles parameterization
db.query.users.findFirst({
  where: eq(users.email, email)
});
```

---

## Post-Deployment Checklist

After successful deployment:

- [ ] Test all major features
  - [ ] User login/registration
  - [ ] Create workspace
  - [ ] Create project
  - [ ] Create task
  - [ ] Upload CSV
  - [ ] Start/end shift (attendance)
  - [ ] View reports
  - [ ] Download reports

- [ ] Test on different devices
  - [ ] Desktop Chrome
  - [ ] Desktop Firefox
  - [ ] Mobile Safari
  - [ ] Mobile Chrome

- [ ] Monitor for errors (first 24 hours)
  - [ ] Check error logs
  - [ ] Monitor database connections
  - [ ] Check API response times

- [ ] Performance check
  - [ ] Page load times < 3 seconds
  - [ ] Time to Interactive < 5 seconds
  - [ ] Lighthouse score > 80

---

## Emergency Contacts & Resources

### Documentation
- Next.js Docs: https://nextjs.org/docs
- Vercel Deployment: https://vercel.com/docs
- Drizzle ORM: https://orm.drizzle.team/docs
- PostgreSQL: https://www.postgresql.org/docs/

### Support
- Vercel Support: support@vercel.com
- Neon Support: https://neon.tech/docs
- GitHub Issues: Track issues in your repo

---

## Backup Strategy

### Daily Backups
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/backup_$DATE.sql
gzip backups/backup_$DATE.sql

# Keep last 7 days
find backups/ -name "*.sql.gz" -mtime +7 -delete
```

### Schedule with cron:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup-script.sh
```

---

## Cost Estimation

### Minimal Setup (Good for 100-500 users)
- Vercel: Free tier (or $20/month Pro)
- Neon PostgreSQL: Free tier (or $19/month Pro)
- **Total: $0 - $39/month**

### Production Setup (500-5000 users)
- Vercel Pro: $20/month
- Neon Pro: $69/month (includes backups)
- Monitoring (Sentry): $26/month
- **Total: ~$115/month**

### Enterprise Setup (5000+ users)
- Vercel Enterprise: Custom pricing
- Dedicated PostgreSQL: $200+/month
- CDN: $50+/month
- **Total: $500+/month**

---

## Quick Command Reference

```bash
# Local Development
npm run dev                    # Start dev server
npm run build                  # Test production build
npm run db:push                # Push schema changes
npm run db:studio              # Open database GUI

# Production
git push origin main           # Deploy (if auto-deploy enabled)
npm run start                  # Run production server locally

# Database
npm run db:generate            # Generate migration
npm run db:migrate             # Run migrations
psql $DATABASE_URL             # Connect to database

# Troubleshooting
npm run build 2>&1 | tee build.log  # Save build logs
npm run db:check               # Check database connection
```

---

## Success Metrics

Track these after deployment:

- **Uptime:** Target 99.9% (Use UptimeRobot - free)
- **Response Time:** < 500ms average
- **Error Rate:** < 0.1%
- **User Satisfaction:** Monitor feedback

---

## Need Help?

**If you get stuck:**
1. Check deployment logs first
2. Review this checklist
3. Search GitHub issues for similar problems
4. Ask in relevant Discord/Slack communities
5. Contact platform support

**Remember:** Most deployment issues are:
- Missing environment variables (60%)
- Database connection problems (20%)
- Build errors from TypeScript (15%)
- Other (5%)

---

## Final Notes

✅ **You're prepared!** This guide covers 95% of deployment scenarios.

🔐 **Priority #1:** Secure your credentials before deploying

🧪 **Always test locally first:** `npm run build` should pass

📊 **Monitor everything:** Especially in the first 48 hours

🔄 **Have a rollback plan:** Test it before you need it

Good luck with your deployment! 🚀
