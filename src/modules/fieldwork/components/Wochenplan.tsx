import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useWochenplan } from '../hooks/useBaustelle'
import {
  auslastung,
  isoTag,
  konflikteGesamt,
  tageZwischen,
  wochenAnfang,
  wochenTage,
  type PlanEintrag,
} from '../lib/wochenplan'
import { einsatzVerschieben, serviceTerminVerschieben } from '../services/baustelle'
import { PlanZelle } from './PlanZelle'

/** Was gerade gezogen wird: der Eintrag und die Zeile/der Tag, aus denen er kommt. */
export interface Gezogen {
  eintrag: PlanEintrag
  person: string | null
  tag: string
}

/**
 * Wochenplan je Person (Modul-Prüfung 23A): Zeilen Personen und Subunternehmer, Spalten Montag bis Samstag, mit
 * Montage, Service und Wartung in drei Farben. Abwesenheiten grau, Konflikte rot (abwesend, doppelt, Kurs
 * abgelaufen). Ziehen auf einen anderen Tag oder eine andere Person verschiebt den Einsatz bzw. Termin.
 */
export function Wochenplan() {
  const { t } = useTranslation()
  const [montag, setMontag] = useState(() => wochenAnfang(new Date()))
  const tage = useMemo(() => wochenTage(montag), [montag])
  const von = tage[0] ?? isoTag(montag)
  const bis = tage[tage.length - 1] ?? von
  const plan = useWochenplan(von, bis)
  const { aus } = useAktion()
  const [gezogen, setGezogen] = useState<Gezogen | null>(null)

  function woche(schritt: number) {
    const d = new Date(montag)
    d.setDate(d.getDate() + 7 * schritt)
    setMontag(d)
  }

  function ablegen(person: string | null, tag: string) {
    const g = gezogen
    setGezogen(null)
    if (!g || (g.tag === tag && g.person === person)) return
    const fertig = { de: 'Verschoben', fr: 'Déplacé' }
    if (g.eintrag.typ === 'montage')
      void aus(() => einsatzVerschieben(g.eintrag.id, tageZwischen(g.tag, tag), g.person, person), fertig)
    else void aus(() => serviceTerminVerschieben(g.eintrag.id, tag, person), fertig)
  }

  const p = plan.data
  const kopf = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-label={t('baustelle.woche.zurueck')}
        onClick={() => {
          woche(-1)
        }}
      >
        <ChevronLeft />
      </Button>
      <span className="zahlen text-sm font-medium">
        {formatDatum(von)} – {formatDatum(bis)}
      </span>
      <Button
        variant="ghost"
        size="sm"
        aria-label={t('baustelle.woche.weiter')}
        onClick={() => {
          woche(1)
        }}
      >
        <ChevronRight />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setMontag(wochenAnfang(new Date()))
        }}
      >
        {t('baustelle.woche.heute')}
      </Button>
      {p && (
        <span className="ml-auto flex flex-wrap gap-1.5">
          <Badge ton={konflikteGesamt(p, tage) ? 'kritisch' : 'ok'}>
            {t('baustelle.woche.konflikte', { count: konflikteGesamt(p, tage) })}
          </Badge>
          <Badge>{t('baustelle.woche.auslastung', { prozent: auslastung(p, tage) })}</Badge>
          <Badge ton="marke">{t('baustelle.woche.typ.montage')}</Badge>
          <Badge ton="info">{t('baustelle.woche.typ.service')}</Badge>
          <Badge ton="ok">{t('baustelle.woche.typ.wartung')}</Badge>
        </span>
      )}
    </div>
  )

  if (plan.error) return <Fehlerzustand details={String(plan.error)} onNochmal={() => void plan.refetch()} />
  if (!p)
    return (
      <div className="flex flex-col gap-3">
        {kopf}
        <Skelett className="h-96" />
      </div>
    )

  const zeilen = [
    ...p.personen.map((x) => ({ key: x.id, name: x.name, person: x.id, sub: undefined })),
    ...p.subunternehmer.map((x) => ({ key: `s:${x.id}`, name: x.name, person: null, sub: x.id })),
  ]
  return (
    <div className="flex flex-col gap-3">
      {kopf}
      {zeilen.length === 0 ? (
        <Leerzustand icon={CalendarRange} titel={t('baustelle.woche.leer')} />
      ) : (
        // Mit Tastatur scrollbar (WCAG: scrollbarer Bereich braucht Fokus), darum Region mit Namen.
        <section
          aria-label={t('baustelle.woche.titel')}
          tabIndex={0}
          className="bg-surface focus-visible:ring-ring overflow-x-auto rounded-xl border outline-none focus-visible:ring-2"
        >
          <table className="w-full min-w-[56rem] table-fixed border-collapse text-sm">
            <caption className="sr-only">{t('baustelle.woche.titel')}</caption>
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th scope="col" className="w-40 px-3 py-2 font-medium">
                  {t('baustelle.woche.person')}
                </th>
                {tage.map((tag) => (
                  <th key={tag} scope="col" className="px-2 py-2 font-medium">
                    {t(`baustelle.woche.tag.${String(new Date(`${tag}T12:00:00`).getDay())}`)}{' '}
                    <span className="zahlen">{formatDatum(tag).slice(0, 6)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.key} className="border-t align-top">
                  <th scope="row" className="px-3 py-2 text-left text-sm font-medium">
                    {z.name}
                    {z.sub && <span className="text-muted-foreground block text-xs">{t('baustelle.woche.sub')}</span>}
                  </th>
                  {tage.map((tag) => (
                    <PlanZelle
                      key={tag}
                      plan={p}
                      person={z.person}
                      sub={z.sub}
                      tag={tag}
                      gezogen={gezogen}
                      onZiehen={setGezogen}
                      onAblegen={ablegen}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="text-muted-foreground text-xs">{t('baustelle.woche.hilfe')}</p>
    </div>
  )
}
