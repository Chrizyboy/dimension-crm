import { toast } from 'sonner'
import i18n from '@/i18n'
import { useBenachrichtigungen, type MeldungsArt } from '@/stores/benachrichtigungen'
import type { Sprache, Zweisprachig } from '@/types/modul'

interface MeldungsOptionen {
  text?: Zweisprachig
  /** Ansicht, die beim Klick auf die Benachrichtigung geöffnet wird. */
  ziel?: string
  /** Zusätzlich in den Posteingang (Glocke) legen, nicht nur kurz einblenden. */
  bleibend?: boolean
  /** Knopf in der Meldung, z. B. «Rückgängig» nach dem Archivieren. */
  aktion?: { text: Zweisprachig; ausfuehren: () => void }
}

/**
 * Zeigt eine kurze Rückmeldung unten rechts (z.B. «Gespeichert») und legt sie auf Wunsch
 * in den Posteingang. Einzige Stelle, über die Module Meldungen ausgeben.
 */
export function melde(art: MeldungsArt, titel: Zweisprachig, optionen: MeldungsOptionen = {}): void {
  const sprache: Sprache = i18n.language === 'fr' ? 'fr' : 'de'
  const beschreibung = optionen.text?.[sprache]
  const anzeige = {
    ...(beschreibung ? { description: beschreibung } : {}),
    ...(optionen.aktion
      ? { action: { label: optionen.aktion.text[sprache], onClick: optionen.aktion.ausfuehren } }
      : {}),
  }
  if (art === 'ok') toast.success(titel[sprache], anzeige)
  else if (art === 'warnung') toast.warning(titel[sprache], anzeige)
  else if (art === 'kritisch') toast.error(titel[sprache], { ...anzeige, duration: 10_000 })
  else toast.info(titel[sprache], anzeige)

  if (optionen.bleibend === true) {
    useBenachrichtigungen.getState().hinzufuegen({
      art,
      titel,
      ...(optionen.text ? { text: optionen.text } : {}),
      ...(optionen.ziel ? { ziel: optionen.ziel } : {}),
    })
  }
}
