import { useEffect, useRef, useState } from 'react'

/** Die Spracherkennung des Browsers (Chrome/Edge/Safari; in Firefox nicht vorhanden). */
interface Erkennung {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult:
    | ((e: {
        resultIndex: number
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
      }) => void)
    | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type ErkennungKlasse = new () => Erkennung

function klasse(): ErkennungKlasse | null {
  const w = window as unknown as { SpeechRecognition?: ErkennungKlasse; webkitSpeechRecognition?: ErkennungKlasse }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Diktieren (Bau-Auftrag 3.4: Gesprächsnotiz per Text oder Diktat). Nutzt die Spracherkennung des Browsers bzw.
 * des Handys; der Ton geht dabei an den Dienst des Browsers, nicht an das CRM. Fertige Sätze kommen über `onText`.
 */
export function useDiktat(sprache: 'de' | 'fr', onText: (t: string) => void) {
  const [laeuft, setLaeuft] = useState(false)
  const ref = useRef<Erkennung | null>(null)
  const rueckruf = useRef(onText)
  useEffect(() => {
    rueckruf.current = onText
  })
  useEffect(() => () => ref.current?.stop(), [])

  const K = typeof window === 'undefined' ? null : klasse()
  const umschalten = () => {
    if (!K) return
    if (laeuft) {
      ref.current?.stop()
      return
    }
    const e = new K()
    e.lang = sprache === 'fr' ? 'fr-CH' : 'de-CH'
    e.continuous = true
    e.interimResults = false
    e.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r?.isFinal && r[0]) rueckruf.current(r[0].transcript.trim())
      }
    }
    e.onend = () => {
      setLaeuft(false)
    }
    e.onerror = () => {
      setLaeuft(false)
    }
    ref.current = e
    e.start()
    setLaeuft(true)
  }
  return { verfuegbar: Boolean(K), laeuft, umschalten }
}
