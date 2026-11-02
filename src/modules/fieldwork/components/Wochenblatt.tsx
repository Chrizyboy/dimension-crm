import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useAnmeldung } from '@/stores/anmeldung'
import { useEinstellung, useWochenblatt } from '../hooks/useLeitung'
import { STANDARD_REGELN, warnungen, wochenIst, wochenSoll, type Warnung, type ZeitRegeln } from '../lib/arbeitsgesetz'
import { heute } from '../lib/zeit'
import { wocheBestaetigen } from '../services/leitung'
import type { WochenTag } from '../types'

const TAGE = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'] as const

/**
 * Wochenblatt: Stunden je Person und Tag gegen das Soll nach Pensum, Jahressaldo, Hinweise nach Arbeitsgesetz
 * (Pause, zu lang, nicht gestempelt). Jede Person bestätigt ihre Woche; die Leitung sieht alle.
 */
export function Wochenblatt({ montag }: { montag: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const blatt = useWochenblatt(montag)
  const cfg = useEinstellung().data?.zeiten
  const regeln: ZeitRegeln = { ...STANDARD_REGELN, ...(cfg ?? {}) }
  const jetzt = heute()

  const text = (w: Warnung) =>
    w.art === 'saldo'
      ? t('baustelle.woche.w.saldo', { h: w.stunden })
      : `${formatDatum(w.tag)}: ${
          w.art === 'pause'
            ? t('baustelle.woche.w.pause', { min: w.fehlt_min })
            : w.art === 'zu_lang'
              ? t('baustelle.woche.w.zuLang', { h: w.stunden })
              : t(`baustelle.woche.w.${w.art === 'laeuft' ? 'laeuft' : 'nichtGestempelt'}`)
        }`

  const zelle = (d: WochenTag) =>
    d.abwesenheit ? (
      <Badge ton="info">{t(`baustelle.woche.abw.${d.abwesenheit.art}`, d.abwesenheit.art)}</Badge>
    ) : d.stunden > 0 ? (
      <span className={d.ungeprueft ? '' : 'text-ok'}>{d.stunden}</span>
    ) : d.einsatz && d.tag < jetzt ? (
      <span className="text-bad">0</span>
    ) : (
      <span className="text-muted-foreground">–</span>
    )

  async function bestaetigen() {
    try {
      await wocheBestaetigen(montag)
      await qc.invalidateQueries({ queryKey: ['baustelle', 'wochenblatt'] })
    } catch (e) {
      meldeFehler(e)
    }
  }

  if (blatt.error) return <Fehlerzustand details={String(blatt.error)} onNochmal={() => void blatt.refetch()} />
  if (!blatt.data) return <Skelett className="h-40" />
  const personen = blatt.data.personen

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('baustelle.woche.titel')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <Tabelle aria-label={t('baustelle.woche.titel')}>
            <TabelleKopf>
              <Zeile>
                <Kopfzelle>{t('baustelle.spalte.person')}</Kopfzelle>
                {TAGE.map((d) => (
                  <Kopfzelle key={d} className="text-right">
                    {t(`baustelle.woche.tag.${d}`)}
                  </Kopfzelle>
                ))}
                <Kopfzelle className="text-right">{t('baustelle.woche.istSoll')}</Kopfzelle>
                <Kopfzelle className="text-right">{t('baustelle.woche.saldo')}</Kopfzelle>
                <Kopfzelle>{t('baustelle.woche.stand')}</Kopfzelle>
              </Zeile>
            </TabelleKopf>
            <TabelleKoerper>
              {personen.map((p) => {
                const ist = wochenIst(p)
                const soll = wochenSoll(p, regeln)
                const eigene = p.person_id === ich?.id
                return (
                  <Zeile key={p.person_id}>
                    <Zelle className="font-medium">{p.kuerzel ?? p.name}</Zelle>
                    {p.tage.map((d) => (
                      <Zelle key={d.tag} className="zahlen text-right">
                        {zelle(d)}
                      </Zelle>
                    ))}
                    <Zelle className={`zahlen text-right ${ist < soll ? 'text-warn' : ''}`}>
                      {ist} / {soll}
                    </Zelle>
                    <Zelle
                      className={`zahlen text-right ${Math.abs(p.saldo_jahr) > regeln.saldo_warnung_h ? 'text-bad' : ''}`}
                    >
                      {p.saldo_jahr > 0 ? '+' : ''}
                      {p.saldo_jahr}
                    </Zelle>
                    <Zelle>
                      {p.bestaetigt_am ? (
                        <Badge ton="ok">{t('baustelle.woche.bestaetigt')}</Badge>
                      ) : eigene ? (
                        <Button size="sm" onClick={() => void bestaetigen()}>
                          <CheckCircle2 />
                          {t('baustelle.woche.bestaetigen')}
                        </Button>
                      ) : (
                        <Badge ton="neutral">{t('baustelle.woche.offen')}</Badge>
                      )}
                    </Zelle>
                  </Zeile>
                )
              })}
            </TabelleKoerper>
          </Tabelle>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {personen.flatMap((p) =>
            warnungen(p, jetzt, regeln).map((w, i) => (
              <li key={`${p.person_id}-${String(i)}`} className="text-warn">
                <span className="font-medium">{p.kuerzel ?? p.name}</span> {text(w)}
              </li>
            )),
          )}
        </ul>
      </KarteInhalt>
    </Karte>
  )
}
