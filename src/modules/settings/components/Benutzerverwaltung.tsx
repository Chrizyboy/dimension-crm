import { ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte } from '@/components/ui/karte'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useUi } from '@/stores/ui'
import type { ModulMeta } from '@/types/modul'
import { useBenutzerDaten } from '../hooks/useBenutzer'
import { statusVon } from '../services/benutzer'
import type { Person, Rolle } from '../types'
import { BenutzerTabelle } from './BenutzerTabelle'
import { Betrieb } from './Betrieb'
import { Datensicherung } from './Datensicherung'
import { EinladungDialog } from './EinladungDialog'
import { PersonDialog } from './PersonDialog'
import { RollenDialog } from './RollenDialog'
import { Verbindungen } from './Verbindungen'

/**
 * Einstellungen > Benutzer und Rollen (nur Administration).
 * Wer hier fehlt, kann sich nicht anmelden: Ein Login entsteht nur für erfasste, aktive Personen.
 */
export default function Benutzerverwaltung({
  module,
  reiter = 'personen',
  onReiter,
}: {
  module: readonly ModulMeta[]
  /** Offener Reiter aus der Adresse (#/settings?reiter=verbindungen). */
  reiter?: string
  onReiter: (reiter: string) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { personen, rollen, standorte, einladungen } = useBenutzerDaten()
  const [einladen, setEinladen] = useState(false)
  const [person, setPerson] = useState<Person | null>(null)
  const [rolle, setRolle] = useState<Rolle | null>(null)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Users} titel={t('benutzer.ohneDatenbankTitel')} text={t('benutzer.ohneDatenbankText')} />
      </div>
    )
  }

  const fehler = personen.error ?? rollen.error
  const status = (p: Person) => statusVon(p, einladungen.data ?? [])
  const liste = personen.data ?? []

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('benutzer.titel')}
        beschreibung={t('benutzer.beschreibung')}
        aktionen={
          <Button
            onClick={() => {
              setEinladen(true)
            }}
            disabled={!rollen.data}
          >
            <UserPlus />
            {t('benutzer.einladen')}
          </Button>
        }
      />

      <Reiter value={reiter} onValueChange={onReiter} className="flex flex-col gap-4">
        <ReiterListe>
          <ReiterKnopf value="personen">
            {t('benutzer.reiterPersonen')}
            <span className="zahlen text-muted-foreground ml-1">{liste.length}</span>
          </ReiterKnopf>
          <ReiterKnopf value="rollen">{t('benutzer.reiterRollen')}</ReiterKnopf>
          <ReiterKnopf value="verbindungen">{t('verbindungen.reiter')}</ReiterKnopf>
          <ReiterKnopf value="sicherung">{t('sicherung.reiter')}</ReiterKnopf>
          <ReiterKnopf value="betrieb">{t('betrieb.reiter')}</ReiterKnopf>
        </ReiterListe>

        <ReiterInhalt value="personen">
          <Karte className="overflow-hidden">
            {fehler ? (
              <Fehlerzustand details={fehler.message} onNochmal={() => void personen.refetch()} />
            ) : personen.isPending || rollen.isPending ? (
              <div className="flex flex-col gap-2 p-4">
                {[1, 2, 3].map((i) => (
                  <Skelett key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <BenutzerTabelle
                personen={liste}
                status={status}
                rollen={rollen.data ?? []}
                standorte={standorte.data ?? []}
                onWaehle={setPerson}
              />
            )}
          </Karte>
        </ReiterInhalt>

        <ReiterInhalt value="rollen" className="grid gap-3 sm:grid-cols-2">
          {(rollen.data ?? []).map((r) => {
            const anzahl = liste.filter((p) => p.rolle === r.schluessel && p.aktiv).length
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRolle(r)
                }}
                className="bg-surface hover:border-border-strong focus-visible:ring-ring flex flex-col gap-2 rounded-lg border p-4 text-left outline-none focus-visible:ring-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="text-muted-foreground size-4" aria-hidden="true" />
                    {sprache === 'fr' ? r.name_fr : r.name_de}
                  </span>
                  <span className="text-muted-foreground text-xs">{t('rollen.personen', { count: anzahl })}</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {sprache === 'fr' ? r.beschreibung_fr : r.beschreibung_de}
                </p>
                <div className="flex flex-wrap gap-1">
                  {r.rechte.map((x) => (
                    <Badge key={x} ton="marke">
                      {t(`rechte.${x}`)}
                    </Badge>
                  ))}
                  <Badge>
                    {r.bereiche.length === 0
                      ? t('rollen.alleBereiche')
                      : t('rollen.bereiche', { count: r.bereiche.length })}
                  </Badge>
                </div>
              </button>
            )
          })}
        </ReiterInhalt>

        <ReiterInhalt value="verbindungen">
          <Verbindungen />
        </ReiterInhalt>

        <ReiterInhalt value="sicherung">
          <Datensicherung />
        </ReiterInhalt>

        <ReiterInhalt value="betrieb">
          <Betrieb />
        </ReiterInhalt>
      </Reiter>

      <EinladungDialog
        offen={einladen}
        onOffen={setEinladen}
        rollen={rollen.data ?? []}
        standorte={standorte.data ?? []}
      />
      <PersonDialog
        key={person?.id ?? 'keine-person'}
        person={person}
        status={person ? status(person) : null}
        onSchliessen={() => {
          setPerson(null)
        }}
        rollen={rollen.data ?? []}
        standorte={standorte.data ?? []}
        module={module}
      />
      <RollenDialog
        key={rolle?.id ?? 'keine-rolle'}
        rolle={rolle}
        onSchliessen={() => {
          setRolle(null)
        }}
        module={module}
      />
    </div>
  )
}
