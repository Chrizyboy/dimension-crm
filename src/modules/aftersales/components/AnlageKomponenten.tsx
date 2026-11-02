import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import type { Komponente } from '../types'
import { Box } from './Box'

/** Komponenten der Anlage: Art, Hersteller und Modell, Anzahl, Seriennummer und Garantie (rot, wenn abgelaufen). */
export function AnlageKomponenten({ komponenten }: { komponenten: Komponente[] }) {
  const { t } = useTranslation()
  const art = useAuswahl('komponente')
  const heute = new Date().toISOString().slice(0, 10)
  return (
    <Box titel={t('service.anlagen.komponenten')} rechts={<span className="zahlen">{komponenten.length}</span>}>
      {komponenten.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t('service.anlage.keineKomponenten')}</p>
      ) : (
        <div className="-mx-3 overflow-x-auto">
          <Tabelle aria-label={t('service.anlagen.komponenten')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('service.anlagen.feld.art')}</Kopfzelle>
                <Kopfzelle>{t('service.anlagen.feld.modell')}</Kopfzelle>
                <Kopfzelle className="text-right">{t('service.anlagen.feld.anzahl')}</Kopfzelle>
                <Kopfzelle>{t('service.anlagen.feld.seriennummer')}</Kopfzelle>
                <Kopfzelle>{t('service.anlagen.feld.garantie_bis')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {komponenten.map((k, i) => (
                <Zeile key={`${k.art}-${String(i)}`}>
                  <Zelle>{art.text(k.art)}</Zelle>
                  <Zelle>{[k.hersteller, k.modell].filter(Boolean).join(' ') || '–'}</Zelle>
                  <Zelle className="zahlen text-right">{k.anzahl ?? '–'}</Zelle>
                  <Zelle className="zahlen font-mono text-xs">{k.seriennummer || '–'}</Zelle>
                  <Zelle>
                    {k.garantie_bis ? (
                      <Badge ton={k.garantie_bis >= heute ? 'ok' : 'kritisch'}>{formatDatum(k.garantie_bis)}</Badge>
                    ) : (
                      '–'
                    )}
                  </Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </div>
      )}
    </Box>
  )
}
