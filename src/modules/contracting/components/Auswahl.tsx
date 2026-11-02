import { Building2, Check, Eye, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte } from '@/components/ui/karte'
import { Kbd } from '@/components/ui/diverses'
import { useTaste } from '@/hooks/useTaste'
import { hatRecht } from '@/lib/rechte'
import { cn } from '@/lib/utils'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useGrossprojekte, useRegeln, useSucheStand } from '../hooks/useGrossprojekte'
import { groesse, investition, zahl } from '../lib/anzeige'
import { entscheiden, rechercheUebernehmen } from '../services/grossprojekte'
import type { Grossprojekt } from '../types'
import { EntscheidDialog } from './EntscheidDialog'
import { PunkteMarke } from './PunkteMarke'

/** Montag dieser Woche als JJJJ-MM-TT (Entscheide «diese Woche»). */
function montag(): string {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toLocaleDateString('sv-SE')
}

/** Eine Karte der Auswahl: Punkte, Ort, Fakten, Eigentümer und Ansprechperson aus der Recherche, Grund. */
function AuswahlKarte({
  g,
  aktiv,
  darf,
  onWahl,
  onOeffnen,
}: {
  g: Grossprojekt
  aktiv: boolean
  darf: boolean
  onWahl: (art: 'ja' | 'beobachten' | 'verwerfen') => void
  onOeffnen: () => void
}) {
  const { t } = useTranslation()
  const r = g.recherche
  const eigentuemer = g.bauherr ?? r?.eigentuemer?.name
  const person = g.ansprechperson ?? r?.ansprechpersonen?.[0]
  const inv = investition(g)
  return (
    <Karte
      className={cn('grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto]', aktiv && 'ring-accent ring-2')}
      aria-current={aktiv ? 'true' : undefined}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <PunkteMarke g={g} t={t} />
          {g.art && <Badge ton="marke">{t(`grossprojekte.art.${g.art}`)}</Badge>}
          <Badge ton="neutral">{t(`grossprojekte.quelle.${g.quelle}`, { defaultValue: g.quelle })}</Badge>
        </div>
        <button
          type="button"
          onClick={onOeffnen}
          className="focus-visible:ring-ring rounded text-left font-semibold outline-none hover:underline focus-visible:ring-2"
        >
          {g.titel}
        </button>
        <p className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
          {[
            [g.strasse, g.plz, g.gemeinde].filter(Boolean).join(' '),
            g.dachflaeche_m2 ? `${zahl(g.dachflaeche_m2)} m²` : null,
            groesse(g, t('grossprojekte.waerme')) || null,
            inv > 0 ? `CHF ${zahl(inv / 100)}` : null,
            g.fahrzeit_min != null ? t('grossprojekte.fahrzeit', { min: g.fahrzeit_min }) : null,
          ]
            .filter(Boolean)
            .map((x) => (
              <span key={x}>{x}</span>
            ))}
        </p>
        <p className="text-sm">
          <b>{t('grossprojekte.auswahl.eigentuemer')}:</b> {eigentuemer ?? t('grossprojekte.auswahl.unbekannt')}
          {r?.eigentuemer?.sicherheit && !g.bauherr
            ? ` (${t(`grossprojekte.recherche.sicherheit.${r.eigentuemer.sicherheit}`)})`
            : ''}
          {person && (
            <>
              {' · '}
              <b>{t('grossprojekte.recherche.ansprechperson')}:</b>{' '}
              {[person.name, person.funktion].filter(Boolean).join(', ')}
            </>
          )}
        </p>
        {r?.zusammenfassung && <p className="text-muted-foreground line-clamp-2 text-sm">{r.zusammenfassung}</p>}
      </div>
      <div className="flex flex-row flex-wrap items-start gap-2 sm:flex-col">
        {darf && (
          <Button
            onClick={() => {
              onWahl('ja')
            }}
          >
            <Check />
            {t('grossprojekte.auswahl.ja')}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            onWahl('beobachten')
          }}
        >
          <Eye />
          {t('grossprojekte.entscheid.beobachten')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onWahl('verwerfen')
          }}
        >
          <X />
          {t('grossprojekte.auswahl.nein')}
        </Button>
      </div>
    </Karte>
  )
}

/**
 * «Neu diese Woche»: die besten offenen Treffer als Karten mit allem, was für den Entscheid nötig ist. Mit den Tasten
 * J (ja, angehen), B (beobachten), N (nein mit Grund) und Pfeil ab/auf geht es in Sekunden; Ja legt den Lead an und
 * nimmt das Projekt in die Pipeline (nur wer bewilligen darf).
 */
export function Auswahl({ onOeffnen }: { onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const regeln = useRegeln().data
  const daten = useGrossprojekte()
  const stand = useSucheStand().data
  const { aus } = useAktion()
  const [index, setIndex] = useState(0)
  const [frage, setFrage] = useState<{ id: string; art: 'verwerfen' | 'beobachten' } | null>(null)
  const darf =
    hatRecht(ich, 'admin') ||
    [...(regeln?.bewilligen ?? []), ...(regeln?.bewilligen_vertretung ?? [])].includes(ich?.kuerzel ?? '')
  const offen = (daten.data ?? []).filter((g) => g.stand === 'pruefen' && !g.ausschluss)
  const seit = montag()
  const woche = (daten.data ?? []).filter((g) => g.entschieden_am && g.entschieden_am.slice(0, 10) >= seit)
  const aktiv = offen[Math.min(index, offen.length - 1)]

  function wahl(g: Grossprojekt | undefined, art: 'ja' | 'beobachten' | 'verwerfen') {
    if (!g) return
    if (art === 'ja') {
      // Ja auf der Karte heisst auch: der gezeigte Eigentümer und die Ansprechperson stimmen (wie «Übernehmen»).
      const r = g.recherche
      const vorschlag = !g.bauherr && r?.eigentuemer?.name
      if (darf)
        void aus(
          async () => {
            if (vorschlag)
              await rechercheUebernehmen(g.id, {
                bauherr: r.eigentuemer?.name ?? null,
                bauherr_art: r.eigentuemer?.art ?? null,
                ansprechperson: g.ansprechperson ?? r.ansprechpersonen?.[0] ?? null,
              })
            await entscheiden(g.id, 'bewilligen')
          },
          { de: 'In der Pipeline', fr: 'Dans le pipeline' },
        )
      return
    }
    setFrage({ id: g.id, art })
  }
  const tasten = !frage && offen.length > 0
  useTaste(
    'j',
    () => {
      wahl(aktiv, 'ja')
    },
    tasten && darf,
    t('grossprojekte.auswahl.tasteJa'),
  )
  useTaste(
    'b',
    () => {
      wahl(aktiv, 'beobachten')
    },
    tasten,
    t('grossprojekte.auswahl.tasteB'),
  )
  useTaste(
    'n',
    () => {
      wahl(aktiv, 'verwerfen')
    },
    tasten,
    t('grossprojekte.auswahl.tasteN'),
  )
  useTaste(
    'arrowdown',
    () => {
      setIndex(Math.min(index + 1, offen.length - 1))
    },
    tasten,
  )
  useTaste(
    'arrowup',
    () => {
      setIndex(Math.max(index - 1, 0))
    },
    tasten,
  )

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-muted-foreground text-xs">
          {t('grossprojekte.auswahl.tasten')} <Kbd>J</Kbd> <Kbd>B</Kbd> <Kbd>N</Kbd> <Kbd>↓</Kbd>
        </p>
        {offen.length === 0 && !daten.isPending ? (
          <Leerzustand
            icon={Building2}
            titel={t('grossprojekte.leer.pruefen')}
            text={t('grossprojekte.auswahl.leer')}
          />
        ) : (
          offen.map((g) => (
            <AuswahlKarte
              key={g.id}
              g={g}
              aktiv={g.id === aktiv?.id}
              darf={darf}
              onWahl={(a) => {
                wahl(g, a)
              }}
              onOeffnen={() => {
                onOeffnen(g.id)
              }}
            />
          ))
        )}
      </div>
      <Karte className="flex flex-col gap-2 p-3 text-sm">
        <h2 className="text-sm font-semibold">{t('grossprojekte.auswahl.woche')}</h2>
        {(['bewilligt', 'beobachten', 'verworfen'] as const).map((s) => (
          <p key={s} className="flex justify-between">
            <span>{t(`grossprojekte.auswahl.anzahl.${s}`)}</span>
            <b className="zahlen">{woche.filter((g) => g.stand === s).length}</b>
          </p>
        ))}
        <p className="flex justify-between">
          <span>{t('grossprojekte.auswahl.anzahl.offen')}</span>
          <b className="zahlen">{offen.length}</b>
        </p>
        {stand && (
          <p className="text-muted-foreground text-xs">
            {t('grossprojekte.auswahl.vorrat', { n: stand.vorrat, woche: stand.diese_woche, max: stand.pro_woche })}
          </p>
        )}
      </Karte>
      {frage && (
        <EntscheidDialog
          id={frage.id}
          art={frage.art}
          onSchliessen={() => {
            setFrage(null)
          }}
        />
      )}
    </div>
  )
}
