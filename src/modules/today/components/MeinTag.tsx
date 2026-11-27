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
import { formatDatum } from '@/lib/format'
import { supabase } from '@/services/supabase'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useMeinTag } from '../hooks/useMeinTag'
import { anzahlOffen, listeVon, tageszeit, vorname } from '../lib/tag'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { aufgabeErledigt, verschieben } from '../services/meinTag'
import type { TagListeName, TagZeile } from '../types'
import { TagesMail } from './TagesMail'
import { TagKarte } from './TagKarte'
import { TeamHeute } from './TeamHeute'
import { WetterKarte } from './WetterKarte'
import { ZieleKarte } from './ZieleKarte'

/** Karten unter Termine und Aufgaben: Symbol und wohin «Alle anzeigen» führt. Leere Karten bleiben weg. */
const WEITERE: { liste: TagListeName; icon: LucideIcon; ziel: string }[] = [
  // «Wartet auf deine Freigabe» ist seit 27.11.2026 ausgeblendet (nie besprochen, Entscheid 0061).
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
  zeilenKnoepfe,
  verkaufKarten,
}: {
  /** Weitere Knöpfe im Kopf (z. B. neue Aufgabe, Kennzahlen). */
  aktionen?: ReactNode
  oben?: ReactNode
  unten?: ReactNode
  /** Knöpfe je Zeile einer Liste aus anderen Bereichen (z. B. Entscheid beim Nachfassen aus den Offerten). */
  zeilenKnoepfe?: Partial<Record<TagListeName, (z: TagZeile) => ReactNode>>
  /** Karten aus dem Verkauf vor den Listen (Offerten prüfen, Nach dem Termin); leere zeigen sich nicht. */
  verkaufKarten?: ReactNode
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

  /** Verschieben (M2 A): Aufgabe neu fällig, sonst bis zum Datum ausgeblendet. */
  async function verschiebe(z: TagZeile, bis: string) {
    const id = z.art === 'aufgabe' ? z.aufgabe_id : z.id
    if (!id) return
    try {
      await verschieben(z.art, id, bis)
      melde('ok', zweisprachig('tag.verschieben.erledigt', { datum: formatDatum(bis) }))
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'tag')
      melde('kritisch', zweisprachig(s ?? 'tag.verschieben.fehler'))
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
  const weitere = d ? WEITERE.filter((w) => listeVon(d, w.liste).anzahl > 0) : []
  const kernLeer = d ? d.termine.anzahl + d.aufgaben.anzahl + d.vergeben.anzahl === 0 : false

  // Termine und Aufgaben; nur was Punkte hat (Chris 27.11.2026: keine leeren Karten).
  const aufgabenLeer = d ? d.aufgaben.anzahl + d.vergeben.anzahl === 0 : true
  const kern = d && (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {d.termine.anzahl > 0 && (
        <TagKarte
          icon={CalendarDays}
          titel={t('tag.liste.termine')}
          liste={d.termine}
          heute={d.heute}
          max={8}
          testId="tag-termine"
        />
      )}
      {!aufgabenLeer && (
        <TagKarte
          icon={ListChecks}
          titel={t('tag.liste.aufgaben')}
          liste={d[aufgabenSicht]}
          heute={d.heute}
          max={8}
          alleZiel={aufgabenSicht === 'vergeben' ? '/tasks?wer=vergeben' : '/tasks'}
          onAbhaken={(z) => void abhaken(z)}
          {...(aufgabenSicht === 'aufgaben'
            ? { onVerschieben: (z: TagZeile, bis: string) => void verschiebe(z, bis) }
            : {})}
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
      )}
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-6 sm:px-6" data-testid="mein-tag">
      <Seitenkopf
        titel={t(`tag.gruss.${tageszeit()}`, { name: vorname(ich?.name) }).replace(/,\s*$/, '')}
        {...(d ? { zeile: t('tag.zusammenfassung', { datum, count: offen }) } : {})}
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
          {/* Was Punkte hat, steht oben; leere Karten bleiben ganz weg. */}
          {!kernLeer && kern}

          {(weitere.length > 0 || verkaufKarten) && (
            // auto-fit: leere Spuren fallen weg, zwei Karten füllen die Breite statt rechts eine Lücke zu lassen.
            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(22rem,1fr))]">
              {verkaufKarten}
              {weitere.map((w) => (
                <TagKarte
                  key={w.liste}
                  icon={w.icon}
                  titel={t(`tag.liste.${w.liste}`)}
                  liste={listeVon(d, w.liste)}
                  heute={d.heute}
                  alleZiel={w.ziel}
                  onVerschieben={(z, bis) => void verschiebe(z, bis)}
                  {...(zeilenKnoepfe?.[w.liste] ? { zeilenZusatz: zeilenKnoepfe[w.liste] } : {})}
                  testId={`tag-${w.liste}`}
                />
              ))}
            </div>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <ZieleKarte ziele={d.ziele ?? null} darfSetzen={Boolean(d.darf_ziele as boolean | undefined)} />
            <TeamHeute />
            <WetterKarte />
          </div>

          {offen === 0 && <Leerzustand icon={Sun} titel={t('tag.leerTitel')} text={t('tag.leerText')} />}
        </>
      )}

      {/* Erst nach den eigenen Karten: Sonst ist «Team und Betrieb» beim Laden kurz im Bild und lädt sofort mit. */}
      {!tag.isLoading && unten}

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
