import { useQueryClient } from '@tanstack/react-query'
import {
  BellRing,
  CalendarDays,
  Inbox,
  ListChecks,
  Mail,
  PhoneOutgoing,
  ShieldCheck,
  Stamp,
  Sun,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { meldeFehler } from '@/services/fehler'
import { supabase } from '@/services/supabase'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useMeinTag } from '../hooks/useMeinTag'
import { anzahlOffen, tageszeit, vorname } from '../lib/tag'
import { aufgabeErledigt } from '../services/meinTag'
import type { TagListeName, TagZeile } from '../types'
import { TagesMail } from './TagesMail'
import { TagKarte } from './TagKarte'

/** Karten unter Termine und Aufgaben: Symbol und wohin «Alle anzeigen» führt. Leere Karten bleiben weg. */
const WEITERE: { liste: TagListeName; icon: LucideIcon; ziel: string }[] = [
  { liste: 'nachfassen', icon: PhoneOutgoing, ziel: '/quotes?ansicht=nachfassen' },
  { liste: 'neue_leads', icon: Inbox, ziel: '/sales' },
  { liste: 'wiedervorlagen', icon: BellRing, ziel: '/sales' },
  { liste: 'fristen', icon: Stamp, ziel: '/projects?reiter=bewilligungen' },
  { liste: 'zahlungen', icon: Wallet, ziel: '/finance' },
  { liste: 'service', icon: Wrench, ziel: '/aftersales' },
  { liste: 'kontrollen', icon: ShieldCheck, ziel: '/aftersales?reiter=wartung' },
]

/**
 * «Mein Tag» (V233 Heute, Bau-Auftrag «Heute»): was heute für mich ansteht, in einer Abfrage. Die Startseite
 * setzt weitere Teile dazu (KI-Briefing, Karten der Bereiche), weil Module sich nicht gegenseitig importieren.
 */
export default function MeinTag({
  aktionen,
  oben,
  unten,
}: {
  /** Weitere Knöpfe im Kopf (z. B. neue Aufgabe, Kennzahlen). */
  aktionen?: ReactNode
  oben?: ReactNode
  unten?: ReactNode
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const client = useQueryClient()
  const tag = useMeinTag()
  const [aufgabenSicht, setAufgabenSicht] = useState<'aufgaben' | 'vergeben'>('aufgaben')
  const [mail, setMail] = useState(false)

  async function abhaken(z: TagZeile) {
    if (!z.aufgabe_id || !ich) return
    try {
      await aufgabeErledigt(z.aufgabe_id, ich.id)
      melde('ok', { de: 'Aufgabe erledigt', fr: 'Tâche terminée' })
    } catch (f) {
      meldeFehler(f, 'tag')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
    void client.invalidateQueries({ queryKey: ['mein-tag'] })
    void client.invalidateQueries({ queryKey: ['aufgaben'] })
  }

  const d = tag.data
  const datum = d
    ? new Date(`${d.heute}T12:00:00`).toLocaleDateString(sprache === 'fr' ? 'fr-CH' : 'de-CH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''
  const offen = d ? anzahlOffen(d) : 0
  const weitere = d ? WEITERE.filter((w) => d[w.liste].anzahl > 0) : []

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6" data-testid="mein-tag">
      <Seitenkopf
        titel={t(`tag.gruss.${tageszeit()}`, { name: vorname(ich?.name) }).replace(/,\s*$/, '')}
        {...(d ? { beschreibung: t('tag.zusammenfassung', { datum, count: offen }) } : {})}
        aktionen={
          <>
            {aktionen}
            {d && (
              <Button
                variant="secondary"
                onClick={() => {
                  setMail(true)
                }}
              >
                <Mail />
                {t('tag.mail.knopf')}
              </Button>
            )}
          </>
        }
      />

      {oben}

      {!supabase && <Leerzustand icon={Sun} titel={t('tag.leerTitel')} text={t('projekte.ohneDatenbank')} />}
      {tag.isError && <Fehlerzustand onNochmal={() => void tag.refetch()} />}
      {tag.isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skelett className="h-48" />
          <Skelett className="h-48" />
        </div>
      )}

      {d && (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <TagKarte
              icon={CalendarDays}
              titel={t('tag.liste.termine')}
              liste={d.termine}
              heute={d.heute}
              max={8}
              testId="tag-termine"
            />
            <TagKarte
              icon={ListChecks}
              titel={t('tag.liste.aufgaben')}
              liste={d[aufgabenSicht]}
              heute={d.heute}
              max={8}
              alleZiel={aufgabenSicht === 'vergeben' ? '/tasks?wer=vergeben' : '/tasks'}
              onAbhaken={(z) => void abhaken(z)}
              testId="tag-aufgaben"
              kopf={
                <Filterchips
                  einzeln
                  beschriftung={t('tag.liste.aufgaben')}
                  gewaehlt={[aufgabenSicht]}
                  optionen={[
                    { wert: 'aufgaben', text: t('tag.aufgabenFilter.fuerMich'), anzahl: d.aufgaben.anzahl },
                    { wert: 'vergeben', text: t('tag.aufgabenFilter.vergeben'), anzahl: d.vergeben.anzahl },
                  ]}
                  onChange={([w]) => {
                    setAufgabenSicht(w === 'vergeben' ? 'vergeben' : 'aufgaben')
                  }}
                />
              }
            />
          </div>

          {weitere.length > 0 && (
            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {weitere.map((w) => (
                <TagKarte
                  key={w.liste}
                  icon={w.icon}
                  titel={t(`tag.liste.${w.liste}`)}
                  liste={d[w.liste]}
                  heute={d.heute}
                  alleZiel={w.ziel}
                  testId={`tag-${w.liste}`}
                />
              ))}
            </div>
          )}

          {offen === 0 && <Leerzustand icon={Sun} titel={t('tag.leerTitel')} text={t('tag.leerText')} />}
        </>
      )}

      {unten}

      {mail && d && (
        <TagesMail
          tag={d}
          onSchliessen={() => {
            setMail(false)
          }}
        />
      )}
    </div>
  )
}
