# Anatolian Paw - yerel DB + Vercel build hazirligi (tek komut)
#
# 1) scripts/setup-anatolianpaw.config.example.json -> setup-anatolianpaw.config.json kopyala, doldur
# 2) npm run setup:paw:prod
#
# Etkileşimli:  npm run setup:paw:prod -- -Interactive
# Vercel env CLI: npm run setup:paw:prod -- -SetVercelEnv  (npx vercel gerekir, proje linkli olmalı)

param(
  [string]$ConfigPath = "",
  [switch]$Interactive,
  [switch]$SetVercelEnv,
  [switch]$SkipSeed,
  [switch]$SkipBuildCheck
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function New-RandomSecret([int]$Length = 48) {
  $bytes = New-Object byte[] $Length
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes).Replace("+", "x").Replace("/", "y").Substring(0, $Length)
}

function Read-Secret([string]$Prompt) {
  $sec = Read-Host $Prompt -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Invoke-Step([string]$Label, [scriptblock]$Action) {
  Write-Host ""
  Write-Host ">> $Label" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "Adim basarisiz: $Label (exit $LASTEXITCODE)"
  }
}

function Write-EnvLine([System.Text.StringBuilder]$Sb, [string]$Key, [string]$Value, [switch]$Quote) {
  if ($null -eq $Value) { return }
  $v = $Value.Trim()
  if ($v -eq "") { return }
  if ($Quote) {
    $escaped = $v.Replace('"', '\"')
    [void]$Sb.AppendLine("$Key=`"$escaped`"")
  } else {
    [void]$Sb.AppendLine("$Key=$v")
  }
}

function Show-VercelEnvTable($Cfg) {
  $vars = [ordered]@{
    DATABASE_URL            = $Cfg.databaseUrl
    STORE_SITE_SLUG         = $Cfg.storeSiteSlug
    SESSION_SECRET          = $Cfg.sessionSecret
    NEXT_PUBLIC_SITE_URL    = $Cfg.publicUrl
    NEXT_PUBLIC_STORE_URL   = $Cfg.publicUrl
    ADMIN_PASSWORD          = $Cfg.adminPassword
    MAIL_FROM               = $Cfg.mailFrom
    SMTP_HOST               = $Cfg.smtp.host
    SMTP_PORT               = $Cfg.smtp.port
    SMTP_USER               = $Cfg.smtp.user
    SMTP_PASSWORD           = $Cfg.smtp.password
    CRON_SECRET             = $Cfg.cronSecret
  }

  Write-Host ""
  Write-Host "=== Vercel: Project -> Settings -> Environment Variables ===" -ForegroundColor Yellow
  Write-Host "Her satir icin Production + Preview isaretleyin."
  Write-Host "DATABASE_URL icin ayrica BUILD kutusunu isaretleyin (mirror prebuild icin zorunlu)."
  Write-Host ""
  foreach ($entry in $vars.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace([string]$entry.Value)) { continue }
    Write-Host ("  {0}" -f $entry.Key) -ForegroundColor Green
    Write-Host ("    {0}" -f $entry.Value)
  }
  Write-Host ""
  Write-Host "Kaydettikten sonra: Deployments -> son deploy -> Redeploy (Clear build cache onerilir)"
}

function Set-VercelEnvFromConfig($Cfg) {
  if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw "npx bulunamadi"
  }
  $projectJson = Join-Path $Root ".vercel\project.json"
  if (-not (Test-Path $projectJson)) {
    Write-Host "Vercel projesi linkli degil. Once: npx vercel@latest link" -ForegroundColor Yellow
    return
  }

  $pairs = @{
    DATABASE_URL          = $Cfg.databaseUrl
    STORE_SITE_SLUG       = $Cfg.storeSiteSlug
    SESSION_SECRET        = $Cfg.sessionSecret
    NEXT_PUBLIC_SITE_URL  = $Cfg.publicUrl
    NEXT_PUBLIC_STORE_URL = $Cfg.publicUrl
    ADMIN_PASSWORD        = $Cfg.adminPassword
    MAIL_FROM             = $Cfg.mailFrom
    SMTP_HOST             = $Cfg.smtp.host
    SMTP_PORT             = $Cfg.smtp.port
    SMTP_USER             = $Cfg.smtp.user
    SMTP_PASSWORD         = $Cfg.smtp.password
    CRON_SECRET           = $Cfg.cronSecret
  }

  $targets = @("production", "preview")
  foreach ($kv in $pairs.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace([string]$kv.Value)) { continue }
    foreach ($target in $targets) {
      Write-Host "  vercel env add $($kv.Key) $target"
      $kv.Value | npx --yes vercel@latest env add $kv.Key $target --force 2>$null
      if ($kv.Key -eq "DATABASE_URL") {
        $kv.Value | npx --yes vercel@latest env add $kv.Key development --force 2>$null
      }
    }
  }
  Write-Host "Vercel env guncellendi (CLI). Panelden DATABASE_URL -> Build kutusunu dogrulayin."
}

# --- Config yukle ---
if (-not $ConfigPath) {
  $ConfigPath = Join-Path $PSScriptRoot "setup-anatolianpaw.config.json"
}
$ExamplePath = Join-Path $PSScriptRoot "setup-anatolianpaw.config.example.json"

$cfg = $null
if ($Interactive) {
  Write-Host "=== Anatolian Paw kurulum (etkilesimli) ===" -ForegroundColor Cyan
  $cfg = [PSCustomObject]@{
    databaseUrl   = Read-Host "Neon DATABASE_URL (pooler)"
    adminPassword = Read-Secret "Admin sifresi (min 8 karakter)"
    storeSiteSlug = (Read-Host "STORE_SITE_SLUG [anatolianpaw]").Trim()
    publicUrl     = Read-Host "Canli URL (ornek: https://xxx.vercel.app)"
    sessionSecret = ""
    mailFrom      = "Anatolian Paw <siparis@anatolianpaw.com>"
    smtp          = [PSCustomObject]@{
      host     = (Read-Host "SMTP host [smtp.yandex.com]").Trim()
      port     = (Read-Host "SMTP port [465]").Trim()
      user     = Read-Host "SMTP user"
      password = Read-Secret "SMTP sifre (bos birakilabilir)"
    }
    cronSecret      = ""
    skipSeed        = $SkipSeed.IsPresent
    skipBuildCheck  = $SkipBuildCheck.IsPresent
    setVercelEnv    = $SetVercelEnv.IsPresent
  }
  if ([string]::IsNullOrWhiteSpace($cfg.storeSiteSlug)) { $cfg.storeSiteSlug = "anatolianpaw" }
  if ([string]::IsNullOrWhiteSpace($cfg.smtp.host)) { $cfg.smtp.host = "smtp.yandex.com" }
  if ([string]::IsNullOrWhiteSpace($cfg.smtp.port)) { $cfg.smtp.port = "465" }
} elseif (-not (Test-Path $ConfigPath)) {
  if (-not (Test-Path $ExamplePath)) {
    throw "Ornek config bulunamadi: $ExamplePath"
  }
  Copy-Item $ExamplePath $ConfigPath
  Write-Host "Olusturuldu: $ConfigPath" -ForegroundColor Yellow
  Write-Host "DATABASE_URL, adminPassword ve publicUrl doldurun, sonra tekrar calistirin:"
  Write-Host "  npm run setup:paw:prod"
  exit 1
} else {
  $raw = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $cfg = [PSCustomObject]@{
    databaseUrl     = [string]$raw.databaseUrl
    adminPassword   = [string]$raw.adminPassword
    storeSiteSlug   = if ($raw.storeSiteSlug) { [string]$raw.storeSiteSlug } else { "anatolianpaw" }
    publicUrl       = [string]$raw.publicUrl
    sessionSecret   = [string]$raw.sessionSecret
    mailFrom        = if ($raw.mailFrom) { [string]$raw.mailFrom } else { "Anatolian Paw <siparis@anatolianpaw.com>" }
    smtp            = [PSCustomObject]@{
      host     = if ($raw.smtp.host) { [string]$raw.smtp.host } else { "" }
      port     = if ($raw.smtp.port) { [string]$raw.smtp.port } else { "" }
      user     = if ($raw.smtp.user) { [string]$raw.smtp.user } else { "" }
      password = if ($raw.smtp.password) { [string]$raw.smtp.password } else { "" }
    }
    cronSecret      = if ($raw.cronSecret) { [string]$raw.cronSecret } else { "" }
    skipSeed        = [bool]($raw.skipSeed -or $SkipSeed)
    skipBuildCheck  = [bool]($raw.skipBuildCheck -or $SkipBuildCheck)
    setVercelEnv    = [bool]($raw.setVercelEnv -or $SetVercelEnv)
  }
}

# --- Dogrulama ---
if ($cfg.databaseUrl -notmatch "^postgresql://") {
  throw "Gecersiz DATABASE_URL - Neon pooler connection string girin"
}
if ($cfg.adminPassword.Length -lt 8) {
  throw "adminPassword en az 8 karakter olmali"
}
if ($cfg.publicUrl -notmatch "^https?://") {
  throw "publicUrl https://... formatinda olmali (Vercel .vercel.app veya domain)"
}
if ([string]::IsNullOrWhiteSpace($cfg.sessionSecret) -or $cfg.sessionSecret.Length -lt 32) {
  $cfg.sessionSecret = New-RandomSecret 48
  Write-Host "SESSION_SECRET otomatik uretildi." -ForegroundColor DarkGray
}
if ([string]::IsNullOrWhiteSpace($cfg.cronSecret)) {
  $cfg.cronSecret = New-RandomSecret 32
}

# --- .env.anatolianpaw yaz ---
$EnvFile = Join-Path $Root ".env.anatolianpaw"
$sb = New-Object System.Text.StringBuilder
Write-EnvLine $sb "DATABASE_URL" $cfg.databaseUrl -Quote
Write-EnvLine $sb "SESSION_SECRET" $cfg.sessionSecret -Quote
Write-EnvLine $sb "ADMIN_PASSWORD" $cfg.adminPassword -Quote
Write-EnvLine $sb "STORE_SITE_SLUG" $cfg.storeSiteSlug
Write-EnvLine $sb "NEXT_PUBLIC_STORE_URL" $cfg.publicUrl -Quote
Write-EnvLine $sb "NEXT_PUBLIC_SITE_URL" $cfg.publicUrl -Quote
Write-EnvLine $sb "MAIL_FROM" $cfg.mailFrom -Quote
Write-EnvLine $sb "CRON_SECRET" $cfg.cronSecret -Quote
Write-EnvLine $sb "SMTP_HOST" $cfg.smtp.host -Quote
Write-EnvLine $sb "SMTP_PORT" $cfg.smtp.port
Write-EnvLine $sb "SMTP_USER" $cfg.smtp.user -Quote
Write-EnvLine $sb "SMTP_PASSWORD" $cfg.smtp.password -Quote
Set-Content -Path $EnvFile -Value $sb.ToString().TrimEnd() -Encoding UTF8
Copy-Item $EnvFile (Join-Path $Root ".env") -Force
Write-Host ".env.anatolianpaw ve .env yazildi." -ForegroundColor Green

Invoke-Step "npm install (gerekirse)" { npm install }
Invoke-Step "Prisma sema (db:push)" { npm run db:push }
Invoke-Step "Magaza provision (anatolianpaw)" {
  npm run store:provision -- --env-file=.env.anatolianpaw --preset=anatolianpaw --slug=$($cfg.storeSiteSlug) --name="Anatolian Paw" --url=$($cfg.publicUrl)
}

if (-not $cfg.skipSeed) {
  Invoke-Step "Gorsel paketi (logo, hero)" { npm run store:seed:anatolianpaw }
}

Invoke-Step "Sifre sifirlama tablosu" { npm run db:migrate-password-reset }

if (-not $cfg.skipBuildCheck) {
  Invoke-Step "Build hazirlik kontrolu (tsc + mirror prebuild)" {
    node --require ./scripts/shim-server-only.cjs ./node_modules/tsx/dist/cli.mjs scripts/check-vercel-build-ready.ts --prebuild --env-file=.env.anatolianpaw
  }
} else {
  Invoke-Step "Hizli kontrol (tsc)" {
    node --require ./scripts/shim-server-only.cjs ./node_modules/tsx/dist/cli.mjs scripts/check-vercel-build-ready.ts --env-file=.env.anatolianpaw
  }
}

Show-VercelEnvTable $cfg

if ($cfg.setVercelEnv) {
  Invoke-Step "Vercel env (CLI)" { Set-VercelEnvFromConfig $cfg }
}

Write-Host ""
Write-Host "=== Yerel calistirma ===" -ForegroundColor Green
Write-Host "  npm run dev:paw"
Write-Host "  Vitrin: http://localhost:5556"
Write-Host "  Admin : http://localhost:5556/admin  (admin / sizin sifreniz)"
Write-Host ""
Write-Host "=== Git + Vercel ===" -ForegroundColor Green
Write-Host "  git push"
Write-Host "  Vercel panelden Redeploy (build cache temizle)"
Write-Host ""
