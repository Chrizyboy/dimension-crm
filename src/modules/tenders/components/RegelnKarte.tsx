import { useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Switch } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { ladeRegeln, regelnSpeichern } from '../services/ausschreibungen'
import type { MonitorRegeln } from '../types'

const ROLLEN = ['bewilligen', 'bewilligen_vertretung', 'senden', 'senden_vertretung', 'innendienst'] as const
const ZAHLEN = ['fahrzeit_max', 'nachfassen_arbeitstage', 'beobachten_monate'] as const

/** Kürzel als Liste: «andreas, chris» → ['andreas', 'chris']. */
const liste = (s: string) =>
  s
    .split(/[,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)

/**
 * Regeln des Monitors für die Administration: wer bewilligt und sendet (Kürzel der Personen), wie weit
 * gefahren wird, wann nachgefasst wird. Vorlagen, Signatur und Stichworte bleiben in den Einstellungen.
 */
export function RegelnKarte() {
  const { t } = useTranslation()
  const regeln = useQuery({ queryKey: ['ausschreibungen', 'regeln'], queryFn: ladeRegeln })
  if (regeln.isPending) return <Skelett className="h-64" />
  if (!regeln.data) return null
  return (
    <RegelnFormular key={JSON.stringify(regeln.data)} regeln={regeln.data} titel={t('ausschreibungen.regeln.titel')} />
  )
}

function RegelnFormular({ regeln, titel }: { regeln: MonitorRegeln; titel: string }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [rollen, setRollen] = useState(
    () => Object.fromEntries(ROLLEN.map((r) => [r, regeln[r].join(', ')])) as Record<(typeof ROLLEN)[number], string>,
  )
  const [zahlen, setZahlen] = useState(
    () => Object.fromEntries(ZAHLEN.map((z) => [z, String(regeln[z])])) as Record<(typeof ZAHLEN)[number], string>,
  )
  const [briefe, setBriefe] = useState(regeln.privat_briefe)

  function speichern() {
    const aenderung: Partial<MonitorRegeln> = { privat_briefe: briefe }
    for (const r of ROLLEN) aenderung[r] = liste(rollen[r])
    for (const z of ZAHLEN) {
      const n = Number(zahlen[z])
      if (Number.isFinite(n) && n > 0) aenderung[z] = Math.round(n)
    }
    void aus(() => regelnSpeichern(aenderung), { de: 'Regeln gespeichert', fr: 'Règles enregistrées' })
  }

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{titel}</KarteTitel>
      </KarteKopf>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {ROLLEN.map((r) => (
          <Feld
            key={r}
            id={`as-r-${r}`}
            label={t(`ausschreibungen.regeln.${r}`)}
            hinweis={t('ausschreibungen.regeln.kuerzel')}
          >
            <Input
              id={`as-r-${r}`}
              value={rollen[r]}
              onChange={(e) => {
                setRollen({ ...rollen, [r]: e.target.value })
              }}
            />
          </Feld>
        ))}
        {ZAHLEN.map((z) => (
          <Feld key={z} id={`as-r-${z}`} label={t(`ausschreibungen.regeln.${z}`)}>
            <Input
              id={`as-r-${z}`}
              type="number"
              min={1}
              value={zahlen[z]}
              onChange={(e) => {
                setZahlen({ ...zahlen, [z]: e.target.value })
              }}
            />
          </Feld>
        ))}
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <Switch checked={briefe} onCheckedChange={setBriefe} />
          {t('ausschreibungen.regeln.privat_briefe')}
        </label>
      </div>
      <div className="flex justify-end border-t p-3">
        <Button onClick={speichern} laedt={laeuft}>
          <Save />
          {t('allgemein.speichern')}
        </Button>
      </div>
    </Karte>
  )
}
