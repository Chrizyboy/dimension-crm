import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { holeAusPapierkorb, legeInPapierkorb } from '@/services/papierkorb'

/** Was in den Papierkorb soll. */
export interface PapierkorbZiel {
  /** Tabelle in der Datenbank, z. B. `verkaufschancen`. */
  tabelle: string
  id: string
  /** Was weggeht, so wie die Person es kennt («L-2026-041 Meier»). */
  name: string
  /** Nach dem Wegwerfen, z. B. Akte schliessen oder zurück zur Liste. */
  onFertig?: () => void
}

/**
 * Papierkorb für jeden Bereich (Chris 3.11.2026: überall löschen können): `frage()` öffnet die Rückfrage,
 * `dialog` gehört irgendwo in die Seite (nicht in ein Menü, das beim Klick zugeht).
 * Die Datenbank (`papierkorb_legen`) prüft Recht und Stand; Gebuchtes meldet sie als «stornieren statt löschen».
 * Danach laden alle Listen neu, und 10 Sekunden lang gibt es «Rückgängig».
 */
export function usePapierkorb(ziel: PapierkorbZiel | null): { frage: () => void; dialog: ReactNode } {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [offen, setOffen] = useState(false)
  const [laeuft, setLaeuft] = useState(false)

  async function zurueckholen(z: PapierkorbZiel) {
    try {
      await holeAusPapierkorb(z.tabelle, z.id)
      await qc.invalidateQueries()
      melde('ok', zweisprachig('papierkorb.zurueck', { name: z.name }))
    } catch (f) {
      zeigePapierkorbFehler(f)
    }
  }

  async function wegwerfen(z: PapierkorbZiel) {
    setLaeuft(true)
    try {
      await legeInPapierkorb(z.tabelle, z.id)
      setOffen(false)
      z.onFertig?.()
      await qc.invalidateQueries()
      melde('ok', zweisprachig('papierkorb.gelegt', { name: z.name }), {
        text: zweisprachig('papierkorb.gelegtText'),
        aktion: { text: zweisprachig('allgemein.rueckgaengig'), ausfuehren: () => void zurueckholen(z) },
      })
    } catch (f) {
      zeigePapierkorbFehler(f)
    } finally {
      setLaeuft(false)
    }
  }

  const dialog =
    offen && ziel ? (
      <Dialog open onOpenChange={setOffen}>
        <DialogInhalt
          titel={t('papierkorb.frageTitel')}
          fuss={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setOffen(false)
                }}
              >
                {t('allgemein.abbrechen')}
              </Button>
              <Button variant="danger" laedt={laeuft} onClick={() => void wegwerfen(ziel)}>
                <Trash2 />
                {t('papierkorb.knopf')}
              </Button>
            </>
          }
        >
          <p className="text-muted-foreground text-sm">{t('papierkorb.frageText', { name: ziel.name })}</p>
        </DialogInhalt>
      </Dialog>
    ) : null

  return {
    frage: () => {
      setOffen(true)
    },
    dialog,
  }
}

/** Fachliche Gründe («nur stornieren») in der Sprache der Person, sonst allgemeiner Fehler. */
export function zeigePapierkorbFehler(f: unknown): void {
  const s = fachFehlerSchluessel(f)
  if (!s) meldeFehler(f, 'papierkorb')
  melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
}
