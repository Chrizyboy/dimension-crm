# Dimension Work Vorschau: die neuste Fassung am PC anschauen und am Schluss entscheiden, ob sie veröffentlicht wird.
# Gestartet über die Desktop-Verknüpfung «Dimension Work Vorschau» (einrichten.ps1).
#
# Neuste Fassung = main plus alle offenen Änderungen (Pull Requests), zusammengestellt von vorschau-bauen.ps1 in
# einem eigenen Ordner (%USERPROFILE%\dimension-crm-vorschau, git worktree), damit der Ordner für «Dimension Work
# aktualisieren» sauber auf main bleibt. Öffnet http://localhost:1420 mit den echten Cloud-Daten und holt jede Minute
# den neusten Stand; die Seite lädt dann von selbst neu.
# Am Schluss: J = die gezeigten Änderungen mit dem eigenen GitHub-Login zusammenführen (nur mit grüner Prüfung),
# Version erhöhen (startet die App-Veröffentlichung) und bei Datenbank-/Server-Änderungen die Cloud aktualisieren.
# N = nichts veröffentlichen, auf Wunsch einen kurzen Grund an die Änderung schreiben.
# Achtung: Echte Daten. Was man in der Vorschau speichert, ist wirklich gespeichert.

$ErrorActionPreference = 'Continue'
$Projekt = 'iklwyrbktotucwewkxlj'
$Repo = 'Chrizyboy/dimension-crm'
$Haupt = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Vorschau = Join-Path $env:USERPROFILE 'dimension-crm-vorschau'
$Bauen = Join-Path $PSScriptRoot 'vorschau-bauen.ps1'
$StandDatei = Join-Path $Vorschau '.vorschau-stand.json'
$Port = 1420

function Schritt($text) { Write-Host ''; Write-Host "== $text" -ForegroundColor Cyan }
function Ende($text, $farbe) {
  Write-Host ''; Write-Host $text -ForegroundColor $farbe
  Read-Host 'Enter drücken zum Schliessen' | Out-Null
  exit 0
}
function Abbruch($text) { Ende "FEHLER: $text`nBitte Screenshot in den Thread «Go-live» schicken." Red }
function Stand { try { return Get-Content -Raw -Encoding UTF8 $StandDatei | ConvertFrom-Json } catch { return $null } }
function GithubBereit {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { return $false }
  gh auth status 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

Write-Host 'Dimension Work Vorschau' -ForegroundColor Cyan

# Dieses Skript selbst auf den neusten Stand bringen. Sonst läuft die Verknüpfung mit der alten Fassung aus dem
# Ordner dimension-crm, bis jemand «Dimension Work aktualisieren» startet (Chris 19.11.2026: «wieder nicht erkannt»).
# Nur wenn der Ordner sauber auf main steht; sonst einfach mit der vorhandenen Fassung weiter.
if (-not $env:DW_VORSCHAU_NEU) {
  Push-Location $Haupt
  git checkout -q -- src/routeTree.gen.ts 2>$null
  $vorher = (Get-FileHash $PSCommandPath).Hash
  if (-not (git status --porcelain --untracked-files=no) -and (git rev-parse --abbrev-ref HEAD) -eq 'main') {
    git pull -q --ff-only 2>$null
  }
  Pop-Location
  if ((Get-FileHash $PSCommandPath).Hash -ne $vorher) {
    Write-Host 'Die Vorschau hat sich selbst aktualisiert und startet neu.' -ForegroundColor Yellow
    $env:DW_VORSCHAU_NEU = '1'
    & $PSCommandPath
    exit $LASTEXITCODE
  }
}

Schritt '1/4 Neuste Fassung zusammenstellen'
Remove-Item $StandDatei -ErrorAction SilentlyContinue
& $Bauen -Haupt $Haupt -Vorschau $Vorschau -Repo $Repo
$stand = Stand
if (-not $stand) { Abbruch 'Die neuste Fassung liess sich nicht holen (Internet?).' }
if (@($stand.prs).Count -gt 0) {
  Write-Host 'Darin sind diese Änderungen, noch nicht veröffentlicht:'
  foreach ($pr in @($stand.prs)) { Write-Host ("  #{0}  {1}" -f $pr.nummer, $pr.titel) }
} else {
  Write-Host 'Keine offenen Änderungen: Das ist der veröffentlichte Stand.'
}
foreach ($pr in @($stand.uebersprungen)) {
  Write-Host ("  Weggelassen (passt nicht mit den anderen zusammen): #{0}  {1}" -f $pr.nummer, $pr.titel) -ForegroundColor Yellow
}

Schritt '2/4 Werkzeuge (npm install)'
Set-Location $Vorschau
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

Schritt "3/4 Vorschau starten: http://localhost:$Port"
# Im selben Fenster, aber leise: Schliesst man das Fenster, endet auch die Vorschau.
# Eingabe aus einer leeren Datei: Sonst liest Vite die Tastatur mit (Kürzel h, r, q …) und schluckt das «J»
# der Schlussfrage, die dann leer ankommt (Chris 19.11.2026: «ich klicke auf J und es passiert nichts»).
$leer = Join-Path $env:TEMP 'dimension-work-vorschau-leer.txt'
Set-Content -Path $leer -Value '' -Encoding ASCII
$vite = Start-Process -FilePath 'npx.cmd' -WorkingDirectory $Vorschau -NoNewWindow -PassThru `
  -RedirectStandardInput $leer `
  -ArgumentList 'vite', '--mode', 'cloud', '--port', $Port, '--strictPort', '--logLevel', 'error'
for ($i = 0; $i -lt 60; $i++) {
  if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { break }
  Start-Sleep -Seconds 1
}
Start-Process "http://localhost:$Port"

# Immer live: jede Minute neu zusammenstellen, wenn sich main oder eine Änderung bewegt hat.
$live = Start-Job -ArgumentList $Bauen, $Haupt, $Vorschau, $Repo, $StandDatei -ScriptBlock {
  param($bauen, $haupt, $vorschau, $repo, $datei)
  while ($true) {
    Start-Sleep -Seconds 60
    $bisher = ''
    try { $bisher = (Get-Content -Raw -Encoding UTF8 $datei | ConvertFrom-Json).kennung } catch { }
    & $bauen -Haupt $haupt -Vorschau $vorschau -Repo $repo -Bisher $bisher
  }
}

Schritt '4/4 Anschauen'
Write-Host 'Der Browser zeigt die Vorschau. Echte Daten: Was du speicherst, ist wirklich gespeichert.' -ForegroundColor Yellow
Write-Host 'Neue Stände kommen jede Minute von selbst. Lass dieses Fenster offen, bis du fertig bist.'
Write-Host ''
# Nur J oder N gilt; alles andere (auch ein leeres Enter) fragt nochmals, statt still «nicht veröffentlichen».
do {
  try { $Host.UI.RawUI.FlushInputBuffer() } catch { }
  $antwort = "$(Read-Host 'Fertig? Passt alles und soll es veröffentlicht werden? (J = veröffentlichen, N = noch nicht)')".Trim()
  if ($antwort -notmatch '^[jJyYnN]') { Write-Host 'Bitte J oder N eingeben und Enter drücken.' -ForegroundColor Yellow }
} until ($antwort -match '^[jJyYnN]')

Stop-Job $live -ErrorAction SilentlyContinue; Remove-Job $live -Force -ErrorAction SilentlyContinue
if ($vite) { taskkill.exe /PID $vite.Id /T /F 2>$null | Out-Null }

# Was du zuletzt gesehen hast (der Hintergrund kann seit dem Start Neues dazugenommen haben).
$prs = @((Stand).prs | Where-Object { $_ })
if ($antwort -match '^[jJyY]') {
  & (Join-Path $PSScriptRoot 'veroeffentlichen.ps1') -Haupt $Haupt -Repo $Repo -Prs $prs
  exit 0
}

if ($prs.Count -gt 0 -and (GithubBereit)) {
  $grund = Read-Host 'Was passt noch nicht? (kurz beschreiben, oder einfach Enter)'
  if ($grund) {
    $ziel = $prs
    if ($prs.Count -gt 1) {
      $nr = Read-Host 'Welche Änderung betrifft es? (Nummer, oder Enter für alle)'
      if ($nr -match '^\d+$') { $ziel = @($prs | Where-Object { "$($_.nummer)" -eq $nr }) }
    }
    foreach ($pr in $ziel) { gh pr comment $pr.nummer --repo $Repo --body "Vorschau: passt noch nicht. $grund" | Out-Null }
    Write-Host 'Weitergegeben. Claude passt die Änderung an und meldet sich im Thread.'
  }
}
Ende 'Nichts veröffentlicht.' Green
