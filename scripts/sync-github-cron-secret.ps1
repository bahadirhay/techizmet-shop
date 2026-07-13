# GitHub Actions CRON_SECRET_ANATOLIANPAW = Vercel CRON_SECRET
# Kullanim: .\scripts\sync-github-cron-secret.ps1
# Once: gh auth login

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
  $gh = (Get-Command gh -ErrorAction SilentlyContinue)?.Source
}
if (-not $gh) {
  throw "GitHub CLI (gh) yok. winget install GitHub.cli"
}

$envFile = if (Test-Path ".env.anatolianpaw") { ".env.anatolianpaw" } else { ".env" }
if (-not (Test-Path $envFile)) { throw "Env dosyasi bulunamadi: $envFile" }

$line = Select-String -Path $envFile -Pattern '^CRON_SECRET="([^"]+)"' | Select-Object -First 1
if (-not $line) { throw "CRON_SECRET $envFile icinde yok" }
$secret = $line.Matches.Groups[1].Value

& $gh auth status | Out-Null
& $gh secret set CRON_SECRET_ANATOLIANPAW --repo bahadirhay/techizmet-shop --body $secret
Write-Host "CRON_SECRET_ANATOLIANPAW GitHub'a yazildi (Vercel CRON_SECRET ile eslesmeli)."
