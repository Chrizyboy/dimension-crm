import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import type { Protokolleintrag, ZeitplanLauf } from '../types'

/** Hintergrund-Jobs (wann zuletzt, mit welchem Ergebnis) und die letzten 50 Aufrufe fremder Dienste. */
export function VerbindungenProtokoll({
  zeitplan,
  protokoll,
}: {
  zeitplan: ZeitplanLauf[]
  protokoll: Protokolleintrag[]
}) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Karte>
        <KarteKopf>
          <KarteTitel>{t('verbindungen.zeitplan')}</KarteTitel>
        </KarteKopf>
        <KarteInhalt>
          {zeitplan.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('verbindungen.zeitplanLeer')}</p>
          ) : (
            <ul className="divide-y text-sm">
              {zeitplan.map((z) => (
                <li key={z.job} className="flex flex-col gap-0.5 py-2">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t(`verbindungen.job.${z.job}`, { defaultValue: z.job })}</span>
                    <Badge ton={z.ok === false ? 'kritisch' : 'ok'} punkt>
                      {formatDatumZeit(z.zuletzt_am)}
                    </Badge>
                  </span>
                  {z.meldung && <span className="text-muted-foreground line-clamp-2 text-xs">{z.meldung}</span>}
                </li>
              ))}
            </ul>
          )}
        </KarteInhalt>
      </Karte>
      <Karte>
        <KarteKopf>
          <KarteTitel>{t('verbindungen.protokoll')}</KarteTitel>
        </KarteKopf>
        <KarteInhalt className="overflow-x-auto">
          {protokoll.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('verbindungen.protokollLeer')}</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2 font-medium">{t('verbindungen.spalte.zeit')}</th>
                  <th className="py-1 pr-2 font-medium">{t('verbindungen.spalte.dienst')}</th>
                  <th className="py-1 pr-2 font-medium">{t('verbindungen.spalte.person')}</th>
                  <th className="py-1 text-right font-medium">{t('verbindungen.spalte.ergebnis')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {protokoll.map((p) => (
                  <tr key={p.id}>
                    <td className="zahlen py-1.5 pr-2 font-mono whitespace-nowrap">{formatDatumZeit(p.zeitpunkt)}</td>
                    <td className="py-1.5 pr-2">
                      {p.dienst} · {p.aktion}
                    </td>
                    <td className="text-muted-foreground py-1.5 pr-2">{p.person ?? '–'}</td>
                    <td className="py-1.5 text-right">
                      <Badge ton={p.ok ? 'ok' : 'kritisch'}>
                        {p.ok ? `${p.dauer_ms ?? 0} ms` : (p.meldung ?? String(p.status ?? ''))}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </KarteInhalt>
      </Karte>
    </div>
  )
}
