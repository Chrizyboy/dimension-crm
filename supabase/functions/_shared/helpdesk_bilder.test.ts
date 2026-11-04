import { describe, expect, it } from 'vitest'
import { BILDER_PRO_MELDUNG, anhaengeAbfrage, bilderJeMeldung, lesbaresBild } from './helpdesk_bilder.ts'

const a = (bezug_id: string, name: string, mime_typ: string | null, pfad: string | null = `handbuch/${name}`) => ({
  bezug_id,
  name,
  mime_typ,
  speicher_pfad: pfad,
})

describe('Bilder einer Meldung für die Prüfung', () => {
  it('nimmt nur Bilder, die Claude lesen kann', () => {
    expect(lesbaresBild(a('m', 'x.png', 'image/png'))).toBe(true)
    expect(lesbaresBild(a('m', 'x.jpg', 'image/jpeg'))).toBe(true)
    expect(lesbaresBild(a('m', 'x.heic', 'image/heic'))).toBe(false)
    expect(lesbaresBild(a('m', 'x.pdf', 'application/pdf'))).toBe(false)
    expect(lesbaresBild(a('m', 'x.png', 'image/png', null))).toBe(false)
  })

  it('ordnet nach Meldung und begrenzt die Anzahl', () => {
    const viele = Array.from({ length: BILDER_PRO_MELDUNG + 3 }, (_, i) => a('m1', `${String(i)}.png`, 'image/png'))
    const je = bilderJeMeldung([...viele, a('m2', 'b.jpg', 'image/jpeg'), a('m2', 'c.pdf', 'application/pdf')])
    expect(je.get('m1')).toHaveLength(BILDER_PRO_MELDUNG)
    expect(je.get('m2')?.map((x) => x.name)).toEqual(['b.jpg'])
  })

  it('fragt alle Meldungen in einer Abfrage ab, ohne Papierkorb', () => {
    const q = anhaengeAbfrage(['a', 'b'])
    expect(q).toContain('bezug_id=in.(a,b)')
    expect(q).toContain('geloescht_am=is.null')
  })
})
