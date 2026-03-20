# Mobile App Cleanup Script
# This script will clean up unnecessary directories and keep only the essential mobile app code

# Set the base directory
$baseDir = "C:\Users\NYTP\OneDrive - nytp.com\Desktop\AttendEase\attendease-main\attendease-main"

# Create a backup of the entire directory first
$backupPath = "$baseDir-backup-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "Creating backup at: $backupPath" -ForegroundColor Yellow
if (-not (Test-Path $backupPath)) {
    Copy-Item -Path $baseDir -Destination $backupPath -Recurse -Force
    Write-Host "Backup created successfully!" -ForegroundColor Green
} else {
    Write-Host "Backup already exists at: $backupPath" -ForegroundColor Yellow
}

# Directories to remove
$directoriesToRemove = @(
    "AttendEaseMobile-backup",
    "AttendEdgeNew",
    "MobileApp",
    "temp-app",
    "temp-attendease",
    "temp-attendedge",
    "attendedge-fresh",
    "fresh-attendedge",
    "fresh-attendedge-backup",
    "dist",
    "archive",
    "marketing",
    "data"
)

# Files to remove
$filesToRemove = @(
    "*.bat",
    "*.sql",
    "*.js",
    "*.mjs",
    "*.lockb",
    "*.md",
    "db_types.ts",
    "check_rls_*",
    "create-rls-*",
    "direct-*",
    "fix-*",
    "migrate-*",
    "run-*",
    "test-*",
    "verify-*"
)

# Remove directories
Write-Host "`nRemoving unnecessary directories..." -ForegroundColor Yellow
foreach ($dir in $directoriesToRemove) {
    $fullPath = Join-Path $baseDir $dir
    if (Test-Path $fullPath) {
        try {
            Remove-Item -Path $fullPath -Recurse -Force -ErrorAction Stop
            Write-Host "Removed directory: $dir" -ForegroundColor Green
        } catch {
            Write-Host "Failed to remove $dir : $_" -ForegroundColor Red
        }
    }
}

# Remove files
Write-Host "`nRemoving unnecessary files..." -ForegroundColor Yellow
foreach ($filePattern in $filesToRemove) {
    Get-ChildItem -Path $baseDir -Filter $filePattern -Recurse -File | ForEach-Object {
        try {
            Remove-Item -Path $_.FullName -Force -ErrorAction Stop
            Write-Host "Removed file: $($_.Name)" -ForegroundColor Green
        } catch {
            Write-Host "Failed to remove $($_.Name) : $_" -ForegroundColor Red
        }
    }
}

Write-Host "`nCleanup completed!" -ForegroundColor Green
Write-Host "Mobile app directories kept:" -ForegroundColor Cyan
Write-Host "- AttendEaseMobile/" -ForegroundColor Cyan
Write-Host "- AttendEdgeMobile/" -ForegroundColor Cyan

# Instructions for setting up the mobile environment
Write-Host "`nNext steps to set up the mobile development environment:" -ForegroundColor Yellow
Write-Host "1. Install Node.js (v16 or later) from https://nodejs.org/"
Write-Host "2. Install Yarn: npm install -g yarn"
Write-Host "3. Install Expo CLI: npm install -g expo-cli"
Write-Host "4. Navigate to the mobile app directory: cd 'C:\Users\NYTP\OneDrive - nytp.com\Desktop\AttendEase\attendease-main\attendease-main\AttendEaseMobile'"
Write-Host "5. Install dependencies: yarn install"
Write-Host "6. Start the development server: expo start"

# Check if Node.js is installed
$nodeVersion = (node -v) -replace 'v',''
if ($nodeVersion) {
    Write-Host "`nNode.js is installed (v$nodeVersion)" -ForegroundColor Green
} else {
    Write-Host "`nNode.js is not installed. Please install it from https://nodejs.org/" -ForegroundColor Red
}
