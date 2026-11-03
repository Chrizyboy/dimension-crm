import { CheckCheck, Check, MessageCircleQuestion, Pencil, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { useTaste } from '@/hooks/useTaste'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { useKategorieText } from '../hooks/useKategorieText'
import { spesenGeprueft } from '../services/spesen'
import type { Spese } from '../types'
import { BelegVorschau } from './BelegVorschau'
import { GrundDialog, type GrundArt } from './GrundDialog'
import { HinweisMarken } from './Marken'
import { SpeseErfassen } from './SpeseErfassen'

/**
 * Prüfen (Buchhaltung): links die eingereichten Spesen aller Personen (mit Hinweis zuerst), rechts der Beleg
 * gross neben den Angaben. «Geprüft», «Rückfrage» (Glocke an die Person) oder «Ablehnen» mit Grund; mit J/K
 * blättern und P prüfen. Spesen ohne Hinweis lassen sich gesammelt prüfen.
 */
export function Pruefen({ alle }: { alle: Spese[] }) {
  const { t } = useTranslation()
  const kategorie = useKategorieText()
  const { laeuft, aus } = useAktion()
  const liste = useMemo(
    () =>
      alle
        .filter((s) => s.status === 'eingereicht')
        .sort((a, b) => b.hinweise.length - a.hinweise.length || a.erstellt_am.localeCompare(b.erstellt_am)),
    [alle],
  )
  const [gewaehltId, setGewaehltId] = useState<string | null>(null)
  const [fenster, setFenster] = useState<GrundArt | 'aendern' | null>(null)
  const index = Math.max(
    0,
    liste.findIndex((s) => s.id === gewaehltId),
  )
  const s = liste[index]
  const ohneHinweis = liste.filter((x) => x.hinweise.length === 0)

  const blaettern = (d: number) => {
    const neu = liste[Math.min(liste.length - 1, Math.max(0, index + d))]
    if (neu) setGewaehltId(neu.id)
  }
  async function pruefen(ids: string[]) {
    const naechste = liste[index + 1] ?? liste[index - 1]
    const ok = await aus(() => spesenGeprueft(ids), {
      de: ids.length === 1 ? 'Geprüft' : `${String(ids.length)} geprüft`,
      fr: ids.length === 1 ? 'Vérifié' : `${String(ids.length)} vérifiés`,
    })
    if (ok && ids.length === 1) setGewaehltId(naechste?.id ?? null)
  }
  useTaste(
    'j',
    () => {
      blaettern(1)
    },
    liste.length > 0,
    t('spesen.pruefen.tasteWeiter'),
  )
  useTaste(
    'k',
    () => {
      blaettern(-1)
    },
    liste.length > 0,
    t('spesen.pruefen.tasteZurueck'),
  )
  useTaste(
    'p',
    () => {
      if (s) void pruefen([s.id])
    },
    Boolean(s),
    t('spesen.pruefen.tastePruefen'),
  )

  if (!s) {
    return <Leerzustand icon={CheckCheck} titel={t('spesen.pruefen.leer')} text={t('spesen.pruefen.leerText')} />
  }

  const angaben: [string, string][] = [
    [t('spesen.spalte.person'), s.person ?? '–'],
    [t('spesen.spalte.datum'), formatDatum(s.datum)],
    [
      t('spesen.spalte.kategorie'),
      [kategorie(s.kategorie), s.konto ? `${t('spesen.konto')} ${s.konto}` : null].filter(Boolean).join(' · '),
    ],
    [
      t('spesen.erfassen.mwst'),
      s.mwst_satz === null ? '–' : `${String(s.mwst_satz)} % · ${formatChf(s.mwst_rappen ?? 0, { mitWaehrung: true })}`,
    ],
    [t('spesen.spalte.projekt'), [s.projekt_nummer, s.projekt_titel].filter(Boolean).join(' · ') || '–'],
    [t('spesen.erfassen.bezahltMit'), t(`spesen.bezahlt.${s.bezahlt_mit}`)],
    ...(s.art === 'kilometer'
      ? [
          [
            t('spesen.erfassen.km'),
            `${String(s.km)} km × ${formatChf(s.km_satz_rappen ?? 0)}${s.strecke ? ` · ${s.strecke}` : ''}`,
          ] as [string, string],
        ]
      : []),
    ...(s.personen ? [[t('spesen.erfassen.personen'), String(s.personen)] as [string, string]] : []),
    ...(s.notiz ? [[t('spesen.erfassen.notiz'), s.notiz] as [string, string]] : []),
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          disabled={ohneHinweis.length === 0}
          laedt={laeuft}
          onClick={() => void pruefen(ohneHinweis.map((x) => x.id))}
        >
          <CheckCheck />
          {t('spesen.pruefen.alleOhneHinweis', { count: ohneHinweis.length })}
        </Button>
        <ul className="bg-surface divide-y overflow-hidden rounded-lg border" aria-label={t('spesen.ansicht.pruefen')}>
          {liste.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                aria-current={x.id === s.id}
                onClick={() => {
                  setGewaehltId(x.id)
                }}
                className={cn(
                  'hover:bg-muted focus-visible:ring-ring flex w-full flex-col gap-1 px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset',
                  x.id === s.id && 'bg-accent-soft',
                )}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">{x.zweck ?? kategorie(x.kategorie)}</span>
                  <span className="zahlen shrink-0">{formatChf(x.betrag_rappen)}</span>
                </span>
                <span className="text-muted-foreground zahlen text-xs">
                  {x.person} · {formatDatum(x.datum)}
                </span>
                <HinweisMarken spese={x} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <section
        aria-labelledby="spese-pruefen-titel"
        className="bg-surface flex min-w-0 flex-col gap-4 rounded-lg border p-4"
      >
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="spese-pruefen-titel" className="text-lg font-semibold">
              {s.zweck ?? kategorie(s.kategorie)} ·{' '}
              <span className="zahlen">{formatChf(s.betrag_rappen, { mitWaehrung: true })}</span>
            </h2>
            <p className="text-muted-foreground text-xs">
              {t('spesen.pruefen.position', { nr: index + 1, von: liste.length })} · {t('spesen.pruefen.tasten')}
            </p>
          </div>
          <HinweisMarken spese={s} />
        </header>
        <div className="grid gap-4 xl:grid-cols-2">
          <BelegVorschau spese={s} />
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              {angaben.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {s.hinweise.includes('richtwert') && (
              <p className="bg-warn-soft text-warn rounded-md px-3 py-2 text-xs">{t('spesen.pruefen.richtwertText')}</p>
            )}
            <AkteAbschnitt ebene={3} titel={t('spesen.verlauf')}>
              <ul className="flex flex-col gap-1 text-xs">
                {s.verlauf.map((v) => (
                  <li key={`${v.am}-${v.text}`} className="text-muted-foreground">
                    <span className="zahlen">{formatDatum(v.am.slice(0, 10))}</span> · {v.von ?? '–'} · {v.text}
                  </li>
                ))}
              </ul>
            </AkteAbschnitt>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
          <Button
            variant="ghost"
            onClick={() => {
              setFenster('ablehnen')
            }}
          >
            <XCircle />
            {t('spesen.grund.ablehnen.knopf')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFenster('rueckfrage')
            }}
          >
            <MessageCircleQuestion />
            {t('spesen.grund.rueckfrage.knopf')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFenster('aendern')
            }}
          >
            <Pencil />
            {t('spesen.pruefen.aendern')}
          </Button>
          <Button laedt={laeuft} onClick={() => void pruefen([s.id])}>
            <Check />
            {t('spesen.pruefen.geprueft')}
          </Button>
        </div>
      </section>
      {fenster === 'aendern' && (
        <SpeseErfassen
          personId={s.person_id}
          spese={s}
          onSchliessen={() => {
            setFenster(null)
          }}
        />
      )}
      {(fenster === 'rueckfrage' || fenster === 'ablehnen') && (
        <GrundDialog
          art={fenster}
          spese={s}
          onSchliessen={() => {
            setFenster(null)
          }}
        />
      )}
    </div>
  )
}
