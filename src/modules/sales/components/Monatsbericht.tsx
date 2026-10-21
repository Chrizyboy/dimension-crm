import { BadgeCheck, BarChart3, ChevronLeft, ChevronRight, Copy, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useMonatsbericht, useVerkaufAenderung } from '../hooks/useVerkauf'
import { berichtText, monatName } from '../lib/bericht'
import { speichereEinkauf, type BerichtQuelle } from '../services/bericht'

function vormonat(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return d.toLocaleDateString('sv-SE').slice(0, 7)
}
function schiebe(monat: string, um: number): string {
  const [j, m] = monat.split('-').map(Number)
  const d = new Date(j ?? 2026, (m ?? 1) - 1 + um, 1)
  return d.toLocaleDateString('sv-SE').slice(0, 7)
}

function QuelleKarte({ q, monat, onOeffnen }: { q: BerichtQuelle; monat: string; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const quellen = useAuswahl('quelle')
  const staende = useAuswahl('kundenstand')
  const ich = useAnmeldung((z) => z.ich)
  const [gekauft, setGekauft] = useState(q.gekauft === null ? '' : String(q.gekauft))
  const ohne = q.leads.filter((l) => l.stand === 'kein')
  const vorschlag = berichtText({
    monat,
    quelle: quellen.text(q.quelle),
    erhalten: q.erhalten,
    gekauft: gekauft === '' ? null : Number(gekauft),
    ohneInteresse: ohne,
    sprache,
  })
  const [text, setText] = useState(q.berichtText ?? '')
  const speichern = useVerkaufAenderung((f: Parameters<typeof speichereEinkauf>[2]) =>
    speichereEinkauf(monat, q.quelle, f),
  )
  const diff = gekauft === '' ? null : Number(gekauft) - q.erhalten

  async function sichern(f: Parameters<typeof speichereEinkauf>[2], meldung: { de: string; fr: string }) {
    try {
      await speichern.mutateAsync(f)
      melde('ok', meldung)
    } catch (e) {
      meldeFehler(e, 'monatsbericht')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  return (
    <article className="bg-surface flex flex-col gap-3 rounded-xl border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{quellen.text(q.quelle) || t('verkauf.bericht.ohneQuelle')}</h2>
        {q.gemeldet?.am ? (
          <Badge ton="ok">
            <BadgeCheck />
            {t('verkauf.bericht.gemeldetAm', { datum: formatDatum(q.gemeldet.am), von: q.gemeldet.von ?? '' })}
          </Badge>
        ) : (
          <Badge ton="warnung">{t('verkauf.bericht.offen')}</Badge>
        )}
      </header>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        {(
          [
            ['erhalten', q.erhalten],
            ['inBearbeitung', q.inBearbeitung],
            ['termin', q.termin],
            ['offeriert', q.offeriert],
            ['keinInteresse', q.keinInteresse],
          ] as const
        ).map(([k, n]) => (
          <div key={k} className="bg-muted/50 rounded-lg p-2">
            <dt className="text-muted-foreground text-[11px]">{t(`verkauf.bericht.${k}`)}</dt>
            <dd className="zahlen font-mono text-lg font-semibold">{n}</dd>
          </div>
        ))}
        <div className="bg-muted/50 rounded-lg p-2">
          <label htmlFor={`gekauft-${q.quelle}`} className="text-muted-foreground text-[11px]">
            {t('verkauf.bericht.gekauft')}
          </label>
          <Input
            id={`gekauft-${q.quelle}`}
            type="number"
            min={0}
            className="h-7"
            value={gekauft}
            onChange={(e) => {
              setGekauft(e.target.value)
            }}
            onBlur={() => {
              if (gekauft !== (q.gekauft === null ? '' : String(q.gekauft)))
                void sichern(
                  { gekauft: gekauft === '' ? null : Number(gekauft) },
                  { de: 'Gekaufte Leads gespeichert', fr: 'Leads achetés enregistrés' },
                )
            }}
          />
        </div>
      </dl>
      {diff !== null && diff !== 0 && (
        <p className={diff > 0 ? 'text-bad text-sm font-medium' : 'text-muted-foreground text-sm'}>
          {t(diff > 0 ? 'verkauf.bericht.fehlen' : 'verkauf.bericht.mehr', { count: Math.abs(diff) })}
        </p>
      )}
      {ohne.length > 0 && (
        <div>
          <h3 className="text-muted-foreground mb-1 text-xs font-medium uppercase">{t('verkauf.bericht.gruende')}</h3>
          <ul className="text-sm">
            {ohne.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => {
                    onOeffnen(l.id)
                  }}
                >
                  {formatDatum(l.eingang_am)} · {l.name} · {l.ort ?? ''}
                </button>{' '}
                <span className="text-muted-foreground">– {l.grund ?? t('verkauf.bericht.ohneGrund')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <details>
        <summary className="text-muted-foreground cursor-pointer text-xs">
          {t('verkauf.bericht.alleLeads', { count: q.leads.length })}
        </summary>
        <ul className="mt-1 text-sm">
          {q.leads.map((l) => (
            <li key={l.id} className="flex gap-2">
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left hover:underline"
                onClick={() => {
                  onOeffnen(l.id)
                }}
              >
                {l.nummer} · {l.name} · {l.ort ?? ''}
              </button>
              <span className="text-muted-foreground text-xs">{staende.text(l.stand)}</span>
            </li>
          ))}
        </ul>
      </details>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`text-${q.quelle}`} className="text-xs font-medium">
          {t('verkauf.bericht.text')}
        </label>
        <Textarea
          id={`text-${q.quelle}`}
          rows={9}
          value={text || vorschlag}
          onChange={(e) => {
            setText(e.target.value)
          }}
        />
        {text && text !== vorschlag ? (
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
            {t('verkauf.bericht.gespeicherterText')}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => {
                setText('')
              }}
            >
              {t('verkauf.bericht.neuAusZahlen')}
            </button>
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">{t('verkauf.bericht.textHinweis')}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(text || vorschlag).then(() => {
              melde('ok', { de: 'Text kopiert', fr: 'Texte copié' })
            })
          }}
        >
          <Copy />
          {t('verkauf.bericht.kopieren')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            void sichern({ bericht_text: text || vorschlag }, { de: 'Bericht gespeichert', fr: 'Rapport enregistré' })
          }
        >
          <Save />
          {t('verkauf.bericht.speichern')}
        </Button>
        <Button
          size="sm"
          disabled={!!q.gemeldet?.am}
          onClick={() =>
            void sichern(
              {
                bericht_text: text || vorschlag,
                gemeldet: {
                  am: new Date().toISOString(),
                  von: ich?.name ?? '',
                  an: '',
                  anzahl: q.erhalten,
                  wie: 'manuell',
                },
              },
              { de: 'Als gemeldet markiert', fr: 'Marqué comme signalé' },
            )
          }
        >
          <BadgeCheck />
          {t('verkauf.bericht.gemeldet')}
        </Button>
      </div>
    </article>
  )
}

/**
 * Lead-Monatsbericht (V174–V176): pro Anbieter die erhaltenen Leads laut CRM neben den gekauften,
 * Gründe bei «kein Interesse» und der Text an den Anbieter. Senden über den Ausgangskorb folgt mit
 * Phase 8 (mit Freigabe), die KI-Fassung mit Phase 13; bis dahin kopieren und als gemeldet markieren.
 */
export default function Monatsbericht({ onOeffnen }: { onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const [monat, setMonat] = useState(vormonat())
  const bericht = useMonatsbericht(monat)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="secondary"
          aria-label={t('verkauf.bericht.vorher')}
          onClick={() => {
            setMonat(schiebe(monat, -1))
          }}
        >
          <ChevronLeft />
        </Button>
        <h2 className="min-w-40 text-center text-base font-semibold">{monatName(monat, sprache)}</h2>
        <Button
          size="icon"
          variant="secondary"
          aria-label={t('verkauf.bericht.nachher')}
          onClick={() => {
            setMonat(schiebe(monat, 1))
          }}
        >
          <ChevronRight />
        </Button>
      </div>
      {bericht.isError ? (
        <Fehlerzustand details={String(bericht.error)} onNochmal={() => void bericht.refetch()} />
      ) : bericht.isPending ? (
        <Skelett className="h-64" />
      ) : bericht.data.length === 0 ? (
        <Leerzustand icon={BarChart3} titel={t('verkauf.bericht.leer')} text={t('verkauf.bericht.leerText')} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {bericht.data.map((q) => (
            <QuelleKarte key={`${monat}-${q.quelle}`} q={q} monat={monat} onOeffnen={onOeffnen} />
          ))}
        </div>
      )}
    </div>
  )
}
