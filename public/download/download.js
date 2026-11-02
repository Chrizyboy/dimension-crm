/* global document, location */
// Download-Seite: Sprache umschalten und den Knopf auf den Installer der neusten Version setzen.
// Läuft ohne Build und ohne Bibliotheken, damit die Seite auch dann lädt, wenn die App selbst Probleme hat.
;(function () {
  'use strict'

  var REPO = 'Chrizyboy/dimension-crm'

  // Französisch für das Team in Bulle. Deutsch steht direkt im HTML.
  var FR = {
    titel: 'Installer Dimension Work',
    einleitung:
      'Notre CRM pour la vente, les projets, le service et le chantier. Sur le PC comme application, sur le téléphone directement dans le navigateur.',
    pcTitel: 'Sur le PC (Windows)',
    pcText: "L'application démarre vite, signale les nouveaux e-mails et se met à jour toute seule.",
    pcKnopf: 'Télécharger pour Windows',
    handyTitel: 'Sur le téléphone',
    handyText:
      "Ouvrir et choisir « Sur l'écran d'accueil ». Dimension Work est alors sur le téléphone comme une application.",
    handyKnopf: 'Ouvrir dans le navigateur',
    handyAdresse: 'Adresse :',
    schritteTitel: 'Sur le PC, c’est simple',
    s1b: 'Télécharger',
    s1: 'Cliquer sur le bouton orange ci-dessus.',
    s2b: 'Ouvrir le fichier',
    s2: "Ouvrir le fichier téléchargé. Pas besoin de droits d'administrateur.",
    s3b: 'Si Windows affiche un avertissement',
    s3: "Si « Windows a protégé votre ordinateur » apparaît : cliquer sur « Informations complémentaires », puis « Exécuter quand même ». Cela n'arrive que la première fois.",
    s4b: 'Se connecter',
    s4: "Se connecter avec son adresse e-mail professionnelle. Le code arrive par e-mail. Les mises à jour s'installent ensuite toutes seules.",
    fusszeile: 'Des questions ? Demandez simplement à Chris.',
    version: 'Version {v} · {mb} Mo',
  }
  var DE_VERSION = 'Version {v} · {mb} MB'

  var deutsch = {}
  document.querySelectorAll('[data-t]').forEach(function (el) {
    deutsch[el.getAttribute('data-t')] = el.textContent.trim().replace(/\s+/g, ' ')
  })

  var sprache = 'de'
  var release = null

  function setzeSprache(neu) {
    sprache = neu
    document.documentElement.lang = neu
    document.title = neu === 'fr' ? 'Télécharger Dimension Work' : 'Dimension Work herunterladen'
    document.querySelectorAll('[data-t]').forEach(function (el) {
      var k = el.getAttribute('data-t')
      el.textContent = neu === 'fr' ? FR[k] || deutsch[k] : deutsch[k]
    })
    document.querySelectorAll('[data-sprache]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-sprache') === neu))
    })
    zeigeVersion()
    try {
      localStorage.setItem('download-sprache', neu)
    } catch {
      /* privat: dann eben ohne Merken */
    }
  }

  function zeigeVersion() {
    var el = document.getElementById('version')
    if (!release) return
    var vorlage = sprache === 'fr' ? FR.version : DE_VERSION
    el.textContent = vorlage.replace('{v}', release.version).replace('{mb}', (release.groesse / 1048576).toFixed(0))
    el.hidden = false
  }

  document.querySelectorAll('[data-sprache]').forEach(function (b) {
    b.addEventListener('click', function () {
      setzeSprache(b.getAttribute('data-sprache'))
    })
  })

  var gemerkt = null
  try {
    gemerkt = localStorage.getItem('download-sprache')
  } catch {
    /* ignorieren */
  }
  var browser = (navigator.language || 'de').slice(0, 2).toLowerCase()
  setzeSprache(gemerkt || (browser === 'fr' ? 'fr' : 'de'))

  // Adresse der Web-App aus der eigenen Adresse: stimmt so für github.io und für die eigene Domain.
  document.getElementById('adresse').textContent = (location.host + location.pathname)
    .replace(/download\/(index\.html)?$/, '')
    .replace(/\/$/, '')

  // Auf dem Handy die Handy-Karte zuerst zeigen: dort nützt der Windows-Knopf nichts.
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    document.getElementById('karten').classList.add('handy-zuerst')
  }

  // Neuste Version holen. Klappt das nicht (offline, API-Limit), bleibt der Knopf auf der Release-Seite.
  fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' },
  })
    .then(function (r) {
      return r.ok ? r.json() : null
    })
    .then(function (daten) {
      if (!daten || !daten.assets) return
      var exe = daten.assets.find(function (a) {
        return /-setup\.exe$/i.test(a.name)
      })
      if (!exe) return
      document.getElementById('windows').href = exe.browser_download_url
      release = { version: String(daten.tag_name || '').replace(/^v/, ''), groesse: exe.size }
      zeigeVersion()
    })
    .catch(function () {
      /* Rückfall: Link auf die Release-Seite bleibt */
    })
})()
