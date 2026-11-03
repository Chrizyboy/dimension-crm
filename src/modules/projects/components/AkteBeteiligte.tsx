import { Mail, Phone, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KundeWahl, type GewaehlterKunde } from '@/components/shared/KundeWahl'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatTelefon } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { beteiligtEntfernen, beteiligtSetzen } from '../services/leitstand'
import type { Beteiligter } from '../types'
import { Box } from './AkteBox'

/**
 * Beteiligte am Projekt (Elektriker, Gerüstbau, Netzbetreiber …) als Kontakte aus dem Adressbuch mit Rolle, damit
 * Nummer und Mail an einem Ort stehen und man sieht, auf welchen Projekten ein Partner gerade arbeitet.
 * Die Rollen sind die Auswahlliste «projekt_rolle» (Einstellungen), nicht im Code.
 */
export function AkteBeteiligte({ projektId, beteiligte }: { projektId: string; beteiligte: Beteiligter[] }) {
  const { t } = useTranslation()
  const rollen = useAuswahl('projekt_rolle')
  const { aus, laeuft } = useAktion()
  const [kontakt, setKontakt] = useState<GewaehlterKunde | null>(null)
  const [rolle, setRolle] = useState('')
  const [neu, setNeu] = useState(false)

  const hinzufuegen = async () => {
    if (!kontakt || !rolle) return
    const ok = await aus(() => beteiligtSetzen(projektId, kontakt.id, rolle), { de: 'Hinzugefügt', fr: 'Ajouté' })
    if (ok) {
      setKontakt(null)
      setRolle('')
      setNeu(false)
    }
  }

  return (
    <Box
      titel={t('projekte.beteiligte.titel')}
      rechts={
        !neu ? (
          <button
            type="button"
            className="underline"
            onClick={() => {
              setNeu(true)
            }}
          >
            {t('projekte.beteiligte.hinzufuegen')}
          </button>
        ) : undefined
      }
    >
      {beteiligte.length === 0 && !neu && <p className="text-muted-foreground">{t('projekte.beteiligte.leer')}</p>}
      {beteiligte.length > 0 && (
        <ul className="flex flex-col divide-y">
          {beteiligte.map((b) => (
            <li key={b.id} className="flex items-start justify-between gap-2 py-2">
              <div className="flex min-w-0 flex-col">
                <span className="text-muted-foreground text-xs">{rollen.text(b.rolle)}</span>
                <a href={`#/contacts?kontakt=${b.kontakt_id}`} className="truncate font-medium underline">
                  {b.name ?? '–'}
                </a>
                <span className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
                  {b.telefon && (
                    <a href={`tel:${b.telefon}`} className="inline-flex items-center gap-1 underline">
                      <Phone className="size-3" aria-hidden="true" />
                      {formatTelefon(b.telefon)}
                    </a>
                  )}
                  {b.email && (
                    <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1 underline">
                      <Mail className="size-3" aria-hidden="true" />
                      {b.email}
                    </a>
                  )}
                </span>
                {b.notiz && <span className="text-muted-foreground text-xs">{b.notiz}</span>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                aria-label={t('projekte.beteiligte.entfernen', { name: b.name ?? '' })}
                onClick={() => void aus(() => beteiligtEntfernen(b.id))}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {neu && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-2">
          <Auswahl
            aria-label={t('projekte.beteiligte.rolle')}
            platzhalter={t('projekte.beteiligte.rolle')}
            optionen={rollen.werte.map((w) => ({ wert: w.schluessel, text: rollen.text(w.schluessel) }))}
            value={rolle}
            onValueChange={setRolle}
          />
          <KundeWahl id={`beteiligt-${projektId}`} wert={kontakt} onWahl={setKontakt} />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNeu(false)
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button size="sm" disabled={!kontakt || !rolle} laedt={laeuft} onClick={() => void hinzufuegen()}>
              {t('projekte.beteiligte.hinzufuegen')}
            </Button>
          </div>
        </div>
      )}
    </Box>
  )
}
