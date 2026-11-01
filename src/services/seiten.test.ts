import { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { alleSeiten, SEITE } from './seiten'

describe('alleSeiten', () => {
  it('holt Seite für Seite, bis eine Seite nicht mehr voll ist', async () => {
    const alle = Array.from({ length: SEITE * 2 + 5 }, (_, i) => i)
    const aufrufe: [number, number][] = []
    const zeilen = await alleSeiten((von, bis) => {
      aufrufe.push([von, bis])
      return Promise.resolve({ data: alle.slice(von, bis + 1), error: null })
    })
    expect(zeilen).toEqual(alle)
    expect(aufrufe).toEqual([
      [0, SEITE - 1],
      [SEITE, 2 * SEITE - 1],
      [2 * SEITE, 3 * SEITE - 1],
    ])
  })

  it('gibt Fehler weiter', async () => {
    const fehler = new PostgrestError({ message: 'kaputt', details: '', hint: '', code: 'X' })
    await expect(alleSeiten(() => Promise.resolve({ data: null, error: fehler }))).rejects.toBe(fehler)
  })
})
