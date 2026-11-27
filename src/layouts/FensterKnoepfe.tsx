import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { istDesktopApp } from '@/lib/plattform'
import { meldeFehler } from '@/services/fehler'

/** Schaltet das Fenster in den Vollbildmodus und zurück: in der Windows-App das ganze Fenster, im Browser die Seite. */
async function vollbildUmschalten(): Promise<boolean> {
  if (istDesktopApp()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const fenster = getCurrentWindow()
    const neu = !(await fenster.isFullscreen())
    await fenster.setFullscreen(neu)
    return neu
  }
  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return false
  }
  await document.documentElement.requestFullscreen()
  return true
}

/**
 * Vollbild (F11) und Aktualisieren wie in V234, seit 27.11.2026 im Konto-Menü statt als runde Knöpfe (Chris: Kopfzeile
 * nur Suche, Assistent, Glocke, Profil). «Aktualisieren» lädt alle Daten der offenen Ansicht neu vom Server, ohne die
 * Seite neu zu laden (Eingaben bleiben).
 */
export function useFenster() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const laedt = useIsFetching() > 0
  const [vollbild, setVollbild] = useState(false)

  // Im Browser kann man das Vollbild auch mit Esc verlassen; der Knopf zeigt dann wieder das richtige Symbol.
  useEffect(() => {
    const beiWechsel = () => {
      setVollbild(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', beiWechsel)
    return () => {
      document.removeEventListener('fullscreenchange', beiWechsel)
    }
  }, [])

  // F11 wie unter Windows gewohnt; in der Windows-App gibt es dafür sonst keine Taste.
  useEffect(() => {
    const beiTaste = (e: KeyboardEvent) => {
      if (e.key !== 'F11') return
      e.preventDefault()
      vollbildUmschalten().then(setVollbild, (f: unknown) => {
        meldeFehler(f)
      })
    }
    window.addEventListener('keydown', beiTaste)
    return () => {
      window.removeEventListener('keydown', beiTaste)
    }
  }, [])

  const vollbildText = vollbild ? t('fenster.vollbildAus') : t('fenster.vollbild')
  return {
    vollbild,
    vollbildText,
    laedt,
    vollbildUmschalten: () => {
      vollbildUmschalten().then(setVollbild, (e: unknown) => {
        meldeFehler(e)
      })
    },
    aktualisieren: () => {
      void queryClient.invalidateQueries()
    },
  }
}
