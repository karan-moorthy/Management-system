# Vercel Production Environment Variables Setup

## Required Environment Variables for Client Invitations

Add these to your Vercel project settings:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add the following variables:

### Email Service (Gmail SMTP)

```
GMAIL_USER=mlkaran2004@gmail.com
GMAIL_APP_PASSWORD=gmhb knwf sdfp birp
EMAIL_FROM=ggs@pms.com
```

### Application URL

```
NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app
```

Replace `your-production-domain.vercel.app` with your actual Vercel deployment URL.

### Database (if not already set)

```
DATABASE_URL=your-supabase-or-neon-database-url
```

## Steps to Add Environment Variables in Vercel

1. Login to [Vercel Dashboard](https://vercel.com)
2. Select your project (Management-system or Proj_Pms)
3. Go to **Settings** tab
4. Click **Environment Variables** in the sidebar
5. For each variable:
   - Enter the **Key** (e.g., `GMAIL_USER`)
   - Enter the **Value** (e.g., `mlkaran2004@gmail.com`)
   - Select environments: **Production**, **Preview**, **Development** (check all)
   - Click **Save**

## After Adding Variables

**Important:** You must redeploy your application for the new environment variables to take effect.

### Option 1: Trigger Redeploy in Vercel Dashboard
1. Go to **Deployments** tab
2. Click the three dots (**...**) on the latest deployment
3. Click **Redeploy**

### Option 2: Push a New Commit
```bash
git add .
git commit -m "Configure email service"
git push origin main
```

## Testing Client Invitations

Once deployed with the new environment variables:

1. Login as admin (varun@pms.com / admin123)
2. Go to any project
3. Click **"Invite Client"** button
4. Enter a client email address
5. Click **"Send Invitation"**

You should see:
- ✅ Success message
- 📧 Email sent to the client
- 🔗 Invitation link you can copy manually

## Troubleshooting

### Emails Not Sending?

Check Vercel deployment logs:
1. Go to **Deployments** tab
2. Click on latest deployment
3. Click **Function Logs**
4. Look for errors related to email sending

### Common Issues

**"Failed to send invitation email"**
- ✅ Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` are correct
- ✅ Check if Gmail App Password is valid (not expired)
- ✅ Ensure you redeployed after adding variables

**"Invalid invitation link"**
- ✅ Verify `NEXT_PUBLIC_APP_URL` is set correctly
- ✅ Must include `https://` protocol
- ✅ Must match your actual Vercel domain

**"Unauthorized" errors**
- ✅ Verify user has ADMIN or PROJECT_MANAGER role
- ✅ Check user is logged in correctly

## Security Notes

- Never commit `.env.local` to git
- Gmail App Password is already in `.gitignore`
- Vercel environment variables are encrypted
- Rotate Gmail App Password periodically

## Support

If issues persist after following these steps:
1. Check Vercel Function Logs
2. Check browser console for errors
3. Verify all environment variables are set in Vercel
4. Ensure you redeployed after adding variables
