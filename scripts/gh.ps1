# GitHub CLI sarmalayici — PATH gerekmez
$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
  Write-Error "GitHub CLI bulunamadi. Kurulum: winget install GitHub.cli"
  exit 1
}
& $gh @args
exit $LASTEXITCODE
