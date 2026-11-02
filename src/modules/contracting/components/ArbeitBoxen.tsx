import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { useRegeln } from '../hooks/useGrossprojekte'
import { heuteIso, ueberfaellig } from '../lib/pipeline'
import { akteSetzen } from '../services/grossprojekte'
import type { Grossprojekt, YouderaStand } from '../types'
import { Box, Zeile } from './Box'

/**
 * Nächster Schritt mit Datum: Jedes offene Grossprojekt hat genau einen, damit nichts liegen bleibt. Rot, wenn das
 * Datum vorbei ist. Speichern schreibt ihn auch in den Verlauf.
 */
export function SchrittBox({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [text, setText] = useState(g.naechster_schritt ?? '')
  const [am, setAm] = useState(g.naechster_schritt_am ?? '')
  const geaendert = text.trim() !== (g.naechster_schritt ?? '') || am !== (g.naechster_schritt_am ?? '')
  const spaet = ueberfaellig(g, heuteIso())
  return (
    <Box
      titel={t('grossprojekte.projekt.schritt')}
      rechts={
        g.naechster_schritt_am ? (
          <Badge ton={spaet ? 'kritisch' : 'neutral'}>
            {spaet ? t('grossprojekte.projekt.ueberfaellig') : formatDatum(g.naechster_schritt_am)}
          </Badge>
        ) : null
      }
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
        <Input
          aria-label={t('grossprojekte.projekt.schrittText')}
          placeholder={t('grossprojekte.projekt.schrittPlatzhalter')}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
          }}
        />
        <Input
          type="date"
          aria-label={t('grossprojekte.projekt.schrittAm')}
          value={am}
          onChange={(e) => {
            setAm(e.target.value)
          }}
        />
        <Button
          disabled={!geaendert}
          laedt={laeuft}
          onClick={() =>
            void aus(
              () => akteSetzen(g.id, { naechster_schritt: text.trim() || null, naechster_schritt_am: am || null }),
              {
                de: 'Gespeichert',
                fr: 'Enregistré',
              },
            )
          }
        >
          {t('allgemein.speichern')}
        </Button>
      </div>
    </Box>
  )
}

/** Unterlagen für Youdera als Checkliste (Liste aus der Einstellung). Abhaken merkt das Datum. */
export function UnterlagenBox({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const liste = useRegeln().data?.pipeline?.unterlagen ?? []
  const { laeuft, aus } = useAktion()
  const da = liste.filter((u) => g.unterlagen[u.id]).length
  function umschalten(id: string) {
    const neu = g.unterlagen[id]
      ? Object.fromEntries(Object.entries(g.unterlagen).filter(([k]) => k !== id))
      : { ...g.unterlagen, [id]: heuteIso() }
    void aus(() => akteSetzen(g.id, { unterlagen: neu }))
  }
  return (
    <Box
      titel={t('grossprojekte.projekt.unterlagen')}
      rechts={<Badge ton={da === liste.length ? 'ok' : 'warnung'}>{`${String(da)} / ${String(liste.length)}`}</Badge>}
    >
      <ul className="flex flex-col gap-1.5">
        {liste.map((u) => (
          <li key={u.id}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-ok size-4"
                checked={!!g.unterlagen[u.id]}
                disabled={laeuft}
                onChange={() => {
                  umschalten(u.id)
                }}
              />
              <span className="flex-1">{sprache === 'fr' ? u.fr : u.de}</span>
              {g.unterlagen[u.id] && (
                <span className="text-muted-foreground text-xs">{formatDatum(g.unterlagen[u.id] ?? '')}</span>
              )}
            </label>
          </li>
        ))}
      </ul>
    </Box>
  )
}

/** Stand bei Youdera: Dossier gesendet, Angebot erhalten mit Preis und Laufzeit, Notiz. */
export function YouderaBox({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [y, setY] = useState<YouderaStand>(g.youdera)
  const setze = (x: Partial<YouderaStand>) => {
    setY({ ...y, ...x })
  }
  const zahl = (s: string) => (s === '' ? undefined : Number(s))
  const geaendert = JSON.stringify(y) !== JSON.stringify(g.youdera)
  return (
    <Box
      titel="Youdera"
      rechts={
        <Badge ton={y.angebot_am ? 'ok' : y.dossier_am ? 'info' : 'neutral'}>
          {t(`grossprojekte.projekt.youdera.${y.angebot_am ? 'angebot' : y.dossier_am ? 'gesendet' : 'offen'}`)}
        </Badge>
      }
    >
      <dl className="flex flex-col gap-1.5">
        <Zeile label={t('grossprojekte.projekt.youdera.dossierAm')}>
          <span className="flex items-center gap-2">
            <Input
              type="date"
              className="h-8"
              aria-label={t('grossprojekte.projekt.youdera.dossierAm')}
              value={y.dossier_am ?? ''}
              onChange={(e) => {
                setze({ dossier_am: e.target.value || undefined })
              }}
            />
          </span>
        </Zeile>
        <Zeile label={t('grossprojekte.projekt.youdera.angebotAm')}>
          <Input
            type="date"
            className="h-8"
            aria-label={t('grossprojekte.projekt.youdera.angebotAm')}
            value={y.angebot_am ?? ''}
            onChange={(e) => {
              setze({ angebot_am: e.target.value || undefined })
            }}
          />
        </Zeile>
        <Zeile label={t('grossprojekte.projekt.youdera.preis')}>
          <Input
            type="number"
            step="0.1"
            className="h-8"
            aria-label={t('grossprojekte.projekt.youdera.preis')}
            value={y.preis_rp ?? ''}
            onChange={(e) => {
              setze({ preis_rp: zahl(e.target.value) })
            }}
          />
        </Zeile>
        <Zeile label={t('grossprojekte.projekt.youdera.laufzeit')}>
          <Input
            type="number"
            className="h-8"
            aria-label={t('grossprojekte.projekt.youdera.laufzeit')}
            value={y.laufzeit_jahre ?? ''}
            onChange={(e) => {
              setze({ laufzeit_jahre: zahl(e.target.value) })
            }}
          />
        </Zeile>
        <Zeile label={t('grossprojekte.feld.notiz')}>
          <Input
            className="h-8"
            aria-label={t('grossprojekte.projekt.youdera.notiz')}
            value={y.notiz ?? ''}
            onChange={(e) => {
              setze({ notiz: e.target.value || undefined })
            }}
          />
        </Zeile>
      </dl>
      {geaendert && (
        <Button
          size="sm"
          className="self-end"
          laedt={laeuft}
          onClick={() => void aus(() => akteSetzen(g.id, { youdera: y }), { de: 'Gespeichert', fr: 'Enregistré' })}
        >
          <Check />
          {t('allgemein.speichern')}
        </Button>
      )}
    </Box>
  )
}
