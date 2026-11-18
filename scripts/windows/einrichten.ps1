# Einmalige Einrichtung auf einem Windows-PC: «Dimension Work aktualisieren» per Doppelklick.
#
# Aufruf (PowerShell, kein Admin nötig):
#   irm https://raw.githubusercontent.com/Chrizyboy/dimension-crm/main/scripts/windows/einrichten.ps1 | iex
# Was passiert: Git und Node.js installieren (falls nötig), Projekt nach %USERPROFILE%\dimension-crm holen,
# bei Supabase anmelden (Browser), mit der Cloud verbinden (Datenbank-Passwort selbst eintippen) und auf dem
# Desktop die Verknüpfung «Dimension Work aktualisieren» anlegen. Keine Geheimwerte im Skript oder in Git.
# Mehrfach ausführen schadet nicht: Vorhandenes wird nur aktualisiert.

$ErrorActionPreference = 'Continue'
$Projekt = 'iklwyrbktotucwewkxlj'
$Repo = 'https://github.com/Chrizyboy/dimension-crm.git'
$Ordner = Join-Path $env:USERPROFILE 'dimension-crm'

function Schritt($text) { Write-Host ''; Write-Host "== $text" -ForegroundColor Cyan }
function Abbruch($text) {
  Write-Host ''; Write-Host "FEHLER: $text" -ForegroundColor Red
  Write-Host 'Bitte Screenshot in den Thread «Go-live» schicken.'
  Read-Host 'Enter drücken zum Schliessen' | Out-Null
  throw $text
}
# Nach einer Installation kennt das offene Fenster die neuen Programme noch nicht.
function NeuerPfad {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Installiere($befehl, $paket, $name) {
  if (Get-Command $befehl -ErrorAction SilentlyContinue) { Write-Host "$name ist vorhanden."; return }
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { Abbruch "$name fehlt und winget ist nicht verfügbar." }
  Write-Host "$name wird installiert ..."
  winget install --id $paket -e --source winget --accept-package-agreements --accept-source-agreements
  NeuerPfad
  if (-not (Get-Command $befehl -ErrorAction SilentlyContinue)) { Abbruch "$name liess sich nicht installieren. PowerShell neu öffnen und nochmals starten." }
}

Write-Host 'Dimension Work: Aktualisieren einrichten' -ForegroundColor Cyan

Schritt '1/5 Programme prüfen (Git, Node.js)'
Installiere 'git' 'Git.Git' 'Git'
Installiere 'node' 'OpenJS.NodeJS.LTS' 'Node.js'

Schritt "2/5 Projekt holen nach $Ordner"
if (Test-Path (Join-Path $Ordner '.git')) {
  Set-Location $Ordner
  git checkout -- src/routeTree.gen.ts
  git checkout main
  git pull --ff-only
  if ($LASTEXITCODE -ne 0) { Abbruch 'git pull ging nicht (Dateien im Ordner von Hand geändert?).' }
} else {
  git clone $Repo $Ordner
  if ($LASTEXITCODE -ne 0) { Abbruch 'Projekt konnte nicht geholt werden.' }
  Set-Location $Ordner
}
npm.cmd install --no-audit --no-fund --loglevel=error
if ($LASTEXITCODE -ne 0) { Abbruch 'npm install ging nicht.' }

Schritt '3/5 Bei Supabase anmelden'
Write-Host 'Es öffnet sich der Browser. Mit deinem Supabase-Konto anmelden und bestätigen.'
npx.cmd supabase login
if ($LASTEXITCODE -ne 0) { Abbruch 'Anmeldung bei Supabase ging nicht.' }

Schritt '4/5 Mit der Cloud verbinden'
Write-Host 'Jetzt das Datenbank-Passwort eintippen (es wird nicht angezeigt).'
npx.cmd supabase link --project-ref $Projekt
if ($LASTEXITCODE -ne 0) { Abbruch 'Verbindung zur Cloud ging nicht (Passwort falsch oder kein Zugriff aufs Projekt).' }

Schritt '5/5 Verknüpfung auf dem Desktop'
$skript = Join-Path $Ordner 'scripts\windows\aktualisieren.ps1'
$desktop = [Environment]::GetFolderPath('Desktop')
$link = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'Dimension Work aktualisieren.lnk'))
$link.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$link.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$skript`""
$link.WorkingDirectory = $Ordner
$link.IconLocation = Join-Path $Ordner 'src-tauri\icons\icon.ico'
$link.Description = 'Neusten Stand von GitHub holen und in die Cloud hochladen'
$link.Save()

Write-Host ''
Write-Host 'FERTIG. Auf dem Desktop liegt jetzt «Dimension Work aktualisieren».' -ForegroundColor Green
Read-Host 'Enter drücken zum Schliessen' | Out-Null
