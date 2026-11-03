import { FileText, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { mailMitPdf, pdfAblegen, type Versand } from '../services/dokumente'
import type { Grossprojekt } from '../types'

/** Was der Dialog vorschlägt; alles bleibt vor dem Senden änderbar. */
export interface MailVorschlag {
  art: Versand['art']
  an: string
  betreff: string
  text: string
  sprache: 'de' | 'fr'
  name: string
}

/**
 * Mail mit einem PDF der Akte: zuerst ansehen, dann senden. «Senden» ist die Freigabe (Regel 6), die Mail geht über
 * den Ausgangskorb aus dem eigenen Postfach. Ein Hinweis (z. B. fehlendes Einverständnis) steht oben.
 */
export function MailPdfDialog({
  g,
  titel,
  vorschlag,
  erzeuge,
  hinweis,
  onGesendet,
  onSchliessen,
}: {
  g: Grossprojekt
  titel: string
  vorschlag: MailVorschlag
  erzeuge: () => Promise<Uint8Array>
  hinweis?: string | undefined
  onGesendet?: () => Promise<unknown>
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [m, setM] = useState({ an: vorschlag.an, cc: '', betreff: vorschlag.betreff, text: vorschlag.text })
  const [ansehen, setAnsehen] = useState(false)
  // Ein Schlüssel pro geöffnetem Fenster: ein Doppelklick legt die Mail nicht zweimal an.
  const [tag] = useState(() => String(Date.now()))

  async function oeffnen() {
    setAnsehen(true)
    try {
      const bytes = await erzeuge()
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 60_000)
    } finally {
      setAnsehen(false)
    }
  }

  async function senden() {
    const ok = await aus(
      async () => {
        const anhang = await pdfAblegen(g, vorschlag.name, await erzeuge())
        await mailMitPdf(
          g,
          {
            art: vorschlag.art,
            an: m.an.trim(),
            ...(m.cc.trim() ? { cc: m.cc.trim() } : {}),
            betreff: m.betreff,
            text: m.text,
            sprache: vorschlag.sprache,
            anhang,
          },
          tag,
        )
        await onGesendet?.()
      },
      { de: 'Im Ausgangskorb, wird gesendet', fr: 'Dans la corbeille de sortie, envoi en cours' },
    )
    if (ok) onSchliessen()
  }

  const feld = (k: 'an' | 'cc' | 'betreff', label: string) => (
    <Feld id={`gp-mail-${k}`} label={label} {...(k === 'cc' ? {} : { pflicht: true })}>
      <Input
        id={`gp-mail-${k}`}
        type={k === 'betreff' ? 'text' : 'email'}
        value={m[k]}
        onChange={(e) => {
          setM({ ...m, [k]: e.target.value })
        }}
      />
    </Feld>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={titel}
        beschreibung={t('grossprojekte.mail.beschreibung')}
        breite="breit"
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button variant="secondary" laedt={ansehen} onClick={() => void oeffnen()}>
              <FileText />
              {t('grossprojekte.mail.ansehen')}
            </Button>
            <Button laedt={laeuft} disabled={!m.an.trim() || !m.betreff.trim()} onClick={() => void senden()}>
              <Send />
              {t('grossprojekte.mail.senden')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {hinweis && <p className="bg-warn-soft text-warn rounded-md px-3 py-2 text-sm">{hinweis}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {feld('an', t('grossprojekte.mail.an'))}
            {feld('cc', t('grossprojekte.mail.cc'))}
          </div>
          {feld('betreff', t('grossprojekte.mail.betreff'))}
          <Feld id="gp-mail-text" label={t('grossprojekte.mail.text')}>
            <Textarea
              id="gp-mail-text"
              rows={9}
              value={m.text}
              onChange={(e) => {
                setM({ ...m, text: e.target.value })
              }}
            />
          </Feld>
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <FileText className="size-3.5" aria-hidden="true" />
            {vorschlag.name}
          </p>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
