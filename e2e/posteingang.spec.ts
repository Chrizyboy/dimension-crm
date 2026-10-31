import AxeBuilder from '@axe-core/playwright'
import { devices, expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 18: Posteingang. Zwei erfundene Mails kommen wie vom Server (abholen + einordnen) ins persönliche Postfach der
// Administration: eine Anfrage und eine Frage eines Kunden. Die Liste zeigt Frist und Art, die Mail-Akte die
// Zusammenfassung; weitergeben an den Verkauf, «Erledigt ohne Antwort» verschiebt sie unter «Erledigt», «Lead anlegen»
// führt zu Anfragen & Leads. Am Handy: Liste und Akte ohne Verstösse gegen die Barrierefreiheit.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = String(Date.now()).slice(-6)
const anfrage = `E2E Anfrage Wärmepumpe ${lauf}`
const frage = `E2E Frage zur Montage ${lauf}`

/** SQL in der lokalen Datenbank (nur Testdaten; die Funktionen sind dem Server vorbehalten). */
const sql = (befehl: string) =>
  execFileSync('psql', ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-tAc', befehl], {
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: 'postgres' },
  }).trim()

/** Eine Mail aufnehmen und einordnen, wie es der Zeitplan tut. */
function mailEinliefern(betreff: string, von: string, art: string, zusammenfassung: string) {
  const mail = JSON.stringify([
    {
      kennung: `<e2e-${betreff.replace(/\W/g, '')}@test>`,
      outlook_id: `e2e-${lauf}-${art}`,
      konversation: `e2e-${lauf}-${art}`,
      eingang_am: new Date(Date.now() - 10 * 60_000).toISOString(),
      von,
      von_name: 'Testperson E2E',
      an: ['admin@test.local'],
      betreff,
      vorschau: zusammenfassung,
      anhang: false,
    },
  ]).replace(/'/g, "''")
  sql(
    `select public.posteingang_aufnehmen((select id from public.personen where email = 'admin@test.local'), 'me', '${mail}')`,
  )
  const p = JSON.stringify({ art, sprache: 'de', zusammenfassung, antwort_noetig: true }).replace(/'/g, "''")
  sql(
    `select public.posteingang_sortieren(id, '${p}') from public.posteingang where betreff = '${betreff.replace(/'/g, "''")}'`,
  )
}

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

test.beforeAll(() => {
  mailEinliefern(anfrage, `e2e-${lauf}@beispiel.test`, 'anfrage', 'Möchte eine Offerte für eine Wärmepumpe.')
  mailEinliefern(frage, `e2e-kunde-${lauf}@beispiel.test`, 'kunde', 'Fragt, wann die Monteure kommen.')
})

test('Posteingang: Frist sehen, weitergeben, erledigen und Lead anlegen', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/inbox')
  await expect(page.getByRole('heading', { name: 'Posteingang', level: 1 })).toBeVisible()
  const zeileFrage = page.getByRole('row', { name: new RegExp(frage) })
  await expect(zeileFrage).toBeVisible()
  await expect(zeileFrage).toContainText('Kunde')
  await expect(page.getByRole('row', { name: new RegExp(anfrage) })).toContainText('Neue Anfrage')
  expect(await verstoesse(page)).toEqual([])

  // Akte: Zusammenfassung, weitergeben an den Verkauf
  await zeileFrage.click()
  const akte = page.getByRole('dialog', { name: frage })
  await expect(akte).toContainText('Fragt, wann die Monteure kommen.')
  expect(await verstoesse(page)).toEqual([])
  await akte.getByRole('button', { name: 'Weitergeben' }).click()
  const weiter = page.getByRole('dialog', { name: 'Mail weitergeben' })
  await weiter.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Vera Verkauf' }).click()
  await weiter.getByRole('button', { name: 'Weitergeben' }).click()
  await expect(weiter).toBeHidden()
  await expect(akte).toContainText('Vera Verkauf')

  // Erledigt ohne Antwort → unter «Erledigt»
  await akte.getByRole('button', { name: 'Erledigt ohne Antwort' }).click()
  await expect(akte).toBeHidden()
  await page.getByRole('button', { name: /^Erledigt/ }).click()
  await page.getByRole('row', { name: new RegExp(frage) }).click()
  await expect(page.getByRole('dialog', { name: frage }).getByRole('button', { name: 'Wieder öffnen' })).toBeVisible()
  await page.keyboard.press('Escape')

  // Anfrage → Lead anlegen führt zu Anfragen & Leads mit der Mail
  await page.goto('/#/inbox?ansicht=neu')
  await page.getByRole('row', { name: new RegExp(anfrage) }).click()
  await page.getByRole('dialog', { name: anfrage }).getByRole('link', { name: 'Lead anlegen' }).click()
  await expect(page).toHaveURL(/#\/sales\?ausMail=/)
})

test.describe('Handy', () => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 7']
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch })

  test('Liste und Akte am Handy', async ({ page }) => {
    await anmelden(page, 'admin@test.local')
    await page.goto('/#/inbox?ansicht=neu')
    await expect(page.getByRole('heading', { name: 'Posteingang', level: 1 })).toBeVisible()
    await page.getByText(anfrage).click()
    await expect(page.getByRole('dialog', { name: anfrage })).toBeVisible()
    expect(await verstoesse(page)).toEqual([])
  })
})
