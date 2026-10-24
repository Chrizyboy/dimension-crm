import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KiNotiz } from '@/components/shared/ki/KiNotiz'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { feldFehler } from '@/lib/formular'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKontaktAenderung } from '../hooks/useKunden'
import { aktivitaetSchema, type AktivitaetEingabe } from '../schema'
import { erfasseAktivitaet } from '../services/kundenakte'

interface AktivitaetDialogProps {
  kontaktId: string
  onSchliessen: () => void
}

/** Ergebnisse gibt es nur bei Anruf, Besuch und SMS; bei einer Notiz wäre die Frage sinnlos. */
const MIT_ERGEBNIS = new Set(['anruf', 'besuch', 'sms'])

/**
 * Kontakt erfassen (V233 «Kontakt als Aktivität»): Art, Richtung, Ergebnis und Text.
 * Der Eintrag erscheint sofort oben in der Zeitachse.
 */
export function AktivitaetDialog({ kontaktId, onSchliessen }: AktivitaetDialogProps) {
  const { t } = useTranslation()
  const arten = useAuswahl('aktivitaet')
  const ergebnisse = useAuswahl('kontaktergebnis')
  const personId = useAnmeldung((z) => z.ich?.id ?? null)
  const [werte, setWerte] = useState<AktivitaetEingabe>({ art: 'anruf', richtung: 'aus', text: '', ergebnis: null })
  const [fehler, setFehler] = useState<Partial<Record<keyof AktivitaetEingabe, string>>>({})
  const speichern = useKontaktAenderung((e: AktivitaetEingabe) => erfasseAktivitaet(kontaktId, personId, e))

  async function absenden() {
    const geprueft = aktivitaetSchema.safeParse({
      ...werte,
      ergebnis: MIT_ERGEBNIS.has(werte.art) ? werte.ergebnis : null,
    })
    if (!geprueft.success) {
      setFehler(feldFehler(geprueft.error.issues, t))
      return
    }
    try {
      await speichern.mutateAsync(geprueft.data)
      melde('ok', { de: 'Kontakt erfasst', fr: 'Contact enregistré' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'aktivitaet')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  // «Änderung» schreibt das System selbst, darum steht sie hier nicht zur Wahl.
  const waehlbar = arten.werte.filter((a) => a.schluessel !== 'aenderung')

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('akte.kontaktErfassen')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label={t('aktivitaet.art')} className="flex flex-wrap gap-1.5">
            {waehlbar.map((a) => (
              <button
                key={a.schluessel}
                type="button"
                role="radio"
                aria-checked={werte.art === a.schluessel}
                onClick={() => {
                  setWerte((w) => ({ ...w, art: a.schluessel }))
                }}
                className={cn(
                  'focus-visible:ring-ring h-7 rounded-full border px-3 text-xs font-medium outline-none focus-visible:ring-2',
                  werte.art === a.schluessel ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
                )}
              >
                {arten.text(a.schluessel)}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld id="aktivitaet-richtung" label={t('aktivitaet.richtung')}>
              <Auswahl
                id="aktivitaet-richtung"
                value={werte.richtung ?? 'keine'}
                onValueChange={(w) => {
                  setWerte((x) => ({ ...x, richtung: w === 'ein' || w === 'aus' ? w : null }))
                }}
                optionen={[
                  { wert: 'aus', text: t('aktivitaet.aus') },
                  { wert: 'ein', text: t('aktivitaet.ein') },
                  { wert: 'keine', text: t('aktivitaet.keineRichtung') },
                ]}
              />
            </Feld>
            {MIT_ERGEBNIS.has(werte.art) && (
              <Feld id="aktivitaet-ergebnis" label={t('aktivitaet.ergebnis')}>
                <Auswahl
                  id="aktivitaet-ergebnis"
                  value={werte.ergebnis ?? ''}
                  platzhalter={t('aktivitaet.ergebnisWaehlen')}
                  onValueChange={(w) => {
                    setWerte((x) => ({ ...x, ergebnis: w || null }))
                  }}
                  optionen={ergebnisse.werte.map((e) => ({ wert: e.schluessel, text: ergebnisse.text(e.schluessel) }))}
                />
              </Feld>
            )}
          </div>
          <Feld id="aktivitaet-text" label={t('aktivitaet.text')} pflicht fehler={fehler.text}>
            <Textarea
              id="aktivitaet-text"
              rows={4}
              autoFocus
              value={werte.text}
              aria-invalid={fehler.text ? true : undefined}
              onChange={(e) => {
                setWerte((w) => ({ ...w, text: e.target.value }))
              }}
              onKeyDown={(e) => {
                // Ctrl+Enter speichert, ohne die Hand von der Tastatur zu nehmen.
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void absenden()
              }}
            />
          </Feld>
          <KiNotiz
            text={werte.text}
            bezug={{ tabelle: 'kontakte', id: kontaktId }}
            onText={(text) => {
              setWerte((w) => ({ ...w, text }))
            }}
            onErgebnis={(e) => {
              setWerte((w) => ({
                ...w,
                art: waehlbar.some((a) => a.schluessel === e.art) ? e.art : w.art,
                richtung: e.richtung,
                ergebnis: e.ergebnis,
                text: e.text,
              }))
            }}
          />
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
