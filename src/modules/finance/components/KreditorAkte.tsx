import { Check, CircleDot, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useMwst } from '@/hooks/useMwst'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { useProjekte } from '../hooks/useFinanzen'
import { pruefungSetzen, visumGeben } from '../services/ablaeufe'
import type { Finanzdaten, Pruefung, Zahlung } from '../types'

/**
 * Akte einer Lieferantenrechnung als Seitenblatt: Angaben, Vergleich mit der Bestellung, Ablauf (Visum der
 * Projektleitung → Freigabe Buchhaltung → Zahllauf → bezahlt) und die Schritte, die gerade möglich sind.
 */
export function KreditorAkte({
  zahlung: z,
  daten,
  onBearbeiten,
  onSchliessen,
}: {
  zahlung: Zahlung
  daten: Finanzdaten
  onBearbeiten: () => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const projekte = useProjekte()
  const mwst = useMwst()
  const [grund, setGrund] = useState('')
  const [frage, setFrage] = useState<'klaeren' | 'zurueckgehalten' | null>(null)
  const projekt = projekte.data?.find((p) => p.id === z.projekt_id)
  const bestellung = z.bestellung_id ? daten.bestellungen[z.bestellung_id] : undefined
  const firma = daten.firmen.find((f) => f.id === z.firma_id)?.name
  const zahllauf = daten.zahllaeufe.find((x) => x.id === z.zahllauf_id)
  const person = (id: string | null) => (id ? (daten.personen[id] ?? '–') : '–')
  const betrag = z.betrag_rappen ?? 0
  const abweichung = bestellung?.total_rappen ? betrag - Math.round(bestellung.total_rappen * (1 + mwst / 100)) : null

  const schritt = (s: Pruefung, notiz?: string) =>
    void aus(() => pruefungSetzen(z.id, s, notiz), { de: 'Gespeichert', fr: 'Enregistré' }).then((ok) => {
      if (ok) {
        setFrage(null)
        setGrund('')
      }
    })

  const ablauf: { fertig: boolean; aktiv: boolean; text: string }[] = [
    { fertig: true, aktiv: false, text: t(`finanzen.lief.quelle.${z.quelle === 'abaninja' ? 'abaninja' : 'hand'}`) },
    {
      fertig: Boolean(z.visum_am),
      aktiv: z.pruefung === 'visum',
      text: z.visum_am
        ? t('finanzen.lief.visumVon', { person: person(z.visum_von), datum: formatDatum(z.visum_am.slice(0, 10)) })
        : z.projekt_id
          ? t('finanzen.lief.visumOffen')
          : t('finanzen.lief.visumOhneProjekt'),
    },
    {
      fertig: z.pruefung === 'bereit' || z.status === 'bezahlt',
      aktiv: z.pruefung === 'freigabe',
      text: z.freigabe_am
        ? t('finanzen.lief.freigabeVon', { person: person(z.freigabe_von), datum: formatDatum(z.freigabe_am.slice(0, 10)) })
        : t('finanzen.lief.freigabeOffen'),
    },
    {
      fertig: z.status === 'bezahlt',
      aktiv: Boolean(zahllauf),
      text:
        z.status === 'bezahlt'
          ? t('finanzen.lief.bezahltAm', { datum: z.bezahlt_am ? formatDatum(z.bezahlt_am) : '–' })
          : zahllauf
            ? t('finanzen.lief.imZahllauf', { datum: formatDatum(zahllauf.ausfuehren_am) })
            : t('finanzen.lief.zahllaufOffen'),
    },
  ]
  const offen = z.status === 'offen' && !z.zahllauf_id

  return (
    <Dialog open onOpenChange={(o) => !o && onSchliessen()}>
      <DialogInhalt
        art="seite"
        titel={z.firma ?? '–'}
        beschreibung={[z.rechnung_nr, firma, projekt ? `${projekt.nummer} · ${projekt.kunde ?? ''}` : null]
          .filter(Boolean)
          .join(' · ')}
      >
        <div className="flex flex-col px-5 py-2">
          <div className="flex flex-wrap gap-1.5 py-2">
            {z.pruefung && <Badge ton="info">{t(`finanzen.pruefung.${z.pruefung}`)}</Badge>}
            {z.status === 'bezahlt' && <Badge ton="ok">{t('finanzen.bezahlt')}</Badge>}
            {z.prioritaet && z.prioritaet !== 'normal' && <Badge ton="kritisch">{t(`finanzen.prio.${z.prioritaet}`)}</Badge>}
          </div>
          <AkteAbschnitt titel={t('finanzen.lief.angaben')}>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <Angabe label={t('finanzen.lief.betrag')}>{formatChf(betrag, { mitWaehrung: true })}</Angabe>
              <Angabe label={t('finanzen.lief.offen')}>{formatChf(z.offen_rappen ?? betrag, { mitWaehrung: true })}</Angabe>
              <Angabe label={t('finanzen.faelligAm')}>{z.faellig_am ? formatDatum(z.faellig_am) : '–'}</Angabe>
              <Angabe label={t('finanzen.lief.skonto')}>
                {z.skonto_prozent
                  ? t('finanzen.lief.skontoText', {
                      prozent: z.skonto_prozent,
                      datum: z.skonto_bis ? formatDatum(z.skonto_bis) : '–',
                      betrag: formatChf(z.skonto_rappen ?? 0),
                    })
                  : '–'}
              </Angabe>
              <Angabe label={t('finanzen.lief.iban')}>{z.iban ?? '–'}</Angabe>
              <Angabe label={t('finanzen.lief.referenz')}>{z.referenz ?? '–'}</Angabe>
              <Angabe label={t('finanzen.kategorie')}>{z.kategorie ?? '–'}</Angabe>
              <Angabe label={t('finanzen.lief.rechnungAm')}>{z.rechnung_am ? formatDatum(z.rechnung_am) : '–'}</Angabe>
            </dl>
          </AkteAbschnitt>
          {bestellung && (
            <AkteAbschnitt titel={t('finanzen.lief.vergleich')}>
              <p
                className={cn(
                  'rounded-md px-3 py-2 text-sm',
                  abweichung !== null && Math.abs(abweichung) > betrag * 0.02 ? 'bg-warn-soft text-warn' : 'bg-muted',
                )}
              >
                {t('finanzen.lief.vergleichText', {
                  nummer: bestellung.nummer,
                  bestellt: formatChf(Math.round((bestellung.total_rappen ?? 0) * (1 + mwst / 100))),
                  rechnung: formatChf(betrag),
                  abweichung: abweichung === null ? '–' : `${abweichung >= 0 ? '+' : '−'}${formatChf(Math.abs(abweichung))}`,
                })}
              </p>
            </AkteAbschnitt>
          )}
          <AkteAbschnitt titel={t('finanzen.lief.ablauf')}>
            <ol className="flex flex-col gap-2 text-sm">
              {ablauf.map((a) => (
                <li key={a.text} className="flex items-start gap-2">
                  {a.fertig ? (
                    <Check className="text-ok mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <CircleDot
                      className={cn('mt-0.5 size-4 shrink-0', a.aktiv ? 'text-accent' : 'text-muted-foreground')}
                      aria-hidden="true"
                    />
                  )}
                  <span className={cn(a.aktiv && 'font-medium')}>{a.text}</span>
                </li>
              ))}
            </ol>
            {z.visum_notiz && <p className="text-muted-foreground mt-2 text-sm">«{z.visum_notiz}»</p>}
            {z.notiz && <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">{z.notiz}</p>}
          </AkteAbschnitt>
          {frage && (
            <div className="flex flex-col gap-2 py-3">
              <Input
                autoFocus
                aria-label={t('finanzen.lief.grund')}
                placeholder={t('finanzen.lief.grund')}
                value={grund}
                onChange={(e) => {
                  setGrund(e.target.value)
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" laedt={laeuft} disabled={!grund.trim()} onClick={() => schritt(frage, grund)}>
                  {t(`finanzen.lief.knopf.${frage}`)}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFrage(null)}>
                  <X />
                  {t('allgemein.abbrechen')}
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 py-4">
            {offen && z.pruefung === 'visum' && (
              <Button
                laedt={laeuft}
                onClick={() => void aus(() => visumGeben(z.id, true, null), { de: 'Visum gegeben', fr: 'Visé' })}
              >
                {t('finanzen.lief.knopf.visumSelbst')}
              </Button>
            )}
            {offen && z.pruefung === 'freigabe' && (
              <Button laedt={laeuft} onClick={() => schritt('bereit')}>
                {t('finanzen.lief.knopf.freigeben')}
              </Button>
            )}
            {offen && (z.pruefung === 'klaeren' || z.pruefung === 'zurueckgehalten') && (
              <>
                <Button laedt={laeuft} onClick={() => schritt('bereit')}>
                  {t('finanzen.lief.knopf.freigeben')}
                </Button>
                {z.projekt_id && (
                  <Button variant="secondary" laedt={laeuft} onClick={() => schritt('visum')}>
                    {t('finanzen.lief.knopf.zumVisum')}
                  </Button>
                )}
              </>
            )}
            {offen && z.pruefung !== 'klaeren' && z.pruefung !== 'zurueckgehalten' && (
              <>
                <Button variant="secondary" onClick={() => setFrage('klaeren')}>
                  {t('finanzen.lief.knopf.klaeren')}
                </Button>
                <Button variant="secondary" onClick={() => setFrage('zurueckgehalten')}>
                  {t('finanzen.lief.knopf.zurueckgehalten')}
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={onBearbeiten}>
              <Pencil />
              {t('finanzen.lief.knopf.bearbeiten')}
            </Button>
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
