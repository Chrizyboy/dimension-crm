import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatDatum } from '@/lib/format'
import { franken } from '../lib/format'
import type { Auftrag } from '../types'

/** Auftragsbestand: was unterschrieben, aber noch nicht verrechnet ist, grösster Rest zuerst; Klick öffnet das Projekt. */
export function Auftragsbestand({ auftraege }: { auftraege: Auftrag[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const zeilen = [...auftraege].sort((a, b) => b.rest_rappen - a.rest_rappen)
  const total = (k: 'vertrag_rappen' | 'verrechnet_rappen' | 'rest_rappen') => zeilen.reduce((s, a) => s + a[k], 0)

  return (
    <Karte className="overflow-hidden" data-testid="kz-auftragsbestand">
      <KarteKopf className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <KarteTitel>{t('kz.betrieb.auftragsbestand')}</KarteTitel>
          <span className="text-muted-foreground text-xs">{t('kz.betrieb.auftragsbestandText')}</span>
        </div>
        <span className="font-display zahlen text-xl font-semibold">{franken(total('rest_rappen'))}</span>
      </KarteKopf>
      <div className="max-h-[28rem] overflow-y-auto">
        <Tabelle aria-label={t('kz.betrieb.auftragsbestand')}>
          <TabelleKopf className="sticky top-0">
            <tr>
              <Kopfzelle>{t('kz.betrieb.projekt')}</Kopfzelle>
              <Kopfzelle className="hidden md:table-cell">{t('kz.detail.datum')}</Kopfzelle>
              <Kopfzelle zahl className="hidden sm:table-cell">
                {t('kz.betrieb.vertrag')}
              </Kopfzelle>
              <Kopfzelle zahl className="hidden sm:table-cell">
                {t('kz.betrieb.verrechnet')}
              </Kopfzelle>
              <Kopfzelle zahl>{t('kz.betrieb.rest')}</Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {zeilen.map((a) => (
              <Zeile
                key={a.id}
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => void navigate({ to: '/projects', search: { projekt: a.id } })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void navigate({ to: '/projects', search: { projekt: a.id } })
                }}
              >
                <Zelle>
                  <span className="flex flex-col">
                    <span className="font-medium">{a.name ?? '–'}</span>
                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span className="font-mono">{a.nummer}</span>
                      {a.standort && t(`kz.spalte.${a.standort}`, { defaultValue: a.standort })}
                      <Badge ton={a.status === 'im_bau' ? 'info' : 'neutral'}>
                        {t(`kz.betrieb.status.${a.status}`, { defaultValue: a.status })}
                      </Badge>
                    </span>
                  </span>
                </Zelle>
                <Zelle className="text-muted-foreground hidden font-mono text-xs md:table-cell">
                  {a.unterzeichnet_am ? formatDatum(a.unterzeichnet_am) : '–'}
                </Zelle>
                <Zelle zahl className="hidden font-mono sm:table-cell">
                  {franken(a.vertrag_rappen)}
                </Zelle>
                <Zelle zahl className="hidden font-mono sm:table-cell">
                  {franken(a.verrechnet_rappen)}
                </Zelle>
                <Zelle zahl className="font-mono font-medium">
                  {franken(a.rest_rappen)}
                </Zelle>
              </Zeile>
            ))}
            <Zeile className="bg-surface-2 font-semibold">
              <Zelle>{t('kz.betrieb.total')}</Zelle>
              <Zelle className="hidden md:table-cell" />
              <Zelle zahl className="hidden font-mono sm:table-cell">
                {franken(total('vertrag_rappen'))}
              </Zelle>
              <Zelle zahl className="hidden font-mono sm:table-cell">
                {franken(total('verrechnet_rappen'))}
              </Zelle>
              <Zelle zahl className="font-mono">
                {franken(total('rest_rappen'))}
              </Zelle>
            </Zeile>
          </TabelleKoerper>
        </Tabelle>
      </div>
    </Karte>
  )
}
