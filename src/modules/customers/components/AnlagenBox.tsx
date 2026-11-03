import { Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { adresseEinzeilig } from '@/lib/kontakt'
import { datumOderLeer, jsonText, kwpText } from '../lib/anzeige'
import type { Anlage, Objekt } from '../types'
import { Box, Leer, Posten } from './Box'

/** Komponenten einer Anlage als kurze Zeile («Wechselrichter Huawei SUN2000 · Batterie …»). */
function komponentenText(komponenten: unknown, art: (w: string) => string): string {
  if (!Array.isArray(komponenten)) return ''
  return komponenten
    .map((k) => {
      const a = jsonText(k, 'art')
      return [a ? art(a) : '', jsonText(k, 'hersteller'), jsonText(k, 'modell')].filter(Boolean).join(' ')
    })
    .filter(Boolean)
    .join(' · ')
}

/**
 * Anlagen des Kunden (entstehen mit der IBN): Leistung, Inbetriebnahme, Garantie, Komponenten, Gebäude.
 * Garantie abgelaufen wird markiert, weil Service und Verkauf das beim nächsten Anruf wissen müssen.
 */
export function AnlagenBox({ anlagen, objekte, heute }: { anlagen: Anlage[]; objekte: Objekt[]; heute: string }) {
  const { t } = useTranslation()
  const art = useAuswahl('komponente')
  const ort = (id: string) => {
    const o = objekte.find((x) => x.id === id)
    return o ? adresseEinzeilig(o) : ''
  }
  return (
    <Box titel={t('kundenseite.anlagen')} rechts={t('kundenseite.ausIbn')}>
      {anlagen.length === 0 ? (
        <Leer>{t('kundenseite.keineAnlage')}</Leer>
      ) : (
        anlagen.map((a) => {
          const garantie = a.garantie_bis
          return (
            <Posten
              key={a.id}
              titel={[kwpText(a.leistung_kwp) || t('kundenseite.anlage'), ort(a.objekt_id)].filter(Boolean).join(' · ')}
              href={a.projekt_id ? `#/projects?projekt=${a.projekt_id}` : undefined}
              status={
                garantie ? (
                  <Badge ton={garantie >= heute ? 'ok' : 'neutral'}>
                    <Sun />
                    {garantie >= heute
                      ? t('kundenseite.garantieBis', { datum: datumOderLeer(garantie) })
                      : t('kundenseite.garantieAbgelaufen')}
                  </Badge>
                ) : undefined
              }
            >
              {[
                a.ibn_am ? t('kundenseite.ibn', { datum: datumOderLeer(a.ibn_am) }) : '',
                komponentenText(a.komponenten, art.text),
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
