import { Send, Star, Users, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { zielVon } from '@/lib/ziel'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useEmpfehlungen } from '../hooks/useMarketing'
import { bewertungSenden, bewertungVerwerfen, empfehlungAusbezahlt } from '../services/empfehlung'
import type { Bewertungsanfrage, Einschaetzung } from '../types'

const TON: Record<Einschaetzung, 'ok' | 'warnung' | 'kritisch'> = {
  zufrieden: 'ok',
  unklar: 'warnung',
  unzufrieden: 'kritisch',
}
const REIHENFOLGE: Record<Bewertungsanfrage['status'], number> = { bereit: 0, pruefen: 1, gesendet: 2, verworfen: 3 }

/**
 * Marketing › Empfehlungen (Modul-Prüfung 32A): Bitte um eine Google-Bewertung nach der IBN, mit KI-Einschätzung
 * der Zufriedenheit. Jede Anfrage einzeln senden (Klick = Freigabe), nie automatisch. Darunter die Empfehlungen mit
 * Gutschrift, die erst mit dem unterschriebenen Werkvertrag des neuen Kunden entsteht.
 */
export function Empfehlungen() {
  const { t } = useTranslation()
  const daten = useEmpfehlungen()
  const { laeuft, aus } = useAktion()
  const ich = useAnmeldung((z) => z.ich)
  const finanzen = hatRecht(ich, 'finanzen')

  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  if (!daten.data) return <Skelett className="h-96" />
  const anfragen = [...daten.data.anfragen].sort((a, b) => REIHENFOLGE[a.status] - REIHENFOLGE[b.status])
  const { empfehlungen } = daten.data

  return (
    <div className="flex flex-col gap-4">
      <Karte className="overflow-hidden" data-testid="bewertungsanfragen">
        <KarteKopf className="flex flex-col items-start gap-1 text-left">
          <KarteTitel>{t('marketing.empfehlung.anfragen')}</KarteTitel>
          <p className="text-muted-foreground text-sm">{t('marketing.empfehlung.anfragenHinweis')}</p>
        </KarteKopf>
        <KarteInhalt className="p-0">
          {anfragen.length === 0 ? (
            <Leerzustand
              icon={Star}
              titel={t('marketing.empfehlung.keineAnfragen')}
              text={t('marketing.empfehlung.keineAnfragenText')}
            />
          ) : (
            <ul className="divide-y">
              {anfragen.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start gap-3 px-4 py-3 text-sm">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <a href={`#${zielVon('kontakte', a.kontakt_id) ?? ''}`} className="font-medium hover:underline">
                        {a.kunde ?? '–'}
                      </a>
                      <span className="text-muted-foreground text-xs">
                        {[a.projekt_nummer, a.ort, formatDatum(a.faellig_am)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      {a.einschaetzung && (
                        <Badge ton={TON[a.einschaetzung]}>
                          {t(`marketing.empfehlung.einschaetzung.${a.einschaetzung}`)}
                        </Badge>
                      )}
                      <Badge ton={a.status === 'gesendet' ? 'info' : 'neutral'}>
                        {t(`marketing.empfehlung.status.${a.status}`)}
                      </Badge>
                      {a.werbesperre && <Badge ton="kritisch">{t('marketing.empfehlung.werbesperre')}</Badge>}
                    </span>
                    {(a.grund || a.ohne_ki) && (
                      <span className="text-muted-foreground text-xs">
                        {a.ohne_ki ? t('marketing.empfehlung.ohneKi') : a.grund}
                      </span>
                    )}
                    {a.status === 'gesendet' && a.entschieden_am && (
                      <span className="text-muted-foreground text-xs">
                        {t('marketing.empfehlung.gesendetVon', {
                          name: a.entschieden_von ?? '–',
                          datum: formatDatum(a.entschieden_am.slice(0, 10)),
                        })}
                      </span>
                    )}
                  </div>
                  {a.status === 'bereit' && (
                    <span className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant={a.einschaetzung === 'unzufrieden' ? 'secondary' : 'primary'}
                        laedt={laeuft}
                        disabled={a.werbesperre || !a.email}
                        onClick={() =>
                          void aus(() => bewertungSenden(a.id), {
                            de: 'Anfrage im Ausgangskorb',
                            fr: 'Demande dans la boîte d’envoi',
                          })
                        }
                      >
                        <Send />
                        {t(
                          a.einschaetzung === 'unzufrieden'
                            ? 'marketing.empfehlung.trotzdemSenden'
                            : 'marketing.empfehlung.senden',
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        laedt={laeuft}
                        onClick={() =>
                          void aus(() => bewertungVerwerfen(a.id), { de: 'Nicht gesendet', fr: 'Non envoyé' })
                        }
                      >
                        <X />
                        {t('marketing.empfehlung.nichtSenden')}
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </KarteInhalt>
      </Karte>

      <Karte className="overflow-hidden" data-testid="empfehlungen">
        <KarteKopf className="flex flex-col items-start gap-1 text-left">
          <KarteTitel>{t('marketing.empfehlung.liste')}</KarteTitel>
          <p className="text-muted-foreground text-sm">{t('marketing.empfehlung.listeHinweis')}</p>
        </KarteKopf>
        <KarteInhalt className="p-0">
          {empfehlungen.length === 0 ? (
            <Leerzustand
              icon={Users}
              titel={t('marketing.empfehlung.keineEmpfehlungen')}
              text={t('marketing.empfehlung.keineEmpfehlungenText')}
            />
          ) : (
            <ul className="divide-y">
              {empfehlungen.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-medium">
                      {t('marketing.empfehlung.vonAn', { von: e.empfehler ?? '–', an: e.neukunde ?? '–' })}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {[e.lead_nummer, e.projekt_nummer, formatDatum(e.erstellt_am.slice(0, 10))]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <Badge ton={e.status === 'auftrag' ? 'warnung' : e.status === 'ausbezahlt' ? 'ok' : 'neutral'}>
                    {t(`marketing.empfehlung.stand.${e.status}`)}
                  </Badge>
                  {e.gutschrift_rappen != null && (
                    <span className="zahlen font-mono text-xs">
                      {formatChf(e.gutschrift_rappen, { mitWaehrung: true })}
                    </span>
                  )}
                  {e.status === 'auftrag' && finanzen && (
                    <Button
                      size="sm"
                      variant="secondary"
                      laedt={laeuft}
                      onClick={() =>
                        void aus(() => empfehlungAusbezahlt(e.id), { de: 'Gutschrift erledigt', fr: 'Avoir réglé' })
                      }
                    >
                      {t('marketing.empfehlung.ausbezahlt')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </KarteInhalt>
      </Karte>
    </div>
  )
}
