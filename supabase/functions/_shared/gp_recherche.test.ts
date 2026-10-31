// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { anfrageInhalt, frageClaude } from './claude.ts'
import { rechercheLesen } from './gp_recherche.ts'
import { websucheMillirappen } from './ki_rahmen.ts'

describe('Recherche lesen', () => {
  it('nimmt nur Bekanntes, begrenzt Listen und verwirft Erfundenes ohne Form', () => {
    const r = rechercheLesen({
      zusammenfassung: 'Halle der Muster AG',
      eigentuemer: {
        name: 'Muster AG',
        art: 'erfunden',
        sicherheit: 'sehr',
        begruendung: 'Website',
        quelle: 'keine url',
      },
      nutzer: '',
      ansprechpersonen: [
        {
          name: 'Anna Beispiel',
          funktion: 'Leiterin Technik',
          telefon: '+41 56 000 00 00',
          email: 'kaputt',
          quelle: 'https://muster.ch/team',
        },
        { name: '', funktion: 'ohne Namen' },
        { name: 'B' },
        { name: 'C' },
        { name: 'D' },
      ],
      naechste_schritte: [{ titel: 'Eigentum im Grundbuch bestätigen', text: 'Auszug bestellen', in_tagen: 400 }],
      quellen: [
        { titel: 'Team', url: 'https://muster.ch/team' },
        { titel: 'kaputt', url: 'javascript:alert(1)' },
      ],
    })
    expect(r.eigentuemer).toEqual({
      name: 'Muster AG',
      art: 'unbekannt',
      sicherheit: 'tief',
      begruendung: 'Website',
      quelle: null,
    })
    expect(r.nutzer).toBeNull()
    expect(r.ansprechpersonen).toHaveLength(3)
    expect(r.ansprechpersonen[0]).toMatchObject({
      name: 'Anna Beispiel',
      email: null,
      quelle: 'https://muster.ch/team',
    })
    expect(r.naechste_schritte[0]?.in_tagen).toBe(60)
    expect(r.quellen).toEqual([{ titel: 'Team', url: 'https://muster.ch/team' }])
  })
  it('leere Antwort ergibt einen leeren, gültigen Vorschlag', () => {
    const r = rechercheLesen(null)
    expect(r.eigentuemer.art).toBe('unbekannt')
    expect(r.ansprechpersonen).toEqual([])
  })
})

describe('Websuche', () => {
  const basis = {
    system: 'Regeln',
    teile: [{ art: 'text' as const, text: 'Suche' }],
    maxTokens: 100,
    modell: 'claude-opus-5-5',
  }
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('schickt Werkzeuge und setzt eine pausierte Runde fort', () => {
    const a = anfrageInhalt({ ...basis, werkzeuge: [{ type: 'web_search_20260209', name: 'web_search' }] }, [
      { type: 'server_tool_use', id: 'x' },
    ])
    expect(a.tools).toEqual([{ type: 'web_search_20260209', name: 'web_search' }])
    expect((a.messages as { role: string }[]).map((m) => m.role)).toEqual(['user', 'assistant'])
  })

  it('pause_turn: fragt weiter, zählt Verbrauch und Suchen zusammen', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test')
    const antworten = [
      {
        stop_reason: 'pause_turn',
        content: [{ type: 'server_tool_use' }],
        usage: { input_tokens: 10, output_tokens: 5, server_tool_use: { web_search_requests: 3 } },
      },
      {
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Notizen' }],
        usage: { input_tokens: 20, output_tokens: 7, server_tool_use: { web_search_requests: 2 } },
      },
    ]
    const bodies: { messages: unknown[] }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)) as { messages: unknown[] })
        return new Response(JSON.stringify(antworten.shift()), { status: 200 })
      }),
    )
    const r = await frageClaude({ ...basis, werkzeuge: [{ type: 'web_search_20260209', name: 'web_search' }] })
    expect(r.text).toBe('Notizen')
    expect(r.nutzung.ein).toBe(30)
    expect(r.websuchen).toBe(5)
    expect(bodies[1]?.messages).toHaveLength(2)
  })

  it('rechnet die Kosten der Suchen', () => {
    // 5 Suchen × 10 USD / 1000 × 0.9 = 0.045 CHF = 4.5 Rappen
    expect(websucheMillirappen(5, { websuche_usd_je_1000: 10, usd_chf: 0.9 })).toBe(4500)
  })
})
