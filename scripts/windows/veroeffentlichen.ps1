# Veröffentlichen nach der Vorschau («J»): von vorschau.ps1 aufgerufen, nie direkt.
# 1. Die gezeigten Änderungen mit dem eigenen GitHub-Login zusammenführen, genau den gezeigten Stand
#    (--match-head-commit) und nur mit grüner Prüfung (CI).
# 2. Ist die Version auf main schon veröffentlicht, Version erhöhen (package.json, package-lock.json,
#    Abschnitt in docs/versionen.md aus den Titeln) und auf main schieben. Das startet die GitHub-Action
#    «Neue Version veröffentlichen» von selbst (Windows-Installer, Auto-Update, Web-App).
# 3. Ist die Cloud nicht auf dem Stand von main (Datenbank-Änderungen oder Server-Funktionen seit dem letzten
#    erfolgreichen «aktualisieren», auch direkt auf GitHub Zusammengeführtes), gleich aktualisieren.ps1 starten.
#    Den letzten Stand der Cloud merkt sich aktualisieren.ps1 in %USERPROFILE%\.dimension-work-cloud-stand.
param([string]$Haupt, [string]$Repo, [object[]]$Prs = @())

$ErrorActionPreference = 'Continue'
function Ende($text, $farbe) {
  Write-Host ''; Write-Host $text -ForegroundColor $farbe
  Read-Host 'Enter drücken zum Schliessen' | Out-Null
  exit 0
}
# Braucht die Cloud ein Update? Verglichen wird mit dem Stand, den aktualisieren.ps1 zuletzt hochgeladen hat, nicht nur
# mit dem, was gerade zusammengeführt wurde (Chris 19.11.2026: Änderung war direkt auf GitHub gemergt, die Cloud blieb
# alt und die Grossprojekte luden nicht). Unbekannter Stand: lieber einmal aktualisieren.
function CloudVeraltet {
  $datei = Join-Path $env:USERPROFILE '.dimension-work-cloud-stand'
  $basis = ''
  if (Test-Path $datei) { $basis = "$(Get-Content -Raw $datei)".Trim() }
  if ($basis) { git cat-file -e "$basis^{commit}" 2>$null; if ($LASTEXITCODE -ne 0) { $basis = '' } }
  if (-not $basis) { return $true }
  return [bool](git diff --name-only $basis HEAD -- supabase/migrations supabase/functions)
}
function CloudNachziehen($sonst, $farbe) {
  if (CloudVeraltet) {
    Write-Host ''
    Write-Host 'Die Cloud ist nicht auf dem neusten Stand. Jetzt folgt «Dimension Work aktualisieren».' -ForegroundColor Cyan
    & (Join-Path $PSScriptRoot 'aktualisieren.ps1')
    exit 0
  }
  Ende $sonst $farbe
}

Write-Host ''
Write-Host '== Veröffentlichen' -ForegroundColor Cyan
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Ende "GitHub-Anmeldung fehlt noch. Bitte den Einrichtungs-Befehl einmal nochmals starten (siehe Thread «Go-live»).`nNichts veröffentlicht." Red
}
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Einmalig bei GitHub anmelden: Es öffnet sich der Browser.'
  gh auth login --hostname github.com --git-protocol https --web
  gh auth setup-git
}

Set-Location $Haupt
git checkout -q -- src/routeTree.gen.ts
if (git status --porcelain --untracked-files=no) { Ende 'Im Ordner dimension-crm sind Dateien von Hand geändert. Nichts veröffentlicht. Bitte Screenshot schicken.' Red }
git checkout -q main
git pull -q --ff-only
if ($Prs.Count -eq 0) { CloudNachziehen 'Es gibt nichts Neues: Alles ist schon veröffentlicht.' Green }

$gemergt = @()
foreach ($pr in $Prs) {
  Write-Host ("#{0}  {1}" -f $pr.nummer, $pr.titel)
  # gh pr checks: 0 = alles grün, sonst noch am Laufen oder rot.
  gh pr checks $pr.nummer --repo $Repo 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Host '   Prüfung noch nicht grün, bleibt offen. Später nochmals Vorschau starten.' -ForegroundColor Yellow; continue }
  gh pr merge $pr.nummer --repo $Repo --merge --match-head-commit $pr.sha
  if ($LASTEXITCODE -eq 0) { $gemergt += $pr; Write-Host '   zusammengeführt' -ForegroundColor Green }
  else { Write-Host '   ging nicht (inzwischen geändert oder Konflikt), bleibt offen.' -ForegroundColor Yellow }
}
if ($gemergt.Count -eq 0) { CloudNachziehen 'Nichts veröffentlicht.' Yellow }

git pull -q --ff-only
$version = (Get-Content -Raw package.json | ConvertFrom-Json).version
git ls-remote --exit-code --tags origin "refs/tags/v$version" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  # Diese Version gibt es schon: erhöhen, sonst startet keine Veröffentlichung.
  npm.cmd version patch --no-git-tag-version | Out-Null
  $version = (Get-Content -Raw package.json | ConvertFrom-Json).version
  $pfad = Join-Path $Haupt 'docs\versionen.md'
  $text = [IO.File]::ReadAllText($pfad)
  $zeilen = ($gemergt | ForEach-Object { "- $($_.titel)" }) -join "`n"
  $i = $text.IndexOf("`n## ")
  $text = $text.Insert($i + 1, "## $version`n`n$zeilen`n`n")
  [IO.File]::WriteAllText($pfad, $text, (New-Object Text.UTF8Encoding $false))
  git add package.json package-lock.json docs/versionen.md
  # Ohne eingerichteten Git-Namen den Namen des GitHub-Kontos nehmen.
  $wer = @()
  if (-not (git config user.email)) {
    $login = gh api user --jq .login
    $wer = @('-c', "user.name=$login", '-c', "user.email=$login@users.noreply.github.com")
  }
  git @wer commit -q -m "Version $version"
  if ($LASTEXITCODE -ne 0) { Ende 'Version liess sich nicht festhalten. Bitte Screenshot in den Thread «Go-live» schicken.' Red }
  git push -q origin main
  if ($LASTEXITCODE -ne 0) { Ende 'Version liess sich nicht hochladen. Bitte Screenshot in den Thread «Go-live» schicken.' Red }
}
Write-Host "Version $version wird jetzt gebaut (etwa 15 Minuten), danach meldet die App das Update." -ForegroundColor Green

CloudNachziehen 'FERTIG. Die Cloud braucht diesmal nichts.' Green
