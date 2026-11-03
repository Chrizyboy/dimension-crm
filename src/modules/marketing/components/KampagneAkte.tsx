import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { useAktion } from '../hooks/useAktion'
import { zeitraum } from '../lib/kampagne'
import { useWerbekampagnen } from '../hooks/useKampagnen'
import { kampagnePapierkorb } from '../services/kampagnen'
import type { Werbekampagne } from '../types'
import { KampagneErgebnis } from './KampagneErgebnis'
import { KampagneForm } from './KampagneForm'
import { MesseTeil } from './MesseTeil'

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
  /** ID oder «neu». */
  id: string
  /** Werte für eine neue Kampagne (z. B. Art «messe» aus dem Reiter Messen). */
  vorlage?: Partial<Werbekampagne>
  onOeffnen: (id: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const liste = useWerbekampagnen()
  const { aus } = useAktion()
  const k = id === 'neu' ? null : liste.data?.find((x) => x.id === id)
  const [gewaehlt, setReiter] = useState<string | null>(null)
  if (id !== 'neu' && !k) return null
  // Messe öffnet beim Stand (Erfassen, Checkliste), alles andere beim Ergebnis
  const reiter = gewaehlt ?? (k?.art === 'messe' ? 'messe' : 'ergebnis')

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
        {...(k
          ? {
              beschreibung: [t(`werbung.art.${k.art}`), t(`werbung.status.${k.status}`), zeitraum(k), k.details.ort]
                .filter(Boolean)
                .join(' · '),
            }
          : {})}
        fuss={
          k ? (
            <Button
              variant="ghost"
              onClick={() =>
                void aus(() => kampagnePapierkorb(k.id), {
                  de: 'In den Papierkorb gelegt',
                  fr: 'Mis à la corbeille',
                }).then(onSchliessen)
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
