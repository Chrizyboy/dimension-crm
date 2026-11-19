import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Maximize, Minimize, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { istDesktopApp } from '@/lib/plattform'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { AnsichtKnopf } from './AnsichtKnopf'

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
 * Runde Knöpfe oben rechts wie in V234: PC/Handy, Vollbild und Aktualisieren.
 * «Aktualisieren» lädt alle Daten der offenen Ansicht neu vom Server, ohne die Seite neu zu laden (Eingaben bleiben).
 */
export function FensterKnoepfe() {
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
  return (
    <>
      <AnsichtKnopf />
      <Button
        variant="glas"
        size="rund"
        className="hidden sm:inline-flex"
        aria-label={vollbildText}
        title={`${vollbildText} (F11)`}
        onClick={() => {
          vollbildUmschalten().then(setVollbild, (e: unknown) => {
            meldeFehler(e)
          })
        }}
      >
        {vollbild ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
      </Button>
      <Button
        variant="glas"
        size="rund"
        aria-label={t('fenster.aktualisieren')}
        title={t('fenster.aktualisieren')}
        onClick={() => {
          void queryClient.invalidateQueries()
        }}
      >
        <RefreshCw aria-hidden="true" className={cn(laedt && 'animate-spin')} />
      </Button>
    </>
  )
}
