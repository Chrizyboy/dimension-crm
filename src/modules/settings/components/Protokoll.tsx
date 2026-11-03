import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { Karte } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import { useBenutzerDaten } from '../hooks/useBenutzer'
import { datensatzText, geaenderteFelder } from '../lib/protokoll'
import { ladeProtokoll } from '../services/stammdaten'

const ALLE = '_alle'

/** Zeitpunkt vor so vielen Tagen (ISO). */
function vor(tage: number): string {
  return new Date(Date.now() - tage * 86_400_000).toISOString()
}
const TON = {
  erstellt: 'ok',
  geaendert: 'info',
  papierkorb: 'warnung',
  wiederhergestellt: 'ok',
  geloescht: 'kritisch',
} as const

/** Tabellen, nach denen man filtern kann (die häufigsten); alle anderen erscheinen ohne Filter. */
const TABELLEN = [
  'kontakte',
  'objekte',
  'verkaufschancen',
  'offerten',
  'werkvertraege',
  'projekte',
  'rechnungen',
  'service_faelle',
  'wartungsvertraege',
  'aufgaben',
  'personen',
  'rollen',
  'einstellungen',
  'auswahlwerte',
  'regionen',
  'standorte',
  'firmen',
  'automationen',
] as const

/**
 * Einstellungen › Änderungsprotokoll: wer wann was geändert hat, mit den geänderten Feldern.
 * Die Datenbank zeigt nur Zeilen aus Bereichen, die man lesen darf.
 */
export default function Protokoll() {
  const { t } = useTranslation()
  const [tage, setTage] = useState('7')
  const [tabelle, setTabelle] = useState(ALLE)
  const [person, setPerson] = useState(ALLE)
  const { personen } = useBenutzerDaten()
  // Startzeit beim Wählen festhalten statt bei jedem Zeichnen neu (sonst ändert sich die Abfrage laufend).
  const [seit, setSeit] = useState<string | undefined>(() => vor(7))
  const waehleZeitraum = (w: string) => {
    setTage(w)
    setSeit(w === ALLE ? undefined : vor(Number(w)))
  }
  const filter = {
    ...(seit ? { seit } : {}),
    ...(tabelle !== ALLE ? { tabelle } : {}),
    ...(person !== ALLE ? { benutzer: person } : {}),
  }
  const eintraege = useQuery({ queryKey: ['einstellungen', 'protokoll', filter], queryFn: () => ladeProtokoll(filter) })
  const name = (uid: string | null) =>
    uid ? (personen.data?.find((p) => p.auth_user_id === uid)?.name ?? t('protokoll.unbekannt')) : t('protokoll.system')
  const bereich = (x: string) => t(`protokoll.tabellen.${x}`, x)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Auswahl
          id="protokoll-zeit"
          aria-label={t('protokoll.zeitraum')}
          className="w-40"
          value={tage}
          onValueChange={waehleZeitraum}
          optionen={[
            { wert: '1', text: t('protokoll.heute') },
            { wert: '7', text: t('protokoll.tage', { count: 7 }) },
            { wert: '30', text: t('protokoll.tage', { count: 30 }) },
            { wert: ALLE, text: t('protokoll.alles') },
          ]}
        />
        <Auswahl
          id="protokoll-tabelle"
          aria-label={t('protokoll.bereich')}
          className="w-48"
          value={tabelle}
          onValueChange={setTabelle}
          optionen={[
            { wert: ALLE, text: t('protokoll.alleBereiche') },
            ...TABELLEN.map((x) => ({ wert: x, text: bereich(x) })),
          ]}
        />
        <Auswahl
          id="protokoll-person"
          aria-label={t('protokoll.person')}
          className="w-48"
          value={person}
          onValueChange={setPerson}
          optionen={[
            { wert: ALLE, text: t('protokoll.allePersonen') },
            ...(personen.data ?? []).flatMap((p) => (p.auth_user_id ? [{ wert: p.auth_user_id, text: p.name }] : [])),
          ]}
        />
      </div>
      <Karte className="overflow-hidden">
        {eintraege.error ? (
          <Fehlerzustand details={String(eintraege.error)} onNochmal={() => void eintraege.refetch()} />
        ) : !eintraege.data ? (
          <Skelett className="h-64" />
        ) : eintraege.data.length === 0 ? (
          <Leerzustand icon={History} titel={t('protokoll.leer')} text={t('protokoll.leerText')} />
        ) : (
          <ul className="divide-border divide-y">
            {eintraege.data.map((e) => {
              const felder = e.aktion === 'geaendert' ? geaenderteFelder(e.vorher, e.nachher) : []
              return (
                <li key={e.id} className="flex flex-col gap-1 px-4 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-muted-foreground zahlen w-32 shrink-0 text-xs">
                      {formatDatumZeit(e.zeitpunkt)}
                    </span>
                    <span className="font-medium">{name(e.benutzer)}</span>
                    <Badge ton={TON[e.aktion as keyof typeof TON]}>{t(`protokoll.aktion.${e.aktion}`)}</Badge>
                    <span className="text-muted-foreground">{bereich(e.tabelle)}</span>
                    <span className="min-w-0 truncate">{datensatzText(e.nachher ?? e.vorher)}</span>
                  </div>
                  {felder.length > 0 && (
                    <ul className="text-muted-foreground flex flex-col gap-0.5 pl-0 text-xs sm:pl-34">
                      {felder.slice(0, 6).map((f) => (
                        <li key={f.feld} className="break-words">
                          <span className="text-foreground">{f.feld}</span>: {f.vorher} → {f.nachher}
                        </li>
                      ))}
                      {felder.length > 6 && <li>{t('protokoll.weitere', { count: felder.length - 6 })}</li>}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Karte>
      <p className="text-muted-foreground text-xs">{t('protokoll.hinweis')}</p>
    </div>
  )
}
