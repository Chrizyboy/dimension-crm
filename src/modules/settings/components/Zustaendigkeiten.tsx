import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { ladeRegionen, ladeZustaendigkeiten, speichereZustaendigkeiten } from '../services/zustaendigkeiten'
import type { Person, Standort, VerkaufRegel, Zustaendigkeiten as Werte } from '../types'

const ALLE = '_alle'
const PRODUKTE = ['pv', 'batterie', 'wallbox', 'waermepumpe'] as const

/**
 * Einstellungen › Zuständigkeiten: wer neue Leads bekommt (Regeln nach Sprache, Standort, Region, Produkt),
 * wer Offerten macht und wer bei Abwesenheit vertritt. Pro Lead und Offerte bleibt die Person änderbar.
 */
export function Zustaendigkeiten({ personen, standorte }: { personen: Person[]; standorte: Standort[] }) {
  const werte = useQuery({ queryKey: ['einstellungen', 'zustaendigkeiten'], queryFn: ladeZustaendigkeiten })
  const regionen = useQuery({ queryKey: ['regionen'], queryFn: ladeRegionen, staleTime: 10 * 60_000 })
  if (werte.error) return <Fehlerzustand details={String(werte.error)} onNochmal={() => void werte.refetch()} />
  if (!werte.data) return <Skelett className="h-64" />
  return (
    <Formular
      key={JSON.stringify(werte.data)}
      vorher={werte.data}
      personen={personen.filter((p) => p.aktiv)}
      standorte={standorte}
      regionen={regionen.data ?? []}
    />
  )
}

function Formular({
  vorher,
  personen,
  standorte,
  regionen,
}: {
  vorher: Werte
  personen: Person[]
  standorte: Standort[]
  regionen: { nummer: number; name: string }[]
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [w, setW] = useState<Werte>(vorher)
  const [speichert, setSpeichert] = useState(false)
  const geaendert = JSON.stringify(w) !== JSON.stringify(vorher)
  const personWahl = [{ wert: ALLE, text: '–' }, ...personen.map((p) => ({ wert: p.kuerzel, text: p.name }))]
  const alle = { wert: ALLE, text: t('zust.alle') }
  const regel = (i: number, neu: Partial<VerkaufRegel>) => {
    setW({ ...w, verkauf: w.verkauf.map((r, j) => (j === i ? { ...r, ...neu } : r)) })
  }
  const wert = (v: string) => (v === ALLE ? null : v)
  // Wer vertreten werden kann: alle, die in einer Regel oder bei den Offerten stehen.
  const vertretene = [...new Set([...w.verkauf.map((r) => r.person), w.offerten].filter((k): k is string => !!k))]

  async function sichern() {
    setSpeichert(true)
    try {
      await speichereZustaendigkeiten(w)
      melde('ok', { de: 'Zuständigkeiten gespeichert', fr: 'Responsabilités enregistrées' })
      void qc.invalidateQueries({ queryKey: ['einstellungen', 'zustaendigkeiten'] })
    } catch (f) {
      meldeFehler(f, 'zustaendigkeiten')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel className="flex items-center gap-2">
          <UserCheck className="text-muted-foreground size-4" aria-hidden="true" />
          {t('zust.titel')}
        </KarteTitel>
        <Button size="sm" disabled={!geaendert} laedt={speichert} onClick={() => void sichern()}>
          {t('allgemein.speichern')}
        </Button>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-5 text-sm">
        <p className="text-muted-foreground">{t('zust.zweck')}</p>

        <section className="flex flex-col gap-2">
          <h3 className="font-medium">{t('zust.verkauf')}</h3>
          <p className="text-muted-foreground text-xs">{t('zust.verkaufHinweis')}</p>
          <div
            className="text-muted-foreground hidden gap-2 text-xs font-medium sm:grid sm:grid-cols-[repeat(4,1fr)_1.3fr_2rem]"
            aria-hidden="true"
          >
            <span>{t('zust.sprache')}</span>
            <span>{t('zust.standort')}</span>
            <span>{t('zust.region')}</span>
            <span>{t('zust.produkt')}</span>
            <span>{t('zust.person')}</span>
          </div>
          {w.verkauf.map((r, i) => (
            <div key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[repeat(4,1fr)_1.3fr_2rem]">
              <Auswahl
                aria-label={t('zust.sprache')}
                value={r.sprache ?? ALLE}
                onValueChange={(v) => {
                  regel(i, { sprache: wert(v) as 'de' | 'fr' | null })
                }}
                optionen={[alle, { wert: 'de', text: 'Deutsch' }, { wert: 'fr', text: 'Français' }]}
              />
              <Auswahl
                aria-label={t('zust.standort')}
                value={r.standort ?? ALLE}
                onValueChange={(v) => {
                  regel(i, { standort: wert(v) })
                }}
                optionen={[alle, ...standorte.map((s) => ({ wert: s.kuerzel, text: s.name }))]}
              />
              <Auswahl
                aria-label={t('zust.region')}
                value={r.region != null ? String(r.region) : ALLE}
                onValueChange={(v) => {
                  regel(i, { region: v === ALLE ? null : Number(v) })
                }}
                optionen={[alle, ...regionen.map((g) => ({ wert: String(g.nummer), text: `${g.nummer} ${g.name}` }))]}
              />
              <Auswahl
                aria-label={t('zust.produkt')}
                value={r.produkt ?? ALLE}
                onValueChange={(v) => {
                  regel(i, { produkt: wert(v) })
                }}
                optionen={[alle, ...PRODUKTE.map((p) => ({ wert: p, text: t(`zust.produkte.${p}`) }))]}
              />
              <Auswahl
                aria-label={t('zust.person')}
                value={r.person || ALLE}
                onValueChange={(v) => {
                  regel(i, { person: wert(v) ?? '' })
                }}
                optionen={personWahl}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('zust.regelWeg')}
                onClick={() => {
                  setW({ ...w, verkauf: w.verkauf.filter((_, j) => j !== i) })
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => {
              setW({ ...w, verkauf: [...w.verkauf, { person: '' }] })
            }}
          >
            <Plus />
            {t('zust.regelNeu')}
          </Button>
        </section>

        <section className="grid gap-2 sm:grid-cols-2">
          <h3 className="font-medium sm:col-span-2">{t('zust.offerten')}</h3>
          <Auswahl
            aria-label={t('zust.offerten')}
            value={w.offerten ?? ALLE}
            onValueChange={(v) => {
              setW({ ...w, offerten: wert(v) })
            }}
            optionen={personWahl}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-medium">{t('zust.stellvertretung')}</h3>
          <p className="text-muted-foreground text-xs">{t('zust.stellvertretungHinweis')}</p>
          {vertretene.map((k) => (
            <div key={k} className="grid grid-cols-2 items-center gap-2">
              <span>{personen.find((p) => p.kuerzel === k)?.name ?? k}</span>
              <Auswahl
                aria-label={t('zust.vertretungFuer', { name: personen.find((p) => p.kuerzel === k)?.name ?? k })}
                value={w.stellvertretung[k] ?? ALLE}
                onValueChange={(v) => {
                  setW({ ...w, stellvertretung: { ...w.stellvertretung, [k]: wert(v) ?? '' } })
                }}
                optionen={personWahl.filter((o) => o.wert !== k)}
              />
            </div>
          ))}
        </section>
      </KarteInhalt>
    </Karte>
  )
}
