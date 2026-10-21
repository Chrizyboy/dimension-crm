import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { useAnbieter } from '../hooks/useAnbieter'
import { useMonatsbericht, useVerkaufAenderung } from '../hooks/useVerkauf'
import { monatName } from '../lib/bericht'
import { kennzahlen } from '../lib/berichtZahlen'
import { speichereEinkauf, type BerichtQuelle } from '../services/bericht'
import { BerichtKarte } from './BerichtKarte'

const BerichtDialog = lazy(() => import('./BerichtDialog'))

function monatVon(d: Date): string {
  return d.toLocaleDateString('sv-SE').slice(0, 7)
}
function schiebe(monat: string, um: number): string {
  const [j, m] = monat.split('-').map(Number)
  return monatVon(new Date(j ?? 2026, (m ?? 1) - 1 + um, 15))
}

/** Feste Klassen, damit Tailwind sie beim Bauen findet. */
const TON = { ok: 'text-ok', bad: 'text-bad', warn: 'text-warn' } as const

function Kennzahl({
  titel,
  wert,
  unter,
  ton,
}: {
  titel: string
  wert: string | number
  unter: string
  ton?: 'ok' | 'bad' | 'warn' | undefined
}) {
  return (
    <div className="bg-surface rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{titel}</p>
      <p className={cn('text-2xl font-semibold', typeof wert === 'number' && 'zahlen font-mono', ton && TON[ton])}>
        {wert}
      </p>
      <p className="text-muted-foreground text-xs">{unter}</p>
    </div>
  )
}

/**
 * Lead-Monatsbericht (V174–V176): oben die Kennzahlen des Monats, darunter pro Quelle eine Karte.
 * Anbieter (gekaufte Leads) haben «gekauft» und den Bericht; eigene Leads stehen nur zur Übersicht.
 * Gezählt wird nach Eingangsdatum des Leads.
 */
export default function Monatsbericht({ onOeffnen }: { onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const istAnbieter = useAnbieter()
  const [monat, setMonat] = useState(monatVon(new Date()))
  const [dialog, setDialog] = useState<BerichtQuelle | null>(null)
  const bericht = useMonatsbericht(monat)
  const speichern = useVerkaufAenderung((e: { quelle: string; felder: Parameters<typeof speichereEinkauf>[2] }) =>
    speichereEinkauf(monat, e.quelle, e.felder),
  )

  async function sichere(
    quelle: string,
    felder: Parameters<typeof speichereEinkauf>[2],
    meldung: { de: string; fr: string },
  ) {
    try {
      await speichern.mutateAsync({ quelle, felder })
      melde('ok', meldung)
    } catch (f) {
      meldeFehler(f, 'monatsbericht')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
      throw f
    }
  }

  const liste = bericht.data ?? []
  const k = kennzahlen(liste, istAnbieter)
  const sortiert = [...liste].sort(
    (a, b) => Number(istAnbieter(b.quelle)) - Number(istAnbieter(a.quelle)) || b.erhalten - a.erhalten,
  )

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
          disabled={monat >= monatVon(new Date())}
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
      ) : liste.length === 0 ? (
        <Leerzustand icon={BarChart3} titel={t('verkauf.bericht.leer')} text={t('verkauf.bericht.leerText')} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kennzahl
              titel={t('verkauf.bericht.kLeads')}
              wert={k.leads}
              unter={
                k.eigene
                  ? t('verkauf.bericht.kLeadsTeil', { gekauft: k.gekauftErhalten, eigene: k.eigene })
                  : t('verkauf.bericht.kQuellen', { count: k.quellen })
              }
            />
            <Kennzahl
              titel={t('verkauf.bericht.gekauft')}
              wert={k.gekauft || '–'}
              unter={t(k.gekauft ? 'verkauf.bericht.kLautAnbieter' : 'verkauf.bericht.kNochNicht')}
            />
            <Kennzahl
              titel={t('verkauf.bericht.kAbgleich')}
              wert={
                !k.gekauft
                  ? '–'
                  : k.fehlen
                    ? t('verkauf.bericht.fehlt', { count: k.fehlen })
                    : t('verkauf.bericht.stimmt')
              }
              unter={t(
                !k.gekauft
                  ? 'verkauf.bericht.kEintragen'
                  : k.fehlen
                    ? 'verkauf.bericht.kMelden'
                    : 'verkauf.bericht.kAlle',
              )}
              ton={!k.gekauft ? undefined : k.fehlen ? 'bad' : 'ok'}
            />
            <Kennzahl
              titel={t('verkauf.bericht.kTermin')}
              wert={k.terminOfferte}
              unter={t('verkauf.bericht.kAnteil', { anteil: k.terminAnteil })}
            />
            <Kennzahl
              titel={t('verkauf.bericht.keinInteresse')}
              wert={k.kein}
              unter={t('verkauf.bericht.kAnteil', { anteil: k.keinAnteil })}
              ton={k.kein ? 'warn' : undefined}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {sortiert.map((q) => (
              <BerichtKarte
                key={`${monat}-${q.quelle}`}
                q={q}
                anbieter={istAnbieter(q.quelle)}
                onOeffnen={onOeffnen}
                onBericht={() => {
                  setDialog(q)
                }}
                onGekauft={(n) =>
                  void sichere(
                    q.quelle,
                    { gekauft: n },
                    { de: 'Gekaufte Leads gespeichert', fr: 'Leads achetés enregistrés' },
                  ).catch(() => undefined)
                }
              />
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{t('verkauf.bericht.hinweis')}</p>
        </>
      )}
      {dialog && (
        <Suspense fallback={null}>
          <BerichtDialog
            q={dialog}
            monat={monat}
            laedt={speichern.isPending}
            onSpeichern={(f, m) => sichere(dialog.quelle, f as unknown as Parameters<typeof speichereEinkauf>[2], m)}
            onSchliessen={() => {
              setDialog(null)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
