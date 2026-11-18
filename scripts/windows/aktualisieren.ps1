# Dimension Work aktualisieren: neusten Stand von GitHub holen und in die Cloud hochladen.
#
# Gestartet über die Desktop-Verknüpfung «Dimension Work aktualisieren» (angelegt von einrichten.ps1).
# Schritte: git pull → npm install → Datenbank-Änderungen (supabase db push) → alle Server-Funktionen.
# Warum hier und nicht in GitHub Actions: Das Datenbank-Passwort soll nie in GitHub liegen. Es wird bei
# jedem Lauf von Hand eingetippt (oder steht nur auf diesem PC in der Umgebungsvariable SUPABASE_DB_PASSWORD).
# Nie `db reset` und nie `config push`: das würde die Cloud zurücksetzen bzw. die Anmelde-Einstellungen überschreiben.

# Continue statt Stop: git und npm schreiben Fortschritt nach stderr, das wäre in PowerShell 5.1 sonst ein Abbruch.
$ErrorActionPreference = 'Continue'
$Projekt = 'iklwyrbktotucwewkxlj'
$Ordner = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Protokoll = Join-Path $env:USERPROFILE 'dimension-work-aktualisieren.log'

function Schritt($text) { Write-Host ''; Write-Host "== $text" -ForegroundColor Cyan }
function Ende($ok, $text) {
  Write-Host ''
  if ($ok) { Write-Host $text -ForegroundColor Green } else { Write-Host $text -ForegroundColor Red }
  Write-Host "Protokoll: $Protokoll"
  try { Stop-Transcript | Out-Null } catch { }
  Read-Host 'Enter drücken zum Schliessen' | Out-Null
  if ($ok) { exit 0 } else { exit 1 }
}
# Externe Befehle melden Fehler nur über den Exit-Code, nicht als PowerShell-Fehler.
function Pruefe($was) { if ($LASTEXITCODE -ne 0) { Ende $false "FEHLER bei: $was. Bitte Screenshot in den Thread «Go-live» schicken." } }

Start-Transcript -Path $Protokoll -Force | Out-Null
Set-Location $Ordner
Write-Host "Dimension Work aktualisieren ($Ordner)" -ForegroundColor Cyan

Schritt '1/4 Neusten Stand von GitHub holen'
# Diese Datei erzeugt Vite beim Starten neu; lokale Änderungen daran würden git pull blockieren.
git checkout -- src/routeTree.gen.ts
$offen = git status --porcelain --untracked-files=no
if ($offen) {
  Write-Host $offen
  Ende $false 'Im Ordner sind Dateien von Hand geändert. Nichts hochgeladen. Bitte Screenshot schicken.'
}
git checkout main; Pruefe 'git checkout main'
git pull --ff-only; Pruefe 'git pull'
git log -1 --format='Stand: %h %s'

Schritt '2/4 Werkzeuge aktualisieren (npm install)'
npm.cmd install --no-audit --no-fund --loglevel=error; Pruefe 'npm install'

if (-not (Test-Path 'supabase\.temp\project-ref')) {
  Schritt 'Mit der Cloud verbinden (einmalig)'
  npx.cmd supabase link --project-ref $Projekt; Pruefe 'supabase link'
}

Schritt '3/4 Datenbank-Änderungen hochladen'
Write-Host 'Es folgt eine Liste der neuen Änderungen. Mit Y bestätigen, dann das Datenbank-Passwort eintippen.'
npx.cmd supabase db push --include-all; Pruefe 'db push'

Schritt '4/4 Server-Funktionen hochladen'
# --use-api: Supabase baut die Funktionen selbst, Docker ist auf dem PC nicht nötig.
npx.cmd supabase functions deploy --project-ref $Projekt --use-api; Pruefe 'functions deploy'

Ende $true 'FERTIG. Die Cloud ist aktuell. Schreib «fertig» in den Thread «Go-live».'
