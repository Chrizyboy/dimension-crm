import { FileText, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useRegeln } from '../hooks/useGrossprojekte'
import { heuteIso } from '../lib/pipeline'
import { ladeAbsender } from '../services/dokumente'
import { dossierPdf } from '../services/dossierPdf'
import { akteSetzen, vermerken } from '../services/grossprojekte'
import { potenzialName, potenzialPdf } from '../services/potenzialPdf'
import type { Grossprojekt } from '../types'
import { MailPdfDialog } from './MailPdfDialog'

/** Mail-Adresse beim Kunden: wer entscheidet, sonst der erste Kontakt mit Mail, sonst die Ansprechperson. */
function kundenMail(g: Grossprojekt): string {
  const mitMail = g.kontakte.filter((k) => k.email)
  return mitMail.find((k) => k.rolle === 'entscheider')?.email ?? mitMail[0]?.email ?? g.ansprechperson?.email ?? ''
}

/**
 * Potenzialanalyse für den Kunden: PDF in seiner Sprache (nur Dimension Solaire genannt), mit Mail an wer entscheidet.
 * Nach dem Senden steht es im Verlauf.
 */
export function PotenzialSenden({ g }: { g: Grossprojekt }) {
  const { i18n } = useTranslation()
  const t = i18n.getFixedT(g.sprache)
  const tUi = useTranslation().t
  const regeln = useRegeln().data
  const [offen, setOffen] = useState(false)
  const name = potenzialName(g, t)
  const kontakt = g.kontakte.find((k) => k.email === kundenMail(g))?.name ?? ''
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setOffen(true)
        }}
      >
        <FileText />
        {tUi('grossprojekte.mail.potenzialKnopf')}
      </Button>
      {offen && (
        <MailPdfDialog
          g={g}
          titel={tUi('grossprojekte.mail.potenzialTitel')}
          vorschlag={{
            art: 'potenzialanalyse',
            an: kundenMail(g),
            betreff: t('grossprojekte.mail.potenzial.betreff', { name: g.bauherr ?? g.titel }),
            text: t('grossprojekte.mail.potenzial.text', { anrede: kontakt ? ` ${kontakt}` : '' }),
            sprache: g.sprache,
            name,
          }}
          erzeuge={async () => potenzialPdf(g, regeln, await ladeAbsender(g), t)}
          onGesendet={() => vermerken(g.id, 'mail', `Potenzialanalyse gesendet (${name})`)}
          onSchliessen={() => {
            setOffen(false)
          }}
        />
      )}
    </>
  )
}

/**
 * Dossier an Youdera: PDF mit allem für das Angebot und Mail an die Adresse aus der Einstellung. Fehlt das
 * Einverständnis des Kunden zur Weitergabe, steht ein Hinweis oben. Nach dem Senden ist «Dossier gesendet» gesetzt.
 */
export function DossierSenden({ g }: { g: Grossprojekt }) {
  const { t, i18n } = useTranslation()
  const tDe = i18n.getFixedT('de')
  const regeln = useRegeln().data
  const [offen, setOffen] = useState(false)
  const name = `Dossier ${g.nummer}.pdf`
  return (
    <>
      <Button
        size="sm"
        variant={g.youdera.dossier_am ? 'ghost' : 'primary'}
        onClick={() => {
          setOffen(true)
        }}
      >
        <Send />
        {t(g.youdera.dossier_am ? 'grossprojekte.mail.dossierNochmals' : 'grossprojekte.mail.dossierKnopf')}
      </Button>
      {offen && (
        <MailPdfDialog
          g={g}
          titel={t('grossprojekte.mail.dossierTitel')}
          hinweis={g.unterlagen.einverstaendnis ? undefined : t('grossprojekte.mail.ohneEinverstaendnis')}
          vorschlag={{
            art: 'youdera_dossier',
            an: regeln?.pipeline?.youdera_mail ?? '',
            betreff: tDe('grossprojekte.mail.dossier.betreff', { nummer: g.nummer, name: g.bauherr ?? g.titel }),
            text: tDe('grossprojekte.mail.dossier.text', { name: g.bauherr ?? g.titel, gemeinde: g.gemeinde ?? '' }),
            sprache: 'de',
            name,
          }}
          erzeuge={async () => dossierPdf(g, regeln, await ladeAbsender(g), tDe, 'de')}
          onGesendet={() => akteSetzen(g.id, { youdera: { ...g.youdera, dossier_am: heuteIso() } })}
          onSchliessen={() => {
            setOffen(false)
          }}
        />
      )}
    </>
  )
}
