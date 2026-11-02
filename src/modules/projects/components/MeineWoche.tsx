import { CalendarCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useEinsaetze, useFaelligeSchritte, useLieferfrist, useProjekte, useSignale } from '../hooks/useProjekte'
import { heuteIso, hinweise, nochOffen, tageBis, woche } from '../lib/leitstand'
import type { Projekt } from '../types'
import { Box, Zeile } from './AkteBox'

type Gruppe = 'ueberfaellig' | 'woche' | 'naechste'

interface Punkt {
  id: string
  projekt: Projekt
  text: string
  zusatz: string
  gruppe: Gruppe
  ton: 'kritisch' | 'warnung' | 'neutral'
}

const STATUS = ['auftrag', 'im_bau', 'abgeschlossen'] as const

/**
 * «Meine Woche» für die Projektleitung: alles, was diese und nächste Woche anzustossen ist, quer über die eigenen
 * Projekte. Fahrplan-Schritte mit Frist, dazu was blockiert (Material, Zahlung) und was zu tun ist (Bautermin,
 * Rechnung stellen). Rechts die Einsätze der Woche. Klick öffnet die Akte.
 */
export function MeineWoche({ onOeffnen }: { onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich?.id ?? null)
  const heute = heuteIso()
  const w = woche(heute)
  const naechste = woche(new Date(Date.parse(`${w.bis}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10))
  const projekte = useProjekte([...STATUS])
  const signale = useSignale()
  const lieferfrist = useLieferfrist().data
  const schritte = useFaelligeSchritte(naechste.bis)
  const einsaetze = useEinsaetze(w.von, w.bis)
  const hatEigene = (projekte.data ?? []).some((p) => p.verantwortlich_id === ich && p.status !== 'abgeschlossen')
  const [wer, setWer] = useState<'meine' | 'alle' | null>(null)
  const umfang = wer ?? (hatEigene ? 'meine' : 'alle')

  const meine = useMemo(() => {
    const alle = (projekte.data ?? []).filter((p) => nochOffen(p, heute))
    return new Map((umfang === 'meine' ? alle.filter((p) => p.verantwortlich_id === ich) : alle).map((p) => [p.id, p]))
  }, [projekte.data, umfang, ich, heute])

  const punkte = useMemo(() => {
    const liste: Punkt[] = []
    const gruppe = (frist: string): Gruppe => (frist < heute ? 'ueberfaellig' : frist <= w.bis ? 'woche' : 'naechste')
    for (const s of schritte.data ?? []) {
      const p = meine.get(s.projekt_id)
      if (!p || !s.frist) continue
      liste.push({
        id: `${s.projekt_id}:${s.schluessel}`,
        projekt: p,
        text: sprache === 'fr' ? s.name_fr : s.name_de,
        zusatz:
          s.frist < heute
            ? t('projekte.woche.seit', { tage: tageBis(s.frist, heute) })
            : t('projekte.fahrplan.bis', { datum: formatDatum(s.frist) }),
        gruppe: gruppe(s.frist),
        ton: s.frist < heute ? 'kritisch' : s.frist <= w.bis ? 'warnung' : 'neutral',
      })
    }
    for (const p of meine.values()) {
      for (const h of hinweise(p, signale.data?.get(p.id), heute, lieferfrist)) {
        if (
          !['material_fehlt', 'material_bestellen', 'zahlung_ueberfaellig', 'ohne_termin', 'verrechnen'].includes(
            h.schluessel,
          )
        )
          continue
        if (h.schluessel === 'ohne_termin' && p.status !== 'auftrag') continue
        liste.push({
          id: `${p.id}:${h.schluessel}`,
          projekt: p,
          text: t(`projekte.woche.aufgabe.${h.schluessel}`),
          zusatz: t(`projekte.hinweis.${h.schluessel}`, h.werte ?? {}),
          gruppe: h.ton === 'kritisch' ? 'ueberfaellig' : 'woche',
          ton: h.ton === 'kritisch' ? 'kritisch' : 'warnung',
        })
      }
    }
    return liste
  }, [schritte.data, signale.data, meine, sprache, t, heute, w.bis, lieferfrist])

  if (projekte.error || schritte.error)
    return (
      <Fehlerzustand
        details={String(projekte.error ?? schritte.error)}
        onNochmal={() => void Promise.all([projekte.refetch(), schritte.refetch()])}
      />
    )
  if (projekte.isPending || schritte.isPending) return <Skelett className="h-96" />

  const baustellen = (einsaetze.data ?? []).filter((e) => meine.has(e.projekt_id))

  return (
    <div className="flex flex-col gap-4">
      <Filterchips
        beschriftung={t('projekte.woche.wer')}
        einzeln
        optionen={(['meine', 'alle'] as const).map((x) => ({ wert: x, text: t(`projekte.woche.${x}`) }))}
        gewaehlt={[umfang]}
        onChange={(v) => {
          setWer(v[0] === 'alle' ? 'alle' : 'meine')
        }}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {punkte.length === 0 ? (
            <Leerzustand icon={CalendarCheck} titel={t('projekte.woche.leer')} text={t('projekte.woche.leerText')} />
          ) : (
            (['ueberfaellig', 'woche', 'naechste'] as const).map((g) => {
              const teil = punkte.filter((x) => x.gruppe === g)
              if (teil.length === 0) return null
              return (
                <Box
                  key={g}
                  titel={t(`projekte.woche.gruppe.${g}`)}
                  rechts={<span className="zahlen">{teil.length}</span>}
                >
                  <ul className="flex flex-col divide-y">
                    {teil.map((x) => (
                      <li key={x.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onOeffnen(x.projekt.id)
                          }}
                          className="hover:bg-muted focus-visible:ring-ring flex w-full items-start justify-between gap-3 rounded-md px-1 py-2 text-left outline-none focus-visible:ring-2"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="font-medium">
                              <span className="text-muted-foreground zahlen font-mono text-xs">{x.projekt.nummer}</span>{' '}
                              {x.projekt.kunde} · {x.text}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {[x.projekt.ort, x.projekt.verantwortlich].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          <Badge ton={x.ton} className="shrink-0">
                            {x.zusatz}
                          </Badge>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Box>
              )
            })
          )}
        </div>
        <Box titel={t('projekte.woche.baustellen')}>
          {baustellen.length === 0 ? (
            <p className="text-muted-foreground">{t('projekte.woche.keineBaustellen')}</p>
          ) : (
            baustellen.map((e) => {
              const p = meine.get(e.projekt_id)
              return (
                <Zeile
                  key={e.id}
                  links={
                    <>
                      <b>{formatDatum(e.von)}</b>
                      {e.bis !== e.von ? `–${formatDatum(e.bis)}` : ''} {p?.kunde}, {p?.ort ?? ''}
                    </>
                  }
                  rechts={<Badge>{t(`projekte.einsatz.${e.art}`)}</Badge>}
                />
              )
            })
          )}
        </Box>
      </div>
    </div>
  )
}
