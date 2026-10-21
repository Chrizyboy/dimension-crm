import { FileSpreadsheet, Upload } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useRegionen, useVerkaufAenderung } from '../hooks/useVerkauf'
import { heuteIso } from '../lib/geschaeft'
import { findeBestehend, lesePlanungstool, trenneName, type ExcelLead } from '../lib/planungstool'
import { leererLead } from '../schema'
import { legeLeadAn } from '../services/leads'
import type { Geschaeft } from '../types'

const ohneZeichen = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüéèà]/g, '')

/**
 * Planungstool-Excel laden (V233): liest das Blatt mit «Name» und «Lead-ID», zeigt, welche Leads schon
 * im CRM sind, und übernimmt nur die neuen. Bestehende werden nie überschrieben.
 */
export default function ExcelImport({
  geschaefte,
  onSchliessen,
}: {
  geschaefte: Geschaeft[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const quellen = useAuswahl('quelle')
  const erreichbarkeit = useAuswahl('erreichbarkeit')
  const regionen = useRegionen()
  const [leads, setLeads] = useState<(ExcelLead & { bestehend: Geschaeft | null })[] | null>(null)
  const [wahl, setWahl] = useState<Set<number>>(new Set())
  const [fehler, setFehler] = useState<string | null>(null)
  const [fortschritt, setFortschritt] = useState<number | null>(null)

  const schluessel = (liste: typeof quellen, roh: string) => {
    const r = ohneZeichen(roh)
    if (!r) return ''
    return (
      liste.werte.find((w) =>
        [w.schluessel, w.text_de, w.text_fr].some((x) => ohneZeichen(x) === r || r.startsWith(ohneZeichen(x))),
      )?.schluessel ?? ''
    )
  }

  async function lies(datei: File) {
    setFehler(null)
    try {
      const { default: leseExcel } = await import('read-excel-file/browser')
      const blaetter = await leseExcel(datei)
      const roh = lesePlanungstool(blaetter as unknown as Parameters<typeof lesePlanungstool>[0])
      if (!roh) {
        setFehler(t('verkauf.excel.falsch'))
        return
      }
      const mit = roh.map((l) => ({ ...l, bestehend: findeBestehend(l, geschaefte) }))
      setLeads(mit)
      setWahl(new Set(mit.filter((l) => !l.bestehend).map((l) => l.zeile)))
    } catch (f) {
      meldeFehler(f, 'excel')
      setFehler(t('verkauf.excel.unlesbar'))
    }
  }

  const uebernehmen = useVerkaufAenderung(async (liste: ExcelLead[]) => {
    let n = 0
    for (const l of liste) {
      const { vorname, nachname } = trenneName(l.name)
      const nr = Number(/^(\d+)/.exec(l.tour)?.[1])
      await legeLeadAn(
        {
          ...leererLead(heuteIso()),
          vorname,
          nachname,
          telefon: l.telefon,
          email: l.email,
          strasse: l.strasse,
          plz: /^\d{4}$/.test(l.plz) ? l.plz : '',
          ort: l.ort,
          quelle: schluessel(quellen, l.quelle),
          eingangAm: l.eingang ?? heuteIso(),
          regionId: regionen.data?.find((r) => r.nummer === nr)?.id ?? null,
          erreichbarkeit: schluessel(erreichbarkeit, l.erreichbarkeit),
          kommentar: l.kommentar,
          notiz: [l.notiz, l.leadId ? `Planungstool ${l.leadId}` : ''].filter(Boolean).join('\n'),
        },
        null,
      )
      n += 1
      setFortschritt(n)
    }
    return n
  })

  async function los() {
    const liste = (leads ?? []).filter((l) => wahl.has(l.zeile))
    try {
      const n = await uebernehmen.mutateAsync(liste)
      melde('ok', { de: `${n} neue Leads übernommen`, fr: `${n} nouveaux leads importés` })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'excel')
      melde('kritisch', { de: 'Import abgebrochen', fr: 'Import interrompu' })
    } finally {
      setFortschritt(null)
    }
  }

  const neu = leads?.filter((l) => !l.bestehend).length ?? 0
  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('verkauf.excel.titel')}
        beschreibung={t('verkauf.excel.text')}
        className="max-w-2xl"
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={uebernehmen.isPending} disabled={wahl.size === 0} onClick={() => void los()}>
              <Upload />
              {fortschritt !== null
                ? t('verkauf.excel.laeuft', { n: fortschritt, von: wahl.size })
                : t('verkauf.excel.uebernehmen', { count: wahl.size })}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <label className="hover:bg-muted/60 focus-within:ring-ring flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm focus-within:ring-2">
            <FileSpreadsheet className="text-muted-foreground size-6" aria-hidden="true" />
            {t('verkauf.excel.waehlen')}
            <input
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void lies(f)
              }}
            />
          </label>
          {fehler && (
            <p role="alert" className="text-bad text-sm">
              {fehler}
            </p>
          )}
          {leads && (
            <>
              <p className="text-sm" role="status">
                {t('verkauf.excel.ergebnis', { gesamt: leads.length, neu, bestehend: leads.length - neu })}
              </p>
              <ul className="max-h-80 overflow-y-auto rounded-lg border">
                {leads.map((l) => (
                  <li key={l.zeile} className="flex items-center gap-2 border-b px-3 py-1.5 text-sm last:border-b-0">
                    <Checkbox
                      checked={wahl.has(l.zeile)}
                      disabled={l.bestehend !== null}
                      aria-label={l.name}
                      onCheckedChange={(an) => {
                        setWahl((alt) => {
                          const x = new Set(alt)
                          if (an === true) x.add(l.zeile)
                          else x.delete(l.zeile)
                          return x
                        })
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {l.name}{' '}
                      <span className="text-muted-foreground text-xs">
                        · {[l.plz, l.ort].filter(Boolean).join(' ')}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {l.bestehend
                        ? t('verkauf.excel.schonDa', { nummer: l.bestehend.nummer })
                        : t('verkauf.excel.neu')}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
