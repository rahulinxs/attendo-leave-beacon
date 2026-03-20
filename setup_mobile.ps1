# Mobile App Setup Script
# This script will help set up the mobile development environment

# Set the base directory
$baseDir = "C:\Users\NYTP\OneDrive - nytp.com\Desktop\AttendEase\attendease-main\attendease-main"
$mobileAppDir = "$baseDir\AttendEaseMobile"

# Function to check if a command exists
function Test-CommandExists {
    param ($command)
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

# Check if Node.js is installed
Write-Host "`nChecking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = (node -v) -replace 'v',''
if ($nodeVersion) {
    Write-Host "✓ Node.js v$nodeVersion is installed" -ForegroundColor Green
    
    # Check Node.js version
    $nodeMajorVersion = [int]($nodeVersion -split '\\.')[0]
    if ($nodeMajorVersion -lt 16) {
        Write-Host "! Node.js version $nodeVersion is below the recommended version 16 or higher" -ForegroundColor Red
        Write-Host "  Please update Node.js from https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✗ Node.js is not installed" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if Yarn is installed
Write-Host "`nChecking Yarn installation..." -ForegroundColor Yellow
if (Test-CommandExists "yarn") {
    $yarnVersion = (yarn -v)
    Write-Host "✓ Yarn v$yarnVersion is installed" -ForegroundColor Green
} else {
    Write-Host "! Yarn is not installed. Installing Yarn..." -ForegroundColor Yellow
    npm install -g yarn
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install Yarn" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Yarn installed successfully" -ForegroundColor Green
}

# Check if Expo CLI is installed
Write-Host "`nChecking Expo CLI installation..." -ForegroundColor Yellow
if (Test-CommandExists "expo") {
    $expoVersion = (expo --version | Select-Object -First 1)
    Write-Host "✓ Expo CLI v$expoVersion is installed" -ForegroundColor Green
} else {
    Write-Host "! Expo CLI is not installed. Installing Expo CLI..." -ForegroundColor Yellow
    npm install -g expo-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install Expo CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Expo CLI installed successfully" -ForegroundColor Green
}

# Install project dependencies
if (Test-Path $mobileAppDir) {
    Write-Host "`nInstalling project dependencies..." -ForegroundColor Yellow
    Set-Location $mobileAppDir
    
    # Check if node_modules exists
    if (-not (Test-Path "$mobileAppDir\node_modules")) {
        Write-Host "Installing dependencies with Yarn..."
        yarn install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
            exit 1
        }
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "✓ Dependencies are already installed" -ForegroundColor Green
    }
    
    # Check for .env file
    if (-not (Test-Path "$mobileAppDir\.env")) {
        Write-Host "`nCreating .env file..." -ForegroundColor Yellow
        @"
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# App Configuration
EXPO_PUBLIC_API_URL=your_api_url_here
"@ | Out-File -FilePath "$mobileAppDir\.env" -Encoding utf8
        
        Write-Host "✓ Created .env file. Please update it with your configuration." -ForegroundColor Green
        Write-Host "  File location: $mobileAppDir\.env" -ForegroundColor Cyan
    } else {
        Write-Host "✓ .env file already exists" -ForegroundColor Green
    }
    
    # Provide next steps
    Write-Host "`n🎉 Setup completed successfully!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Update the .env file with your configuration"
    Write-Host "2. Start the development server: expo start"
    Write-Host "3. Press 'a' to run on Android emulator or 'i' for iOS simulator"
    Write-Host "   (Make sure you have an emulator/simulator set up)"
    Write-Host "4. Press 'w' to open in web browser"
    
} else {
    Write-Host "✗ Mobile app directory not found: $mobileAppDir" -ForegroundColor Red
    Write-Host "  Please make sure you've run the cleanup script first" -ForegroundColor Yellow
    exit 1
}
