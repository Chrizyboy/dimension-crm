import { ArrowLeft, Check, ChevronRight, ExternalLink, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InPapierkorbKnopf } from '@/components/shared/papierkorb/InPapierkorbKnopf'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { adresse, groesse } from '../lib/anzeige'
import { heuteIso, kwpVon } from '../lib/pipeline'
import { stufeSetzen } from '../services/grossprojekte'
import { STUFEN, type Grossprojekt } from '../types'
import { PunkteMarke } from './PunkteMarke'

/** Fragt beim Abschluss nach: «verloren» braucht einen Grund, «Vertrag» Datum und Leistung. */
function StufeDialog({
  g,
  art,
  onSchliessen,
}: {
  g: Grossprojekt
  art: 'verloren' | 'vertrag'
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [grund, setGrund] = useState('')
  const [datum, setDatum] = useState(heuteIso)
  const [kwp, setKwp] = useState(String(Math.round(kwpVon(g))))
  const [fehler, setFehler] = useState<string>()
  async function ok() {
    if (art === 'verloren' && !grund.trim()) {
      setFehler(t('pruefung.pflicht'))
      return
    }
    const angaben =
      art === 'verloren' ? { grund: grund.trim() } : { datum, ...(Number(kwp) > 0 ? { kwp: Number(kwp) } : {}) }
    if (await aus(() => stufeSetzen(g.id, art, angaben), { de: 'Gespeichert', fr: 'Enregistré' })) onSchliessen()
  }
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(`grossprojekte.projekt.${art}Titel`)}
        beschreibung={t(`grossprojekte.projekt.${art}Text`)}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} onClick={() => void ok()}>
              {t(`grossprojekte.projekt.${art}`)}
            </Button>
          </>
        }
      >
        {art === 'verloren' ? (
          <Feld id="gp-grund" label={t('grossprojekte.entscheid.grund')} pflicht {...(fehler ? { fehler } : {})}>
            <Textarea
              id="gp-grund"
              rows={3}
              value={grund}
              onChange={(e) => {
                setGrund(e.target.value)
              }}
            />
          </Feld>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Feld id="gp-vertrag-am" label={t('grossprojekte.projekt.vertragAm')}>
              <Input
                id="gp-vertrag-am"
                type="date"
                value={datum}
                onChange={(e) => {
                  setDatum(e.target.value)
                }}
              />
            </Feld>
            <Feld id="gp-vertrag-kwp" label={t('grossprojekte.projekt.vertragKwp')}>
              <Input
                id="gp-vertrag-kwp"
                type="number"
                min={0}
                value={kwp}
                onChange={(e) => {
                  setKwp(e.target.value)
                }}
              />
            </Feld>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}

/**
 * Kopf der Projekt-Akte: zurück, Name, Adresse, Marken, Knöpfe (nächste Stufe, verloren, Lead) und darunter die
 * Leiste der Stufen. Ein Klick auf eine Stufe setzt sie (zurück geht auch, z. B. nach einem Fehlklick).
 */
export function ProjektKopf({ g, onZurueck }: { g: Grossprojekt; onZurueck: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [frage, setFrage] = useState<'verloren' | 'vertrag' | null>(null)
  const index = g.stufe ? STUFEN.indexOf(g.stufe as (typeof STUFEN)[number]) : -1
  const naechste = index >= 0 && index < STUFEN.length - 1 ? STUFEN[index + 1] : undefined
  const setze = (s: (typeof STUFEN)[number]) => {
    if (s === 'vertrag') setFrage('vertrag')
    else void aus(() => stufeSetzen(g.id, s), { de: 'Stufe gesetzt', fr: 'Étape enregistrée' })
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <button
            type="button"
            onClick={onZurueck}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {t('grossprojekte.reiter.pipeline')} · <span className="zahlen font-mono">{g.nummer}</span>
          </button>
          <h1 className="font-display text-xl font-semibold text-balance">{g.bauherr ?? g.titel}</h1>
          <p className="text-muted-foreground text-sm">
            {[adresse(g), g.bauherr ? g.titel : null].filter(Boolean).join(' · ')}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <PunkteMarke g={g} t={t} />
            {g.art && <Badge ton="marke">{t(`grossprojekte.art.${g.art}`)}</Badge>}
            {groesse(g, t('grossprojekte.waerme')) && (
              <Badge ton="neutral">{groesse(g, t('grossprojekte.waerme'))}</Badge>
            )}
            {g.stufe === 'verloren' && (
              <Badge ton="kritisch">
                {t('grossprojekte.stufe.verloren')}
                {g.grund ? `: ${g.grund}` : ''}
              </Badge>
            )}
            {g.vertrag_am && (
              <Badge ton="ok">{t('grossprojekte.projekt.unterschrieben', { datum: formatDatum(g.vertrag_am) })}</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <InPapierkorbKnopf
            tabelle="grossprojekte"
            id={g.id}
            name={[g.nummer, g.bauherr ?? g.titel].filter(Boolean).join(' ')}
            onFertig={onZurueck}
          />
          {g.verkaufschance_id && (
            <a href={`#/sales?lead=${g.verkaufschance_id}`} className={buttonVariants({ variant: 'secondary' })}>
              <ExternalLink />
              {t('grossprojekte.akte.zumLead')}
            </a>
          )}
          {g.stufe === 'verloren' ? (
            <Button
              variant="secondary"
              laedt={laeuft}
              onClick={() => {
                setze('qualifizieren')
              }}
            >
              <RotateCcw />
              {t('grossprojekte.projekt.wieder')}
            </Button>
          ) : (
            g.stufe !== 'vertrag' && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFrage('verloren')
                }}
              >
                <X />
                {t('grossprojekte.projekt.verloren')}
              </Button>
            )
          )}
          {naechste && g.stufe !== 'verloren' && (
            <Button
              laedt={laeuft}
              onClick={() => {
                setze(naechste)
              }}
            >
              {naechste === 'vertrag' ? <Check /> : <ChevronRight />}
              {t('grossprojekte.projekt.weiter', { stufe: t(`grossprojekte.stufe.${naechste}`) })}
            </Button>
          )}
        </div>
      </div>
      <ol className="bg-surface flex overflow-x-auto rounded-lg border" aria-label={t('grossprojekte.projekt.stufen')}>
        {STUFEN.map((s, i) => (
          <li key={s} className="flex min-w-28 flex-1 border-r last:border-r-0">
            <button
              type="button"
              disabled={laeuft || g.stufe === s}
              aria-current={g.stufe === s ? 'step' : undefined}
              onClick={() => {
                setze(s)
              }}
              className={cn(
                'focus-visible:ring-ring flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs outline-none focus-visible:ring-2',
                i < index && 'bg-ok-soft text-ok',
                g.stufe === s && 'bg-accent-soft text-accent-ink font-semibold',
                g.stufe !== s && 'hover:bg-muted',
              )}
            >
              <span className="flex items-center gap-1">
                {i < index && <Check className="size-3.5" aria-hidden="true" />}
                {t(`grossprojekte.stufe.${s}`)}
              </span>
              <span className="font-normal">
                {g.stufe === s && g.stufe_seit
                  ? t('grossprojekte.projekt.seit', { datum: formatDatum(g.stufe_seit) })
                  : t(`grossprojekte.stufeText.${s}`)}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {frage && (
        <StufeDialog
          g={g}
          art={frage}
          onSchliessen={() => {
            setFrage(null)
          }}
        />
      )}
    </div>
  )
}
