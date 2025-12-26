#!/usr/bin/env pwsh
# Export Local Database to Supabase
# This script helps you migrate your local database to Supabase

Write-Host "🚀 Database Export to Supabase" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if pg_dump is available
$pgDumpExists = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDumpExists) {
    Write-Host "❌ Error: pg_dump not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools:" -ForegroundColor Yellow
    Write-Host "https://www.postgresql.org/download/windows/`n" -ForegroundColor Yellow
    exit 1
}

# Local database settings
$localHost = "localhost"
$localPort = "5432"
$localDb = "pmsdb"
$localUser = "postgres"
$backupFile = "production-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"

Write-Host "📦 Step 1: Export Local Database" -ForegroundColor Green
Write-Host "Local DB: postgresql://$localUser@$localHost:$localPort/$localDb`n"

# Prompt for local password
$env:PGPASSWORD = Read-Host "Enter LOCAL database password (default: admin)" -AsSecureString | ConvertFrom-SecureString -AsPlainText
if ([string]::IsNullOrWhiteSpace($env:PGPASSWORD)) {
    $env:PGPASSWORD = "admin"
}

Write-Host "`nExporting database to: $backupFile..." -ForegroundColor Yellow

try {
    pg_dump -U $localUser -h $localHost -p $localPort -d $localDb --clean --if-exists -f $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Export successful!`n" -ForegroundColor Green
        
        $fileSize = (Get-Item $backupFile).Length / 1KB
        Write-Host "File: $backupFile ($([math]::Round($fileSize, 2)) KB)`n" -ForegroundColor Cyan
    } else {
        throw "Export failed with exit code: $LASTEXITCODE"
    }
} catch {
    Write-Host "❌ Export failed: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "📤 Step 2: Import to Supabase" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "Please provide your Supabase connection details:" -ForegroundColor Yellow
Write-Host "(Found in: Supabase Dashboard → Settings → Database → Connection Pooling)`n" -ForegroundColor Gray

$supabaseUrl = Read-Host "Supabase Connection String (e.g., postgresql://postgres.xxx@aws-0-us-east-1.pooler.supabase.com:6543/postgres)"

if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
    Write-Host "`n⚠️  No connection string provided. Skipping import." -ForegroundColor Yellow
    Write-Host "`nTo import manually later, run:" -ForegroundColor Cyan
    Write-Host "psql `"your-supabase-connection-string`" -f $backupFile`n" -ForegroundColor Gray
    exit 0
}

Write-Host "`nImporting to Supabase..." -ForegroundColor Yellow
Write-Host "⚠️  This will replace all data in your Supabase database!`n" -ForegroundColor Yellow

$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Import cancelled." -ForegroundColor Yellow
    exit 0
}

try {
    psql $supabaseUrl -f $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Import successful!" -ForegroundColor Green
        Write-Host "Your Supabase database is now ready!`n" -ForegroundColor Green
    } else {
        throw "Import failed with exit code: $LASTEXITCODE"
    }
} catch {
    Write-Host "❌ Import failed: $_" -ForegroundColor Red
    Write-Host "`nYou can try importing manually:" -ForegroundColor Yellow
    Write-Host "psql `"$supabaseUrl`" -f $backupFile`n" -ForegroundColor Gray
    exit 1
}

Write-Host "🎉 Database migration complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Update your .env.local with Supabase connection string" -ForegroundColor White
Write-Host "2. Test the connection: npm run db:check" -ForegroundColor White
Write-Host "3. Deploy to Vercel with the Supabase DATABASE_URL`n" -ForegroundColor White
