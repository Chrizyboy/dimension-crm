import { useQuery } from '@tanstack/react-query'
import { Play, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatDatumZeit } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { jetztPruefen, ladeLaeufe, quelleAbrufen } from '../services/ausschreibungen'
import { RegelnKarte } from './RegelnKarte'
import { Sperrliste } from './Sperrliste'

/** Kantone ohne lesbares Portal: dort erfasst der Innendienst Baugesuche von Hand. */
const VON_HAND = ['AG', 'LU', 'FR', 'VD', 'NE']

/**
 * Quellen-Kontrolle: wann simap und das Amtsblatt zuletzt gelesen wurden und mit welchem Ergebnis.
 * Bleibt eine Quelle zwei Tage still, schlägt der tägliche Lauf Alarm. Darunter Sperrliste und Regeln.
 */
export function Quellen({ admin }: { admin: boolean }) {
  const { t } = useTranslation()
  const laeufe = useQuery({ queryKey: ['ausschreibungen', 'laeufe'], queryFn: ladeLaeufe })
  const { laeuft, aus } = useAktion()

  const abrufen = (q: 'simap' | 'amtsblatt') =>
    void aus(
      async () => {
        const r = await quelleAbrufen(q)
        if (!r.ergebnis.ok) throw new Error(r.ergebnis.meldung)
      },
      {
        de: `${q === 'simap' ? 'simap' : 'Amtsblatt'} gelesen`,
        fr: `${q === 'simap' ? 'simap' : 'Feuille officielle'} lue`,
      },
    )

  return (
    <div className="flex flex-col gap-6">
      <Karte className="overflow-hidden">
        <KarteKopf className="flex flex-wrap items-center justify-between gap-2">
          <KarteTitel>{t('ausschreibungen.quellen.titel')}</KarteTitel>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              laedt={laeuft}
              onClick={() => {
                abrufen('simap')
              }}
            >
              <RefreshCw />
              {t('ausschreibungen.quellen.abrufen', { quelle: 'simap' })}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              laedt={laeuft}
              onClick={() => {
                abrufen('amtsblatt')
              }}
            >
              <RefreshCw />
              {t('ausschreibungen.quellen.abrufen', { quelle: t('ausschreibungen.quelle.amtsblatt') })}
            </Button>
            {admin && (
              <Button
                variant="ghost"
                size="sm"
                laedt={laeuft}
                onClick={() =>
                  void aus(() => jetztPruefen(), { de: 'Täglicher Lauf erledigt', fr: 'Contrôle quotidien effectué' })
                }
              >
                <Play />
                {t('ausschreibungen.quellen.pruefen')}
              </Button>
            )}
          </div>
        </KarteKopf>
        <p className="text-muted-foreground border-b px-4 py-2 text-xs">
          {t('ausschreibungen.quellen.hinweis', { kantone: VON_HAND.join(', ') })}
        </p>
        {laeufe.error ? (
          <Fehlerzustand details={String(laeufe.error)} onNochmal={() => void laeufe.refetch()} />
        ) : laeufe.isPending ? (
          <Skelett className="m-4 h-40" />
        ) : laeufe.data.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">{t('ausschreibungen.quellen.leer')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Tabelle aria-label={t('ausschreibungen.quellen.titel')}>
              <TabelleKopf>
                <tr>
                  <Kopfzelle>{t('ausschreibungen.spalte.quelle')}</Kopfzelle>
                  <Kopfzelle>{t('ausschreibungen.quellen.zeit')}</Kopfzelle>
                  <Kopfzelle>{t('ausschreibungen.quellen.stand')}</Kopfzelle>
                  <Kopfzelle zahl>{t('ausschreibungen.quellen.gelesen')}</Kopfzelle>
                  <Kopfzelle zahl>{t('ausschreibungen.quellen.neu')}</Kopfzelle>
                  <Kopfzelle>{t('ausschreibungen.quellen.meldung')}</Kopfzelle>
                </tr>
              </TabelleKopf>
              <TabelleKoerper>
                {laeufe.data.map((l) => (
                  <Zeile key={l.id}>
                    <Zelle>{t(`ausschreibungen.quelle.${l.quelle}`, { defaultValue: l.quelle })}</Zelle>
                    <Zelle className="zahlen font-mono text-[13px] whitespace-nowrap">
                      {formatDatumZeit(l.beginn)}
                    </Zelle>
                    <Zelle>
                      <Badge ton={l.ok ? 'ok' : l.ok === false ? 'kritisch' : 'neutral'} punkt>
                        {t(
                          l.ok
                            ? 'ausschreibungen.quellen.ok'
                            : l.ok === false
                              ? 'ausschreibungen.quellen.fehler'
                              : 'ausschreibungen.quellen.laeuft',
                        )}
                      </Badge>
                    </Zelle>
                    <Zelle zahl>{l.gelesen}</Zelle>
                    <Zelle zahl>{l.neu}</Zelle>
                    <Zelle className="text-muted-foreground max-w-[24rem] truncate text-xs">{l.meldung}</Zelle>
                  </Zeile>
                ))}
              </TabelleKoerper>
            </Tabelle>
          </div>
        )}
      </Karte>
      <Sperrliste />
      {admin && <RegelnKarte />}
    </div>
  )
}
