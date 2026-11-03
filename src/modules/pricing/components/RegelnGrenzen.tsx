import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, parseChf } from '@/lib/format'
import { useAusfuehren } from '../hooks/useAusfuehren'
import { leseProzent, prozentText } from '../lib/prozent'
import { ladePersonenKurz, setzeRegeln } from '../services/regeln'
import type { PreisRegeln } from '../types'
import { PreisFeld } from './PreisFeld'

/** Ein Wert mit Beschriftung; ohne Recht nur Text. */
function Wert({
  label,
  wert,
  darf,
  onSpeichern,
}: {
  label: string
  wert: string
  darf: boolean
  onSpeichern: (t: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-1.5 text-sm last:border-b-0">
      <span>{label}</span>
      {darf ? (
        <PreisFeld label={label} wert={wert} onSpeichern={onSpeichern} />
      ) : (
        <span className="zahlen font-mono text-[13px]">{wert}</span>
      )}
    </div>
  )
}

/**
 * Marge und Mindestmarge je Kategorie, Skonto, Rundung, Gültigkeit des Einkaufs, Grenzen für die Freigabe (P4),
 * wer freigibt und die Förderung für die Schätzung. Ändern nur, wer freigibt; die Datenbank prüft das auch.
 */
export function RegelnGrenzen({ regeln }: { regeln: PreisRegeln }) {
  const { t } = useTranslation()
  const kat = useAuswahl('artikelkategorie')
  const darf = regeln.ich_admin === true
  const personen = useQuery({
    queryKey: ['preise', 'personen'],
    queryFn: ladePersonenKurz,
    enabled: darf,
    staleTime: 10 * 60_000,
  })
  const { fuehreAus } = useAusfuehren('preise.regeln')
  const setze = (p: Partial<PreisRegeln>) => void fuehreAus(() => setzeRegeln(p))
  const kategorien = regeln.kategorien ?? {}
  const f = regeln.foerderung
  const gewaehlt = new Set(regeln.freigabe_person_ids ?? [])
  const zahl = (x: string) => Math.max(0, Math.round(Number(x.replace(',', '.')) || 0))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Karte>
        <KarteKopf>
          <KarteTitel>{t('preise.regel.kategorien')}</KarteTitel>
        </KarteKopf>
        <KarteInhalt>
          <p className="text-muted-foreground mb-2 text-xs">{t('preise.regel.kategorienText')}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="py-1.5 font-medium">{t('preise.spalte.kategorie')}</th>
                <th className="py-1.5 text-right font-medium">{t('preise.regel.marge')}</th>
                <th className="py-1.5 text-right font-medium">{t('preise.regel.mindest')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(kategorien).map(([k, r]) => (
                <tr key={k} className="border-b last:border-b-0">
                  <td className="py-1">{kat.text(k)}</td>
                  {(['marge', 'mindest'] as const).map((feld) => (
                    <td key={feld} className="py-1 text-right">
                      {darf ? (
                        <PreisFeld
                          label={`${t(`preise.regel.${feld}`)} ${kat.text(k)}`}
                          className="w-16"
                          wert={prozentText(r[feld])}
                          onSpeichern={(x) => {
                            const v = leseProzent(x)
                            if (v !== null) setze({ kategorien: { ...kategorien, [k]: { ...r, [feld]: v } } })
                          }}
                        />
                      ) : (
                        <span className="zahlen font-mono text-[13px]">{prozentText(r[feld])}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </KarteInhalt>
      </Karte>

      <div className="flex flex-col gap-4">
        <Karte>
          <KarteKopf>
            <KarteTitel>{t('preise.regel.allgemein')}</KarteTitel>
          </KarteKopf>
          <KarteInhalt>
            <Wert
              label={t('preise.regel.skonto')}
              darf={darf}
              wert={prozentText(regeln.skonto ?? 0)}
              onSpeichern={(x) => {
                setze({ skonto: leseProzent(x) ?? 0 })
              }}
            />
            <Wert
              label={t('preise.regel.rundung')}
              darf={darf}
              wert={formatChf(regeln.rundung_rappen ?? 0)}
              onSpeichern={(x) => {
                setze({ rundung_rappen: parseChf(x) ?? 0 })
              }}
            />
            <Wert
              label={t('preise.regel.ekTage')}
              darf={darf}
              wert={String(regeln.ek_gueltig_tage ?? 90)}
              onSpeichern={(x) => {
                setze({ ek_gueltig_tage: zahl(x) })
              }}
            />
            <Wert
              label={t('preise.regel.rabattFrei')}
              darf={darf}
              wert={String(regeln.rabatt_frei_prozent ?? 8)}
              onSpeichern={(x) => {
                setze({ rabatt_frei_prozent: zahl(x) })
              }}
            />
            <Wert
              label={t('preise.regel.mindestDb')}
              darf={darf}
              wert={String(regeln.mindest_db_prozent ?? 15)}
              onSpeichern={(x) => {
                setze({ mindest_db_prozent: zahl(x) })
              }}
            />
          </KarteInhalt>
        </Karte>

        <Karte>
          <KarteKopf>
            <KarteTitel>{t('preise.regel.freigeber')}</KarteTitel>
          </KarteKopf>
          <KarteInhalt className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">{t('preise.regel.freigeberText')}</p>
            {darf && personen.data ? (
              <div className="grid gap-1 sm:grid-cols-2">
                {personen.data.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={gewaehlt.has(p.id)}
                      onCheckedChange={(c) => {
                        const n = new Set(gewaehlt)
                        if (c === true) n.add(p.id)
                        else n.delete(p.id)
                        setze({ freigabe_person_ids: [...n] })
                      }}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            ) : (
              <span className="flex flex-wrap gap-1">
                {(regeln.freigeber ?? []).map((p) => (
                  <Badge key={p.id}>{p.name}</Badge>
                ))}
              </span>
            )}
            {gewaehlt.size === 0 && <p className="text-warn text-xs">{t('preise.regel.freigeberLeer')}</p>}
          </KarteInhalt>
        </Karte>

        {f && (
          <Karte>
            <KarteKopf>
              <KarteTitel>{t('preise.regel.foerderung', { name: f.name, stand: f.stand })}</KarteTitel>
            </KarteKopf>
            <KarteInhalt>
              <p className="text-muted-foreground mb-2 text-xs">{t('preise.regel.foerderungText')}</p>
              <Wert
                label={t('preise.regel.fGrund')}
                darf={darf}
                wert={formatChf(f.grund_rappen)}
                onSpeichern={(x) => {
                  setze({ foerderung: { ...f, grund_rappen: parseChf(x) ?? 0 } })
                }}
              />
              <Wert
                label={t('preise.regel.fJeKwp', { bis: f.bis_kwp })}
                darf={darf}
                wert={formatChf(f.je_kwp_rappen)}
                onSpeichern={(x) => {
                  setze({ foerderung: { ...f, je_kwp_rappen: parseChf(x) ?? 0 } })
                }}
              />
              <Wert
                label={t('preise.regel.fBis')}
                darf={darf}
                wert={String(f.bis_kwp)}
                onSpeichern={(x) => {
                  setze({ foerderung: { ...f, bis_kwp: zahl(x) } })
                }}
              />
              <Wert
                label={t('preise.regel.fDarueber', { bis: f.bis_kwp })}
                darf={darf}
                wert={formatChf(f.je_kwp_darueber_rappen)}
                onSpeichern={(x) => {
                  setze({ foerderung: { ...f, je_kwp_darueber_rappen: parseChf(x) ?? 0 } })
                }}
              />
            </KarteInhalt>
          </Karte>
        )}
      </div>
    </div>
  )
}
