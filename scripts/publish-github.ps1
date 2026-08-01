param(
  [switch]$SkipSourceSync,
  [switch]$SkipPagesPublish
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$pagesUrl = "https://shaoboqian-arch.github.io/meizhaung-pages/"

function Invoke-Native {
  param([scriptblock]$Command, [string]$FailureMessage)
  & $Command
  if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

try {
  Invoke-Native { gh auth status } "GitHub CLI is not authenticated"
  if (-not $SkipPagesPublish) {
    Push-Location $projectRoot
    try {
      Invoke-Native { npm run build:pages } "GitHub Pages build failed"
    } finally {
      Pop-Location
    }
  }

  if (-not $SkipSourceSync) {
    $env:GH_TOKEN = (& gh auth token)
    if ($LASTEXITCODE -ne 0 -or -not $env:GH_TOKEN) { throw "Unable to read GitHub token" }
    Push-Location $projectRoot
    try {
      Invoke-Native { node scripts/publish-source-api.mjs } "GitHub source API sync failed"
    } finally {
      Pop-Location
      Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
    }
  }

  if (-not $SkipPagesPublish) {
    $env:GH_TOKEN = (& gh auth token)
    if ($LASTEXITCODE -ne 0 -or -not $env:GH_TOKEN) { throw "Unable to read GitHub token" }
    Push-Location $projectRoot
    try {
      Invoke-Native { node scripts/publish-pages-api.mjs } "GitHub Pages API publish failed"
    } finally {
      Pop-Location
      Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
    }

    $expectedAsset = (Get-Content -Raw -LiteralPath (Join-Path $projectRoot "dist\index.html") | Select-String -Pattern "assets/index-[A-Za-z0-9_-]+\.js").Matches.Value
    $deployed = $false
    for ($attempt = 1; $attempt -le 30; $attempt++) {
      try {
        $response = Invoke-WebRequest -Uri "$pagesUrl`?release=$stamp-$attempt" -UseBasicParsing -Headers @{ "Cache-Control" = "no-cache" }
        if ($response.StatusCode -eq 200 -and $response.Content.Contains($expectedAsset)) {
          $deployed = $true
          break
        }
      } catch { }
      Start-Sleep -Seconds 5
    }
    if (-not $deployed) { throw "Code was pushed but the live site did not update in time" }
    Write-Host "Published: $pagesUrl"
  }
} finally {
  Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
}
