# Anatolian Paw - yerel kurulum yardimcisi
# Kullanim: .\scripts\setup-anatolianpaw.ps1
# Once Neon'dan DATABASE_URL alip .env.anatolianpaw dosyasini doldurun.

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$EnvFile = Join-Path $Root ".env.anatolianpaw"
$Example = Join-Path $Root ".env.anatolianpaw.example"

if (-not (Test-Path $EnvFile)) {
  if (-not (Test-Path $Example)) {
    throw ".env.anatolianpaw.example bulunamadi"
  }
  Copy-Item $Example $EnvFile
  Write-Host "Olusturuldu: .env.anatolianpaw - DATABASE_URL ve ADMIN_PASSWORD doldurun, sonra scripti tekrar calistirin."
  exit 1
}

$envContent = Get-Content $EnvFile -Raw
$databaseUrl = $null
$adminPassword = $null
foreach ($line in ($envContent -split "`r?`n")) {
  $trimmed = $line.Trim()
  if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
  if ($trimmed -match '^(\w+)=(.*)$') {
    $key = $matches[1]
    $value = $matches[2].Trim()
    if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if ($key -eq "DATABASE_URL") { $databaseUrl = $value }
    if ($key -eq "ADMIN_PASSWORD") { $adminPassword = $value }
  }
}

if (-not $databaseUrl -or $databaseUrl -match 'USER:PASSWORD@HOST' -or $databaseUrl -notmatch '^postgresql://') {
  Write-Host "HATA: .env.anatolianpaw icinde gecerli DATABASE_URL (Neon) girin."
  exit 1
}
if (-not $adminPassword -or $adminPassword.Length -lt 8) {
  Write-Host "HATA: .env.anatolianpaw icinde en az 8 karakter ADMIN_PASSWORD girin."
  exit 1
}

Copy-Item $EnvFile (Join-Path $Root ".env") -Force
Write-Host ">> .env.anatolianpaw -> .env kopyalandi"

Write-Host ">> prisma db push..."
npm run db:push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">> store provision (anatolianpaw preset, mirror vitrin)..."
npm run store:provision -- --preset=anatolianpaw --slug=anatolianpaw --name="Anatolian Paw" --url=https://anatolianpaw.com
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">> gorsel paketi (logo, hero, urunler)..."
npm run store:seed:anatolianpaw
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "=== Hazir ==="
Write-Host "  npm run dev:paw"
Write-Host "  Vitrin : http://localhost:5556"
Write-Host "  Admin  : http://localhost:5556/admin  (admin / ADMIN_PASSWORD)"
Write-Host ""
Write-Host "Canli: ayri Vercel projesi + env degiskenleri + anatolianpaw.com DNS"
