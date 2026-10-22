import { useQueryClient } from '@tanstack/react-query'
import { CloudUpload, ExternalLink, FileText, FolderOpen, Image as Bild } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KONTAKT_SCHLUESSEL } from '@/hooks/useKontakte'
import { meldeFehler } from '@/services/fehler'
import { meldeIntegrationsFehler, microsoft, useMeineMicrosoftVerbindung } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { datumOderLeer } from '../lib/anzeige'
import { dokumentAdresse } from '../services/kundenakte'
import type { Dokument } from '../types'

/** Die 11 Ordner der Vorlage in ihrer gewohnten Reihenfolge; Unbekanntes kommt ans Ende. */
const ORDNER = [
  'angebot',
  'werkvertrag',
  'korrespondenz',
  'rechnungen',
  'bewilligungen',
  'bilder',
  'plaene',
  'luftbild',
  'lieferanten',
  'selbstkosten',
  'sav',
] as const

function groesse(bytes: number | null): string {
  if (!bytes) return ''
  return bytes > 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${String(Math.max(1, Math.round(bytes / 1000)))} kB`
}

/** Öffnet ein Dokument in einem neuen Fenster (SharePoint oder kurz gültiger Link). */
async function oeffne(d: Dokument) {
  // Fenster sofort öffnen, sonst blockiert der Browser es nach dem Warten auf den Link.
  const fenster = window.open('', '_blank')
  if (fenster) fenster.opener = null
  try {
    const adresse = await dokumentAdresse(d)
    if (!adresse) {
      fenster?.close()
      melde('warnung', { de: 'Datei nicht gefunden', fr: 'Fichier introuvable' })
      return
    }
    if (fenster) fenster.location.href = adresse
    else window.open(adresse, '_blank', 'noopener')
  } catch (f) {
    fenster?.close()
    meldeFehler(f, 'dokument')
    melde('kritisch', { de: 'Datei konnte nicht geöffnet werden', fr: "Impossible d'ouvrir le fichier" })
  }
}

/**
 * Dateien, die nur im CRM liegen, in den Kundenordner auf SharePoint kopieren (V233 «Backup»,
 * Ordner K0123 Name/<Ordner>). Läuft für alle zusätzlich nachts über den Zeitplan.
 */
function SharepointSichern({ offen }: { offen: Dokument[] }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const verbindung = useMeineMicrosoftVerbindung()
  const [laeuft, setLaeuft] = useState(false)
  if (offen.length === 0 || !verbindung.data) return null
  return (
    <div className="bg-muted/60 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm">
      <span>{t('dokument.nichtInSharepoint', { count: offen.length })}</span>
      <Button
        size="sm"
        variant="secondary"
        laedt={laeuft}
        onClick={() => {
          setLaeuft(true)
          microsoft
            .sharepointSichern(offen.map((d) => d.id))
            .then((r) => {
              melde(r.fehler ? 'warnung' : 'ok', {
                de: `${r.gesichert} in SharePoint gesichert${r.fehler ? `, ${r.fehler} nicht` : ''}`,
                fr: `${r.gesichert} sauvegardé(s) dans SharePoint${r.fehler ? `, ${r.fehler} non` : ''}`,
              })
              return qc.invalidateQueries({ queryKey: KONTAKT_SCHLUESSEL })
            })
            .catch(meldeIntegrationsFehler)
            .finally(() => {
              setLaeuft(false)
            })
        }}
      >
        <CloudUpload />
        {t('dokument.inSharepoint')}
      </Button>
    </div>
  )
}

/**
 * Reiter «Dokumente»: alle Dateien des Kunden nach den Ordnern der Vorlage. Dateien aus V233 liegen
 * schon in SharePoint; neue Dateien aus dem CRM lassen sich dorthin sichern.
 */
export function AkteDokumente({ dokumente }: { dokumente: Dokument[] }) {
  const { t } = useTranslation()
  const nurImCrm = useMemo(() => dokumente.filter((d) => d.speicher === 'intern' && !d.sharepoint_url), [dokumente])
  const gruppen = useMemo(() => {
    const nach = new Map<string, Dokument[]>()
    for (const d of dokumente) {
      const o = d.ordner ?? 'andere'
      nach.set(o, [...(nach.get(o) ?? []), d])
    }
    const rang = (o: string) => {
      const i = (ORDNER as readonly string[]).indexOf(o)
      return i === -1 ? ORDNER.length : i
    }
    return [...nach.entries()].sort(([a], [b]) => rang(a) - rang(b))
  }, [dokumente])

  if (dokumente.length === 0) {
    return <Leerzustand icon={FolderOpen} titel={t('dokument.leer')} text={t('dokument.leerText')} />
  }

  return (
    <div className="flex flex-col gap-5">
      <SharepointSichern offen={nurImCrm} />
      {gruppen.map(([ordner, liste]) => (
        <section key={ordner} className="flex flex-col gap-1.5">
          <h3 className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
            {t(`dokument.ordner.${ordner}`, { defaultValue: ordner })}
            <Badge>{liste.length}</Badge>
          </h3>
          <ul className="flex flex-col divide-y rounded-lg border">
            {liste.map((d) => {
              const Icon = d.mime_typ?.startsWith('image/') ? Bild : FileText
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => void oeffne(d)}
                    className="hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-3 px-3 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset"
                  >
                    <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    <span className="text-muted-foreground zahlen hidden shrink-0 text-xs sm:inline">
                      {[groesse(d.bytes), datumOderLeer(d.hochgeladen_am ?? d.erstellt_am)].filter(Boolean).join(' · ')}
                    </span>
                    {d.sharepoint_url && (
                      <ExternalLink className="text-muted-foreground size-3.5 shrink-0" aria-label="SharePoint" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
