# Source and destination paths
$sourceDir = "C:\Users\NYTP\OneDrive - nytp.com\Desktop\AttendEase\attendease-main\attendease-main"
$destDir = "C:\Users\NYTP\OneDrive - nytp.com\Desktop\AttendEase\attendease-main\attendease-main-new"

# Create destination directory if it doesn't exist
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
}

# Files to copy
$filesToCopy = @(
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.node.json",
    "tsconfig.app.json",
    "vite.config.ts",
    "index.html",
    ".gitignore",
    "postcss.config.js",
    "tailwind.config.ts"
)

# Directories to copy
$dirsToCopy = @(
    "public",
    "src"
)

# Copy files
foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $sourceDir $file
    $destPath = Join-Path $destDir $file
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Copied: $file"
    } else {
        Write-Host "Warning: $file not found" -ForegroundColor Yellow
    }
}

# Copy directories
foreach ($dir in $dirsToCopy) {
    $sourcePath = Join-Path $sourceDir $dir
    $destPath = Join-Path $destDir $dir
    
    if (Test-Path $sourcePath) {
        if (-not (Test-Path $destPath)) {
            New-Item -ItemType Directory -Path $destPath | Out-Null
        }
        
        # Use robocopy for better performance with large directory trees
        $robocopyArgs = @(
            "$sourcePath",
            "$destPath",
            "/E",     # Copy subdirectories, including empty ones
            "/ZB",     # Use restartable mode; if access denied, use backup mode
            "/R:3",    # Retry 3 times
            "/W:10",   # Wait 10 seconds between retries
            "/NP",     # No progress (don't display percentage copied)
            "/NFL",    # No file list
            "/NDL",    # No directory list
            "/NJH",    # No job header
            "/NJS"     # No job summary
        )
        
        $process = Start-Process -FilePath "robocopy.exe" -ArgumentList $robocopyArgs -NoNewWindow -Wait -PassThru
        
        # robocopy returns success codes 0-7
        if ($process.ExitCode -le 7) {
            Write-Host "Copied directory: $dir"
        } else {
            Write-Host "Error copying directory: $dir (Exit code: $($process.ExitCode))" -ForegroundColor Red
        }
    } else {
        Write-Host "Warning: Directory $dir not found" -ForegroundColor Yellow
    }
}

Write-Host "\nCopy operation completed!" -ForegroundColor Green
Write-Host "New web app location: $destDir" -ForegroundColor Cyan
