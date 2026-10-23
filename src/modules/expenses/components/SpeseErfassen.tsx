import { Camera, FileUp, Sparkles, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { formatChf, parseChf } from '@/lib/format'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { kiDatei, rufeKi, type KiBeleg } from '@/services/ki'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich } from '../lib/spesen'
import { speseSchema } from '../schema'
import { speseErfassen } from '../services/spesen'

/**
 * Spese erfassen (V233 «Spese erfassen mit Beleg»): Datum, Betrag, Kategorie, Zweck und der Beleg als Foto
 * (Handy-Kamera) oder Datei. Die Spese gehört immer der angemeldeten Person. «Mit KI lesen» (V233 spAiRead)
 * füllt Datum, Betrag, Kategorie und Zweck aus dem Beleg; die Person prüft und speichert selbst.
 */
export function SpeseErfassen({ personId, onSchliessen }: { personId: string; onSchliessen: () => void }) {
  const { t, i18n } = useTranslation()
  const { spesen_kategorien } = useFinanzEinstellungen()
  const { laeuft, aus } = useAktion()
  const [datum, setDatum] = useState(heuteZuerich())
  const [betrag, setBetrag] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [zweck, setZweck] = useState('')
  const [notiz, setNotiz] = useState('')
  const [beleg, setBeleg] = useState<File | null>(null)
  const [liest, setLiest] = useState(false)
  const [kiNotiz, setKiNotiz] = useState<string | null>(null)

  async function belegLesen(datei: File) {
    setLiest(true)
    try {
      const r = await rufeKi<KiBeleg>('beleg', { datei: await kiDatei(datei) })
      if (r.datum) setDatum(r.datum)
      if (r.betrag_rappen) setBetrag(formatChf(r.betrag_rappen))
      if (r.kategorie) setKategorie(r.kategorie)
      if (r.zweck) setZweck(r.zweck)
      const fremd = r.waehrung && r.waehrung !== 'CHF' ? r.waehrung : null
      setKiNotiz(
        [fremd ? t('ki.beleg.waehrung', { waehrung: fremd }) : null, r.bemerkung].filter(Boolean).join(' · ') || null,
      )
      melde('info', { de: 'Beleg gelesen – bitte prüfen', fr: 'Justificatif lu – à vérifier' })
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLiest(false)
    }
  }
  const kamera = useRef<HTMLInputElement>(null)
  const datei = useRef<HTMLInputElement>(null)
  const rappen = parseChf(betrag) ?? 0
  const gueltig = speseSchema.safeParse({ datum, betrag_rappen: rappen, kategorie, zweck }).success

  async function speichern() {
    if (!gueltig) return
    const ok = await aus(
      () =>
        speseErfassen(personId, {
          datum,
          betrag_rappen: rappen,
          kategorie,
          zweck,
          notiz: notiz.trim() || null,
          beleg,
        }),
      { de: 'Spese erfasst', fr: 'Frais saisis' },
    )
    if (ok) onSchliessen()
  }

  const gewaehlt = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBeleg(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('spesen.erfassen.titel')}
        beschreibung={t('spesen.erfassen.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!gueltig}>
              {t('spesen.erfassen.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id="spese-betrag" label={t('spesen.spalte.betrag')} pflicht>
            <Input
              id="spese-betrag"
              inputMode="decimal"
              placeholder="0.00"
              value={betrag}
              onChange={(e) => {
                setBetrag(e.target.value)
              }}
            />
          </Feld>
          <Feld id="spese-datum" label={t('spesen.spalte.datum')} pflicht>
            <Input
              id="spese-datum"
              type="date"
              max={heuteZuerich()}
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <Feld id="spese-kategorie" label={t('spesen.spalte.kategorie')} pflicht className="sm:col-span-2">
            <Auswahl
              id="spese-kategorie"
              value={kategorie}
              onValueChange={setKategorie}
              platzhalter={t('spesen.erfassen.kategorieWaehlen')}
              optionen={spesen_kategorien.map((k) => ({
                wert: k.schluessel,
                text: i18n.language === 'fr' ? k.fr : k.de,
              }))}
            />
          </Feld>
          <Feld id="spese-zweck" label={t('spesen.spalte.zweck')} pflicht className="sm:col-span-2">
            <Input
              id="spese-zweck"
              placeholder={t('spesen.erfassen.zweckBeispiel')}
              value={zweck}
              onChange={(e) => {
                setZweck(e.target.value)
              }}
            />
          </Feld>
          <Feld id="spese-notiz" label={t('spesen.erfassen.notiz')} className="sm:col-span-2">
            <Textarea
              id="spese-notiz"
              rows={2}
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-medium">{t('spesen.spalte.beleg')}</span>
            {beleg ? (
              <div className="bg-muted flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm">
                <span className="truncate">{beleg.name}</span>
                {supabase && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto"
                    laedt={liest}
                    onClick={() => void belegLesen(beleg)}
                  >
                    <Sparkles />
                    {t('ki.beleg.lesen')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('spesen.erfassen.belegEntfernen')}
                  onClick={() => {
                    setBeleg(null)
                  }}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => kamera.current?.click()}>
                  <Camera />
                  {t('spesen.erfassen.foto')}
                </Button>
                <Button variant="secondary" onClick={() => datei.current?.click()}>
                  <FileUp />
                  {t('spesen.erfassen.datei')}
                </Button>
              </div>
            )}
            {kiNotiz && <p className="bg-warn-soft text-warn rounded-md px-3 py-1.5 text-xs">{kiNotiz}</p>}
            <p className="text-muted-foreground text-xs">{t('spesen.erfassen.belegHinweis')}</p>
            <input
              ref={kamera}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={gewaehlt}
            />
            <input ref={datei} type="file" accept="image/*,application/pdf" className="hidden" onChange={gewaehlt} />
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
