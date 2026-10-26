import { describe, expect, it } from 'vitest'
import { fehlende, notizenFuer, releaseKonfig } from './vorbereiten.mjs'

describe('Veröffentlichen vorbereiten', () => {
  it('liest die Notizen der Version aus docs/versionen.md', () => {
    const text = '# Versionen\n\n## 0.17.0 (Entwurf)\n\n- Neu B\n\n## 0.16.0\n\n- Neu A\n- Fix\n'
    expect(notizenFuer(text, '0.16.0')).toBe('- Neu A\n- Fix')
    expect(notizenFuer(text, '0.17.0')).toBe('- Neu B')
    expect(notizenFuer(text, '0.1.0')).toBe('')
  })
  it('nennt fehlende Einstellungen nur mit Namen', () => {
    expect(fehlende({ TAURI_SIGNING_PRIVATE_KEY: 'x', VITE_SUPABASE_URL: ' ' })).toEqual([
      'TAURI_UPDATER_PUBKEY',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ])
  })
  it('schaltet Update-Dateien ein und setzt den öffentlichen Schlüssel', () => {
    expect(releaseKonfig(' abc\n')).toEqual({
      bundle: { createUpdaterArtifacts: true },
      plugins: { updater: { pubkey: 'abc' } },
    })
  })
})
