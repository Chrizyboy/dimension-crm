// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { marketingHtml, wirdGezaehlt } from './zaehler.ts'

const basis = 'https://abc.supabase.co'
const id = '11111111-2222-3333-4444-555555555555'

describe('Zähler für Werbe-Mails', () => {
  it('zählt nur Serien-Mails und Newsletter ohne eigenes HTML', () => {
    expect(wirdGezaehlt({ kanal: 'mail', art: 'newsletter' })).toBe(true)
    expect(wirdGezaehlt({ kanal: 'mail', art: 'serienmail', html: '' })).toBe(true)
    expect(wirdGezaehlt({ kanal: 'mail', art: 'frei' })).toBe(false)
    expect(wirdGezaehlt({ kanal: 'sms', art: 'newsletter' })).toBe(false)
    expect(wirdGezaehlt({ kanal: 'mail', art: 'newsletter', html: '<p>x</p>' })).toBe(false)
  })

  it('leitet Links über den Zähler, ohne Satzzeichen, Abmelde-Link direkt', () => {
    const html = marketingHtml(
      'Mehr unter https://www.dimension-solaire.ch/batterie?a=1&b=2.\nAbmelden: https://abc.supabase.co/functions/v1/abmelden?s=x',
      basis,
      id,
      'Wir zählen Öffnungen.',
    )
    expect(html).toContain(
      `href="${basis}/functions/v1/zaehler?k=${id}&amp;u=${encodeURIComponent('https://www.dimension-solaire.ch/batterie?a=1&b=2')}"`,
    )
    expect(html).toContain('</a>.<br>')
    expect(html).toContain('href="https://abc.supabase.co/functions/v1/abmelden?s=x"')
    expect(html).toContain(`src="${basis}/functions/v1/zaehler?o=${id}"`)
    expect(html).toContain('Wir zählen Öffnungen.')
  })

  it('schützt den Text vor HTML', () => {
    expect(marketingHtml('<b>Hallo</b> & "du"', basis, id)).toContain('&lt;b&gt;Hallo&lt;/b&gt; &amp; &quot;du&quot;')
  })
})
