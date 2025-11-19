# Clean development startup script for OneDrive environments
# This script ensures clean startup by removing locked files

Write-Host "Cleaning up previous build artifacts..." -ForegroundColor Cyan

# Stop any running Node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Remove .next folder with retry logic
$maxRetries = 3
$retryCount = 0
$deleted = $false

while (-not $deleted -and $retryCount -lt $maxRetries) {
    try {
        if (Test-Path ".next") {
            Remove-Item -Path ".next" -Recurse -Force -ErrorAction Stop
            Write-Host "Removed .next folder" -ForegroundColor Green
        }
        $deleted = $true
    }
    catch {
        $retryCount++
        Write-Host "Retry $retryCount/$maxRetries - waiting for file locks to release..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $deleted -and (Test-Path ".next")) {
    Write-Host "Warning: Could not fully clean .next folder. Some files may be locked by OneDrive." -ForegroundColor Yellow
    Write-Host "Tip: Pause OneDrive sync or exclude this folder from OneDrive" -ForegroundColor Cyan
}

# Clean other cache directories
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Starting Next.js development server..." -ForegroundColor Cyan
Write-Host ""

# Start the dev server
npm run dev
