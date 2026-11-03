import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { tonVonFarbe } from '@/lib/kontakt'
import { chfOderLeer, datumOderLeer } from '../lib/anzeige'
import type { ServiceFall, Wartungsvertrag } from '../types'
import { Box, Leer, Posten, Unterteil } from './Box'

/** Paket-Schlüssel («comfort») als Name («Comfort»); ältere Verträge haben kein Paket. */
const paketName = (p: string | null) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : '')

/**
 * Service und Wartung des Kunden: Wartungsverträge mit nächster Inspektion, darunter Service-Fälle (offene zuerst).
 * Früher gab es das nur im Service-Modul; beim Anruf eines Kunden muss man es hier sofort sehen.
 */
export function ServiceBox({
  faelle,
  vertraege,
  heute,
}: {
  faelle: ServiceFall[]
  vertraege: Wartungsvertrag[]
  heute: string
}) {
  const { t } = useTranslation()
  const status = useAuswahl('servicestatus')
  const kategorie = useAuswahl('servicekategorie')
  const offen = faelle.filter((f) => f.status !== 'erledigt')
  const erledigt = faelle.filter((f) => f.status === 'erledigt')
  const fall = (f: ServiceFall) => (
    <Posten
      key={f.id}
      titel={`${f.nummer} ${f.titel}`}
      href={`#/aftersales?fall=${f.id}`}
      status={<Badge ton={tonVonFarbe(status.finde(f.status)?.farbe)}>{status.text(f.status)}</Badge>}
    >
      {[
        kategorie.text(f.kategorie),
        f.garantie ? t('kundenseite.garantie') : '',
        f.erledigt_am
          ? t('kundenseite.erledigtAm', { datum: datumOderLeer(f.erledigt_am) })
          : datumOderLeer(f.erstellt_am),
      ]
        .filter(Boolean)
        .join(' · ')}
    </Posten>
  )
  return (
    <Box
      titel={t('kundenseite.service')}
      rechts={
        <a href="#/aftersales" className="hover:underline">
          {t('kundenseite.zumService')}
        </a>
      }
    >
      {vertraege.length === 0 && faelle.length === 0 && <Leer>{t('kundenseite.keinService')}</Leer>}
      {vertraege.map((v) => {
        const faellig = v.status === 'aktiv' && v.naechste_wartung !== null && v.naechste_wartung < heute
        return (
          <Posten
            key={v.id}
            titel={`${t('kundenseite.wartungsvertrag')} ${v.nummer} ${paketName(v.paket)}`.trim()}
            href={`#/contracts?vertrag=${v.id}`}
            status={
              <Badge ton={v.status === 'aktiv' ? (faellig ? 'warnung' : 'ok') : 'neutral'}>
                {faellig
                  ? t('kundenseite.wartungFaellig')
                  : t(`wartung.filterwert.${v.status}`, { defaultValue: v.status })}
              </Badge>
            }
          >
            {[
              v.preis_netto_rappen ? t('kundenseite.proJahr', { betrag: chfOderLeer(v.preis_netto_rappen) }) : '',
              v.naechste_wartung ? t('kundenseite.naechsteWartung', { datum: datumOderLeer(v.naechste_wartung) }) : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Posten>
        )
      })}
      {offen.length > 0 && <Unterteil>{t('kundenseite.offeneFaelle')}</Unterteil>}
      {offen.map(fall)}
      {erledigt.length > 0 && <Unterteil>{t('kundenseite.erledigteFaelle')}</Unterteil>}
      {erledigt.slice(0, 5).map(fall)}
    </Box>
  )
}
