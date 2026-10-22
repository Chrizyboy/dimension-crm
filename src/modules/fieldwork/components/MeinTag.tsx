import { useQueryClient } from '@tanstack/react-query'
import { CalendarCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { usePersonen, useTag } from '../hooks/useBaustelle'
import { heute, plusTage } from '../lib/zeit'
import { rapportAnlegen, zeitStarten } from '../services/monteur'
import type { RapportArt, TagEintrag } from '../types'
import { TagKarte } from './TagKarte'
import { ZeitLaeuft } from './ZeitLaeuft'

/** Tage von heute bis in einer Woche, an denen ein Eintrag liegt (mehrtägige Einsätze an jedem Tag). */
function nachTagen(eintraege: TagEintrag[], von: string): { tag: string; eintraege: TagEintrag[] }[] {
  return Array.from({ length: 7 }, (_, i) => plusTage(von, i))
    .map((tag) => ({ tag, eintraege: eintraege.filter((e) => e.von <= tag && e.bis >= tag) }))
    .filter((g) => g.eintraege.length > 0)
}

/**
 * «Mein Tag» am Handy: Einsätze und Service-Termine von heute und den nächsten Tagen mit Adresse, Navigation,
 * Anruf, Team und Material. «Rapport beginnen» legt den Rapport an und startet die Zeit, auch ohne Netz.
 */
export function MeinTag({ onRapport }: { onRapport: (id: string) => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const darfAndere = hatRecht(ich, 'preise')
  const [person, setPerson] = useState<string | null>(null)
  const personen = usePersonen()
  const von = heute()
  const tag = useTag(von, plusTage(von, 6), person)
  const eigener = !person || person === ich?.id

  async function beginnen(e: TagEintrag, art: RapportArt) {
    const offen = e.rapporte.find((r) => r.datum === von && !r.abgeschlossen_am && r.art === art)
    if (offen) {
      onRapport(offen.id)
      return
    }
    const id = crypto.randomUUID()
    try {
      await rapportAnlegen(
        {
          id,
          art,
          datum: von,
          projekt_id: e.projekt?.id ?? null,
          service_fall_id: e.service?.id ?? null,
          einsatz_id: e.typ === 'einsatz' ? e.id : null,
          verrechnung: e.service?.garantie ? 'garantie' : null,
        },
        {
          kunde: e.kunde.name,
          projekt_nummer: e.projekt?.nummer ?? null,
          service_nummer: e.service?.nummer ?? null,
          objekt_strasse: e.adresse.strasse,
          objekt_plz: e.adresse.plz,
          objekt_ort: e.adresse.ort,
        },
      )
      await zeitStarten({ rapport_id: id, projekt_id: e.projekt?.id ?? null, art: 'arbeit' })
      await qc.invalidateQueries({ queryKey: ['baustelle', 'tag'] })
      onRapport(id)
    } catch {
      melde('kritisch', { de: 'Rapport nicht angelegt', fr: 'Rapport non créé' })
    }
  }

  const gruppen = nachTagen(tag.data?.eintraege ?? [], von)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {darfAndere && (
        <Auswahl
          aria-label={t('baustelle.tag.person')}
          className="sm:w-72"
          value={person ?? ich?.id ?? ''}
          onValueChange={(v) => {
            setPerson(v === ich?.id ? null : v)
          }}
          optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
        />
      )}
      {tag.data?.laufend && eigener && <ZeitLaeuft laufend={tag.data.laufend} onRapport={onRapport} />}
      {tag.error ? (
        <Fehlerzustand details={String(tag.error)} onNochmal={() => void tag.refetch()} />
      ) : tag.isPending ? (
        <Skelett className="h-64" />
      ) : gruppen.length === 0 ? (
        <Leerzustand icon={CalendarCheck} titel={t('baustelle.tag.leer')} text={t('baustelle.tag.leerText')} />
      ) : (
        gruppen.map((g) => (
          <section key={g.tag} aria-label={formatDatum(g.tag)} className="flex flex-col gap-2">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {g.tag === von ? t('baustelle.tag.heute') : g.tag === plusTage(von, 1) ? t('baustelle.tag.morgen') : ''}{' '}
              {formatDatum(g.tag)}
            </h2>
            {g.eintraege.map((e) => (
              <TagKarte
                key={`${e.typ}-${e.id}`}
                eintrag={e}
                tag={g.tag}
                aktiv={g.tag === von && eigener}
                onBeginnen={(art) => void beginnen(e, art)}
                onRapport={onRapport}
              />
            ))}
          </section>
        ))
      )}
    </div>
  )
}
