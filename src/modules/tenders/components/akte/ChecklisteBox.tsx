import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../../hooks/useAktion'
import { useNachweise, useRegeln } from '../../hooks/useSubmission'
import { checklisteSetzen } from '../../services/submission'
import { useUi } from '@/stores/ui'
import type { Dossier } from '../../types'
import { Box } from '../Box'

const OFFEN = new Set(['teilnahme', 'kalkulation', 'eingereicht'])

/**
 * Eingabe-Checkliste (Punkte aus den Regeln). «Nachweise» und «Prüfung» setzt das CRM selbst: Nachweise sind
 * erledigt, wenn jeder bis zur Eingabe gültig ist; Prüfung, wenn eine zweite Person geprüft hat.
 */
export function ChecklisteBox({ d }: { d: Dossier }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const regeln = useRegeln().data
  const nachweise = useNachweise().data
  const { laeuft, aus } = useAktion()
  if (d.spur !== 'angebot' || !OFFEN.has(d.status) || !regeln?.checkliste) return null
  const bis = (d.frist_eingabe ?? d.frist ?? new Date().toISOString()).slice(0, 10)
  const arten = regeln.nachweise
  const fehlen = arten.filter((a) => !(nachweise?.nachweise ?? []).some((n) => n.art === a.art && n.gueltig_bis >= bis))
  const erledigt = (s: string, auto?: string) =>
    auto === 'nachweise' ? fehlen.length === 0 : auto === 'pruefung' ? d.pruefung_am != null : Boolean(d.checkliste[s])
  const anzahl = regeln.checkliste.filter((p) => erledigt(p.schluessel, p.auto)).length
  return (
    <Box titel={t('ausschreibungen.akte.checkliste')} rechts={`${anzahl}/${regeln.checkliste.length}`}>
      <ul className="flex flex-col gap-1.5">
        {regeln.checkliste.map((p) => {
          const fertig = erledigt(p.schluessel, p.auto)
          const id = `cl-${d.id}-${p.schluessel}`
          return (
            <li key={p.schluessel} className="flex items-start gap-2">
              <Checkbox
                id={id}
                checked={fertig}
                disabled={Boolean(p.auto) || laeuft}
                onCheckedChange={(c) => void aus(() => checklisteSetzen(d.id, p.schluessel, c === true))}
              />
              <label htmlFor={id} className="flex min-w-0 flex-1 flex-col">
                <span>{sprache === 'fr' ? p.fr : p.de}</span>
                {p.auto === 'nachweise' && fehlen.length > 0 && (
                  <span className="text-warn text-xs">
                    {t('ausschreibungen.akte.nachweiseFehlen', {
                      liste: fehlen.map((a) => (sprache === 'fr' ? a.fr : a.de)).join(', '),
                    })}
                  </span>
                )}
                {p.auto === 'pruefung' && d.pruefung_am && (
                  <span className="text-muted-foreground text-xs">{formatDatum(d.pruefung_am)}</span>
                )}
              </label>
            </li>
          )
        })}
      </ul>
    </Box>
  )
}
