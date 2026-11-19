// @vitest-environment node
import { describe, expect, it } from 'vitest'
// Prüft den Umbau .msg → .eml der App (src/lib/mailDatei.ts) gegen den Leser des Servers.
import { emlAusFeldern, istMsg, mailDateiAlsEml } from '../../../src/lib/mailDatei'
import { emlLesen } from './anfrage'

describe('mailDatei', () => {
  it('erkennt eine .msg am Dateianfang', () => {
    expect(istMsg(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1]))).toBe(true)
    expect(istMsg(new TextEncoder().encode('From: a@b.ch'))).toBe(false)
  })

  it('baut aus einer .msg eine .eml, die der Server mit Umlauten liest', () => {
    const eml = emlAusFeldern({
      betreff: 'Anfrage Wärmepumpe – Müller',
      vonName: 'Anna Müller',
      vonMail: 'anna@beispiel.ch',
      datum: '2026-11-19T08:00:00Z',
      kennung: '<abc@beispiel.ch>',
      text: 'Grüezi, bitte um Offerte.',
      html: '<p>Grüezi, <b>bitte</b> um Offerte.</p>',
    })
    const m = emlLesen(eml)
    expect(m.betreff).toBe('Anfrage Wärmepumpe – Müller')
    expect(m.von).toContain('Anna Müller')
    expect(m.von).toContain('anna@beispiel.ch')
    expect(m.inhalt.trim()).toBe('Grüezi, bitte um Offerte.')
    expect(m.kennung).toBe('<abc@beispiel.ch>')
    expect(m.datum).toBe('2026-11-19T08:00:00.000Z')
  })

  it('nimmt das HTML, wenn eine .msg keinen Text hat, und lässt .eml unverändert', async () => {
    const m = emlLesen(emlAusFeldern({ betreff: 'Landingpage', html: '<td>Name</td><td>Zoé</td>' }))
    expect(m.inhalt).toContain('Zoé')
    const roh = 'From: a@b.ch\r\nSubject: Test\r\n\r\nHallo'
    expect(await mailDateiAlsEml(new Blob([roh]))).toBe(roh)
  })
})
