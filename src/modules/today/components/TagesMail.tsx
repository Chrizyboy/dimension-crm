import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { tagesMailText } from '../lib/tag'
import { tagMailSchema } from '../schema'
import { tagesMailSenden } from '../services/meinTag'
import type { MeinTag } from '../types'

/**
 * «Übersicht per Mail an mich» (V233 heuteMailText): zeigt den Text vor dem Senden. Der Klick auf «An mich
 * senden» ist die Freigabe; die Mail geht über den Ausgangskorb aus dem eigenen Postfach.
 */
export function TagesMail({ tag, onSchliessen }: { tag: MeinTag; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const datum = formatDatum(tag.heute)
  const [an, setAn] = useState(ich?.email ?? '')
  const [text, setText] = useState(() =>
    tagesMailText(tag, (l) => t(`tag.liste.${l}`), t('tag.mail.kopf', { datum, name: tag.person.name })),
  )
  const [laeuft, setLaeuft] = useState(false)
  const gueltig = tagMailSchema.safeParse({ an }).success

  async function senden() {
    setLaeuft(true)
    try {
      await tagesMailSenden(an, t('tag.mail.betreff', { datum }), text, sprache)
      melde('ok', { de: 'Übersicht liegt im Ausgangskorb', fr: 'Résumé dans la corbeille de sortie' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'tag')
      melde('kritisch', { de: 'Nicht in den Ausgangskorb gelegt', fr: 'Pas déposé dans la corbeille de sortie' })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('tag.mail.titel')}
        beschreibung={t('tag.mail.beschreibung')}
        className="md:max-w-xl"
        fuss={
          <Button onClick={() => void senden()} laedt={laeuft} disabled={!gueltig || !text.trim()}>
            {t('tag.mail.senden')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Feld
            id="tag-mail-an"
            label={t('tag.mail.an')}
            {...(ich?.email ? {} : { hinweis: t('tag.mail.ohneAdresse') })}
          >
            <Input
              id="tag-mail-an"
              type="email"
              value={an}
              onChange={(e) => {
                setAn(e.target.value)
              }}
            />
          </Feld>
          <Textarea
            aria-label={t('tag.mail.titel')}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
            }}
            rows={14}
            className="font-mono text-xs"
          />
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
