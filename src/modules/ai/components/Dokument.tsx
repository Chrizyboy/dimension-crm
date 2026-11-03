import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, FileSearch, ListTodo, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KiHinweis } from '@/components/shared/ki/KiHinweis'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatRelativ } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { useKiNachher, type KiBezugTabelle } from '@/services/ki'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { ladeGespraeche, legeAufgabeAn, leseDokument } from '../services/assistent'
import type { DokumentErgebnis } from '../types'
import { ZielLink } from './ZielLink'

const TYPEN = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX = 5 * 1024 * 1024

/**
 * Dokument lesen: PDF oder Foto hineinziehen. Der Assistent erkennt die Art (Lieferantenrechnung, Bewilligung,
 * Datenblatt …), liest die wichtigsten Angaben mit Sicherheit und sucht passende Projekte, Offerten oder Kunden.
 * Übernommen wird von Hand: Akte öffnen, Aufgabe anlegen oder Angaben kopieren.
 */
export function Dokument() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const nachher = useKiNachher()
  const qc = useQueryClient()
  const eingabe = useRef<HTMLInputElement>(null)
  const [ziehen, setZiehen] = useState(false)
  const [laeuft, setLaeuft] = useState<string | null>(null)
  const [ergebnis, setErgebnis] = useState<DokumentErgebnis | null>(null)
  const [aufgabe, setAufgabe] = useState(false)
  const g = useQuery({ queryKey: ['assistent', 'gespraeche'], queryFn: ladeGespraeche })
  const zuletzt = (g.data ?? []).filter((x) => x.art === 'dokument').slice(0, 8)

  async function lies(datei: File | undefined) {
    if (!datei) return
    if (!TYPEN.includes(datei.type)) {
      melde('warnung', { de: 'Nur PDF oder Bild', fr: 'Uniquement PDF ou image' })
      return
    }
    if (datei.size > MAX) {
      melde('warnung', { de: 'Datei grösser als 5 MB', fr: 'Fichier de plus de 5 Mo' })
      return
    }
    setLaeuft(datei.name)
    setErgebnis(null)
    setAufgabe(false)
    try {
      setErgebnis(await leseDokument(datei, sprache))
      void qc.invalidateQueries({ queryKey: ['assistent', 'gespraeche'] })
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(null)
      nachher()
    }
  }

  async function aufgabeAnlegen(e: DokumentErgebnis) {
    const ziel = e.treffer[0]
    try {
      await legeAufgabeAn({
        titel: e.dokument.titel || e.dokument.art,
        text: [e.dokument.zusammenfassung, e.dokument.naechster_schritt].filter(Boolean).join('\n\n'),
        faellig_am: null,
        person_id: ich?.id ?? null,
        bezug: ziel ? { tabelle: ziel.tabelle as KiBezugTabelle, id: ziel.id } : null,
      })
      setAufgabe(true)
      melde('ok', { de: 'Aufgabe angelegt', fr: 'Tâche créée' })
    } catch (f) {
      meldeFehler(f, 'assistent')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <button
          type="button"
          onClick={() => eingabe.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setZiehen(true)
          }}
          onDragLeave={() => {
            setZiehen(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setZiehen(false)
            void lies(e.dataTransfer.files[0])
          }}
          className={cn(
            'text-muted-foreground focus-visible:ring-ring flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed p-6 text-center outline-none focus-visible:ring-2',
            ziehen && 'border-accent bg-accent-soft',
          )}
        >
          <Upload className="size-6" aria-hidden="true" />
          <span className="text-foreground font-medium">{t('assistent.dokumentZiehen')}</span>
          <span className="text-xs">{t('assistent.dokumentArten')}</span>
        </button>
        <input
          ref={eingabe}
          type="file"
          accept={TYPEN.join(',')}
          className="hidden"
          aria-label={t('assistent.dokumentWaehlen')}
          onChange={(e) => {
            void lies(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {laeuft && (
          <div className="bg-surface flex flex-col gap-2 rounded-xl border p-4" aria-live="polite">
            <span className="text-sm">{t('assistent.dokumentLiest', { name: laeuft })}</span>
            <Skelett className="h-4 w-2/3" />
            <Skelett className="h-24" />
          </div>
        )}
        {ergebnis && (
          <section className="bg-surface flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-display text-base font-semibold">{ergebnis.dokument.titel}</h2>
              <Badge ton="info">
                {t(`assistent.dokArt.${ergebnis.dokument.art}`, { defaultValue: ergebnis.dokument.art })}
              </Badge>
            </div>
            <p className="text-sm">{ergebnis.dokument.zusammenfassung}</p>
            <dl className="divide-y text-sm">
              {ergebnis.dokument.felder.map((f, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-2 py-1.5">
                  <dt className="text-muted-foreground">{f.name}</dt>
                  <dd className="min-w-0 break-words">{f.wert}</dd>
                  <Badge ton={f.sicher ? 'ok' : 'warnung'}>
                    {f.sicher ? t('assistent.sicher') : t('assistent.pruefen')}
                  </Badge>
                </div>
              ))}
            </dl>
            {ergebnis.treffer.length > 0 && (
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">{t('assistent.gehoertZu')}</h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {ergebnis.treffer.map((x) => (
                    <li key={x.id}>
                      <ZielLink tabelle={x.tabelle} id={x.id}>
                        {x.titel}
                      </ZielLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ergebnis.dokument.naechster_schritt && (
              <p className="bg-surface-2 rounded-lg border border-dashed p-3 text-sm">
                <span className="font-semibold">{t('assistent.naechsterSchritt')}: </span>
                {ergebnis.dokument.naechster_schritt}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void aufgabeAnlegen(ergebnis)} disabled={aufgabe}>
                <ListTodo />
                {aufgabe ? t('assistent.uebernommen') : t('assistent.aufgabeAnlegen')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const d = ergebnis.dokument
                  const text = [d.titel, d.zusammenfassung, ...d.felder.map((f) => `${f.name}: ${f.wert}`)].join('\n')
                  void navigator.clipboard.writeText(text).then(
                    () => {
                      melde('ok', { de: 'Kopiert', fr: 'Copié' })
                    },
                    () => undefined,
                  )
                }}
              >
                <Copy />
                {t('assistent.kopieren')}
              </Button>
            </div>
          </section>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <KiHinweis />
        <section className="bg-surface flex flex-col gap-2 rounded-xl border p-4">
          <h2 className="font-display text-sm font-semibold">{t('assistent.zuletztGelesen')}</h2>
          {zuletzt.length === 0 ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <FileSearch className="size-4" aria-hidden="true" />
              {t('assistent.nochKeineDokumente')}
            </p>
          ) : (
            <ul className="flex flex-col text-sm">
              {zuletzt.map((x) => (
                <li key={x.id} className="flex justify-between gap-2 border-b py-2 last:border-0">
                  <span className="truncate">{x.titel}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatRelativ(x.geaendert_am, sprache)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
