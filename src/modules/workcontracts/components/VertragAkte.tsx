import { useNavigate } from '@tanstack/react-router'
import { Ban, FileText, Mail, Pencil, Printer, Send, Signature, Undo2 } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatChf, formatDatum } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import { pdfZeigen } from '@/lib/datei'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useVertragAenderung } from '../hooks/useWerkvertraege'
import { NAECHSTE, VERTRAG_TON } from '../lib/status'
import { vertragInhalt } from '../lib/vertragInhalt'
import { ladeEinstellung, setzeVertragStatus } from '../services/werkvertraege'
import { werkvertragPdf } from '../services/vertragPdf'
import type { Werkvertrag, WerkvertragStatus } from '../types'
import { SendenDialog } from './SendenDialog'
import { Zahlungsplan } from './Zahlungsplan'

const StatusDialog = lazy(() => import('./StatusDialog'))

/** Für die Anzeige in der Akte reichen Platzhalter; Unterzeichner usw. stehen erst im PDF. */
const LEER = {
  unterzeichner: '',
  ansprechperson: '',
  telefon_de: null,
  telefon_fr: null,
  email: null,
  adresse: '',
  kondition_pv: 'normal',
  kondition_batterie: '70_30',
}

/**
 * Ein Werkvertrag (V232): Angaben, Zahlungsplan, Vertragstext in der Vertragssprache und die Schritte
 * Versendet, Unterschrieben (mit Datum) und Storniert (mit Grund). «An Kunden senden» legt Vertrag und
 * Anzahlungsrechnung in eine Mail, «PDF ansehen» zeigt den Vertrag nach Vorlage Muri, «Bearbeiten» öffnet
 * den Auftrag noch einmal (Zahlungsbedingung, Termine, Material; nach Versand eine neue Version).
 */
export default function VertragAkte({
  vertrag: w,
  onNeuErstellen,
  onSchliessen,
}: {
  vertrag: Werkvertrag | null
  onNeuErstellen: (offerteId: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'unterschrieben' | 'storniert' | 'mail' | null>(null)
  const [pdfLaeuft, setPdfLaeuft] = useState(false)
  const schritt = useVertragAenderung((ziel: WerkvertragStatus) => setzeVertragStatus(w?.id ?? '', ziel))

  async function setze(ziel: WerkvertragStatus) {
    try {
      await schritt.mutateAsync(ziel)
      melde('ok', zweisprachig(`werkvertraege.status.${ziel}`))
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'werkvertraege.status')
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
    }
  }

  /** Vertrag als PDF ansehen (zum Drucken oder Prüfen), ohne ihn abzulegen. */
  async function zeigePdf() {
    if (!w) return
    setPdfLaeuft(true)
    try {
      pdfZeigen(await werkvertragPdf(vertragInhalt(w, await ladeEinstellung())))
    } catch (f) {
      meldeFehler(f, 'werkvertraege.pdf')
    } finally {
      setPdfLaeuft(false)
    }
  }

  const moeglich = w ? NAECHSTE[w.status] : []
  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={w ? `${t('werkvertraege.akte.titel')} ${w.nummer}` : t('werkvertraege.titel')}
        {...(w ? { beschreibung: `${w.name} · ${formatKundennummer(w.kundennummer)}` } : {})}
        className="md:w-[38rem]"
      >
        {!w ? (
          <p className="text-muted-foreground text-sm">{t('werkvertraege.akte.nichtMehr')}</p>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 pb-3">
              <Badge ton={VERTRAG_TON[w.status]} punkt>
                {t(`werkvertraege.status.${w.status}`)}
              </Badge>
              <Badge ton="neutral">{w.sprache === 'fr' ? 'FR' : 'DE'}</Badge>
              {w.version > 1 && <Badge ton="neutral">V{w.version}</Badge>}
            </div>
            <div className="flex flex-wrap gap-2 border-b pb-3">
              {w.status !== 'storniert' && w.status !== 'unterschrieben' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDialog('mail')
                  }}
                >
                  <Mail />
                  {t('werkvertraege.akte.senden')}
                </Button>
              )}
              <Button size="sm" variant="secondary" laedt={pdfLaeuft} onClick={() => void zeigePdf()}>
                <Printer />
                {t('werkvertraege.akte.drucken')}
              </Button>
              {moeglich.includes('versendet') && (
                <Button size="sm" variant="secondary" laedt={schritt.isPending} onClick={() => void setze('versendet')}>
                  <Send />
                  {t('werkvertraege.akte.versendet')}
                </Button>
              )}
              {moeglich.includes('unterschrieben') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDialog('unterschrieben')
                  }}
                >
                  <Signature />
                  {t('werkvertraege.akte.unterschrieben')}
                </Button>
              )}
              {w.status === 'storniert' && (
                <Button size="sm" variant="secondary" laedt={schritt.isPending} onClick={() => void setze('erstellt')}>
                  <Undo2 />
                  {t('werkvertraege.akte.reaktivieren')}
                </Button>
              )}
              {w.offerteId && w.status !== 'unterschrieben' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onNeuErstellen(w.offerteId ?? '')
                  }}
                >
                  <Pencil />
                  {t('werkvertraege.akte.bearbeiten')}
                </Button>
              )}
              {w.offerteId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigate({
                      to: '/quotes',
                      search: { offerte: w.offerteId ?? '', ansicht: w.standort ?? 'muri' },
                    })
                  }}
                >
                  <FileText />
                  {t('werkvertraege.akte.offerte')}
                </Button>
              )}
              {moeglich.includes('storniert') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDialog('storniert')
                  }}
                >
                  <Ban />
                  {t('werkvertraege.akte.stornieren')}
                </Button>
              )}
            </div>
            <AkteAbschnitt titel={t('werkvertraege.akte.angaben')}>
              <dl>
                <Angabe label={t('werkvertraege.akte.betrag')}>
                  {w.betragRappen ? formatChf(w.betragRappen, { mitWaehrung: true }) : '–'}
                </Angabe>
                <Angabe label={t('werkvertraege.akte.anlage')}>
                  {[
                    w.kwp ? `${w.kwp} kWp` : null,
                    w.anzahlModule ? `${w.anzahlModule} ${t('werkvertraege.akte.module')}` : null,
                    w.batterie,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '–'}
                </Angabe>
                <Angabe label={t('werkvertraege.akte.objekt')}>
                  {[w.objekt.strasse, [w.objekt.plz, w.objekt.ort].filter(Boolean).join(' ')]
                    .filter(Boolean)
                    .join(', ') || '–'}
                </Angabe>
                <Angabe label={t('werkvertraege.akte.firma')}>{w.firma.name ?? '–'}</Angabe>
                <Angabe label={t('werkvertraege.akte.offerte')}>
                  {[w.offerteNummer, w.angebotAm ? formatDatum(w.angebotAm) : null].filter(Boolean).join(' · ') || '–'}
                </Angabe>
                <Angabe label={t('werkvertraege.akte.erstellt')}>
                  {w.erstelltDatum ? formatDatum(w.erstelltDatum) : '–'}
                </Angabe>
                {w.versendetAm && (
                  <Angabe label={t('werkvertraege.akte.versendetAm')}>{formatDatum(w.versendetAm)}</Angabe>
                )}
                {w.unterschriebenAm && (
                  <Angabe label={t('werkvertraege.akte.unterschriebenAm')}>{formatDatum(w.unterschriebenAm)}</Angabe>
                )}
                {w.notiz && (
                  <Angabe label={t('werkvertraege.akte.notiz')}>
                    <span className="whitespace-pre-line">{w.notiz}</span>
                  </Angabe>
                )}
              </dl>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('werkvertraege.akte.zahlungsplan')} zusatz={w.zahlungsplan.length || undefined}>
              <Zahlungsplan tranchen={w.zahlungsplan} />
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('werkvertraege.akte.imVertrag')}>
              <dl>
                <Angabe label={t('werkvertraege.felder.gegenstand')}>{vertragInhalt(w, LEER).gegenstand}</Angabe>
                {vertragInhalt(w, LEER).termine.map(([l, wert]) => (
                  <Angabe key={l} label={l.replace(/\s*:$/, '')}>
                    {wert}
                  </Angabe>
                ))}
                <Angabe label={t('werkvertraege.akte.anzahlungsrechnung')}>
                  {w.anzahlung?.rechnungNr
                    ? t('werkvertraege.akte.rechnungNr', { nummer: w.anzahlung.rechnungNr })
                    : t('werkvertraege.akte.nochKeine')}
                </Angabe>
              </dl>
            </AkteAbschnitt>
          </div>
        )}
        {w && dialog === 'mail' && (
          <SendenDialog
            vertrag={w}
            onSchliessen={() => {
              setDialog(null)
            }}
            onGesendet={() => {
              if (moeglich.includes('versendet')) void setze('versendet')
            }}
          />
        )}
        <Suspense>
          {w && dialog && dialog !== 'mail' && (
            <StatusDialog
              vertrag={w}
              ziel={dialog}
              onSchliessen={() => {
                setDialog(null)
              }}
            />
          )}
        </Suspense>
      </DialogInhalt>
    </Dialog>
  )
}
