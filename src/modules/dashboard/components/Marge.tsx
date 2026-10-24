import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { cn } from '@/lib/utils'
import { franken } from '../lib/format'
import type { MargeZeile } from '../types'

/** Prozent einer Marge vom Umsatz; ohne Umsatz kein Wert. */
function prozent(marge: number | null, umsatz: number | null): string {
  return marge === null || !umsatz ? '' : ` (${String(Math.round((marge / umsatz) * 100))} %)`
}

/** Marge je Projekt (ERP 0009): geplant aus der Offerte gegen Ist; Klick führt zur Nachkalkulation in Finanzen. */
export function Marge({ zeilen }: { zeilen: MargeZeile[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <Karte className="overflow-hidden" data-testid="kz-marge">
      <KarteKopf className="flex flex-col gap-0.5">
        <KarteTitel>{t('kz.betrieb.marge')}</KarteTitel>
        <span className="text-muted-foreground text-xs">{t('kz.betrieb.margeText')}</span>
      </KarteKopf>
      {zeilen.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('kz.detail.leer')}</p>
      ) : (
        <Tabelle aria-label={t('kz.betrieb.marge')}>
          <TabelleKopf>
            <tr>
              <Kopfzelle>{t('kz.betrieb.projekt')}</Kopfzelle>
              <Kopfzelle zahl>{t('kz.betrieb.geplant')}</Kopfzelle>
              <Kopfzelle zahl className="hidden sm:table-cell">
                {t('kz.betrieb.umsatz')}
              </Kopfzelle>
              <Kopfzelle zahl>{t('kz.betrieb.ist')}</Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {zeilen.map((m) => {
              const n = m.nachkalkulation
              const verkauf = n?.soll.verkauf_rappen ?? null
              const geplant =
                verkauf !== null && n?.soll.einkauf_rappen != null ? verkauf - n.soll.einkauf_rappen : null
              const ist = n && n.ist.umsatz_rappen ? n.ist.marge_rappen : null
              return (
                <Zeile
                  key={m.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => void navigate({ to: '/finance', search: { reiter: 'nachkalkulation' } })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void navigate({ to: '/finance', search: { reiter: 'nachkalkulation' } })
                  }}
                >
                  <Zelle>
                    <span className="flex flex-col">
                      <span className="font-medium">{m.name ?? '–'}</span>
                      <span className="text-muted-foreground font-mono text-xs">{m.nummer}</span>
                    </span>
                  </Zelle>
                  <Zelle zahl className="font-mono">
                    {geplant === null ? '–' : franken(geplant) + prozent(geplant, verkauf)}
                  </Zelle>
                  <Zelle zahl className="hidden font-mono sm:table-cell">
                    {n?.ist.umsatz_rappen ? franken(n.ist.umsatz_rappen) : '–'}
                  </Zelle>
                  <Zelle zahl className={cn('font-mono', ist !== null && ist < 0 && 'text-bad font-semibold')}>
                    {ist === null ? '–' : franken(ist) + prozent(ist, n?.ist.umsatz_rappen ?? null)}
                  </Zelle>
                </Zeile>
              )
            })}
          </TabelleKoerper>
        </Tabelle>
      )}
    </Karte>
  )
}
