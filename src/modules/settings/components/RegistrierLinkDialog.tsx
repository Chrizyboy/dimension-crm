import { Copy, Link2, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { registrierLink, registrierLinkErstellen } from '../services/benutzer'

/**
 * Zeigt den Registrier-Link einmal an (Chris 2.11.2026): kopieren oder per WhatsApp schicken. Den Link schickt die
 * Administration selbst; das CRM sendet nichts nach aussen. Der Link gilt 14 Tage und nur einmal.
 */
export function RegistrierLinkDialog({
  name,
  schluessel,
  onSchliessen,
}: {
  name: string
  schluessel: string
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const adresse = registrierLink(schluessel)
  const text = t('benutzer.link.nachricht', { name: name.split(' ')[0] ?? name, adresse })

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(adresse)
      melde('ok', { de: 'Link kopiert', fr: 'Lien copié' })
    } catch {
      melde('warnung', { de: 'Bitte den Link von Hand kopieren', fr: 'Merci de copier le lien à la main' })
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
        titel={t('benutzer.link.titel', { name })}
        beschreibung={t('benutzer.link.text')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.schliessen')}
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'secondary' })}
            >
              <MessageCircle />
              {t('benutzer.link.whatsapp')}
            </a>
            <Button onClick={() => void kopieren()}>
              <Copy />
              {t('benutzer.link.kopieren')}
            </Button>
          </>
        }
      >
        <Feld id="registrier-link" label={t('benutzer.link.feld')} hinweis={t('benutzer.link.hinweis')}>
          <Input
            id="registrier-link"
            readOnly
            value={adresse}
            onFocus={(e) => {
              e.target.select()
            }}
          />
        </Feld>
      </DialogInhalt>
    </Dialog>
  )
}

/** Knopf in der Person: neuen Registrier-Link erstellen (ältere verfallen) und anzeigen. */
export function RegistrierLinkKnopf({ personId, name }: { personId: string; name: string }) {
  const { t } = useTranslation()
  const [schluessel, setSchluessel] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function erstellen() {
    setLaeuft(true)
    try {
      setSchluessel(await registrierLinkErstellen(personId))
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (s) melde('kritisch', zweisprachig(s))
      else {
        meldeFehler(f, 'einladen')
        melde('kritisch', { de: 'Link nicht erstellt', fr: 'Lien non créé' })
      }
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <>
      <p className="text-muted-foreground text-xs">{t('benutzer.link.ohneMailText')}</p>
      <Button variant="secondary" laedt={laeuft} onClick={() => void erstellen()}>
        <Link2 />
        {t('benutzer.link.erstellen')}
      </Button>
      {schluessel && (
        <RegistrierLinkDialog
          name={name}
          schluessel={schluessel}
          onSchliessen={() => {
            setSchluessel(null)
          }}
        />
      )}
    </>
  )
}
