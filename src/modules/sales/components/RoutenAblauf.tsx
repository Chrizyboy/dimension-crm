import { AlertTriangle, BatteryCharging, Car, Coffee, Copy, Flag, Home, Map as MapIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { melde } from '@/services/meldungen'
import { alsTabelle, type Ablauf, type Ort } from '../lib/ablauf'
import { dauer, hm, mapsLinks } from '../lib/route'

interface RoutenAblaufProps {
  ablauf: Ablauf
  start: Ort
  ziel: Ort | null
  datum: string
  /** Von Hand korrigierte Fahrzeit einer Strecke (Schlüssel «von>nach»), null = wieder schätzen. */
  onFahrzeit: (schluessel: string, minuten: number | null) => void
  onOeffnen?: (id: string) => void
}

function Strecke({ s, onFahrzeit }: { s: Ablauf['strecken'][number]; onFahrzeit: RoutenAblaufProps['onFahrzeit'] }) {
  const { t } = useTranslation()
  const korrigiert = s.min !== s.geschaetzt
  return (
    <li className="text-muted-foreground flex flex-wrap items-center gap-2 py-1 pl-8 text-xs">
      {s.laden && (
        <span className="text-info flex items-center gap-1">
          <BatteryCharging className="size-3.5" aria-hidden="true" />
          {t('verkauf.route.laden', { min: s.laden.min, von: s.laden.von, bis: s.laden.bis })}
        </span>
      )}
      <Car className="size-3.5" aria-hidden="true" />
      <label className="flex items-center gap-1">
        <span className="sr-only">{t('verkauf.route.fahrzeit')}</span>
        <Input
          type="number"
          min={0}
          className={cn('h-6 w-16 px-1.5 text-xs', korrigiert && 'border-accent')}
          value={s.min}
          onChange={(e) => {
            const v = e.target.value === '' ? null : Number(e.target.value)
            onFahrzeit(s.schluessel, v === s.geschaetzt ? null : v)
          }}
        />
        Min
      </label>
      <span className="zahlen font-mono">{Math.round(s.km)} km</span>
      {korrigiert && <span>({t('verkauf.route.geschaetzt', { min: s.geschaetzt })})</span>}
      {s.akkuDanach !== null && (
        <span className={cn(s.reichtNicht && 'text-bad font-medium')}>
          {t('verkauf.route.akku', { prozent: s.akkuDanach })}
        </span>
      )}
    </li>
  )
}

/**
 * Ablauf einer Route als Liste: Abfahrt, Fahrten (Minuten von Hand änderbar), Ladehalte, Besuche mit
 * Ankunft, Termin und Puffer, Warnungen (zu spät, Überschneidung, ausserhalb Erreichbarkeit, Mittag).
 * Darunter Google Maps und «Für Excel kopieren» wie in V233.
 */
export function RoutenAblauf({ ablauf, start, ziel, datum, onFahrzeit, onOeffnen }: RoutenAblaufProps) {
  const { t } = useTranslation()
  const links = mapsLinks([
    start.adresse,
    ...ablauf.zeilen.map((z) => z.stopp.adresse),
    ...(ziel ? [ziel.adresse] : []),
  ])

  async function kopieren() {
    await navigator.clipboard.writeText(alsTabelle(datum, start, ablauf, hm))
    melde('ok', { de: 'Für Excel kopiert', fr: 'Copié pour Excel' })
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col">
        <li className="flex items-center gap-2 py-1 text-sm">
          <Home className="text-muted-foreground size-4" aria-hidden="true" />
          <span className="zahlen w-12 font-mono font-medium">{hm(ablauf.abfahrt)}</span>
          <span>{t('verkauf.route.abfahrt', { ort: start.name })}</span>
        </li>
        {ablauf.zeilen.map((z, i) => {
          const s = ablauf.strecken[i]
          const warnung = z.puffer < 0 || z.zuSpaet || z.ueberschneidet || z.ausserhalbFenster
          return (
            <li key={z.stopp.id} className="flex flex-col">
              {s && (
                <ol>
                  <Strecke s={s} onFahrzeit={onFahrzeit} />
                </ol>
              )}
              <div
                className={cn(
                  'flex items-start gap-2 rounded-md py-1.5 text-sm',
                  warnung && 'bg-bad-soft/60 -mx-2 px-2',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white',
                    z.stopp.fix !== null ? 'bg-primary' : 'bg-accent',
                  )}
                >
                  {z.nr}
                </span>
                <span className="zahlen w-12 shrink-0 font-mono font-medium">{hm(z.geplant)}</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <button
                    type="button"
                    disabled={!onOeffnen || z.stopp.ausKalender}
                    onClick={() => onOeffnen?.(z.stopp.id)}
                    className="truncate text-left font-medium enabled:hover:underline"
                  >
                    {z.stopp.name}
                  </button>
                  <span className="text-muted-foreground line-clamp-2 text-xs">{z.stopp.adresse}</span>
                  <span className="text-muted-foreground text-xs">
                    {t('verkauf.route.ankunft', { zeit: hm(z.ankunft) })} · {dauer(z.besuchMin)}
                    {z.stopp.fix !== null ? ` · ${t('verkauf.route.fix')}` : ` · ${t('verkauf.route.vorschlag')}`}
                    {z.puffer >= 0 && z.stopp.fix !== null && ` · ${t('verkauf.route.puffer', { min: z.puffer })}`}
                  </span>
                  {z.puffer < 0 && <Warnung text={t('verkauf.route.zuSpaetUm', { min: -z.puffer })} />}
                  {z.zuSpaet && <Warnung text={t('verkauf.route.nachFeierabend')} />}
                  {z.ueberschneidet && (
                    <Warnung text={t('verkauf.route.ueberschneidet', { betreff: z.ueberschneidet.betreff })} />
                  )}
                  {z.ausserhalbFenster && <Warnung text={t('verkauf.route.erreichbarkeit')} />}
                  {z.mittag && (
                    <span className="text-info flex items-center gap-1 text-xs">
                      <Coffee className="size-3.5" aria-hidden="true" />
                      {t('verkauf.route.mittag')}
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
        {ziel && ablauf.ankunft !== null && (
          <>
            {/* Die Strecke ist selbst ein Listeneintrag: direkt in die Liste, nicht in eine eigene (Barrierefreiheit) */}
            {ablauf.strecken.at(-1) && (
              <Strecke s={ablauf.strecken.at(-1) as Ablauf['strecken'][number]} onFahrzeit={onFahrzeit} />
            )}
            <li className="flex items-center gap-2 py-1 text-sm">
              <Flag className="text-muted-foreground size-4" aria-hidden="true" />
              <span className="zahlen w-12 font-mono font-medium">{hm(ablauf.ankunft)}</span>
              <span>{t('verkauf.route.zurueck', { ort: ziel.name })}</span>
            </li>
          </>
        )}
      </ol>
      <p className="text-muted-foreground text-xs">
        {t('verkauf.route.total', {
          km: Math.round(ablauf.totalKm),
          fahrt: dauer(ablauf.totalMin),
          besuche: ablauf.zeilen.length,
        })}
        {ablauf.ladenMin > 0 && ` · ${t('verkauf.route.ladenTotal', { min: ablauf.ladenMin })}`}
        {' · '}
        {t('verkauf.route.schaetzung')}
      </p>
      <div className="flex flex-wrap gap-2">
        {links.map((l, i) => (
          <Button key={l} size="sm" variant="secondary" onClick={() => window.open(l, '_blank', 'noopener')}>
            <MapIcon />
            {links.length > 1 ? t('verkauf.route.mapsEtappe', { nr: i + 1 }) : t('verkauf.route.maps')}
          </Button>
        ))}
        {ablauf.zeilen.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => void kopieren()}>
            <Copy />
            {t('verkauf.route.excel')}
          </Button>
        )}
      </div>
    </div>
  )
}

function Warnung({ text }: { text: string }) {
  return (
    <span className="text-bad flex items-center gap-1 text-xs font-medium">
      <AlertTriangle className="size-3.5" aria-hidden="true" />
      {text}
    </span>
  )
}
