import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'
import { anmelden, API, brauchtDatenbank } from './hilfen'

// Phase 13: KI-Funktionen in der Oberfläche. Die Edge Function «ki» wird hier im Browser ersetzt (erfundene
// Antworten), damit der Test nichts kostet und ohne Schlüssel läuft; den Server selbst (Limit, Kosten, Modelle,
// fremde Inhalte) prüft npm run ki:pruefen. Geprüft wird: Seite mit Reitern ohne Verstösse, Briefing mit Verweis,
// Assistent mit Überarbeiten bis zur Mail, Mail lesen bis zum vorausgefüllten Lead, Spesenbeleg lesen.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const ANTWORTEN: Record<string, unknown> = {
  status: {
    eingerichtet: true,
    aktiv: true,
    budget: { heute_millirappen: 1840, person_millirappen: 1840, limit_rappen: 1000, frei: true },
  },
  briefing: {
    briefing: {
      gruss: 'Guten Morgen Anna',
      einleitung: 'Heute zwei Termine und eine Offerte zum Nachfassen.',
      prioritaeten: [
        { titel: 'Offerte nachfassen', warum: 'Seit 15 Tagen offen.', ref: 'aufgabe:1' },
        { titel: 'Besichtigung vorbereiten', warum: 'Termin um 14:00.', ref: null },
      ],
      hinweis: null,
    },
    erstellt_am: new Date().toISOString(),
    aus_speicher: false,
  },
  entwurf: {
    betreff: 'Ihre Offerte – kurz nachgefragt',
    text: 'Guten Tag Frau Muster\n\nVor zwei Wochen haben wir Ihnen die Offerte geschickt.\n\nFreundliche Grüsse\nAnna Admin\nDimension Solaire',
    hinweise: [],
    sprache: 'de',
    an: null,
    anhaenge: { gelesen: [], uebersprungen: [] },
  },
  stil_lernen: { regeln: ['Kurze Sätze.'], neue: 1 },
  mail_erkennen: {
    erkannt: {
      typ: 'lead',
      sprache: 'de',
      zusammenfassung: 'Möchte eine PV-Anlage mit Speicher für das Einfamilienhaus.',
      kontakt: {
        anrede: 'frau',
        vorname: 'Erika',
        nachname: `Ersatz`,
        firma: null,
        email: 'erika@ersatz.test',
        telefon: '0761234567',
      },
      adresse: { strasse: 'Testweg 1', plz: '5630', ort: 'Muri AG' },
      lead: {
        interesse: ['pv', 'batterie'],
        gebaeudeart: 'einfamilienhaus',
        dachform: 'satteldach',
        kommentar: 'Speicher gewünscht',
      },
      anliegen: { thema: null, dringend: false, antwort_noetig: true },
      aufgabe: { titel: 'Rückruf vereinbaren', in_tagen: 1 },
    },
    kandidaten: [],
    mail: { von: 'Erika Ersatz <erika@ersatz.test>', betreff: 'Solaranlage', text: 'Guten Tag …', datum: '' },
  },
  beleg: {
    datum: '2026-10-20',
    betrag_rappen: 4250,
    waehrung: 'CHF',
    kategorie: 'Verpflegung',
    zweck: 'Mittagessen Baustelle',
    bemerkung: null,
  },
}

/** Ersetzt die Edge Function «ki» und merkt sich die Aufträge. */
async function kiErsetzen(page: Page): Promise<{ aktion: string; eingabe: Record<string, unknown> }[]> {
  const auftraege: { aktion: string; eingabe: Record<string, unknown> }[] = []
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  await page.route(`${API}/functions/v1/ki`, async (route: Route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const eingabe = route.request().postDataJSON() as Record<string, unknown>
    const aktion = String(eingabe.aktion)
    auftraege.push({ aktion, eingabe })
    const antwort = ANTWORTEN[aktion]
    if (!antwort) return route.fulfill({ status: 400, headers: cors, json: { ok: false, fehler: 'aktion' } })
    // Überarbeiten: der Text wird kürzer (sichtbar, dass die Änderung ankam)
    const r =
      aktion === 'entwurf' && eingabe.bisher
        ? {
            ...(antwort),
            text: 'Guten Tag Frau Muster\n\nKurz nachgefragt: Passt die Offerte?\n\nFreundliche Grüsse\nAnna Admin',
          }
        : antwort
    return route.fulfill({ status: 200, headers: cors, json: { ok: true, ...(r) } })
  })
  return auftraege
}

async function verstoesse(page: Page): Promise<string[]> {
  await page.evaluate('Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null)))')
  const ergebnis = await new AxeBuilder({ page })
    .exclude('[data-sonner-toaster]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return ergebnis.violations.map(
    (v) =>
      `${v.id}: ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' | ')}`,
  )
}

test('KI-Seite: Briefing, Reiter ohne Verstösse', async ({ page }) => {
  test.slow()
  await kiErsetzen(page)
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/ai')
  await expect(page.getByRole('heading', { name: 'KI-Assistent', level: 1 })).toBeVisible()
  const briefing = page.getByTestId('ki-briefing')
  await expect(briefing.getByText('Guten Morgen Anna')).toBeVisible()
  await expect(briefing.getByRole('link', { name: /Offerte nachfassen/ })).toHaveAttribute('href', /#\/tasks/)
  expect(await verstoesse(page)).toEqual([])
  for (const reiter of ['Kosten', 'Mein Schreibstil', 'Einstellungen']) {
    await page.getByRole('tab', { name: reiter }).click()
    await expect(page.getByRole('tab', { name: reiter })).toHaveAttribute('aria-selected', 'true')
    expect(await verstoesse(page), reiter).toEqual([])
  }
  await expect(page.getByLabel('Tageslimit (CHF)')).toBeVisible()
})

test('Assistent: Entwurf, überarbeiten, weiter zur Mail', async ({ page }) => {
  const auftraege = await kiErsetzen(page)
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/ai')
  await page.getByRole('button', { name: 'Öffnen' }).first().click()
  const d = page.getByRole('dialog', { name: 'Mit KI schreiben' })
  await d.getByLabel('Was soll drinstehen?').fill('Nachfragen, ob Fragen offen sind')
  await d.getByRole('button', { name: 'Entwurf schreiben' }).click()
  await expect(d.getByLabel('Text')).toHaveValue(/Vor zwei Wochen/)
  expect(await verstoesse(page)).toEqual([])
  await d.getByRole('button', { name: 'Kürzer' }).click()
  await expect(d.getByLabel('Text')).toHaveValue(/Kurz nachgefragt/)
  const zweiter = auftraege.filter((a) => a.aktion === 'entwurf')[1]
  expect(zweiter.eingabe.wunsch).toBe('Kürzer')
  expect(zweiter.eingabe.bisher).toMatchObject({ betreff: 'Ihre Offerte – kurz nachgefragt' })
  await d.getByRole('button', { name: 'Weiter zur Mail' }).click()
  const mail = page.getByRole('dialog', { name: 'Mail prüfen und senden' })
  await expect(mail.getByLabel('Text')).toHaveValue(/Kurz nachgefragt/)
  await expect(mail.getByRole('button', { name: 'Senden' })).toBeVisible()
  await page.keyboard.press('Escape')
})

test('Mail mit KI lesen ergibt einen vorausgefüllten Lead', async ({ page }) => {
  await kiErsetzen(page)
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/sales')
  await page.getByRole('button', { name: 'Anfragen holen' }).click()
  await page.getByRole('menuitem', { name: 'Mail mit KI lesen' }).click()
  const d = page.getByRole('dialog', { name: 'Mail mit KI lesen' })
  await d.getByLabel('Mail-Text').fill('Von: Erika Ersatz\nGuten Tag, wir möchten eine Solaranlage mit Speicher.')
  await d.getByRole('button', { name: 'Mit KI lesen' }).click()
  await expect(d.getByText('Neue Anfrage')).toBeVisible()
  await expect(d.getByText('Kein passender Kunde gefunden')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await d.getByRole('button', { name: 'Als Lead erfassen' }).click()
  const lead = page.getByRole('dialog', { name: /Lead/ })
  await expect(lead.getByLabel('Vorname')).toHaveValue('Erika')
  await expect(lead.getByLabel('PLZ')).toHaveValue('5630')
  await page.keyboard.press('Escape')
})

test('Spesenbeleg mit KI lesen füllt Betrag, Datum, Kategorie und Zweck', async ({ page }) => {
  await kiErsetzen(page)
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/expenses')
  await page.getByRole('button', { name: 'Spese erfassen' }).first().click()
  const d = page.getByRole('dialog', { name: 'Spese erfassen' })
  await d.locator('input[type=file]:not([capture])').setInputFiles({
    name: 'beleg.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  })
  await d.getByRole('button', { name: 'Mit KI lesen' }).click()
  await expect(d.getByLabel('Betrag CHF')).toHaveValue('42.50')
  await expect(d.getByLabel('Datum')).toHaveValue('2026-10-20')
  await expect(d.getByLabel('Zweck')).toHaveValue('Mittagessen Baustelle')
  await page.keyboard.press('Escape')
})
