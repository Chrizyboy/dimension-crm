import { FileArchive, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import { Button } from '@/components/ui/button'
import { herunterladen } from '@/lib/datei'
import type { MailEntwurf } from '@/services/ausgang'
import { dokumenteAlsZip, type DokumentQuelle } from '@/services/dokumente'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { DateiVorschau } from './DateiVorschau'

/** Welches Fenster zu welcher Datei offen ist. */
export type DateiFensterZustand = { art: 'vorschau' | 'mail'; id: string } | null

/** Empfänger, Sprache und Bezug der Akte für «Per Mail senden»; ohne Adresse gibt es den Knopf nicht. */
export type DateiMailEmpfaenger = { an: string | null | undefined; sprache: 'de' | 'fr' } & Pick<
  MailEntwurf,
  'kontakt_id' | 'verkaufschance_id' | 'offerte_id' | 'projekt_id' | 'bezug_tabelle' | 'bezug_id'
>

/**
 * Vorschau und «Per Mail senden» für die Dateien einer Akte (Kunde, Lead, Service-Fall). Die Liste selbst bleibt
 * in der Akte; sie setzt nur den Zustand. Die Mail geht über den Ausgangskorb (Regel 6), die gewählte Datei ist
 * angekreuzt, die anderen der Akte lassen sich dazu wählen.
 */
export function DateiFenster({
  dateien,
  zustand,
  onZustand,
  mail,
}: {
  dateien: DokumentQuelle[]
  zustand: DateiFensterZustand
  onZustand: (z: DateiFensterZustand) => void
  /** Ohne Adresse (z. B. Kunde ohne Mail) gibt es kein «Per Mail senden». */
  mail?: DateiMailEmpfaenger | null | undefined
}) {
  const { t } = useTranslation()
  const an = mail?.an?.trim()
  const index = zustand?.art === 'vorschau' ? dateien.findIndex((d) => d.id === zustand.id) : -1
  const zuMailen = zustand?.art === 'mail' ? dateien.find((d) => d.id === zustand.id) : undefined
  return (
    <>
      <DateiVorschau
        dateien={dateien}
        index={index >= 0 ? index : null}
        onIndex={(i) => {
          const d = dateien[i]
          if (d) onZustand({ art: 'vorschau', id: d.id })
        }}
        onSchliessen={() => {
          onZustand(null)
        }}
        onMail={
          an
            ? (d) => {
                onZustand({ art: 'mail', id: d.id })
              }
            : undefined
        }
      />
      {mail && an && zuMailen && (
        <MailDialog
          titel={t('datei.mailTitel')}
          vorlage={{
            ...mail,
            an,
            art: 'datei',
            // In der Sprache des Kunden, nicht in der Sprache der App.
            betreff: zuMailen.name,
            text: t('datei.mailText', { lng: mail.sprache }),
          }}
          dateien={[zuMailen, ...dateien.filter((d) => d.id !== zuMailen.id)].map((d) => ({
            id: d.id,
            name: d.name,
            vorgewaehlt: d.id === zuMailen.id,
          }))}
          onSchliessen={() => {
            onZustand(null)
          }}
        />
      )}
    </>
  )
}

/** Kleiner Knopf «Per Mail senden» in einer Dateizeile. */
export function DateiMailKnopf({ name, onClick }: { name: string; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('datei.mailFuer', { name })}
      title={t('datei.mail')}
      onClick={onClick}
    >
      <Mail />
    </Button>
  )
}

/**
 * «Alle als ZIP» (V234): alle Dateien der Akte in einem Download, z. B. für den Netzbetreiber oder die
 * Förderung. Erst ab zwei Dateien im CRM-Speicher sichtbar; Dateien nur in SharePoint nennt die Meldung.
 */
export function ZipKnopf({ dateien, name }: { dateien: DokumentQuelle[]; name: string }) {
  const { t } = useTranslation()
  const [laeuft, setLaeuft] = useState(false)
  if (dateien.filter((d) => d.speicher_pfad).length < 2) return null
  return (
    <Button
      size="sm"
      variant="ghost"
      laedt={laeuft}
      onClick={() => {
        setLaeuft(true)
        dokumenteAlsZip(dateien)
          .then(({ zip, ohne }) => {
            herunterladen(zip as BlobPart, `${name.replace(/[\\/:*?"<>|]/g, '_')}.zip`, 'application/zip')
            if (ohne.length > 0)
              melde('info', {
                de: `${String(ohne.length)} Datei(en) liegen nur in SharePoint und fehlen im ZIP`,
                fr: `${String(ohne.length)} fichier(s) seulement dans SharePoint, absent(s) du ZIP`,
              })
          })
          .catch((f: unknown) => {
            meldeFehler(f, 'zip')
            melde('kritisch', { de: 'ZIP konnte nicht erstellt werden', fr: 'Impossible de créer le ZIP' })
          })
          .finally(() => {
            setLaeuft(false)
          })
      }}
    >
      <FileArchive />
      {t('datei.zip', { count: dateien.length })}
    </Button>
  )
}
