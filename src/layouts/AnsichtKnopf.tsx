import { Monitor, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { istDesktopApp } from '@/lib/plattform'
import { meldeFehler } from '@/services/fehler'

const SPEICHER = 'dw.ansicht'
const HANDY = { breite: 430, hoehe: 900 }
const VIEWPORT_HANDY = 'width=device-width, initial-scale=1, viewport-fit=cover'
const VIEWPORT_PC = 'width=1280, viewport-fit=cover'

/** Ist das Gerät selbst ein Handy? Bildschirmbreite, nicht Fensterbreite, sonst kippt es beim Umschalten. */
function istHandyGeraet(): boolean {
  return Math.min(window.screen.width, window.screen.height) < 768
}

function leseWahl(): 'pc' | null {
  try {
    return localStorage.getItem(SPEICHER) === 'pc' ? 'pc' : null
  } catch {
    return null
  }
}

/** Am Handy: die Seite tut so, als wäre der Bildschirm 1280 px breit, dann erscheint die PC-Ansicht. */
function setzeViewport(pc: boolean) {
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', pc ? VIEWPORT_PC : VIEWPORT_HANDY)
}

// Grösse vor dem Umschalten auf Handy, damit «PC-Ansicht» das Fenster wieder so herstellt.
let vorher: { breite: number; hoehe: number; maximiert: boolean } | null = null

/** In der Windows-App das Fenster auf Handy-Grösse verkleinern bzw. zurück; gibt zurück, ob nun Handy-Grösse. */
async function fensterUmschalten(): Promise<boolean> {
  const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window')
  const f = getCurrentWindow()
  if (vorher) {
    const v = vorher
    vorher = null
    if (v.maximiert) await f.maximize()
    else await f.setSize(new LogicalSize(v.breite, v.hoehe))
    return false
  }
  const faktor = await f.scaleFactor()
  const groesse = (await f.innerSize()).toLogical(faktor)
  vorher = { breite: groesse.width, hoehe: groesse.height, maximiert: await f.isMaximized() }
  if (vorher.maximiert) await f.unmaximize()
  await f.setSize(new LogicalSize(HANDY.breite, HANDY.hoehe))
  return true
}

/**
 * Umschalter PC/Handy wie in V234: am Handy auf die PC-Ansicht (bleibt gespeichert), in der Windows-App das
 * Fenster auf Handy-Grösse, im Browser am PC ein Fenster in Handy-Grösse daneben.
 */
export function AnsichtKnopf() {
  const { t } = useTranslation()
  const handyGeraet = istHandyGeraet()
  const [pcAmHandy, setPcAmHandy] = useState(() => handyGeraet && leseWahl() === 'pc')
  const [fensterKlein, setFensterKlein] = useState(false)

  useEffect(() => {
    if (handyGeraet) setzeViewport(pcAmHandy)
  }, [handyGeraet, pcAmHandy])

  const zeigtHandy = handyGeraet ? !pcAmHandy : fensterKlein
  const text = zeigtHandy ? t('fenster.ansichtPc') : t('fenster.ansichtHandy')

  function umschalten() {
    if (handyGeraet) {
      const neu = !pcAmHandy
      try {
        if (neu) localStorage.setItem(SPEICHER, 'pc')
        else localStorage.removeItem(SPEICHER)
      } catch {
        /* privates Fenster: gilt dann nur bis zum Neuladen */
      }
      setPcAmHandy(neu)
      return
    }
    if (istDesktopApp()) {
      fensterUmschalten().then(setFensterKlein, (e: unknown) => {
        meldeFehler(e)
      })
      return
    }
    window.open(
      window.location.href,
      'dimension-work-handy',
      `popup,width=${String(HANDY.breite)},height=${String(HANDY.hoehe)}`,
    )
  }

  return (
    <Button variant="glas" size="rund" aria-label={text} title={text} onClick={umschalten}>
      {zeigtHandy ? <Monitor aria-hidden="true" /> : <Smartphone aria-hidden="true" />}
    </Button>
  )
}
