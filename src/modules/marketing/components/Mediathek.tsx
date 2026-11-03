import { useQuery } from '@tanstack/react-query'
import { Image, Star } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { useFotos } from '../hooks/useKampagnen'
import { fotoAdressen, fotoErlaubnis, fotoTitel } from '../services/mediathek'
import type { MediathekFoto } from '../types'
import { Werbemittel } from './Werbemittel'

/**
 * Mediathek: Fotos aus den Rapporten (nur Ort und Anlage, nie der Name), sortiert nach «darf für Werbung» und
 * Titelbild, dazu die Werbemittel mit Lagerbestand. Die Erlaubnis kommt vom Kunden am Rapport; wer sie hier
 * nachträgt oder entzieht, gibt einen Grund an, der im Verlauf des Kunden steht.
 */
export function Mediathek() {
  const { t } = useTranslation()
  const fotos = useFotos()
  const [filter, setFilter] = useState<string[]>(['erlaubt'])
  const liste = (fotos.data ?? []).filter(
    (f) =>
      (!filter.includes('erlaubt') || f.erlaubt) &&
      (!filter.includes('titel') || f.titel) &&
      (!filter.includes('batterie') || f.batterie),
  )
  const sichtbar = liste.slice(0, 60)
  const adressen = useQuery({
    queryKey: ['marketing', 'foto-adressen', sichtbar.map((f) => f.id)],
    queryFn: () => fotoAdressen(sichtbar),
    enabled: sichtbar.length > 0,
    staleTime: 8 * 60_000,
  })

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold">{t('werbung.mediathek.fotos')}</h2>
          <Filterchips
            beschriftung={t('werbung.mediathek.filter')}
            optionen={(['erlaubt', 'titel', 'batterie'] as const).map((w) => ({
              wert: w,
              text: t(`werbung.mediathek.nur.${w}`),
            }))}
            gewaehlt={filter}
            onChange={setFilter}
          />
        </div>
        {fotos.error ? (
          <Fehlerzustand details={String(fotos.error)} onNochmal={() => void fotos.refetch()} />
        ) : !fotos.data ? (
          <Skelett className="h-64" />
        ) : liste.length === 0 ? (
          <Leerzustand icon={Image} titel={t('werbung.mediathek.leer')} text={t('werbung.mediathek.leerText')} />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {sichtbar.map((f) => (
              <FotoKachel key={f.id} f={f} url={adressen.data?.[f.id]} />
            ))}
          </ul>
        )}
      </section>
      <Werbemittel />
    </div>
  )
}

function FotoKachel({ f, url }: { f: MediathekFoto; url: string | undefined }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [grund, setGrund] = useState<string | null>(null)
  async function erlaubnis() {
    if (!grund?.trim()) return
    await aus(() => fotoErlaubnis(f.rapport_id, !f.erlaubt, grund.trim()), { de: 'Gespeichert', fr: 'Enregistré' })
    setGrund(null)
  }
  return (
    <li className="bg-surface flex flex-col overflow-hidden rounded-lg border">
      <div className="bg-muted relative aspect-[4/3]">
        {url ? (
          <img
            src={url}
            alt={t('werbung.mediathek.alt', { ort: f.ort ?? '' })}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <Image className="text-muted-foreground absolute inset-0 m-auto size-8" aria-hidden="true" />
        )}
        <span className="absolute top-1.5 left-1.5 flex gap-1">
          <Badge ton={f.erlaubt ? 'ok' : 'warnung'}>
            {t(f.erlaubt ? 'werbung.mediathek.erlaubt' : 'werbung.mediathek.nichtErlaubt')}
          </Badge>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2 text-xs">
        <span className="font-medium">
          {f.ort ?? '–'}
          {f.leistung_kwp ? ` · ${String(f.leistung_kwp)} kWp` : ''}
          {f.batterie ? ` · ${t('werbung.mediathek.batterie')}` : ''}
        </span>
        <span className="text-muted-foreground zahlen">
          {f.projekt_nummer ?? ''} {f.datum ? formatDatum(f.datum) : ''}
        </span>
        <span className="mt-auto flex gap-1 pt-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={laeuft || !f.erlaubt}
            aria-pressed={f.titel}
            aria-label={t('werbung.mediathek.titelbild')}
            title={t('werbung.mediathek.titelbild')}
            onClick={() => void aus(() => fotoTitel(f.id, !f.titel))}
          >
            <Star className={cn(f.titel && 'text-warn fill-current')} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={laeuft}
            onClick={() => {
              setGrund(grund === null ? '' : null)
            }}
          >
            {t(f.erlaubt ? 'werbung.mediathek.entziehen' : 'werbung.mediathek.erlauben')}
          </Button>
        </span>
        {grund !== null && (
          <span className="flex gap-1 pt-1">
            <Input
              autoFocus
              aria-label={t(f.erlaubt ? 'werbung.mediathek.grundEntziehen' : 'werbung.mediathek.grundErlauben')}
              placeholder={t(f.erlaubt ? 'werbung.mediathek.grundEntziehen' : 'werbung.mediathek.grundErlauben')}
              value={grund}
              onChange={(e) => {
                setGrund(e.target.value)
              }}
            />
            <Button size="sm" disabled={!grund.trim()} laedt={laeuft} onClick={() => void erlaubnis()}>
              {t('werbung.ok')}
            </Button>
          </span>
        )}
      </div>
    </li>
  )
}
