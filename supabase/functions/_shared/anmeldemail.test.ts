// @vitest-environment node
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { baueAnmeldemail, signaturGueltig, type HookDaten } from './anmeldemail.ts'

const ROH = Buffer.from('ein-geheimnis-mit-genug-laenge-123456').toString('base64')
const GEHEIM = `v1,whsec_${ROH}`
const signiere = (id: string, zeit: string, inhalt: string) =>
  'v1,' + createHmac('sha256', Buffer.from(ROH, 'base64')).update(`${id}.${zeit}.${inhalt}`).digest('base64')

describe('Signatur (Standard Webhooks)', () => {
  const inhalt = '{"a":1}'
  const jetzt = 1_800_000_000
  const zeit = String(jetzt)
  it('nimmt eine richtige Signatur an', async () => {
    const kopf = { id: 'msg_1', zeit, signatur: signiere('msg_1', zeit, inhalt) }
    expect(await signaturGueltig(GEHEIM, kopf, inhalt, jetzt)).toBe(true)
  })
  it('findet die richtige unter mehreren', async () => {
    const kopf = { id: 'msg_1', zeit, signatur: `v1,falsch ${signiere('msg_1', zeit, inhalt)}` }
    expect(await signaturGueltig(GEHEIM, kopf, inhalt, jetzt)).toBe(true)
  })
  it('lehnt veränderten Inhalt ab', async () => {
    const kopf = { id: 'msg_1', zeit, signatur: signiere('msg_1', zeit, inhalt) }
    expect(await signaturGueltig(GEHEIM, kopf, '{"a":2}', jetzt)).toBe(false)
  })
  it('lehnt alte Aufrufe und fehlende Köpfe ab', async () => {
    const kopf = { id: 'msg_1', zeit, signatur: signiere('msg_1', zeit, inhalt) }
    expect(await signaturGueltig(GEHEIM, kopf, inhalt, jetzt + 301)).toBe(false)
    expect(await signaturGueltig(GEHEIM, { ...kopf, id: null }, inhalt, jetzt)).toBe(false)
  })
})

const daten = (art: string, sprache?: string): HookDaten => ({
  user: { email: 'person@test.local', user_metadata: sprache ? { sprache } : {} },
  email_data: { token: '123456', email_action_type: art, site_url: 'https://app.test.local' },
})

describe('Mail bauen', () => {
  it('Code auf Deutsch ohne Sprache', () => {
    const m = baueAnmeldemail(daten('magiclink'))
    expect(m.an).toBe('person@test.local')
    expect(m.betreff).toBe('Dein Anmeldecode · Dimension Work')
    expect(m.html).toContain('123456')
    expect(m.html).not.toContain('Bonjour')
  })
  it('Code nur auf Französisch', () => {
    const m = baueAnmeldemail(daten('signup', 'fr'))
    expect(m.betreff).toBe('Ton code de connexion · Dimension Work')
    expect(m.html).not.toContain('Hallo')
  })
  it('Einladung mit Knopf zur App', () => {
    const m = baueAnmeldemail(daten('invite', 'de'))
    expect(m.betreff).toBe('Einladung zu Dimension Work')
    expect(m.html).toContain('href="https://app.test.local"')
    expect(m.html).not.toContain('123456')
  })
  it('setzt nichts Fremdes ein', () => {
    const d = daten('invite')
    d.email_data.site_url = 'javascript:alert(1)'
    expect(baueAnmeldemail(d).html).toContain('href="https://dimension-solaire.ch"')
    const c = daten('magiclink')
    c.email_data.token = '<b>1</b>'
    expect(baueAnmeldemail(c).html).not.toContain('<b>1</b>')
  })
  it('neue Adresse geht an die neue Adresse', () => {
    const d = daten('email_change')
    d.user.new_email = 'neu@test.local'
    expect(baueAnmeldemail(d).an).toBe('neu@test.local')
  })
})
