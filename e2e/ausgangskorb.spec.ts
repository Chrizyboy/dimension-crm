import AxeBuilder from '@axe-core/playwright'
import { devices, expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { anmelden, brauchtDatenbank } from './hilfen'

// Entscheid 0041: Ausgangskorb als Werkbank. Erfundene Einträge wie aus Offerten, Werkverträgen, Newsletter und
// Integrationen: «Für mich» mit Serie, Akte mit Prüfungen und Zusammenhang, Freigeben mit «Rückgängig», ein Fehler
// mit Lösung, ein Brief und am Handy Liste und Akte, alles ohne Verstösse. Mit BILDER_ORDNER=… speichert der Test
// Bildschirmfotos (z. B. für die Vorschau an die Geschäftsleitung).

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = String(Date.now()).slice(-6)
const offerte = `Ihre Offerte Photovoltaik 12.4 kWp · ${lauf}`
const werkvertrag = `Werkvertrag Wärmepumpe zur Unterschrift · ${lauf}`
const fehler = `Terminbestätigung Montage · ${lauf}`
const brief = `Werkvertrag Familie Beispiel · ${lauf}`

/** SQL in der lokalen Datenbank (nur erfundene Testdaten). */
const sql = (befehl: string) =>
  execFileSync('psql', ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-tAc', befehl], {
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: 'postgres' },
  }).trim()

const person = (email: string) => `(select id from public.personen where email = '${email}')`

/** WCAG 2.1 AA; Meldungen ausgenommen. */
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

async function foto(page: Page, name: string) {
  const ordner = process.env.BILDER_ORDNER
  if (ordner) await page.screenshot({ path: `${ordner}/${name}.png`, fullPage: false })
}

test.beforeAll(() => {
  const admin = person('admin@test.local')
  const kunde = sql(
    `insert into public.kontakte (vorname, nachname, email, sprache) values ('Familie', 'Beispiel ${lauf}', 'familie.beispiel-${lauf}@beispiel.test', 'de') returning id`,
  )
    .split('\n')[0]
    ?.trim()
  const kampagne = sql('select gen_random_uuid()')
  sql(`insert into public.ausgangskorb (kanal, art, an, betreff, text, absender_person_id, kontakt_id, erstellt_von, erstellt_am)
       values ('mail', 'offerte', 'familie.beispiel-${lauf}@beispiel.test', '${offerte}',
               E'Guten Tag\\n\\nVielen Dank für Ihr Interesse. Im Anhang finden Sie die Offerte für Ihre Photovoltaik-Anlage mit 12.4 kWp.\\n\\nFreundliche Grüsse',
               ${admin}, '${kunde}', null, now() - interval '26 hours')`)
  sql(`insert into public.ausgangskorb (kanal, art, an, betreff, text, absender_person_id, kontakt_id, zurueck_an, zurueck_von, zurueck_notiz, zurueck_am)
       values ('mail', 'werkvertrag', 'familie.beispiel-${lauf}@beispiel.test', '${werkvertrag}', E'Guten Tag\\n\\nIm Anhang der Werkvertrag.',
               ${admin}, '${kunde}', ${admin}, ${person('buchhaltung@test.local')}, 'Anzahlung 30 % statt 40 % eintragen', now() - interval '20 minutes')`)
  for (const n of [1, 2, 3])
    sql(`insert into public.ausgangskorb (kanal, art, an, betreff, text, bezug_tabelle, bezug_id, erstellt_von)
         values ('mail', 'newsletter', 'leser${n}-${lauf}@beispiel.test', 'Newsletter November · ${lauf}', 'Neuigkeiten aus Muri und Bulle', 'kampagnen', '${kampagne}', null)`)
  sql(`insert into public.ausgangskorb (kanal, art, an, betreff, text, absender_person_id, status, fehler, versuche)
       values ('mail', 'termin_bestaetigung', 'montage-${lauf}@beispiel.test', '${fehler}', 'Die Monteure kommen am Montag um 07:30.',
               ${admin}, 'fehler', 'microsoft.abgelaufen', 1)`)
  sql(`insert into public.ausgangskorb (kanal, art, an, betreff, absender_person_id)
       values ('brief', 'werkvertrag', E'Familie Beispiel\\nDorfstrasse 1\\n5630 Muri', '${brief}', ${admin})`)
})

test('Werkbank: Für mich, Akte, Freigeben mit Rückgängig, Fehler, Brief', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/outbox')
  await expect(page.getByRole('heading', { name: 'Ausgangskorb', level: 1 })).toBeVisible()
  const spalte = (name: string) => page.getByRole('region', { name, exact: true })
  let liste = spalte('Für mich zur Freigabe')
  await expect(liste.getByText(offerte)).toBeVisible()
  await expect(liste.getByText(/Serie .* 3 Nachrichten/).first()).toBeVisible()
  await expect(liste.getByText('Zurück von Benoît Buchhaltung').first()).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await foto(page, '1-fuer-mich')

  // Akte: Inhalt, Prüfungen, Zusammenhang
  await liste.getByText(offerte).click()
  const akte = page.getByRole('article', { name: offerte })
  await expect(akte.getByText('Wartet auf Freigabe')).toBeVisible()
  await expect(akte.getByText(/Im Anhang finden Sie die Offerte/)).toBeVisible()
  await expect(akte.getByText(`Familie Beispiel ${lauf}`).first()).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await foto(page, '2-akte')

  // Freigeben mit «Rückgängig»: der Eintrag wartet danach wieder
  await akte.getByRole('button', { name: /^Freigeben und senden/ }).click()
  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(liste.getByText(offerte)).toBeVisible()
  expect(sql(`select status from public.ausgangskorb where betreff = '${offerte}'`)).toBe('wartet')

  // Zurückgeschickt: Notiz der Buchhaltung steht in der Akte
  await liste.getByText(werkvertrag).click()
  await expect(page.getByRole('article', { name: werkvertrag })).toContainText('Anzahlung 30 % statt 40 % eintragen')

  // Fehler mit Lösung
  const ordner = page.getByRole('navigation', { name: 'Ordner' })
  await ordner.getByRole('button', { name: /^Fehler/ }).click()
  liste = spalte('Fehler')
  await liste.getByText(fehler).click()
  const fehlerAkte = page.getByRole('article', { name: fehler })
  await expect(fehlerAkte.getByRole('link', { name: /Mein Konto/ })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await foto(page, '3-fehler')

  // Brief: freigeben heisst drucken, danach von Hand als versendet markieren
  await ordner.getByRole('button', { name: /^Ganzes Team/ }).click()
  liste = spalte('Ganzes Team')
  await liste.getByText(brief).click()
  await expect(page.getByRole('article', { name: brief })).toContainText('5630 Muri')
  expect(await verstoesse(page)).toEqual([])
  await foto(page, '4-brief')
})

test.describe('Handy', () => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 7']
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch })

  test('Liste und Akte am Handy', async ({ page }) => {
    await anmelden(page, 'admin@test.local')
    await page.goto('/#/outbox')
    await expect(page.getByRole('heading', { name: 'Ausgangskorb', level: 1 })).toBeVisible()
    await expect(page.getByText(offerte)).toBeVisible()
    expect(await verstoesse(page)).toEqual([])
    await foto(page, '5-handy-liste')
    await page.getByText(offerte).click()
    await expect(page.getByRole('dialog', { name: 'Mail prüfen' })).toBeVisible()
    expect(await verstoesse(page)).toEqual([])
    await foto(page, '6-handy-akte')
  })
})
