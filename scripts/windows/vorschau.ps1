# Dimension Work Vorschau: die neuste Fassung (oder eine einzelne Änderung) am PC anschauen, bevor sie
# veröffentlicht wird. Gestartet über die Desktop-Verknüpfung «Dimension Work Vorschau» (einrichten.ps1).
#
# Läuft in einem eigenen Ordner (%USERPROFILE%\dimension-crm-vorschau, git worktree), damit der Ordner für
# «Dimension Work aktualisieren» immer sauber auf main bleibt. Öffnet http://localhost:1420 mit den echten
# Cloud-Daten und holt jede Minute den neusten Stand derselben Fassung; die Seite lädt dann von selbst neu.
# Achtung: Echte Daten. Was man in der Vorschau speichert, ist wirklich gespeichert.

$ErrorActionPreference = 'Continue'
$Projekt = 'iklwyrbktotucwewkxlj'
$Repo = 'Chrizyboy/dimension-crm'
$Haupt = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Vorschau = Join-Path $env:USERPROFILE 'dimension-crm-vorschau'
$Port = 1420

function Schritt($text) { Write-Host ''; Write-Host "== $text" -ForegroundColor Cyan }
function Abbruch($text) {
  Write-Host ''; Write-Host "FEHLER: $text" -ForegroundColor Red
  Write-Host 'Bitte Screenshot in den Thread «Go-live» schicken.'
  Read-Host 'Enter drücken zum Schliessen' | Out-Null
  exit 1
}

Write-Host 'Dimension Work Vorschau' -ForegroundColor Cyan

# Welche Fassung? Offene Änderungen (Pull Requests) kommen ohne Anmeldung von GitHub, das Repository ist öffentlich.
Schritt '1/4 Fassung wählen'
$offen = @()
try { $offen = @(Invoke-RestMethod "https://api.github.com/repos/$Repo/pulls?state=open&per_page=20" -TimeoutSec 15) } catch { }
if ($offen.Count -gt 0) {
  Write-Host 'Offene Änderungen, noch nicht veröffentlicht:'
  foreach ($pr in $offen) { Write-Host ("  {0,4}  {1}" -f $pr.number, $pr.title) }
}
$wahl = Read-Host 'Nummer einer Änderung eintippen, oder einfach Enter für den neusten Stand (main)'
if ($wahl -match '^\d+$') { $ref = "pull/$wahl/head"; $name = "Änderung #$wahl" } else { $ref = 'main'; $name = 'neuster Stand (main)' }

Schritt "2/4 Vorschau-Ordner vorbereiten ($name)"
Set-Location $Haupt
git fetch -q origin $ref
if ($LASTEXITCODE -ne 0) { Abbruch "Fassung $ref nicht gefunden." }
# FETCH_HEAD gilt nur im Hauptordner, darum gleich die Commit-Nummer merken.
$sha = git rev-parse FETCH_HEAD
if (-not (Test-Path (Join-Path $Vorschau '.git'))) {
  git worktree prune
  git worktree add --detach $Vorschau $sha
  if ($LASTEXITCODE -ne 0) { Abbruch 'Vorschau-Ordner liess sich nicht anlegen.' }
}
Set-Location $Vorschau
# Der Vorschau-Ordner ist nur eine Kopie zum Anschauen: lokale Reste werden verworfen.
git checkout -q --detach -f $sha
git log -1 --format='Stand: %h %s'

Schritt '3/4 Werkzeuge (npm install)'
npm.cmd install --no-audit --no-fund --loglevel=error
if ($LASTEXITCODE -ne 0) { Abbruch 'npm install ging nicht.' }

# Verbindung zur Cloud: nur die öffentlichen Werte (Adresse + anon-Schlüssel, stehen auch in der Web-App).
$envDatei = Join-Path $Vorschau '.env.cloud.local'
if (-not (Test-Path $envDatei)) {
  $schluessel = npx.cmd supabase projects api-keys --project-ref $Projekt -o json | ConvertFrom-Json
  $anon = ($schluessel | Where-Object { $_.name -eq 'anon' } | Select-Object -First 1).api_key
  if (-not $anon) { Abbruch 'Cloud-Schlüssel nicht gefunden (bei Supabase angemeldet? einrichten.ps1 nochmals starten).' }
  "VITE_SUPABASE_URL=https://$Projekt.supabase.co`nVITE_SUPABASE_ANON_KEY=$anon" | Set-Content -Encoding ASCII $envDatei
}

# Port belegt? Meist eine alte Vorschau, die noch offen ist.
$belegt = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($belegt) {
  $antwort = Read-Host "Auf Port $Port läuft schon etwas (alte Vorschau?). Beenden und neu starten? (J/N)"
  if ($antwort -notmatch '^[jJyY]') { Abbruch "Port $Port ist belegt." }
  Stop-Process -Id $belegt.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

# Immer live: jede Minute den neusten Stand derselben Fassung holen. Vite merkt die geänderten Dateien
# und lädt die Seite im Browser neu. Kommen neue Pakete dazu, die Vorschau einmal neu starten.
$live = Start-Job -ArgumentList $Vorschau, $Haupt, $ref -ScriptBlock {
  param($vorschau, $haupt, $ref)
  while ($true) {
    Start-Sleep -Seconds 60
    Set-Location $haupt
    git fetch -q origin $ref 2>$null
    $neu = git rev-parse FETCH_HEAD
    Set-Location $vorschau
    if ($neu -and $neu -ne (git rev-parse HEAD)) { git checkout -q --detach -f $neu 2>$null }
  }
}

Schritt "4/4 Vorschau läuft: http://localhost:$Port"
Write-Host 'Der Browser öffnet sich gleich. Echte Daten: Was du speicherst, ist wirklich gespeichert.' -ForegroundColor Yellow
Write-Host 'Neue Stände kommen jede Minute von selbst. Zum Beenden dieses Fenster schliessen.'
try {
  npx.cmd vite --mode cloud --port $Port --strictPort --open
} finally {
  Stop-Job $live -ErrorAction SilentlyContinue; Remove-Job $live -Force -ErrorAction SilentlyContinue
}
