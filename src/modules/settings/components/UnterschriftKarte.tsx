import { PenLine, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import {
  bildAlsUnterschrift,
  entferneUnterschrift,
  ladeUnterschrift,
  speichereUnterschrift,
} from '@/services/unterschrift'
import { UnterschriftZeichnen } from './UnterschriftZeichnen'

/**
 * «Meine Unterschrift» in Mein Konto: Bild hochladen (Foto oder Scan) oder direkt zeichnen. Sie wird nur in
 * Dokumente gesetzt, die die Person selbst aus dem CRM unterschreibt (z. B. Werkvertrag beim Senden).
 */
export function UnterschriftKarte({ personId }: { personId: string }) {
  const { t } = useTranslation()
  const datei = useRef<HTMLInputElement>(null)
  const [bild, setBild] = useState<string | null | undefined>(undefined)
  const [zeichnen, setZeichnen] = useState(false)
  const [laeuft, setLaeuft] = useState(false)

  const zeigen = (bytes: Uint8Array | null) => {
    setBild((alt) => {
      if (alt) URL.revokeObjectURL(alt)
      return bytes ? URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' })) : null
    })
  }

  useEffect(() => {
    ladeUnterschrift(personId)
      .then(zeigen)
      .catch((f: unknown) => {
        meldeFehler(f, 'unterschrift.laden')
        setBild(null)
      })
  }, [personId])

  async function ablegen(png: Blob) {
    setLaeuft(true)
    try {
      await speichereUnterschrift(personId, png)
      zeigen(new Uint8Array(await png.arrayBuffer()))
      melde('ok', { de: 'Unterschrift gespeichert', fr: 'Signature enregistrée' })
    } catch (f) {
      meldeFehler(f, 'unterschrift.speichern')
      melde('kritisch', { de: 'Unterschrift nicht gespeichert', fr: 'Signature non enregistrée' })
    } finally {
      setLaeuft(false)
    }
  }

  async function entfernen() {
    setLaeuft(true)
    try {
      await entferneUnterschrift(personId)
      zeigen(null)
      melde('ok', { de: 'Unterschrift entfernt', fr: 'Signature supprimée' })
    } catch (f) {
      meldeFehler(f, 'unterschrift.entfernen')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('konto.unterschrift.titel')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">{t('konto.unterschrift.text')}</p>
        {bild === undefined ? (
          <Skelett className="h-20" />
        ) : bild ? (
          // Weisser Grund wie Papier, damit die Tinte in beiden Darstellungen gleich aussieht.
          <div className="border-border flex justify-center rounded-md border bg-white p-2">
            <img src={bild} alt={t('konto.unterschrift.bild')} className="h-16 w-auto" />
          </div>
        ) : (
          <p className="text-muted-foreground">{t('konto.unterschrift.keine')}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            laedt={laeuft}
            onClick={() => {
              setZeichnen(true)
            }}
          >
            <PenLine />
            {t('konto.unterschrift.zeichnen')}
          </Button>
          <Button variant="secondary" disabled={laeuft} onClick={() => datei.current?.click()}>
            <Upload />
            {t('konto.unterschrift.hochladen')}
          </Button>
          {bild && (
            <Button variant="ghost" disabled={laeuft} onClick={() => void entfernen()}>
              <Trash2 />
              {t('konto.unterschrift.entfernen')}
            </Button>
          )}
          <input
            ref={datei}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            aria-label={t('konto.unterschrift.hochladen')}
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              bildAlsUnterschrift(f)
                .then(ablegen)
                .catch((x: unknown) => {
                  meldeFehler(x, 'unterschrift.bild')
                  melde('kritisch', { de: 'Bild nicht lesbar', fr: 'Image illisible' })
                })
            }}
          />
        </div>
      </KarteInhalt>
      {zeichnen && (
        <UnterschriftZeichnen
          onSchliessen={() => {
            setZeichnen(false)
          }}
          onFertig={(png) => {
            setZeichnen(false)
            void ablegen(png)
          }}
        />
      )}
    </Karte>
  )
}
