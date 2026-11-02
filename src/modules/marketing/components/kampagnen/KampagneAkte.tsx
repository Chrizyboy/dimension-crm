import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../../hooks/useAktion'
import { useWerbekampagnen } from '../../hooks/useKampagnen'
import { kampagnePapierkorb } from '../../services/kampagnen'
import type { Werbekampagne } from '../../types'
import { KampagneErgebnis } from './KampagneErgebnis'
import { KampagneForm } from './KampagneForm'
import { MesseTeil } from './MesseTeil'

/** Zeitraum «20.11.2026 – 22.11.2026» oder nur der Start. */
export function zeitraum(k: Pick<Werbekampagne, 'start_am' | 'ende_am'>): string {
  if (!k.start_am) return '–'
  return k.ende_am && k.ende_am !== k.start_am
    ? `${formatDatum(k.start_am)} – ${formatDatum(k.ende_am)}`
    : formatDatum(k.start_am)
}

/**
 * Akte einer Kampagne als Seitenpanel (?kampagne=…): Ergebnis, bei Messen Stand und Erfassung, Angaben. Neue
 * Kampagne: nur die Angaben, nach dem Speichern öffnet sich die Akte.
 */
export function KampagneAkte({
  id,
  vorlage,
  onOeffnen,
  onSchliessen,
}: {
  id: string | 'neu'
  /** Werte für eine neue Kampagne (z. B. Art «messe» aus dem Reiter Messen). */
  vorlage?: Partial<Werbekampagne>
  onOeffnen: (id: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const liste = useWerbekampagnen()
  const { aus } = useAktion()
  const k = id === 'neu' ? null : liste.data?.find((x) => x.id === id)
  const [reiter, setReiter] = useState(k?.art === 'messe' ? 'messe' : 'ergebnis')
  if (id !== 'neu' && !k) return null

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        breite="breit"
        titel={k?.name ?? t('werbung.kampagne.neu')}
        beschreibung={
          k ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge ton="neutral">{t(`werbung.art.${k.art}`)}</Badge>
              <Badge ton={k.status === 'laeuft' ? 'ok' : k.status === 'abgeschlossen' ? 'neutral' : 'info'}>
                {t(`werbung.status.${k.status}`)}
              </Badge>
              <span className="zahlen">{zeitraum(k)}</span>
              {k.details.ort && <span>{k.details.ort}</span>}
            </span>
          ) : undefined
        }
        fuss={
          k ? (
            <Button
              variant="ghost"
              onClick={() =>
                void aus(() => kampagnePapierkorb(k.id), { de: 'In den Papierkorb gelegt', fr: 'Mis à la corbeille' }).then(
                  onSchliessen,
                )
              }
            >
              <Trash2 />
              {t('werbung.papierkorb')}
            </Button>
          ) : undefined
        }
      >
        {!k ? (
          <KampagneForm kampagne={vorlage ?? {}} onGespeichert={onOeffnen} />
        ) : (
          <Reiter value={reiter} onValueChange={setReiter}>
            <ReiterListe>
              <ReiterKnopf value="ergebnis">{t('werbung.akte.ergebnis')}</ReiterKnopf>
              {k.art === 'messe' && <ReiterKnopf value="messe">{t('werbung.akte.messe')}</ReiterKnopf>}
              <ReiterKnopf value="angaben">{t('werbung.akte.angaben')}</ReiterKnopf>
            </ReiterListe>
            <ReiterInhalt value="ergebnis" className="pt-4">
              <KampagneErgebnis kampagne={k} />
            </ReiterInhalt>
            {k.art === 'messe' && (
              <ReiterInhalt value="messe" className="pt-4">
                <MesseTeil kampagne={k} />
              </ReiterInhalt>
            )}
            <ReiterInhalt value="angaben" className="pt-4">
              <KampagneForm key={JSON.stringify(k)} kampagne={k} onGespeichert={() => undefined} />
            </ReiterInhalt>
          </Reiter>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
