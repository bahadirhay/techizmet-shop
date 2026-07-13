# Terk sepet cron — GitHub secret senkronu
# Kullanim: .\scripts\setup-cart-cron-github.ps1
#
# Ilk calistirmada tarayicida GitHub girisi istenir (gh auth login).

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$gh = Join-Path $PSScriptRoot "gh.ps1"
if (-not (Test-Path $gh)) { throw "scripts/gh.ps1 bulunamadi" }

Write-Host ""
Write-Host "=== Cart abandonment cron — GitHub secret kurulumu ===" -ForegroundColor Cyan
Write-Host ""

# 1) GitHub girisi
$loggedIn = $false
try {
  & $gh auth status 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $loggedIn = $true }
} catch { }

if (-not $loggedIn) {
  Write-Host "GitHub girisi gerekli. Sorular:" -ForegroundColor Yellow
  Write-Host "  - GitHub.com"
  Write-Host "  - HTTPS"
  Write-Host "  - Login with a web browser"
  Write-Host ""
  & $gh auth login
  if ($LASTEXITCODE -ne 0) {
    Write-Error "GitHub girisi basarisiz. Tekrar deneyin."
    exit 1
  }
}

Write-Host ""
Write-Host "GitHub girisi OK." -ForegroundColor Green

# 2) Secret senkronu
& (Join-Path $PSScriptRoot "sync-github-cron-secret.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3) Opsiyonel: workflow test
Write-Host ""
$run = Read-Host "Cron workflow'u simdi test etmek ister misiniz? (E/h)"
if ($run -eq "" -or $run -eq "E" -or $run -eq "e") {
  & $gh workflow run "Cart abandonment reminder cron" --repo bahadirhay/techizmet-shop
  Write-Host "Workflow tetiklendi. GitHub Actions'tan sonucu kontrol edin:"
  Write-Host "  https://github.com/bahadirhay/techizmet-shop/actions" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Tamamlandi." -ForegroundColor Green
