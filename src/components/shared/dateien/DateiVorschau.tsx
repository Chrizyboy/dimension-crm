import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileQuestion,
  Mail,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { herunterladen, vorschauArt } from '@/lib/datei'
import { dokumentAdresse, dokumentInhalt, type DokumentQuelle } from '@/services/dokumente'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'

const STUFEN = [1, 1.5, 2, 3] as const

/** Bild als PNG in die Zwischenablage (zum Einfügen in Mail, Teams, Word). JPEG nimmt die Zwischenablage nicht an. */
async function alsPngKopieren(blob: Blob): Promise<void> {
  const bild = await createImageBitmap(blob)
  const leinwand = document.createElement('canvas')
  leinwand.width = bild.width
  leinwand.height = bild.height
  leinwand.getContext('2d')?.drawImage(bild, 0, 0)
  const png = await new Promise<Blob>((ok, nein) => {
    leinwand.toBlob((b) => {
      if (b) ok(b)
      else nein(new Error('png'))
    }, 'image/png')
  })
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}

/**
 * Eine Datei ansehen, ohne die App zu verlassen (V234 «Vorschau»): Bilder mit Zoom und «Kopieren», PDF eingebettet,
 * mit Pfeilen (auch ← →) durch alle Dateien der Liste. Dateien nur in SharePoint öffnen dort, weil dort die
 * Microsoft-Anmeldung gilt.
 */
export function DateiVorschau({
  dateien,
  index,
  onIndex,
  onSchliessen,
  onMail,
}: {
  dateien: DokumentQuelle[]
  index: number | null
  onIndex: (i: number) => void
  onSchliessen: () => void
  /** Ohne Angabe kein «Per Mail senden» (z. B. wenn kein Empfänger bekannt ist). */
  onMail?: ((d: DokumentQuelle) => void) | undefined
}) {
  const d = index === null ? undefined : dateien[index]
  return (
    <Dialog
      open={Boolean(d)}
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      {d && index !== null && (
        <Inhalt key={d.id} d={d} nr={index} von={dateien.length} onIndex={onIndex} onMail={onMail} />
      )}
    </Dialog>
  )
}

function Inhalt({
  d,
  nr,
  von,
  onIndex,
  onMail,
}: {
  d: DokumentQuelle
  nr: number
  von: number
  onIndex: (i: number) => void
  onMail?: ((d: DokumentQuelle) => void) | undefined
}) {
  const { t } = useTranslation()
  const [stufe, setStufe] = useState(0)
  const [laeuft, setLaeuft] = useState<'laden' | 'kopieren' | null>(null)
  const art = vorschauArt(d)
  const nurSharepoint = !d.speicher_pfad && Boolean(d.sharepoint_url)
  const adresse = useQuery({
    queryKey: ['datei-vorschau', d.id],
    queryFn: () => dokumentAdresse(d),
    enabled: !nurSharepoint && art !== 'andere',
    // Der Link gilt 5 Minuten; danach beim nächsten Öffnen neu holen.
    staleTime: 4 * 60_000,
  })
  const zoom = STUFEN[stufe] ?? 1
  const blaettern = (schritt: number) => {
    if (von > 1) onIndex((nr + schritt + von) % von)
  }

  async function mitInhalt(was: 'laden' | 'kopieren') {
    setLaeuft(was)
    try {
      const blob = await dokumentInhalt(d)
      if (!blob) {
        melde('warnung', { de: 'Datei nicht gefunden', fr: 'Fichier introuvable' })
        return
      }
      if (was === 'laden') herunterladen(blob, d.name, blob.type || 'application/octet-stream')
      else {
        await alsPngKopieren(blob)
        melde('ok', { de: 'Bild kopiert', fr: 'Image copiée' })
      }
    } catch (f) {
      meldeFehler(f, 'datei')
      melde('kritisch', {
        de: was === 'laden' ? 'Herunterladen ging nicht' : 'Kopieren ging nicht',
        fr: was === 'laden' ? 'Téléchargement impossible' : 'Copie impossible',
      })
    } finally {
      setLaeuft(null)
    }
  }

  return (
    <DialogInhalt
      art="seite"
      breite="breit"
      titel={d.name}
      beschreibung={von > 1 ? t('datei.nummer', { nr: nr + 1, von }) : t('datei.vorschau')}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        if (e.key === 'ArrowLeft') blaettern(-1)
        if (e.key === 'ArrowRight') blaettern(1)
      }}
      fuss={
        <div className="flex w-full flex-wrap items-center gap-2">
          {von > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('datei.zurueck')}
                onClick={() => {
                  blaettern(-1)
                }}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('datei.weiter')}
                onClick={() => {
                  blaettern(1)
                }}
              >
                <ChevronRight />
              </Button>
            </>
          )}
          {art === 'bild' && !nurSharepoint && (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('datei.zoomRaus')}
                disabled={stufe === 0}
                onClick={() => {
                  setStufe((s) => Math.max(0, s - 1))
                }}
              >
                <ZoomOut />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('datei.zoomRein')}
                disabled={stufe === STUFEN.length - 1}
                onClick={() => {
                  setStufe((s) => Math.min(STUFEN.length - 1, s + 1))
                }}
              >
                <ZoomIn />
              </Button>
            </>
          )}
          <span className="flex-1" />
          {art === 'bild' && !nurSharepoint && typeof ClipboardItem !== 'undefined' && (
            <Button variant="secondary" laedt={laeuft === 'kopieren'} onClick={() => void mitInhalt('kopieren')}>
              <Copy />
              {t('datei.kopieren')}
            </Button>
          )}
          {onMail && (
            <Button
              variant="secondary"
              onClick={() => {
                onMail(d)
              }}
            >
              <Mail />
              {t('datei.mail')}
            </Button>
          )}
          {nurSharepoint ? (
            <a
              href={d.sharepoint_url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'primary' })}
            >
              <ExternalLink />
              {t('datei.inSharepoint')}
            </a>
          ) : (
            <Button laedt={laeuft === 'laden'} onClick={() => void mitInhalt('laden')}>
              <Download />
              {t('datei.herunterladen')}
            </Button>
          )}
        </div>
      }
    >
      {nurSharepoint ? (
        <Leerzustand icon={ExternalLink} titel={t('datei.sharepoint')} text={t('datei.sharepointText')} />
      ) : art === 'andere' ? (
        <Leerzustand icon={FileQuestion} titel={t('datei.keineVorschau')} text={t('datei.keineVorschauText')} />
      ) : adresse.isError ? (
        <Leerzustand icon={FileQuestion} titel={t('datei.nichtGeladen')} text={t('datei.nichtGeladenText')} />
      ) : !adresse.data ? (
        <Skelett className="h-[60vh] w-full" />
      ) : art === 'pdf' ? (
        <iframe
          title={d.name}
          src={adresse.data}
          className="bg-muted h-[calc(100vh-14rem)] min-h-96 w-full rounded-lg"
        />
      ) : (
        <div className="bg-muted flex max-h-[calc(100vh-14rem)] min-h-64 overflow-auto rounded-lg">
          <button
            type="button"
            className={
              zoom === 1
                ? 'm-auto cursor-zoom-in outline-none focus-visible:ring-2'
                : 'shrink-0 cursor-zoom-out outline-none focus-visible:ring-2'
            }
            style={zoom === 1 ? undefined : { width: `${String(zoom * 100)}%` }}
            aria-label={stufe === STUFEN.length - 1 ? t('datei.zoomZurueck') : t('datei.zoomRein')}
            onClick={() => {
              setStufe((s) => (s === STUFEN.length - 1 ? 0 : s + 1))
            }}
          >
            <img
              src={adresse.data}
              alt={d.name}
              className={zoom === 1 ? 'max-h-[calc(100vh-15rem)] max-w-full object-contain' : 'h-auto w-full'}
            />
          </button>
        </div>
      )}
    </DialogInhalt>
  )
}
