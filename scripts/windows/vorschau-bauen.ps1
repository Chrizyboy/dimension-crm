# Stellt die Vorschau-Fassung zusammen: main plus alle offenen Änderungen (Pull Requests, ohne Entwürfe).
# Aufgerufen von vorschau.ps1 beim Start und danach jede Minute im Hintergrund. Was drin ist, steht in
# .vorschau-stand.json im Vorschau-Ordner; vorschau.ps1 liest das am Schluss für «Veröffentlichen».
# Mit -Bisher (Kennung des letzten Stands) wird nur neu gebaut, wenn sich main oder eine Änderung bewegt hat.
param([string]$Haupt, [string]$Vorschau, [string]$Repo, [string]$Bisher = '')

$ErrorActionPreference = 'Continue'
$Datei = Join-Path $Vorschau '.vorschau-stand.json'

# Offene Änderungen kommen ohne Anmeldung von GitHub (Repository öffentlich).
$offen = @()
try {
  $antwort = Invoke-RestMethod "https://api.github.com/repos/$Repo/pulls?state=open&base=main&per_page=30" -TimeoutSec 15
  $offen = @($antwort | Where-Object { -not $_.draft } | Sort-Object number)
} catch {
  # Im Hintergrund lieber den bisherigen Stand behalten als alles auf main zurückzusetzen.
  if ($Bisher) { return }
}

Set-Location $Haupt
$specs = @('+refs/heads/main:refs/vorschau/main')
foreach ($pr in $offen) { $specs += "+refs/pull/$($pr.number)/head:refs/vorschau/pr-$($pr.number)" }
git fetch -q origin @specs 2>$null
if ($LASTEXITCODE -ne 0) { return }

$basis = git rev-parse refs/vorschau/main
$teile = @($basis)
foreach ($pr in $offen) { $teile += "$($pr.number)=$(git rev-parse "refs/vorschau/pr-$($pr.number)")" }
$kennung = $teile -join ','
if ($Bisher -and $kennung -eq $Bisher) { return }

if (-not (Test-Path (Join-Path $Vorschau '.git'))) {
  git worktree prune
  git worktree add --detach $Vorschau $basis
  if ($LASTEXITCODE -ne 0) { return }
}

Set-Location $Vorschau
# Nur eine Kopie zum Anschauen: lokale Reste (z. B. von Vite neu erzeugte Dateien) werden verworfen.
git checkout -q --detach -f $basis
$drin = @()
$nicht = @()
foreach ($pr in $offen) {
  $sha = git rev-parse "refs/vorschau/pr-$($pr.number)"
  git -c user.name=Vorschau -c user.email=vorschau@localhost merge -q --no-edit --no-ff $sha 2>$null | Out-Null
  $eintrag = [pscustomobject]@{ nummer = $pr.number; titel = $pr.title; sha = $sha }
  if ($LASTEXITCODE -eq 0) { $drin += $eintrag } else {
    # Passt nicht mit den anderen zusammen: diese eine Änderung weglassen, den Rest trotzdem zeigen.
    git merge --abort 2>$null
    $nicht += $eintrag
  }
}

$stand = [pscustomobject]@{ kennung = $kennung; prs = $drin; uebersprungen = $nicht; zeit = (Get-Date -Format 'HH:mm') }
ConvertTo-Json -InputObject $stand -Depth 4 | Set-Content -Encoding UTF8 $Datei
