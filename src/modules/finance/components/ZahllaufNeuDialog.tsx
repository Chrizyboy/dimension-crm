import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { zahllaufKandidaten } from '../lib/cockpit'
import { heuteZuerich, montag, plusTage } from '../lib/datum'
import { reserveFuer } from '../lib/firma'
import { zahllaufAnlegen } from '../services/ablaeufe'
import type { Finanzdaten } from '../types'

/** Nächster Freitag (üblicher Zahltag), heute eingeschlossen. */
const naechsterFreitag = (heute: string) => {
  const fr = plusTage(montag(heute), 4)
  return fr >= heute ? fr : plusTage(fr, 7)
}

/**
 * Zahllauf vorbereiten (V233 «Zahllauf planen», neu je Gesellschaft): vorgeschlagen werden geprüfte Rechnungen,
 * fällig bis eine Woche nach dem Datum, mit laufendem Skonto oder Mahnung; Skonto wird abgezogen. Angezeigt wird
 * der Kontostand danach gegen die Reserve. Freigeben muss eine zweite Person.
 */
export function ZahllaufNeuDialog({
  daten,
  firma: start,
  onSchliessen,
}: {
  daten: Finanzdaten
  firma: string | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [firma, setFirma] = useState(start ?? daten.firmen[0]?.id ?? '')
  const konten = daten.konten.filter((k) => k.firma_id === firma && k.aktiv)
  const [konto, setKonto] = useState(konten[0]?.id ?? '')
  const [datum, setDatum] = useState(naechsterFreitag(heuteZuerich()))
  const kandidaten = useMemo(() => zahllaufKandidaten(daten.zahlungen, firma, datum), [daten.zahlungen, firma, datum])
  const [ab, setAb] = useState<Set<string>>(new Set())
  const gewaehlt = kandidaten.filter((k) => !ab.has(k.z.id))
  const summe = gewaehlt.reduce((s, k) => s + k.rappen, 0)
  const skonto = gewaehlt.reduce((s, k) => s + (k.mitSkonto ? (k.z.skonto_rappen ?? 0) : 0), 0)
  const kontoStand = daten.konten.find((k) => k.id === konto)?.stand_rappen ?? null
  const nach = kontoStand === null ? null : kontoStand - summe
  const reserve = reserveFuer(daten, firma)

  const anlegen = () =>
    void aus(
      () => zahllaufAnlegen({ firma, konto: konto || null, datum, ids: gewaehlt.map((k) => k.z.id) }),
      { de: 'Zahllauf zur Freigabe bereit', fr: 'Paiement groupé prêt à valider' },
    ).then((ok) => {
      if (ok) onSchliessen()
    })

  return (
    <Dialog open onOpenChange={(o) => !o && onSchliessen()}>
      <DialogInhalt
        art="seite"
        breite="breit"
        titel={t('finanzen.zl.neu')}
        beschreibung={t('finanzen.zl.neuText')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} disabled={gewaehlt.length === 0 || !firma} onClick={anlegen}>
              {t('finanzen.zl.zurFreigabe', { count: gewaehlt.length })}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Feld id="zl-firma" label={t('finanzen.firmaWahl.titel')}>
              <Auswahl
                id="zl-firma"
                value={firma}
                onValueChange={(v) => {
                  setFirma(v)
                  setKonto(daten.konten.find((k) => k.firma_id === v && k.aktiv)?.id ?? '')
                  setAb(new Set())
                }}
                optionen={daten.firmen.map((f) => ({ wert: f.id, text: f.name }))}
              />
            </Feld>
            <Feld id="zl-konto" label={t('finanzen.zl.konto')}>
              <Auswahl
                id="zl-konto"
                value={konto}
                onValueChange={setKonto}
                platzhalter={t('finanzen.zl.kontoFehlt')}
                optionen={konten.map((k) => ({ wert: k.id, text: k.name }))}
              />
            </Feld>
            <Feld id="zl-datum" label={t('finanzen.zl.datum')}>
              <Input
                id="zl-datum"
                type="date"
                value={datum}
                onChange={(e) => {
                  setDatum(e.target.value)
                }}
              />
            </Feld>
          </div>
          {kandidaten.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('finanzen.zl.keine')}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {kandidaten.map((k) => (
                <li key={k.z.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                  <Checkbox
                    aria-label={k.z.firma ?? ''}
                    checked={!ab.has(k.z.id)}
                    onCheckedChange={(c) => {
                      const n = new Set(ab)
                      if (c) n.delete(k.z.id)
                      else n.add(k.z.id)
                      setAb(n)
                    }}
                    className="mt-0.5"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">{k.z.firma}</span>
                    <span className="text-muted-foreground text-xs">
                      {[
                        k.z.rechnung_nr,
                        k.z.faellig_am ? t('finanzen.faelligKurz', { datum: formatDatum(k.z.faellig_am) }) : null,
                        k.mitSkonto ? t('finanzen.zl.skontoAbzug', { betrag: formatChf(k.z.skonto_rappen ?? 0) }) : null,
                        k.z.prioritaet && k.z.prioritaet !== 'normal' ? t(`finanzen.prio.${k.z.prioritaet}`) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="zahlen">{formatChf(k.rappen)}</span>
                </li>
              ))}
            </ul>
          )}
          <dl className="bg-muted grid grid-cols-2 gap-x-6 gap-y-2 rounded-md p-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground text-xs">{t('finanzen.zl.summe', { count: gewaehlt.length })}</dt>
              <dd className="zahlen font-semibold">{formatChf(summe, { mitWaehrung: true })}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">{t('finanzen.zl.danach')}</dt>
              <dd className={cn('zahlen font-semibold', nach !== null && nach < reserve && 'text-bad')}>
                {nach === null ? '–' : formatChf(nach, { mitWaehrung: true })}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">{t('finanzen.zl.reserve')}</dt>
              <dd className="zahlen">{formatChf(reserve, { mitWaehrung: true })}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">{t('finanzen.zl.skontoGespart')}</dt>
              <dd className="zahlen text-ok">{formatChf(skonto, { mitWaehrung: true })}</dd>
            </div>
          </dl>
          <p className="text-muted-foreground text-xs">{t('finanzen.zl.hinweisFreigabe')}</p>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
