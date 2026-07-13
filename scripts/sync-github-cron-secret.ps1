# GitHub Actions CRON_SECRET_ANATOLIANPAW = Vercel CRON_SECRET
# Kullanim: .\scripts\sync-github-cron-secret.ps1
# Once: gh auth login

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$ghWrapper = Join-Path $PSScriptRoot "gh.ps1"
$ghExe = "C:\Program Files\GitHub CLI\gh.exe"
if (Test-Path $ghWrapper) {
  $gh = $ghWrapper
} elseif (Test-Path $ghExe) {
  $gh = $ghExe
} else {
  $cmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($cmd) { $gh = $cmd.Source } else { throw "GitHub CLI yok. winget install GitHub.cli" }
}

$envFile = if (Test-Path ".env.anatolianpaw") { ".env.anatolianpaw" } else { ".env" }
if (-not (Test-Path $envFile)) { throw "Env dosyasi bulunamadi: $envFile" }

$line = Select-String -Path $envFile -Pattern '^CRON_SECRET="([^"]+)"' | Select-Object -First 1
if (-not $line) { throw "CRON_SECRET $envFile icinde yok" }
$secret = $line.Matches.Groups[1].Value

try {
  & $gh auth status 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "not logged in" }
} catch {
  Write-Host ""
  Write-Host "GitHub'a giris yapilmamis. Once su komutu calistirin:" -ForegroundColor Yellow
  Write-Host "  & `"$gh`" auth login" -ForegroundColor Cyan
  Write-Host ""
  exit 1
}
& $gh secret set CRON_SECRET_ANATOLIANPAW --repo bahadirhay/techizmet-shop --body $secret
Write-Host "CRON_SECRET_ANATOLIANPAW GitHub'a yazildi (Vercel CRON_SECRET ile eslesmeli)."
