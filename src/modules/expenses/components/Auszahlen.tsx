import { Download, FileText, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import { useAbrechnung } from '../hooks/useAbrechnung'
import { useAuszahlungen } from '../hooks/useSpesen'
import { auszahlbar, jePerson, summe } from '../lib/spesen'
import type { Spese } from '../types'
import { AuszahlenDialog } from './AuszahlenDialog'
import { Kacheln } from './Kacheln'

/**
 * Auszahlen (Buchhaltung): geprüfte Spesen mit eigenem Geld je Person, ein Lauf «mit dem Lohn» oder
 * «Überweisung» für die gewählten Personen, Abrechnung als PDF mit Belegen und CSV; darunter die bisherigen
 * Läufe mit ihrer Abrechnung.
 */
export function Auszahlen({ alle, onCsv }: { alle: Spese[]; onCsv: (liste: Spese[], name: string) => void }) {
  const { t } = useTranslation()
  const offen = alle.filter(auszahlbar)
  const personen = jePerson(offen)
  const [ohne, setOhne] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState(false)
  const laeufe = useAuszahlungen().data ?? []
  const pdf = useAbrechnung()
  const gewaehlt = personen.filter((p) => !ohne.has(p.person_id)).flatMap((p) => p.spesen)
  const firmenkarteOffen = alle.filter((s) => s.bezahlt_mit === 'firmenkarte' && s.status === 'eingereicht').length
  const zuPruefen = alle.filter((s) => s.bezahlt_mit === 'eigen' && s.status === 'eingereicht').length

  return (
    <div className="flex flex-col gap-4">
      <Kacheln
        kacheln={[
          {
            zahl: formatChf(summe(offen), { mitWaehrung: true }),
            text: t('spesen.auszahlen.kachelOffen', { count: offen.length, personen: personen.length }),
            ton: 'ok',
          },
          {
            zahl: formatChf(
              offen.reduce((a, s) => a + (s.mwst_rappen ?? 0), 0),
              { mitWaehrung: true },
            ),
            text: t('spesen.auszahlen.kachelVorsteuer'),
          },
          {
            zahl: String(zuPruefen),
            text: t('spesen.auszahlen.kachelPruefen'),
            ...(zuPruefen ? { ton: 'warn' as const } : {}),
          },
          { zahl: String(firmenkarteOffen), text: t('spesen.auszahlen.kachelFirmenkarte') },
        ]}
      />
      {personen.length === 0 ? (
        <Leerzustand icon={WalletCards} titel={t('spesen.auszahlen.leer')} text={t('spesen.auszahlen.leerText')} />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">{t('spesen.auszahlen.jePerson')}</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onCsv(gewaehlt, t('spesen.auszahlen.csvName'))
                }}
              >
                <Download />
                {t('spesen.exportieren')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                laedt={pdf.laeuft === 'offen'}
                disabled={gewaehlt.length === 0}
                onClick={() => void pdf.erstellen(gewaehlt, t('spesen.auszahlen.vorschau'), 'offen')}
              >
                <FileText />
                {t('spesen.auszahlen.pdf')}
              </Button>
              <Button
                size="sm"
                disabled={gewaehlt.length === 0}
                onClick={() => {
                  setDialog(true)
                }}
              >
                <WalletCards />
                {t('spesen.auszahlen.knopfAuswahl', { count: gewaehlt.length })}
              </Button>
            </div>
          </div>
          <Tabelle aria-label={t('spesen.auszahlen.jePerson')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle className="w-8">
                  <span className="sr-only">{t('spesen.alleWaehlen')}</span>
                </Kopfzelle>
                <Kopfzelle>{t('spesen.spalte.person')}</Kopfzelle>
                <Kopfzelle className="text-right">{t('spesen.auszahlen.anzahl')}</Kopfzelle>
                <Kopfzelle className="hidden text-right sm:table-cell">{t('spesen.auszahlen.km')}</Kopfzelle>
                <Kopfzelle className="text-right">{t('spesen.spalte.betrag')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {personen.map((p) => (
                <Zeile key={p.person_id}>
                  <Zelle>
                    <Checkbox
                      aria-label={t('spesen.auszahlen.personWaehlen', { person: p.person })}
                      checked={!ohne.has(p.person_id)}
                      onCheckedChange={(an) => {
                        const neu = new Set(ohne)
                        if (an === true) neu.delete(p.person_id)
                        else neu.add(p.person_id)
                        setOhne(neu)
                      }}
                    />
                  </Zelle>
                  <Zelle className="font-medium">{p.person}</Zelle>
                  <Zelle className="zahlen text-right">{p.anzahl}</Zelle>
                  <Zelle className="zahlen hidden text-right sm:table-cell">{p.km ? `${String(p.km)} km` : '–'}</Zelle>
                  <Zelle className="zahlen text-right font-medium">{formatChf(p.rappen)}</Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </div>
      )}
      <AkteAbschnitt ebene={2} titel={t('spesen.auszahlen.laeufe')} zusatz={String(laeufe.length)}>
        {laeufe.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('spesen.auszahlen.keineLaeufe')}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {laeufe.map((l) => {
              const spesen = alle.filter((s) => s.auszahlung_id === l.id)
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{l.titel}</span>
                    <span className="text-muted-foreground zahlen text-xs">
                      {formatDatum(l.datum)} · {t('spesen.anzahl', { count: l.anzahl })} ·{' '}
                      {t('spesen.auszahlen.personen', { count: l.personen })}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge ton="ok">{t(`spesen.auszahlen.${l.art}`)}</Badge>
                    <span className="zahlen font-medium">{formatChf(l.total_rappen, { mitWaehrung: true })}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onCsv(spesen, l.titel)
                      }}
                    >
                      <Download />
                      CSV
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      laedt={pdf.laeuft === l.id}
                      disabled={spesen.length === 0}
                      onClick={() => void pdf.erstellen(spesen, l.titel, l.id)}
                    >
                      <FileText />
                      PDF
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </AkteAbschnitt>
      {dialog && (
        <AuszahlenDialog
          spesen={gewaehlt}
          onSchliessen={() => {
            setDialog(false)
          }}
          onFertig={() => {
            setDialog(false)
            setOhne(new Set())
          }}
        />
      )}
    </div>
  )
}
