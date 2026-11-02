import { AlarmClock, CalendarClock, Inbox, Phone, PhoneCall, Wallet } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Switch } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAnmeldung } from '@/stores/anmeldung'
import { useJetzt } from '../hooks/useJetzt'
import { useVerkaufEinstellung } from '../hooks/useVerkauf'
import { VERKAUF_STANDARD } from '../lib/einstellung'
import { gehoertZu, zuTun, type ZuTunEintrag } from '../lib/zutun'
import type { Geschaeft } from '../types'

const KontaktErfassenDialog = lazy(() => import('./KontaktErfassenDialog'))

function Kennzahl({ icon: Icon, wert, text, ton }: { icon: typeof Phone; wert: string; text: string; ton?: string }) {
  return (
    <Karte className="flex items-center gap-3 p-3">
      <Icon className={cn('size-5 shrink-0', ton ?? 'text-muted-foreground')} aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <span className={cn('zahlen font-mono text-xl font-semibold', ton)}>{wert}</span>
        <span className="text-muted-foreground text-xs">{text}</span>
      </div>
    </Karte>
  )
}

/** Eine Zeile: wer, was, wann; rechts Anrufen und Ergebnis erfassen. Klick auf den Namen öffnet die Akte. */
function Zeile({
  e,
  onOeffnen,
  onErgebnis,
}: {
  e: ZuTunEintrag
  onOeffnen: (id: string) => void
  onErgebnis: (g: Geschaeft) => void
}) {
  const { t } = useTranslation()
  const interessen = useAuswahl('interesse')
  const { g } = e
  const wann =
    e.art === 'anrufen'
      ? t('verkauf.zutun.minuten', { count: e.minuten ?? 0 })
      : e.wann
        ? e.art === 'termin'
          ? `${formatDatum(e.wann)} ${new Date(e.wann).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
          : formatDatum(e.wann)
        : ''
  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-3 py-2.5 last:border-b-0',
        e.ton === 'kritisch' && 'bg-bad-soft/40',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <button
          type="button"
          onClick={() => {
            onOeffnen(g.id)
          }}
          className="focus-visible:ring-ring self-start rounded text-left text-sm font-medium outline-none hover:underline focus-visible:ring-2"
        >
          {g.name}
        </button>
        <span className="text-muted-foreground text-xs">
          {[
            [g.plz, g.ort].filter(Boolean).join(' '),
            g.interesse.map((i) => interessen.text(i)).join(', '),
            g.herkunft.formular ? t('verkauf.zutun.website') : g.quelle,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <Badge ton={e.ton === 'kritisch' ? 'kritisch' : e.ton === 'warnung' ? 'warnung' : 'neutral'}>
        {e.art === 'anrufen' && <AlarmClock />}
        {t(`verkauf.zutun.art.${e.art}`)} {wann}
      </Badge>
      <div className="flex gap-1.5">
        {g.telefon && (
          <a
            href={`tel:${g.telefon.replace(/[^\d+]/g, '')}`}
            className={buttonVariants({ size: 'sm', variant: 'secondary' })}
          >
            <Phone />
            {t('verkauf.zutun.anrufen')}
          </a>
        )}
        {g.verkaufschanceId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onErgebnis(g)
            }}
          >
            {t('verkauf.zutun.ergebnis')}
          </Button>
        )}
      </div>
    </li>
  )
}

function Abschnitt({
  titel,
  eintraege,
  leer,
  ...rest
}: {
  titel: string
  eintraege: ZuTunEintrag[]
  leer: string
  onOeffnen: (id: string) => void
  onErgebnis: (g: Geschaeft) => void
}) {
  return (
    <Karte className="min-w-0">
      <KarteKopf className="min-h-10 py-1.5">
        <KarteTitel>{titel}</KarteTitel>
        <span className="zahlen text-muted-foreground font-mono text-xs">{eintraege.length}</span>
      </KarteKopf>
      {eintraege.length === 0 ? (
        <p className="text-muted-foreground px-3 py-4 text-sm">{leer}</p>
      ) : (
        <ul>
          {eintraege.map((e) => (
            <Zeile key={`${e.art}-${e.g.id}`} e={e} {...rest} />
          ))}
        </ul>
      )}
    </Karte>
  )
}

/**
 * «Zu tun»: die Startansicht des Verkaufs. Oben die Zahlen, darunter «Jetzt anrufen» mit der Uhr (nach 15
 * Arbeitsminuten orange, nach 2 Std. rot, wie die Glocke), «Heute» und «Diese Woche». Standard: nur meine Leads.
 */
export default function ZuTun({ geschaefte, onOeffnen }: { geschaefte: Geschaeft[]; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const jetzt = useJetzt()
  const ich = useAnmeldung((z) => z.ich?.id ?? null)
  const einstellung = useVerkaufEinstellung().data ?? VERKAUF_STANDARD
  const habeEigene = ich !== null && geschaefte.some((g) => gehoertZu(g, ich))
  const [nurMeine, setNurMeine] = useState(true)
  const [ergebnis, setErgebnis] = useState<Geschaeft | null>(null)
  const meine = nurMeine && habeEigene ? ich : null
  const liste = useMemo(
    () =>
      zuTun(
        geschaefte.filter((g) => gehoertZu(g, meine)),
        jetzt,
        einstellung,
      ),
    [geschaefte, meine, jetzt, einstellung],
  )
  const z = liste.zahlen
  const leer = z.anrufen + z.heute + liste.woche.length === 0
  const zeilen = { onOeffnen, onErgebnis: setErgebnis }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kennzahl
          icon={PhoneCall}
          wert={String(z.anrufen)}
          text={t('verkauf.zutun.zahl.anrufen', { count: z.zuSpaet })}
          {...(z.zuSpaet ? { ton: 'text-bad' } : {})}
        />
        <Kennzahl icon={AlarmClock} wert={String(z.heute)} text={t('verkauf.zutun.zahl.heute')} />
        <Kennzahl icon={CalendarClock} wert={String(z.termineWoche)} text={t('verkauf.zutun.zahl.termine')} />
        <Kennzahl icon={Wallet} wert={formatChf(z.offenRappen)} text={t('verkauf.zutun.zahl.offen')} />
      </div>
      {habeEigene && (
        <label className="text-muted-foreground flex items-center gap-2 self-end text-sm">
          <Switch checked={nurMeine} onCheckedChange={setNurMeine} />
          {t('verkauf.zutun.nurMeine')}
        </label>
      )}
      {leer ? (
        <Leerzustand icon={Inbox} titel={t('verkauf.zutun.leer')} text={t('verkauf.zutun.leerText')} />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <Abschnitt
              titel={t('verkauf.zutun.jetzt', { minuten: einstellung.erstkontakt_minuten })}
              eintraege={liste.jetzt}
              leer={t('verkauf.zutun.jetztLeer')}
              {...zeilen}
            />
            <Abschnitt
              titel={t('verkauf.zutun.heute')}
              eintraege={liste.heute}
              leer={t('verkauf.zutun.heuteLeer')}
              {...zeilen}
            />
          </div>
          <Abschnitt
            titel={t('verkauf.zutun.woche')}
            eintraege={liste.woche}
            leer={t('verkauf.zutun.wocheLeer')}
            {...zeilen}
          />
        </div>
      )}
      <Suspense>
        {ergebnis && (
          <KontaktErfassenDialog
            geschaeft={ergebnis}
            onSchliessen={() => {
              setErgebnis(null)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
