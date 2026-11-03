import { FileUp, Mail, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { kiDatei, rufeKi } from '@/services/ki'
import { melde } from '@/services/meldungen'
import { mailVolltext, mailVorlage } from '@/services/posteingang'
import { useAktion } from '../hooks/useAktion'
import { useBestellMails } from '../hooks/useEinkauf'
import { alsZahl, formatMenge } from '../lib/anzeige'
import { abErfassen } from '../services/einkauf'
import type { Bestellung, Position } from '../types'

interface KiAb {
  nummer: string | null
  datum: string | null
  termin: string | null
  total_rappen: number | null
  hinweis: string | null
  positionen: { nr: number; menge: number | null; ek_rappen: number | null }[]
}

/**
 * Auftragsbestätigung erfassen: Nummer, Termin, Total und je Position bestätigte Menge und Preis. Die KI liest
 * die AB aus einer Mail im Posteingang oder einem PDF vor; übernommen wird erst mit «Speichern».
 */
export function AbDialog({
  bestellung: b,
  positionen,
  onSchliessen,
}: {
  bestellung: Bestellung
  positionen: Position[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const mails = useBestellMails(b.id)
  const pdf = useRef<HTMLInputElement>(null)
  const [liest, setLiest] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [nummer, setNummer] = useState(b.ab_nummer ?? '')
  const [datum, setDatum] = useState(b.ab_am ?? '')
  const [termin, setTermin] = useState(b.ab_termin ?? b.liefertermin ?? '')
  const [total, setTotal] = useState(b.ab_total_rappen != null ? formatChf(b.ab_total_rappen) : '')
  const [werte, setWerte] = useState(() =>
    Object.fromEntries(
      positionen.map((p) => [
        p.id,
        {
          menge: formatMenge(p.ab_menge ?? p.menge),
          ek: (p.ab_ek_rappen ?? p.ek_rappen) != null ? formatChf(p.ab_ek_rappen ?? p.ek_rappen ?? 0) : '',
        },
      ]),
    ),
  )

  async function lesen(quelle: { text: string } | { datei: { typ: string; base64: string } }) {
    setLiest(true)
    try {
      const r = await rufeKi<KiAb>('auftragsbestaetigung', {
        ...quelle,
        positionen: positionen.map((p) => ({
          bezeichnung: p.bezeichnung,
          artikelnummer: p.artikelnummer,
          menge: p.menge,
          ek_rappen: p.ek_rappen,
        })),
      })
      if (r.nummer) setNummer(r.nummer)
      if (r.datum) setDatum(r.datum)
      if (r.termin) setTermin(r.termin)
      if (r.total_rappen != null) setTotal(formatChf(r.total_rappen))
      setWerte((w) => {
        const neu = { ...w }
        for (const z of r.positionen) {
          const p = positionen[z.nr - 1]
          const alt = p ? neu[p.id] : undefined
          if (!p || !alt) continue
          neu[p.id] = {
            menge: z.menge != null ? formatMenge(z.menge) : alt.menge,
            ek: z.ek_rappen != null ? formatChf(z.ek_rappen) : alt.ek,
          }
        }
        return neu
      })
      setHinweis(r.hinweis)
      melde('info', { de: 'Auftragsbestätigung gelesen – bitte prüfen', fr: 'Confirmation lue – à vérifier' })
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLiest(false)
    }
  }

  async function ausMail(id: string) {
    const v = await mailVorlage(id)
    if (v) await lesen({ text: await mailVolltext(v) })
  }

  async function speichern() {
    let abw = 0
    const ok = await aus(async () => {
      abw = await abErfassen(b.id, {
        nummer: nummer.trim(),
        datum: datum || null,
        termin: termin || null,
        total_rappen: parseChf(total),
        positionen: positionen.map((p) => ({
          id: p.id,
          menge: alsZahl(werte[p.id]?.menge ?? ''),
          ek_rappen: parseChf(werte[p.id]?.ek ?? ''),
        })),
      })
    })
    if (!ok) return
    melde(abw ? 'warnung' : 'ok', {
      de: abw ? `AB gespeichert, ${String(abw)} Abweichung(en)` : 'AB gespeichert, alles wie bestellt',
      fr: abw ? `Confirmation enregistrée, ${String(abw)} écart(s)` : 'Confirmation enregistrée, conforme',
    })
    onSchliessen()
  }

  const vorschlag = mails.data?.slice(0, 3) ?? []
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('einkauf.ab.titel', { nummer: b.nummer })}
        beschreibung={t('einkauf.ab.beschreibung')}
        className="max-w-2xl"
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!nummer.trim() || liest}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md p-2.5 text-sm">
            <Sparkles className="text-accent-ink size-4" aria-hidden="true" />
            <span className="text-muted-foreground mr-auto">{t('einkauf.ab.ki')}</span>
            {vorschlag.map((m) => (
              <Button key={m.id} size="sm" variant="secondary" laedt={liest} onClick={() => void ausMail(m.id)}>
                <Mail />
                <span className="max-w-48 truncate">{m.betreff ?? m.von_name ?? '–'}</span>
              </Button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              laedt={liest}
              onClick={() => {
                pdf.current?.click()
              }}
            >
              <FileUp />
              {t('einkauf.ab.pdf')}
            </Button>
            <input
              ref={pdf}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void kiDatei(f).then((datei) => lesen({ datei }))
              }}
            />
          </div>
          {hinweis && <p className="bg-info-soft rounded-md p-2.5 text-sm">{hinweis}</p>}
          <div className="grid gap-3 sm:grid-cols-4">
            <Feld id="ab-nummer" label={t('einkauf.ab.nummer')} pflicht>
              <Input
                id="ab-nummer"
                value={nummer}
                onChange={(e) => {
                  setNummer(e.target.value)
                }}
              />
            </Feld>
            <Feld id="ab-datum" label={t('einkauf.ab.datum')}>
              <Input
                id="ab-datum"
                type="date"
                value={datum}
                onChange={(e) => {
                  setDatum(e.target.value)
                }}
              />
            </Feld>
            <Feld id="ab-termin" label={t('einkauf.ab.termin')}>
              <Input
                id="ab-termin"
                type="date"
                value={termin}
                onChange={(e) => {
                  setTermin(e.target.value)
                }}
              />
            </Feld>
            <Feld id="ab-total" label={t('einkauf.ab.total')}>
              <Input
                id="ab-total"
                inputMode="decimal"
                className="text-right"
                value={total}
                onChange={(e) => {
                  setTotal(e.target.value)
                }}
              />
            </Feld>
          </div>
          <ul className="flex flex-col divide-y rounded-md border">
            {positionen.map((p) => {
              const w = werte[p.id] ?? { menge: '', ek: '' }
              const anders = alsZahl(w.menge) !== p.menge || (p.ek_rappen != null && parseChf(w.ek) !== p.ek_rappen)
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.bezeichnung}</span>
                    <span className={anders ? 'text-warn text-xs' : 'text-muted-foreground text-xs'}>
                      {t('einkauf.ab.bestellt', {
                        menge: formatMenge(p.menge),
                        einheit: p.einheit,
                        ek: p.ek_rappen != null ? formatChf(p.ek_rappen) : '–',
                      })}
                    </span>
                  </span>
                  <Input
                    aria-label={t('einkauf.ab.mengeVon', { name: p.bezeichnung })}
                    className="w-20 text-right"
                    inputMode="decimal"
                    value={w.menge}
                    onChange={(e) => {
                      setWerte((x) => ({ ...x, [p.id]: { ...w, menge: e.target.value } }))
                    }}
                  />
                  <Input
                    aria-label={t('einkauf.ab.ekVon', { name: p.bezeichnung })}
                    className="w-28 text-right"
                    inputMode="decimal"
                    value={w.ek}
                    onChange={(e) => {
                      setWerte((x) => ({ ...x, [p.id]: { ...w, ek: e.target.value } }))
                    }}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
