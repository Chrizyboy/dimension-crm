import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { chfOderLeer, datumOderLeer } from '../lib/anzeige'
import type { Rechnungszeile } from '../types'
import { Box, Leer, Posten } from './Box'

const TON = {
  entwurf: 'neutral',
  gestellt: 'info',
  teilbezahlt: 'warnung',
  bezahlt: 'ok',
  storniert: 'neutral',
} as const

/**
 * Rechnungen des Kunden mit Stand, Fälligkeit, Mahnstufe und wann bezahlt wurde. Ohne Recht auf Rechnungen
 * liefert die Datenbank keine Zeilen; dann steht hier «keine Rechnungen».
 */
export function RechnungenBox({ rechnungen, finanzen }: { rechnungen: Rechnungszeile[]; finanzen: boolean }) {
  const { t } = useTranslation()
  return (
    <Box
      titel={t('kundenseite.rechnungen')}
      rechts={
        <a href="#/invoices" className="hover:underline">
          {t('kundenseite.zuRechnungen')}
        </a>
      }
    >
      {!finanzen ? (
        <Leer>{t('kundenseite.nurFinanzen')}</Leer>
      ) : rechnungen.length === 0 ? (
        <Leer>{t('kundenseite.keineRechnung')}</Leer>
      ) : (
        rechnungen.slice(0, 12).map((r) => {
          const st = (r.status ?? 'entwurf') as keyof typeof TON
          return (
            <Posten
              key={r.id ?? r.nummer}
              titel={[r.nummer, r.titel].filter(Boolean).join(' ')}
              href={r.id ? `#/invoices?rechnung=${r.id}` : undefined}
              status={
                <Badge ton={r.ueberfaellig ? 'kritisch' : TON[st]}>
                  {r.ueberfaellig ? t('kundenseite.ueberfaellig') : t(`rechnungen.status.${st}`, { defaultValue: st })}
                </Badge>
              }
            >
              {[
                chfOderLeer(r.total_rappen),
                st === 'bezahlt'
                  ? r.bezahlt_am
                    ? t('kundenseite.bezahltAm', { datum: datumOderLeer(r.bezahlt_am) })
                    : ''
                  : r.faellig_am
                    ? t('kundenseite.faelligAm', { datum: datumOderLeer(r.faellig_am) })
                    : '',
                r.mahnstufe ? t('kundenseite.mahnstufe', { count: r.mahnstufe }) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Posten>
          )
        })
      )}
    </Box>
  )
}
