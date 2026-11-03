import { Link2Off, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Zelle, Zeile } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import {
  buchungErledigen,
  buchungPerson,
  buchungVerbinden,
  type KartenBuchung,
  type KartenPerson,
} from '../services/firmenkarte'
import type { Spese } from '../types'

/**
 * Eine Kartenbuchung: Person (Karteninhaber), Betrag und je nach Stand die verbundene Spese mit «Lösen», die
 * passenden Firmenkarten-Spesen zum Verbinden und «Ohne Beleg erledigen», oder der Grund mit «Wieder öffnen».
 */
export function KartenZeile({
  b,
  personen,
  frei,
  onErledigen,
}: {
  b: KartenBuchung
  personen: KartenPerson[]
  frei: Spese[]
  onErledigen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  // Passende zuerst: gleicher Betrag, dann nächstes Datum; nur Spesen der Person, wenn sie bekannt ist.
  const abstand = (s: Spese) =>
    (s.betrag_rappen === b.betrag_rappen ? 0 : 1000) +
    Math.abs(new Date(s.datum).getTime() - new Date(b.datum).getTime()) / 86_400_000
  const kandidaten = frei
    .filter((s) => !b.person_id || s.person_id === b.person_id)
    .sort((x, y) => abstand(x) - abstand(y))
    .slice(0, 30)

  return (
    <Zeile>
      <Zelle className="zahlen whitespace-nowrap">{formatDatum(b.datum)}</Zelle>
      <Zelle>
        <span className="line-clamp-2">{b.text}</span>
        {b.karte && <span className="text-muted-foreground block text-xs">{b.karte}</span>}
      </Zelle>
      <Zelle className="min-w-40">
        <Auswahl
          aria-label={t('spesen.karte.person')}
          value={b.person_id ?? ''}
          platzhalter={t('spesen.karte.personWaehlen')}
          disabled={laeuft || b.stand === 'verbunden'}
          optionen={personen.map((p) => ({ wert: p.id, text: p.name }))}
          onValueChange={(p) => void aus(() => buchungPerson(b.id, p))}
        />
      </Zelle>
      <Zelle className="zahlen text-right whitespace-nowrap">{formatChf(b.betrag_rappen)}</Zelle>
      <Zelle className="min-w-64">
        {b.stand === 'verbunden' ? (
          <span className="flex items-center gap-2">
            <span className="text-ok min-w-0 flex-1 truncate text-sm">
              {[b.spese_zweck, b.spese_datum ? formatDatum(b.spese_datum) : null].filter(Boolean).join(' · ')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('spesen.karte.loesen')}
              onClick={() => void aus(() => buchungVerbinden(b.id, null))}
            >
              <Link2Off />
            </Button>
          </span>
        ) : b.stand === 'erledigt' ? (
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
              {b.erledigt_grund}
              {b.erledigt_von ? ` · ${b.erledigt_von}` : ''}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('spesen.karte.wiederOeffnen')}
              onClick={() => void aus(() => buchungErledigen(b.id, null))}
            >
              <RotateCcw />
            </Button>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Auswahl
              className="min-w-0 flex-1"
              aria-label={t('spesen.karte.verbinden')}
              platzhalter={kandidaten.length ? t('spesen.karte.verbinden') : t('spesen.karte.keinBeleg')}
              disabled={laeuft || kandidaten.length === 0}
              optionen={kandidaten.map((s) => ({
                wert: s.id,
                text: `${formatDatum(s.datum)} · ${formatChf(s.betrag_rappen)} · ${s.zweck ?? ''}${b.person_id ? '' : ` · ${s.person ?? ''}`}`,
              }))}
              onValueChange={(s) => void aus(() => buchungVerbinden(b.id, s), { de: 'Verbunden', fr: 'Associé' })}
            />
            <Button variant="secondary" size="sm" onClick={onErledigen}>
              {t('spesen.karte.ohneBeleg')}
            </Button>
          </span>
        )}
      </Zelle>
    </Zeile>
  )
}
