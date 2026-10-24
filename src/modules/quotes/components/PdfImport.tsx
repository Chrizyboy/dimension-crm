import { FileUp, Play } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatChf } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { useOffertAenderung } from '../hooks/useOfferten'
import { leseEturnityOfferte } from '../lib/eturnity'
import { brauchtKi, ergaenzeMitKi, leseMitKi } from '../lib/pdfKi'
import { pdfZeilen } from '../lib/pdfText'
import { findeZiel, type ImportZiel } from '../lib/pdfImport'
import { werteFuerOfferte } from '../lib/pdfUebernahme'
import { legeOfferteAn, legePdfAb, setzeWerte } from '../services/offerten'
import type { Eingang, Offerte, PdfWerte } from '../types'
import { EturnityMeldungen } from './EturnityMeldungen'

interface Posten {
  datei: File
  werte: PdfWerte | null
  ziel: ImportZiel
  fertig: 'ok' | 'fehler' | null
  fehler?: string
  /** Mit KI ergänzt (kein Eturnity-Format): besonders gut prüfen. */
  ki?: boolean
}

const KEINS = 'keins'

/**
 * Mehrere Eturnity-PDFs auf einmal (V183): hineinziehen, prüfen, dann «Ausführen».
 * Gibt es die Nummer schon, werden leere Felder ergänzt und das PDF abgelegt; sonst entsteht die Offerte
 * zum passenden Lead aus «Neue Offerten». Ohne eindeutigen Lead wählt man ihn von Hand oder überspringt.
 */
export default function PdfImport({
  offerten,
  eingang,
  onOeffnen,
}: {
  offerten: Offerte[]
  eingang: Eingang[]
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const [posten, setPosten] = useState<Posten[]>([])
  const [liest, setLiest] = useState(false)
  const ausfuehren = useOffertAenderung(async (p: Posten): Promise<string | null> => {
    if (!p.werte || p.ziel.art === 'keins') return null
    const werte = werteFuerOfferte(p.werte)
    let id: string
    let kontaktId: string
    if (p.ziel.art === 'offerte') {
      id = p.ziel.offerteId
      kontaktId = offerten.find((o) => o.id === id)?.kontaktId ?? ''
      await setzeWerte(id, werte, 'eturnity-pdf', true)
    } else {
      const lead = p.ziel.verkaufschanceId
      kontaktId = eingang.find((e) => e.id === lead)?.kontaktId ?? ''
      id = await legeOfferteAn({ verkaufschance_id: lead, nummer: p.werte.nummer, ...werte })
      await setzeWerte(id, { wirtschaftlichkeit: p.werte.wirtschaftlichkeit }, 'eturnity-pdf', true)
    }
    await legePdfAb({ id, kontaktId }, p.datei)
    return id
  })

  async function lies(dateien: FileList | null) {
    const pdfs = [...(dateien ?? [])].filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    )
    if (pdfs.length === 0) return
    setLiest(true)
    const neu: Posten[] = []
    for (const datei of pdfs) {
      try {
        const zeilen = await pdfZeilen(datei)
        let werte = leseEturnityOfferte(zeilen)
        let ki = false
        if (supabase && brauchtKi(werte)) {
          const k = await leseMitKi(zeilen).catch(() => null)
          if (k) {
            werte = ergaenzeMitKi(werte, k)
            ki = true
          }
        }
        neu.push({ datei, werte, ziel: findeZiel(werte, offerten, eingang), fertig: null, ki })
      } catch (f) {
        meldeFehler(f, 'offerten.import')
        neu.push({
          datei,
          werte: null,
          ziel: { art: 'keins' },
          fertig: 'fehler',
          fehler: t('offerten.import.unlesbar'),
        })
      }
    }
    setPosten((alt) => [...alt, ...neu])
    setLiest(false)
  }

  async function alleAusfuehren() {
    let ok = 0
    const neu = [...posten]
    for (let i = 0; i < neu.length; i++) {
      const p = neu[i]
      if (!p || p.fertig || p.ziel.art === 'keins') continue
      try {
        await ausfuehren.mutateAsync(p)
        neu[i] = { ...p, fertig: 'ok' }
        ok++
      } catch (f) {
        const s = fachFehlerSchluessel(f)
        if (!s) meldeFehler(f, 'offerten.import')
        neu[i] = { ...p, fertig: 'fehler', fehler: t(s ?? 'fachfehler.allgemein') }
      }
      setPosten([...neu])
    }
    melde(ok ? 'ok' : 'warnung', zweisprachig('offerten.import.fertig', { count: ok }))
  }

  const offenLeads = eingang.filter((e) => !e.offerteId)
  const bereit = posten.filter((p) => !p.fertig && p.ziel.art !== 'keins').length

  return (
    <div className="flex flex-col gap-4">
      <label
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={(e) => {
          e.preventDefault()
          void lies(e.dataTransfer.files)
        }}
        className="hover:bg-muted/60 focus-within:ring-ring flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center focus-within:ring-2"
      >
        <FileUp className="text-muted-foreground size-7" aria-hidden="true" />
        <span className="font-medium">{liest ? t('offerten.pdf.liest') : t('offerten.import.ziehen')}</span>
        <span className="text-muted-foreground max-w-md text-sm">{t('offerten.import.hinweis')}</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(e) => void lies(e.target.files)}
        />
      </label>

      {posten.length > 0 && (
        <div className="bg-surface flex flex-col divide-y rounded-xl border">
          {posten.map((p, i) => {
            const o =
              p.ziel.art === 'offerte'
                ? offerten.find((x) => x.id === (p.ziel as { offerteId: string }).offerteId)
                : undefined
            return (
              <div key={`${p.datei.name}-${i}`} className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.datei.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {p.werte
                      ? [
                          p.werte.nummer,
                          p.werte.kunde,
                          p.werte.betragRappen ? formatChf(p.werte.betragRappen, { mitWaehrung: true }) : null,
                          p.werte.kwp ? `${p.werte.kwp} kWp` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : p.fehler}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {p.ki && <Badge ton="info">{t('ki.offerte.mitKi')}</Badge>}
                  {p.fertig === 'ok' && <Badge ton="ok">{t('offerten.import.erledigt')}</Badge>}
                  {p.fertig === 'fehler' && <Badge ton="kritisch">{p.fehler}</Badge>}
                  {!p.fertig && p.ziel.art === 'offerte' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (o) onOeffnen(o.id)
                      }}
                    >
                      {t('offerten.import.ergaenzen', { nummer: o?.nummer ?? '' })}
                    </Button>
                  )}
                  {!p.fertig && p.werte && p.ziel.art !== 'offerte' && (
                    <Auswahl
                      aria-label={t('offerten.import.lead')}
                      className="w-60"
                      value={p.ziel.art === 'lead' ? p.ziel.verkaufschanceId : KEINS}
                      onValueChange={(v) => {
                        const neu = [...posten]
                        neu[i] = { ...p, ziel: v === KEINS ? { art: 'keins' } : { art: 'lead', verkaufschanceId: v } }
                        setPosten(neu)
                      }}
                      optionen={[
                        { wert: KEINS, text: t('offerten.import.ueberspringen') },
                        ...offenLeads.map((e) => ({ wert: e.id, text: `${e.name}${e.ort ? `, ${e.ort}` : ''}` })),
                      ]}
                    />
                  )}
                </div>
              </div>
            )
          })}
          <div className="flex flex-wrap justify-end gap-2 p-3">
            <Button
              variant="secondary"
              onClick={() => {
                setPosten([])
              }}
            >
              {t('offerten.import.leeren')}
            </Button>
            <Button disabled={bereit === 0} laedt={ausfuehren.isPending} onClick={() => void alleAusfuehren()}>
              <Play />
              {t('offerten.import.ausfuehren', { count: bereit })}
            </Button>
          </div>
        </div>
      )}

      <EturnityMeldungen offerten={offerten} />
    </div>
  )
}
