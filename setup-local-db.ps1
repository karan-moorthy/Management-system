# Setup Local PostgreSQL Database for PMS
# Run this after installing PostgreSQL

Write-Host "🚀 Setting up local PostgreSQL database..." -ForegroundColor Cyan

# Check if PostgreSQL is installed
$pgVersion = psql --version 2>$null
if (!$pgVersion) {
    Write-Host "❌ PostgreSQL is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ PostgreSQL installed: $pgVersion" -ForegroundColor Green

# Database configuration
$DB_NAME = "pms_db"
$DB_USER = "postgres"
$DB_PASSWORD = Read-Host "Enter PostgreSQL password (default is 'postgres')" -AsSecureString
$DB_PASSWORD_TEXT = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

if ([string]::IsNullOrEmpty($DB_PASSWORD_TEXT)) {
    $DB_PASSWORD_TEXT = "postgres"
}

Write-Host "`n📦 Creating database '$DB_NAME'..." -ForegroundColor Cyan

# Set PGPASSWORD environment variable for this session
$env:PGPASSWORD = $DB_PASSWORD_TEXT

# Check if database exists
$dbExists = psql -U $DB_USER -lqt 2>$null | Select-String -Pattern "^\s*$DB_NAME\s"

if ($dbExists) {
    Write-Host "⚠️  Database '$DB_NAME' already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Drop and recreate? (y/N)"
    if ($overwrite -eq "y" -or $overwrite -eq "Y") {
        psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>$null
        Write-Host "✓ Dropped existing database" -ForegroundColor Green
    }
}

# Create database
psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database created successfully" -ForegroundColor Green
} else {
    Write-Host "✓ Database exists or created" -ForegroundColor Green
}

# Enable required extensions
Write-Host "`n🔧 Enabling PostgreSQL extensions..." -ForegroundColor Cyan
psql -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>&1 | Out-Null
psql -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" 2>&1 | Out-Null
Write-Host "✓ Extensions enabled" -ForegroundColor Green

# Update .env.local
Write-Host "`n📝 Updating .env.local..." -ForegroundColor Cyan
$CONNECTION_STRING = "postgresql://${DB_USER}:${DB_PASSWORD_TEXT}@localhost:5432/${DB_NAME}"

$envContent = @"
DATABASE_URL=$CONNECTION_STRING
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=pms-secret-key-change-in-production
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password
EMAIL_FROM=onboarding@resend.dev
RESEND_API_KEY=your_resend_key
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8
Write-Host "✓ .env.local updated" -ForegroundColor Green

# Run migrations
Write-Host "`n🔄 Running database migrations..." -ForegroundColor Cyan
npm run db:push

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Database setup complete!" -ForegroundColor Green
    Write-Host "`nConnection string: $CONNECTION_STRING" -ForegroundColor Cyan
    Write-Host "`nYou can now run: npm run dev" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  Migration failed. Check the error above." -ForegroundColor Red
}

# Clear password from environment
Remove-Item Env:\PGPASSWORD
