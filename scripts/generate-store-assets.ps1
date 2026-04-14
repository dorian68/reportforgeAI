param(
  [string]$SitePath = (Join-Path $PSScriptRoot "..\dist\site.html"),
  [string]$OutputDir = (Join-Path $PSScriptRoot "..\assets"),
  [string]$ChromePath = ""
)

$ErrorActionPreference = "Stop"

function Resolve-ChromePath {
  param([string]$ExplicitPath)

  if ($ExplicitPath -and (Test-Path $ExplicitPath)) {
    return (Resolve-Path $ExplicitPath).Path
  }

  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return (Resolve-Path $candidate).Path
    }
  }

  throw "Chrome or Edge headless browser not found. Install Chrome/Edge or pass -ChromePath."
}

function Convert-ToFileUrl {
  param(
    [string]$PathValue,
    [string]$Query = ""
  )

  $normalized = $PathValue -replace "\\", "/"
  return "file:///$normalized$Query"
}

if (-not (Test-Path $SitePath)) {
  throw "Site HTML not found at '$SitePath'. Run 'npm run build:dev' first."
}

$resolvedSitePath = (Resolve-Path $SitePath).Path
$resolvedOutputDir = (Resolve-Path (New-Item -ItemType Directory -Force -Path $OutputDir)).Path
$resolvedChromePath = Resolve-ChromePath -ExplicitPath $ChromePath
$runtimeDir = Join-Path $env:TEMP ("reportforge-site-capture-" + [guid]::NewGuid().ToString("N"))
$resolvedRuntimeDir = (Resolve-Path (New-Item -ItemType Directory -Force -Path $runtimeDir)).Path

$shots = @(
  @{
    Name = "reportforge-store-shot-01.png"
    Url = (Convert-ToFileUrl -PathValue $resolvedSitePath -Query "?capture=taskpane")
    Size = "1366,768"
  },
  @{
    Name = "reportforge-store-shot-02.png"
    Url = (Convert-ToFileUrl -PathValue $resolvedSitePath -Query "?capture=deck")
    Size = "1366,768"
  },
  @{
    Name = "reportforge-store-shot-03.png"
    Url = (Convert-ToFileUrl -PathValue $resolvedSitePath -Query "?capture=dashboard")
    Size = "1366,768"
  },
  @{
    Name = "reportforge-store-banner-01.png"
    Url = (Convert-ToFileUrl -PathValue $resolvedSitePath)
    Size = "1600,900"
  }
)

foreach ($shot in $shots) {
  $outputPath = Join-Path $resolvedOutputDir $shot.Name
  if (Test-Path $outputPath) {
    Remove-Item -Force $outputPath
  }
  $arguments = @(
    "--headless=new"
    "--disable-gpu"
    "--hide-scrollbars"
    "--disable-crash-reporter"
    "--disable-breakpad"
    "--no-sandbox"
    "--no-first-run"
    "--no-default-browser-check"
    "--run-all-compositor-stages-before-draw"
    "--force-device-scale-factor=1"
    "--virtual-time-budget=3000"
    "--user-data-dir=$resolvedRuntimeDir"
    "--window-size=$($shot.Size)"
    "--screenshot=$outputPath"
    $shot.Url
  )

  Write-Host "Generating $($shot.Name)..."
  & $resolvedChromePath @arguments | Out-Null

  if (-not (Test-Path $outputPath)) {
    throw "Screenshot generation failed for $($shot.Name)."
  }
}

Write-Host "Store assets generated in $resolvedOutputDir"

if (Test-Path $resolvedRuntimeDir) {
  Remove-Item -Recurse -Force $resolvedRuntimeDir -ErrorAction SilentlyContinue
}
