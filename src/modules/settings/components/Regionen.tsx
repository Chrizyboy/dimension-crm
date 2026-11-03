import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { regelnLesen, regelnText } from '../lib/regionen'
import {
  ladeRegionenVoll,
  ladeStandorteVoll,
  regionFuerPlz,
  speichereRegion,
  speichereStandort,
  type Region,
  type StandortVoll,
} from '../services/stammdaten'
import type { Json } from '@/types/datenbank'

const SCHLUESSEL = ['einstellungen', 'regionen'] as const

/**
 * Einstellungen › Standorte & Regionen: Adressen von Muri und Bulle, Regionen (Touren) mit Standort und
 * PLZ-Regeln. Eine neue Adresse ohne Region bekommt sie aus der PLZ (Datenbank, `region_fuer_plz`).
 */
export default function Regionen() {
  const { t } = useTranslation()
  const regionen = useQuery({ queryKey: [...SCHLUESSEL, 'liste'], queryFn: ladeRegionenVoll })
  const standorte = useQuery({ queryKey: [...SCHLUESSEL, 'standorte'], queryFn: ladeStandorteVoll })
  const fehler = regionen.error ?? standorte.error
  if (fehler) return <Fehlerzustand details={String(fehler)} onNochmal={() => void regionen.refetch()} />
  if (!regionen.data || !standorte.data) return <Skelett className="h-96" />
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {standorte.data.map((s) => (
          <StandortKarte key={`${s.id}-${JSON.stringify(s)}`} standort={s} />
        ))}
      </div>
      <RegionenKarte key={JSON.stringify(regionen.data)} regionen={regionen.data} standorte={standorte.data} />
      <PlzTest regionen={regionen.data} />
      <p className="text-muted-foreground text-xs">{t('regionen.hinweis')}</p>
    </div>
  )
}

function StandortKarte({ standort }: { standort: StandortVoll }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [w, setW] = useState({
    name: standort.name,
    strasse: standort.strasse ?? '',
    plz: standort.plz ?? '',
    ort: standort.ort ?? '',
  })
  const geaendert =
    w.name !== standort.name ||
    w.strasse !== (standort.strasse ?? '') ||
    w.plz !== (standort.plz ?? '') ||
    w.ort !== (standort.ort ?? '')
  async function sichern() {
    try {
      await speichereStandort(standort.id, {
        name: w.name.trim(),
        strasse: w.strasse.trim() || null,
        plz: w.plz.trim() || null,
        ort: w.ort.trim() || null,
      })
      await qc.invalidateQueries({ queryKey: SCHLUESSEL })
      melde('ok', { de: 'Standort gespeichert', fr: 'Site enregistré' })
    } catch (f) {
      meldeFehler(f, 'standort-speichern')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }
  const feld = (name: keyof typeof w, label: string) => (
    <Feld id={`standort-${standort.kuerzel}-${name}`} label={label}>
      <Input
        id={`standort-${standort.kuerzel}-${name}`}
        value={w[name]}
        onChange={(e) => {
          setW({ ...w, [name]: e.target.value })
        }}
      />
    </Feld>
  )
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('regionen.standort', { name: standort.name })}</KarteTitel>
        <Button size="sm" disabled={!geaendert || !w.name.trim()} onClick={() => void sichern()}>
          {t('allgemein.speichern')}
        </Button>
      </KarteKopf>
      <KarteInhalt className="grid gap-3 sm:grid-cols-2">
        {feld('name', t('regionen.name'))}
        {feld('strasse', t('regionen.strasse'))}
        {feld('plz', t('regionen.plz'))}
        {feld('ort', t('regionen.ort'))}
      </KarteInhalt>
    </Karte>
  )
}

interface Entwurf {
  id?: string
  nummer: string
  name: string
  standort_id: string
  regeln: string
}

function RegionenKarte({ regionen, standorte }: { regionen: Region[]; standorte: StandortVoll[] }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const start: Entwurf[] = regionen.map((r) => ({
    id: r.id,
    nummer: String(r.nummer),
    name: r.name,
    standort_id: r.standort_id ?? '',
    regeln: regelnText(r.plz_regeln),
  }))
  const [zeilen, setZeilen] = useState<Entwurf[]>(start)
  const [speichert, setSpeichert] = useState(false)
  const fehlerhaft = zeilen.filter((z) => regelnLesen(z.regeln) === null || !z.name.trim() || !/^\d+$/.test(z.nummer))
  const geaendert = zeilen.filter((z) => JSON.stringify(z) !== JSON.stringify(start.find((s) => s.id === z.id)))
  const setze = (i: number, x: Partial<Entwurf>) => {
    setZeilen((l) => l.map((z, j) => (j === i ? { ...z, ...x } : z)))
  }

  async function sichern() {
    setSpeichert(true)
    try {
      for (const z of geaendert) {
        await speichereRegion({
          ...(z.id ? { id: z.id } : {}),
          nummer: Number(z.nummer),
          name: z.name.trim(),
          standort_id: z.standort_id || null,
          plz_regeln: (regelnLesen(z.regeln) ?? []) as unknown as NonNullable<Json>,
        })
      }
      await qc.invalidateQueries({ queryKey: SCHLUESSEL })
      await qc.invalidateQueries({ queryKey: ['regionen'] })
      melde('ok', { de: 'Regionen gespeichert', fr: 'Régions enregistrées' })
    } catch (f) {
      meldeFehler(f, 'regionen-speichern')
      melde('kritisch', { de: 'Nicht gespeichert (Nummer doppelt?)', fr: 'Non enregistré (numéro en double ?)' })
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <Karte className="overflow-hidden">
      <KarteKopf>
        <KarteTitel>{t('regionen.titel', { count: zeilen.length })}</KarteTitel>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const max = Math.max(0, ...zeilen.map((z) => Number(z.nummer) || 0))
              setZeilen([...zeilen, { nummer: String(max + 1), name: '', standort_id: '', regeln: '' }])
            }}
          >
            <Plus />
            {t('regionen.neu')}
          </Button>
          <Button
            size="sm"
            laedt={speichert}
            disabled={geaendert.length === 0 || fehlerhaft.length > 0}
            onClick={() => void sichern()}
          >
            {t('allgemein.speichern')}
          </Button>
        </div>
      </KarteKopf>
      <div className="overflow-x-auto">
        <Tabelle>
          <TabelleKopf>
            <tr>
              <Kopfzelle className="w-20">{t('regionen.nummer')}</Kopfzelle>
              <Kopfzelle>{t('regionen.name')}</Kopfzelle>
              <Kopfzelle className="w-40">{t('regionen.standortSpalte')}</Kopfzelle>
              <Kopfzelle>{t('regionen.regeln')}</Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {zeilen.map((z, i) => {
              const ungueltig = regelnLesen(z.regeln) === null
              return (
                <Zeile key={z.id ?? `neu-${i}`}>
                  <Zelle>
                    <Input
                      aria-label={t('regionen.nummer')}
                      inputMode="numeric"
                      value={z.nummer}
                      onChange={(e) => {
                        setze(i, { nummer: e.target.value })
                      }}
                    />
                  </Zelle>
                  <Zelle>
                    <Input
                      aria-label={t('regionen.name')}
                      value={z.name}
                      onChange={(e) => {
                        setze(i, { name: e.target.value })
                      }}
                    />
                  </Zelle>
                  <Zelle>
                    <Auswahl
                      id={`region-standort-${i}`}
                      aria-label={t('regionen.standortSpalte')}
                      value={z.standort_id}
                      platzhalter="–"
                      onValueChange={(v) => {
                        setze(i, { standort_id: v })
                      }}
                      optionen={standorte.map((s) => ({ wert: s.id, text: s.name }))}
                    />
                  </Zelle>
                  <Zelle>
                    <Input
                      aria-label={t('regionen.regeln')}
                      aria-invalid={ungueltig || undefined}
                      placeholder="5600-5649, ZG"
                      value={z.regeln}
                      onChange={(e) => {
                        setze(i, { regeln: e.target.value })
                      }}
                    />
                    {ungueltig && <span className="text-bad text-xs">{t('regionen.regelnFehler')}</span>}
                  </Zelle>
                </Zeile>
              )
            })}
          </TabelleKoerper>
        </Tabelle>
      </div>
    </Karte>
  )
}

/** Probe: welche Region bekäme eine PLZ? Fragt die Datenbank, damit App und Ablauf gleich rechnen. */
function PlzTest({ regionen }: { regionen: Region[] }) {
  const { t } = useTranslation()
  const [plz, setPlz] = useState('')
  const [ergebnis, setErgebnis] = useState<string | null | undefined>(undefined)
  async function pruefen() {
    try {
      setErgebnis(await regionFuerPlz(plz))
    } catch (f) {
      meldeFehler(f, 'region-pruefen')
    }
  }
  const region = regionen.find((r) => r.id === ergebnis)
  return (
    <Karte>
      <KarteInhalt className="flex flex-wrap items-end gap-3 pt-4">
        <Feld id="region-plz-test" label={t('regionen.test')}>
          <Input
            id="region-plz-test"
            inputMode="numeric"
            className="w-28"
            value={plz}
            onChange={(e) => {
              setPlz(e.target.value)
              setErgebnis(undefined)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void pruefen()
            }}
          />
        </Feld>
        <Button variant="secondary" disabled={!/^\d{4}$/.test(plz.trim())} onClick={() => void pruefen()}>
          <Search />
          {t('regionen.pruefen')}
        </Button>
        {ergebnis !== undefined &&
          (region ? (
            <Badge ton="ok">{`${region.nummer} · ${region.name}`}</Badge>
          ) : (
            <Badge ton="warnung">{t('regionen.keineRegion')}</Badge>
          ))}
      </KarteInhalt>
    </Karte>
  )
}
