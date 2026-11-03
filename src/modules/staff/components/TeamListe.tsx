import { Search, Users } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatTelefon } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { ausweisKurz } from '../lib/kurse'
import type { AusweisArt, Kurs, Qualifikation, TeamPerson } from '../types'
import { HeuteBadge } from './HeuteBadge'
import { ZellenBadge } from './ZellenBadge'

/**
 * Reiter «Team»: wer gehört dazu, wie erreiche ich die Person, wer ist vorgesetzt und was tut sie heute
 * (abwesend, Kurs, Baustelle, Service). Gruppiert nach Standort; Klick öffnet die Person.
 */
export function TeamListe({
  personen,
  arten,
  gueltig,
  geplant,
  heute,
  aktiveId,
  onOeffnen,
}: {
  personen: TeamPerson[]
  arten: AusweisArt[]
  gueltig: Map<string, Qualifikation>
  geplant: Map<string, Kurs>
  heute: string
  aktiveId: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const quali = useAuswahl('qualifikation')
  const [filter, setFilter] = useState('alle')
  const [suche, setSuche] = useState('')
  const standorte = [...new Set(personen.map((p) => p.standort ?? ''))]
  const kurz = new Map(personen.map((p) => [p.id, ausweisKurz(p, arten, gueltig, geplant, heute)]))
  const handlung = (p: TeamPerson) => {
    const s = kurz.get(p.id)?.stand
    return s === 'fehlt' || s === 'abgelaufen' || s === 'bald'
  }
  const text = suche.trim().toLowerCase()
  const liste = personen.filter(
    (p) =>
      (filter === 'alle' ||
        (filter === 'da' && (!p.heute || p.heute.art === 'einsatz' || p.heute.art === 'service')) ||
        (filter === 'handlung' && handlung(p)) ||
        filter === `ort:${p.standort ?? ''}`) &&
      (!text ||
        [p.name, p.funktion, p.rolle_de, p.rolle_fr, p.telefon, p.email].some((x) => x?.toLowerCase().includes(text))),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Filterchips
          einzeln
          beschriftung={t('team.filter')}
          optionen={[
            { wert: 'alle', text: t('team.filterwert.alle'), anzahl: personen.length },
            ...standorte
              .filter(Boolean)
              .map((s) => ({ wert: `ort:${s}`, text: s, anzahl: personen.filter((p) => p.standort === s).length })),
            {
              wert: 'da',
              text: t('team.filterwert.da'),
              anzahl: personen.filter((p) => !p.heute || p.heute.art === 'einsatz' || p.heute.art === 'service').length,
            },
            { wert: 'handlung', text: t('team.filterwert.probleme'), anzahl: personen.filter(handlung).length },
          ]}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f)
          }}
        />
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" aria-hidden="true" />
          <span className="sr-only">{t('team.suchen')}</span>
          <Input
            className="pl-8"
            placeholder={t('team.suchen')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        </label>
      </div>
      {liste.length === 0 ? (
        <Leerzustand icon={Users} titel={t('team.leer')} text={t('team.leerText')} />
      ) : (
        <Tabelle aria-label={t('team.reiter.team')}>
          <TabelleKopf>
            <tr>
              <Kopfzelle>{t('team.spalte.person')}</Kopfzelle>
              <Kopfzelle>{t('team.spalte.heute')}</Kopfzelle>
              <Kopfzelle>{t('team.spalte.telefon')}</Kopfzelle>
              <Kopfzelle className="hidden lg:table-cell">{t('team.spalte.vorgesetzt')}</Kopfzelle>
              <Kopfzelle>{t('team.spalte.ausweise')}</Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {standorte.map((s) => {
              const gruppe = liste.filter((p) => (p.standort ?? '') === s)
              if (gruppe.length === 0) return null
              return (
                <Fragment key={s || 'ohne'}>
                  <tr>
                    <td
                      colSpan={5}
                      className="bg-muted/60 text-muted-foreground px-3 py-1.5 text-xs font-semibold tracking-wide uppercase"
                    >
                      {s || t('team.ohneStandort')}
                    </td>
                  </tr>
                  {gruppe.map((p) => {
                    const a = kurz.get(p.id)
                    return (
                      <Zeile
                        key={p.id}
                        data-aktiv={p.id === aktiveId}
                        tabIndex={0}
                        className="cursor-pointer"
                        onClick={() => {
                          onOeffnen(p.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onOeffnen(p.id)
                        }}
                      >
                        <Zelle>
                          <span className="flex min-w-44 items-center gap-2.5">
                            <Avatar name={p.name} />
                            <span className="flex min-w-0 flex-col">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {[p.funktion ?? (sprache === 'fr' ? p.rolle_fr : p.rolle_de), p.sprache.toUpperCase()]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </span>
                          </span>
                        </Zelle>
                        <Zelle>
                          <HeuteBadge heute={p.heute} />
                        </Zelle>
                        <Zelle className="zahlen whitespace-nowrap">{p.telefon ? formatTelefon(p.telefon) : '–'}</Zelle>
                        <Zelle className="text-muted-foreground hidden lg:table-cell">{p.vorgesetzt_name ?? '–'}</Zelle>
                        <Zelle>
                          {a && a.art ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-xs">{quali.text(a.art)}</span>
                              <ZellenBadge stand={a.stand} bis={a.datum} kursVon={a.datum} />
                              {a.anzahl > 1 && <span className="text-muted-foreground text-xs">+{a.anzahl - 1}</span>}
                            </span>
                          ) : (
                            <Badge ton="ok">{t('team.allesGueltig')}</Badge>
                          )}
                        </Zelle>
                      </Zeile>
                    )
                  })}
                </Fragment>
              )
            })}
          </TabelleKoerper>
        </Tabelle>
      )}
    </div>
  )
}
