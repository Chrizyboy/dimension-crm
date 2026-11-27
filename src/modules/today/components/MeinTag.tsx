import { useQueryClient } from '@tanstack/react-query'
import {
  BellRing,
  CalendarDays,
  Check,
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
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { meldeFehler } from '@/services/fehler'
import { formatDatum } from '@/lib/format'
import { supabase } from '@/services/supabase'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useMeinTag } from '../hooks/useMeinTag'
import { RASTER } from '../lib/raster'
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
  bereichKarten,
  listeErlaubt = () => true,
}: {
  /** Weitere Knöpfe im Kopf (z. B. neue Aufgabe, Kennzahlen). */
  aktionen?: ReactNode
  oben?: ReactNode
  unten?: ReactNode
  /** Knöpfe je Zeile einer Liste aus anderen Bereichen (z. B. Entscheid beim Nachfassen aus den Offerten). */
  zeilenKnoepfe?: Partial<Record<TagListeName, (z: TagZeile) => ReactNode>>
  /** Karten aus dem Verkauf vor den Listen (Offerten prüfen, Nach dem Termin); leere zeigen sich nicht. */
  verkaufKarten?: ReactNode
  /** Karten anderer Bereiche (Projekte, Finanzen, Spesen …) im selben Raster wie die eigenen, wie in V234. */
  bereichKarten?: ReactNode
  /** Ob die Person den Bereich einer Liste hat; nur dann steht sie leer unter «Nichts offen». */
  listeErlaubt?: (liste: TagListeName) => boolean
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

  // V234: Termine und Aufgaben zuerst, dann die übrigen Karten; nur was Punkte hat.
  const aufgabenLeer = d ? d.aufgaben.anzahl + d.vergeben.anzahl === 0 : true
  /** V234 «Nichts offen»: leere Listen als Häkchen in einer kleinen Karte statt als leere Karten. */
  const leer: TagListeName[] = d
    ? (['termine', 'aufgaben', ...WEITERE.map((w) => w.liste)] as TagListeName[]).filter(
        (l) => listeErlaubt(l) && (l === 'aufgaben' ? aufgabenLeer : listeVon(d, l).anzahl === 0),
      )
    : []
  const kern = d && (
    <>
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
    </>
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
          {/* Ein Raster wie V234: was Punkte hat, steht oben; leere Karten fehlen und stehen unter «Nichts offen». */}
          <div className={RASTER}>
            {kern}
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
            {d.ziele && <ZieleKarte ziele={d.ziele} darfSetzen={Boolean(d.darf_ziele as boolean | undefined)} />}
            <TeamHeute />
            <WetterKarte />
          </div>

          {bereichKarten && <div data-testid="tag-bereiche">{bereichKarten}</div>}

          {leer.length > 0 && (
            <Karte className="max-w-3xl" data-testid="tag-nichts-offen">
              <KarteKopf>
                <KarteTitel>{t('tag.nichts')}</KarteTitel>
              </KarteKopf>
              <ul className="flex flex-wrap gap-2 px-4 pb-4">
                {leer.map((l) => (
                  <li
                    key={l}
                    className="bg-muted text-muted-foreground flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
                  >
                    <Check className="text-ok size-3.5" aria-hidden="true" />
                    {t(`tag.liste.${l}`)}
                  </li>
                ))}
              </ul>
            </Karte>
          )}

          {/* Ohne Ziele nur der Knopf «Ziele festlegen» (Administration), unten statt als Lücke im Raster. */}
          {!d.ziele && <ZieleKarte ziele={null} darfSetzen={Boolean(d.darf_ziele as boolean | undefined)} />}
        </>
      )}

      {/* Erst nach den eigenen Karten: sonst ist der Systemstatus beim Laden kurz im Bild. */}
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
