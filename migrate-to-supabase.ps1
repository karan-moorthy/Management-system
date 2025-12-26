#!/usr/bin/env pwsh
# Direct Migration to Supabase using Drizzle
# No pg_dump required!

Write-Host "🚀 Direct Database Migration to Supabase" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "1. Apply your schema to Supabase database" -ForegroundColor White
Write-Host "2. You can then copy data manually if needed`n" -ForegroundColor White

# Get Supabase connection details
Write-Host "📝 Step 1: Get Supabase Connection String" -ForegroundColor Green
Write-Host "=========================================`n" -ForegroundColor Cyan

Write-Host "Please provide your Supabase connection details:" -ForegroundColor Yellow
Write-Host "(From: Supabase Dashboard → Settings → Database → Connection Pooling)`n" -ForegroundColor Gray

$supabaseUrl = Read-Host "Supabase Connection String"

if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    Write-Host "`n❌ Connection string is required!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Step 2: Apply Schema to Supabase" -ForegroundColor Green
Write-Host "===================================`n" -ForegroundColor Cyan

# Backup current .env.local
$envBackup = ".env.local.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "Backing up .env.local to: $envBackup" -ForegroundColor Gray
Copy-Item ".env.local" $envBackup

# Temporarily update DATABASE_URL
$envContent = Get-Content ".env.local" -Raw
$newEnvContent = $envContent -replace "DATABASE_URL=.*", "DATABASE_URL=$supabaseUrl"
Set-Content ".env.local" $newEnvContent

Write-Host "✅ Updated DATABASE_URL temporarily`n" -ForegroundColor Green

Write-Host "Pushing schema to Supabase..." -ForegroundColor Yellow

try {
    # Run drizzle-kit push
    npx drizzle-kit push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Schema applied successfully!" -ForegroundColor Green
        Write-Host "`n📊 Your Supabase database now has the correct schema!" -ForegroundColor Green
    } else {
        throw "Schema push failed"
    }
} catch {
    Write-Host "`n❌ Migration failed: $_" -ForegroundColor Red
    Write-Host "Restoring original .env.local..." -ForegroundColor Yellow
    Copy-Item $envBackup ".env.local" -Force
    exit 1
}

# Ask if user wants to keep Supabase connection
Write-Host "`n🤔 Do you want to:" -ForegroundColor Cyan
Write-Host "1. Keep Supabase as your DATABASE_URL (for production)" -ForegroundColor White
Write-Host "2. Restore local database connection" -ForegroundColor White
$choice = Read-Host "`nEnter your choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host "`n✅ Keeping Supabase connection" -ForegroundColor Green
    Write-Host "You can now deploy to Vercel with this DATABASE_URL`n" -ForegroundColor Cyan
} else {
    Write-Host "`nRestoring local database connection..." -ForegroundColor Yellow
    Copy-Item $envBackup ".env.local" -Force
    Write-Host "✅ Restored to local database`n" -ForegroundColor Green
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Your Supabase database schema is ready!" -ForegroundColor White
Write-Host "2. If you need your data, you can:" -ForegroundColor White
Write-Host "   - Use the dbclient extension to copy data" -ForegroundColor Gray
Write-Host "   - Or start fresh with new data in production" -ForegroundColor Gray
Write-Host "3. Deploy to Vercel (see DEPLOYMENT_GUIDE.md)" -ForegroundColor White
Write-Host "4. Add environment variables in Vercel dashboard`n" -ForegroundColor White

Write-Host "🎉 Supabase database is ready for deployment!" -ForegroundColor Green
