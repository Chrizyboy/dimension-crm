import { useCallback, useEffect, useRef, useState } from 'react'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { leseKalender } from '../lib/kalenderdatei'
import {
  gemerkterOrdner,
  merkeOrdner,
  neuesteDatei,
  ordnerMoeglich,
  waehleOrdner,
  type OrdnerZugriff,
} from '../lib/ordner'
import { ersetzeKalender } from '../services/planung'
import { useVerkaufAenderung } from './useVerkauf'

/** Name und Änderungszeit, damit dieselbe Datei nicht bei jedem Zurückkehren neu geladen wird. */
const stempel = (f: File) => `${f.name}|${String(f.lastModified)}`

function gesehen(schluessel: string): string | null {
  try {
    return localStorage.getItem(`ordner.${schluessel}`)
  } catch {
    return null
  }
}
function merke(schluessel: string, wert: string) {
  try {
    localStorage.setItem(`ordner.${schluessel}`, wert)
  } catch {
    // ohne Speicher wird die Datei beim nächsten Mal nochmals geprüft; schadet nicht
  }
}

/**
 * Verbundener Ordner (V233 «Ordner verbinden – lädt automatisch»): beim Öffnen und bei jeder Rückkehr
 * ins Fenster lädt das CRM den neuesten Kalender der angemeldeten Person und meldet ein neueres
 * Planungstool-Excel. Neue Leads übernimmt man im Import-Dialog mit einem Klick.
 */
export function useOrdner(onExcel: (datei: File) => void) {
  const ich = useAnmeldung((z) => z.ich)
  const [ordner, setOrdner] = useState<OrdnerZugriff | null>(null)
  const [erlaubt, setErlaubt] = useState(false)
  const excel = useRef(onExcel)
  useEffect(() => {
    excel.current = onExcel
  })
  const kalender = useVerkaufAenderung((eingabe: { person: string; text: string }) =>
    ersetzeKalender(eingabe.person, 'datei', leseKalender(eingabe.text)),
  )
  const kalenderLaden = kalender.mutateAsync

  const pruefe = useCallback(
    async (o: OrdnerZugriff, immer: boolean) => {
      try {
        const k = await neuesteDatei(o, 'kalender')
        if (k && ich && (immer || gesehen('kalender') !== stempel(k))) {
          const n = await kalenderLaden({ person: ich.id, text: await k.text() })
          merke('kalender', stempel(k))
          melde('ok', {
            de: `Kalender «${k.name}»: ${String(n)} Termine`,
            fr: `Calendrier «${k.name}» : ${String(n)} rendez-vous`,
          })
        }
        const x = await neuesteDatei(o, 'excel')
        if (x && (immer || gesehen('excel') !== stempel(x))) {
          merke('excel', stempel(x))
          excel.current(x)
        } else if (!x && immer) {
          melde('warnung', {
            de: 'Kein «Planungstool…xlsx» im Ordner',
            fr: 'Aucun « Planungstool…xlsx » dans le dossier',
          })
        }
      } catch (f) {
        meldeFehler(f, 'ordner')
        // Excel ist offen und gesperrt: V233 bat ebenfalls, kurz zu warten.
        melde('warnung', {
          de: 'Datei gerade gesperrt, bitte kurz warten',
          fr: 'Fichier verrouillé, veuillez patienter',
        })
      }
    },
    [ich, kalenderLaden],
  )

  useEffect(() => {
    if (!ordnerMoeglich()) return
    let aktiv = true
    void gemerkterOrdner().then(async (o) => {
      if (!o || !aktiv) return
      setOrdner(o)
      const ok = (await o.queryPermission({ mode: 'read' }).catch(() => 'prompt')) === 'granted'
      setErlaubt(ok)
      if (ok) await pruefe(o, false)
    })
    return () => {
      aktiv = false
    }
  }, [pruefe])

  useEffect(() => {
    if (!ordner || !erlaubt) return
    const beiRueckkehr = () => {
      if (document.visibilityState === 'visible') void pruefe(ordner, false)
    }
    document.addEventListener('visibilitychange', beiRueckkehr)
    return () => {
      document.removeEventListener('visibilitychange', beiRueckkehr)
    }
  }, [ordner, erlaubt, pruefe])

  /** Knopf: Ordner wählen, Erlaubnis geben oder jetzt neu laden. */
  async function knopf() {
    try {
      let o = ordner
      if (!o) {
        o = await waehleOrdner()
        // Merken ist Komfort: klappt es nicht (privates Fenster), geht der Ordner trotzdem bis zum Schliessen.
        await merkeOrdner(o).catch((f: unknown) => {
          meldeFehler(f, 'ordner')
        })
        setOrdner(o)
      } else if (!erlaubt && (await o.requestPermission({ mode: 'read' })) !== 'granted') {
        melde('warnung', {
          de: 'Ohne Erlaubnis kann das Excel nicht geladen werden',
          fr: "Sans autorisation, l'Excel ne peut pas être chargé",
        })
        return
      }
      setErlaubt(true)
      await pruefe(o, true)
    } catch (f) {
      if (f instanceof DOMException && f.name === 'AbortError') return
      meldeFehler(f, 'ordner')
      melde('kritisch', { de: 'Ordner konnte nicht verbunden werden', fr: 'Impossible de connecter le dossier' })
    }
  }

  async function trennen() {
    await merkeOrdner(null)
    setOrdner(null)
    setErlaubt(false)
  }

  return { moeglich: ordnerMoeglich(), name: ordner?.name ?? null, erlaubt, laedt: kalender.isPending, knopf, trennen }
}
