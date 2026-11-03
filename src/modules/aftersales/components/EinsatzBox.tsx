import { Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatumZeit } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { dauerText, reaktion } from '../lib/reaktion'
import { fallSpeichern } from '../services/service'
import { AUSWIRKUNGEN, KATEGORIEN, PRIORITAETEN, STATUS, type FallEingabe, type ServiceFall } from '../types'
import { Box, FeldInline, Zeile } from './Box'

/**
 * Reaktionszeit, Stand und die Einordnung (Auswirkung, Priorität, Kategorie, Komponente,
 * Fehlercode). Termin und Team plant die PlanungBox. Alles direkt änderbar; die Reaktionszeit rechnet die Datenbank aus Auswirkung und Priorität.
 */
export function EinsatzBox({ f }: { f: ServiceFall }) {
  const { t } = useTranslation()
  const { aus } = useAktion()
  const listen = {
    status: useAuswahl('servicestatus'),
    prioritaet: useAuswahl('prioritaet'),
    kategorie: useAuswahl('servicekategorie'),
    auswirkung: useAuswahl('serviceauswirkung'),
    komponente: useAuswahl('komponente'),
  }
  const r = reaktion(f)
  const setze = (e: Partial<FallEingabe>) => {
    void aus(() => fallSpeichern(e, f.id))
  }
  const wahl = (feld: keyof typeof listen, wert: string | null, schluessel: readonly string[]) => (
    <Zeile label={t(`service.feld.${feld}`)}>
      <Auswahl
        aria-label={t(`service.feld.${feld}`)}
        className="h-8"
        value={wert ?? ''}
        onValueChange={(v) => {
          setze({ [feld]: v })
        }}
        optionen={schluessel.map((s) => ({ wert: s, text: listen[feld].text(s) }))}
      />
    </Zeile>
  )
  return (
    <Box titel={t('service.akte.einsatz')}>
      {r.laeuft && r.minuten !== null && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md p-2',
            r.ueberfaellig ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn',
          )}
        >
          <Timer className="size-5" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="zahlen text-lg font-semibold">
              {r.ueberfaellig ? `− ${dauerText(r.minuten)}` : dauerText(r.minuten)}
            </span>
            <span className="text-xs">{t('service.reaktion.bis', { zeit: formatDatumZeit(f.reaktion_bis) })}</span>
          </div>
        </div>
      )}
      <dl className="flex flex-col gap-1.5">
        {wahl('status', f.status, STATUS)}
        {wahl('auswirkung', f.auswirkung, AUSWIRKUNGEN)}
        {wahl('prioritaet', f.prioritaet, PRIORITAETEN)}
        {wahl('kategorie', f.kategorie, KATEGORIEN)}
        {wahl(
          'komponente',
          f.komponente,
          listen.komponente.werte.map((w) => w.schluessel),
        )}
        <Zeile label={t('service.feld.fehlercode')}>
          <FeldInline
            label={t('service.feld.fehlercode')}
            wert={f.fehlercode}
            onSpeichern={(w) => {
              setze({ fehlercode: w })
            }}
          />
        </Zeile>
      </dl>
    </Box>
  )
}
