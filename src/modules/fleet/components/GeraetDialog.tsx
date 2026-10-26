import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAktion } from '../hooks/useAktion'
import { useWahl } from '../hooks/useRessourcen'
import { geraetSchema } from '../schema'
import { entfernen, geraetSpeichern } from '../services/ressourcen'
import type { Geraet, GeraetZustand } from '../types'

const KEINE = '-'
const ZUSTAENDE: GeraetZustand[] = ['ok', 'maengel', 'defekt', 'ausser_betrieb']

/**
 * Gerät anlegen oder ändern. Das Prüfintervall kommt aus der Geräte-Art (Einstellung), lässt sich aber je Gerät
 * ändern (z. B. Herstellerangabe). Die nächste Prüfung setzt man beim Anlegen, danach setzt sie die Prüfung.
 */
export function GeraetDialog({
  geraet,
  onFertig,
  onSchliessen,
}: {
  geraet: Geraet | null
  onFertig: (id: string | null) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const wahl = useWahl().data
  const arten = useAuswahl('geraeteart')
  const { laeuft, aus } = useAktion()
  const g = geraet
  const [w, setW] = useState({
    art: g?.art ?? '',
    bezeichnung: g?.bezeichnung ?? '',
    inventar_nr: g?.inventar_nr ?? '',
    serien_nr: g?.serien_nr ?? '',
    hersteller: g?.hersteller ?? '',
    standort_id: g?.standort_id ?? KEINE,
    pruef_monate: g?.pruef_monate?.toString() ?? '',
    naechste_pruefung: g?.naechste_pruefung ?? '',
    zustand: g?.zustand ?? 'ok',
    notiz: g?.notiz ?? '',
  })
  const setze = (teil: Partial<typeof w>) => {
    setW({ ...w, ...teil })
  }
  const monate = w.pruef_monate.trim() === '' ? null : Number(w.pruef_monate)
  const gueltig = geraetSchema.safeParse({ art: w.art, bezeichnung: w.bezeichnung, pruef_monate: monate }).success

  async function speichern() {
    const leer = (s: string) => s.trim() || null
    let id: string | null = null
    const ok = await aus(
      async () => {
        id = await geraetSpeichern(
          {
            art: w.art,
            bezeichnung: w.bezeichnung.trim(),
            inventar_nr: leer(w.inventar_nr),
            serien_nr: leer(w.serien_nr),
            hersteller: leer(w.hersteller),
            standort_id: w.standort_id === KEINE ? null : w.standort_id,
            pruef_monate: monate,
            notiz: leer(w.notiz),
            ...(g ? { zustand: w.zustand } : { naechste_pruefung: leer(w.naechste_pruefung) }),
          },
          g?.id,
        )
      },
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onFertig(id)
  }

  const text = (k: 'bezeichnung' | 'inventar_nr' | 'serien_nr' | 'hersteller', pflicht = false) => (
    <Feld id={`ge-${k}`} label={t(`fuhrpark.feld.${k}`)} pflicht={pflicht}>
      <Input
        id={`ge-${k}`}
        value={w[k]}
        onChange={(e) => {
          setze({ [k]: e.target.value })
        }}
      />
    </Feld>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={g ? t('fuhrpark.geraet.bearbeiten') : t('fuhrpark.geraet.neu')}
        fuss={
          <>
            {g && (
              <Button
                variant="ghost"
                className="text-bad mr-auto"
                laedt={laeuft}
                onClick={() => {
                  void aus(() => entfernen('geraete', g.id), { de: 'Im Papierkorb', fr: 'Dans la corbeille' }).then(
                    (ok) => {
                      if (ok) onFertig(null)
                    },
                  )
                }}
              >
                {t('fuhrpark.entfernen')}
              </Button>
            )}
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!gueltig}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id="ge-art" label={t('fuhrpark.spalte.art')} pflicht>
            <Auswahl
              id="ge-art"
              value={w.art}
              platzhalter={t('fuhrpark.geraet.artWaehlen')}
              onValueChange={(v) => {
                // Neues Gerät: Intervall der Art vorschlagen.
                const vorschlag = arten.finde(v)?.eigenschaften.pruef_monate
                setze({
                  art: v,
                  ...(!g && typeof vorschlag === 'number' ? { pruef_monate: String(vorschlag) } : {}),
                })
              }}
              optionen={arten.werte.map((a) => ({ wert: a.schluessel, text: arten.text(a.schluessel) }))}
            />
          </Feld>
          {text('bezeichnung', true)}
          {text('inventar_nr')}
          {text('serien_nr')}
          {text('hersteller')}
          <Feld id="ge-standort" label={t('fuhrpark.feld.standort')}>
            <Auswahl
              id="ge-standort"
              value={w.standort_id}
              onValueChange={(v) => {
                setze({ standort_id: v })
              }}
              optionen={[
                { wert: KEINE, text: '–' },
                ...(wahl?.standorte ?? []).map((s) => ({ wert: s.id, text: s.name })),
              ]}
            />
          </Feld>
          <Feld id="ge-monate" label={t('fuhrpark.feld.pruefMonate')} hinweis={t('fuhrpark.geraet.monateHinweis')}>
            <Input
              id="ge-monate"
              inputMode="numeric"
              value={w.pruef_monate}
              onChange={(e) => {
                setze({ pruef_monate: e.target.value })
              }}
            />
          </Feld>
          {g ? (
            <Feld id="ge-zustand" label={t('fuhrpark.spalte.zustand')}>
              <Auswahl
                id="ge-zustand"
                value={w.zustand}
                onValueChange={(v) => {
                  setze({ zustand: v as GeraetZustand })
                }}
                optionen={ZUSTAENDE.map((z) => ({ wert: z, text: t(`fuhrpark.zustand.${z}`) }))}
              />
            </Feld>
          ) : (
            <Feld id="ge-pruefung" label={t('fuhrpark.feld.naechste_pruefung')}>
              <Input
                id="ge-pruefung"
                type="date"
                value={w.naechste_pruefung}
                onChange={(e) => {
                  setze({ naechste_pruefung: e.target.value })
                }}
              />
            </Feld>
          )}
          <Feld id="ge-notiz" label={t('fuhrpark.feld.notiz')} className="sm:col-span-2">
            <Textarea
              id="ge-notiz"
              rows={2}
              value={w.notiz}
              onChange={(e) => {
                setze({ notiz: e.target.value })
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
