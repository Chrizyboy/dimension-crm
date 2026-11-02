import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { gepostet } from '../services/social'
import type { SocialPost } from '../types'

/**
 * «Von Hand gepostet» (solange Meta und LinkedIn nicht verbunden sind): Links der Beiträge eintragen, der Post gilt
 * dann als veröffentlicht und erscheint mit Link im Kalender und in der Kampagne.
 */
export function GepostetDialog({ post, onSchliessen }: { post: SocialPost; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [links, setLinks] = useState<Record<string, string>>({})
  const falsch = Object.values(links).some((l) => l && !l.startsWith('https://'))
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('werbung.social.gepostetTitel')}
        beschreibung={t('werbung.social.gepostetInfo')}
        fuss={
          <Button
            laedt={laeuft}
            disabled={falsch}
            onClick={() =>
              void aus(() => gepostet(post.id, Object.fromEntries(Object.entries(links).filter(([, l]) => l))), {
                de: 'Als veröffentlicht vermerkt',
                fr: 'Marqué comme publié',
              }).then(onSchliessen)
            }
          >
            {t('werbung.social.gepostet')}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {post.netzwerke.map((n) => (
            <Feld
              key={n}
              id={`link-${n}`}
              label={t(`marketing.netzwerk.${n}`)}
              hinweis={t('werbung.social.linkHinweis')}
            >
              <Input
                id={`link-${n}`}
                type="url"
                placeholder="https://"
                value={links[n] ?? ''}
                onChange={(e) => {
                  setLinks({ ...links, [n]: e.target.value.trim() })
                }}
              />
            </Feld>
          ))}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
