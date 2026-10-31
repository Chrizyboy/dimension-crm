import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { feldFehler } from '@/lib/formular'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useNeuLaden } from '../hooks/useGrossprojekte'
import { grossprojektSchema, type GrossprojektFormular } from '../schema'
import { anreichern, speichern } from '../services/grossprojekte'
import { BAUHERR_ARTEN, HEIZUNGEN, NUTZUNGEN, type Grossprojekt } from '../types'

type TextFeld = 'titel' | 'quell_url' | 'strasse' | 'plz' | 'gemeinde' | 'parzelle' | 'bauherr'
type ZahlFeld = 'dachflaeche_m2' | 'heizung_jahr' | 'waermeleistung_kw' | 'wohnungen'

const text = (s: string | number | null | undefined) => (s === null || s === undefined ? '' : String(s))

/** Formularwerte aus einem bestehenden Grossprojekt (oder leer für «Erfassen»). */
function anfang(g: Grossprojekt | null): GrossprojektFormular {
  return {
    titel: text(g?.titel),
    quell_url: text(g?.quell_url),
    strasse: text(g?.strasse),
    plz: text(g?.plz),
    gemeinde: text(g?.gemeinde),
    parzelle: text(g?.parzelle),
    bauherr: text(g?.bauherr),
    bauherr_art: g?.bauherr_art ?? '',
    nutzung: g?.nutzung ?? '',
    heizung: g?.heizung ?? '',
    heizung_jahr: text(g?.heizung_jahr),
    dachflaeche_m2: text(g?.dachflaeche_m2),
    waermeleistung_kw: text(g?.waermeleistung_kw),
    wohnungen: text(g?.wohnungen),
    geschuetzt: g?.geschuetzt ?? false,
    heizungsersatz: g?.heizungsersatz ?? false,
    notiz: text(g?.notiz),
  }
}

/**
 * Grossprojekt von Hand erfassen oder ändern (z. B. ein Hinweis aus einem Gespräch mit der Gemeinde). Mit Adresse holt
 * das CRM danach Dach und Heizung beim Bund; was hier eingetragen ist, bleibt stehen.
 */
export function GrossprojektDialog({
  grossprojekt,
  onSchliessen,
  onFertig,
}: {
  grossprojekt: Grossprojekt | null
  onSchliessen: () => void
  onFertig: (id: string) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const neuLaden = useNeuLaden()
  const [w, setW] = useState<GrossprojektFormular>(() => anfang(grossprojekt))
  const [fehler, setFehler] = useState<Partial<Record<keyof GrossprojektFormular, string>>>({})

  async function sichern() {
    const g = grossprojektSchema.safeParse(w)
    if (!g.success) {
      setFehler(feldFehler(g.error.issues, t))
      return
    }
    let id = ''
    const ok = await aus(
      async () => {
        id = await speichern({ ...(grossprojekt ? { id: grossprojekt.id } : {}), ...g.data })
      },
      grossprojekt ? { de: 'Gespeichert', fr: 'Enregistré' } : { de: 'Grossprojekt erfasst', fr: 'Grand projet saisi' },
    )
    if (!ok) return
    onFertig(id)
    const neueLage =
      !grossprojekt ||
      g.data.strasse !== text(grossprojekt.strasse) ||
      g.data.plz !== text(grossprojekt.plz) ||
      g.data.parzelle !== text(grossprojekt.parzelle)
    // Gebäudedaten gleich holen; klappt es nicht, holt der Zeitplan sie innert einer Stunde.
    if (neueLage && (g.data.strasse || g.data.parzelle)) {
      anreichern(id)
        .then(() => neuLaden())
        .catch(() => {
          melde('info', { de: 'Gebäudedaten folgen später', fr: 'Données du bâtiment suivront' })
        })
    }
  }

  const feld = (f: TextFeld | ZahlFeld, o: { pflicht?: boolean; breit?: boolean; zahl?: boolean } = {}) => (
    <div className={o.breit ? 'sm:col-span-2' : undefined}>
      <Feld id={`gp-${f}`} label={t(`grossprojekte.formular.${f}`)} fehler={fehler[f]} pflicht={o.pflicht ?? false}>
        <Input
          id={`gp-${f}`}
          inputMode={o.zahl ? 'numeric' : undefined}
          value={w[f]}
          onChange={(e) => {
            setW({ ...w, [f]: e.target.value })
          }}
        />
      </Feld>
    </div>
  )
  const wahl = (f: 'bauherr_art' | 'nutzung' | 'heizung', werte: readonly string[], praefix: string) => (
    <Feld id={`gp-${f}`} label={t(`grossprojekte.formular.${f}`)}>
      <Auswahl
        id={`gp-${f}`}
        value={w[f] || '-'}
        onValueChange={(v) => {
          setW({ ...w, [f]: v === '-' ? '' : v })
        }}
        optionen={[
          { wert: '-', text: t('grossprojekte.formular.offen') },
          ...werte.map((x) => ({ wert: x, text: t(`grossprojekte.${praefix}.${x}`) })),
        ]}
      />
    </Feld>
  )
  const haken = (f: 'geschuetzt' | 'heizungsersatz') => (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={w[f]}
        onCheckedChange={(an) => {
          setW({ ...w, [f]: an === true })
        }}
      />
      {t(`grossprojekte.feld.${f}`)}
    </label>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(grossprojekt ? 'grossprojekte.formular.aendern' : 'grossprojekte.formular.neu')}
        beschreibung={t('grossprojekte.formular.beschreibung')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void sichern()} laedt={laeuft}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {feld('titel', { pflicht: true, breit: true })}
          {feld('quell_url', { pflicht: true, breit: true })}
          {feld('strasse', { breit: true })}
          {feld('plz', { zahl: true })}
          {feld('gemeinde')}
          {feld('parzelle')}
          {feld('bauherr')}
          {wahl(
            'bauherr_art',
            BAUHERR_ARTEN.filter((b) => b !== 'unbekannt'),
            'bauherrArt',
          )}
          {wahl('nutzung', NUTZUNGEN, 'nutzung')}
          {feld('dachflaeche_m2', { zahl: true })}
          {feld('wohnungen', { zahl: true })}
          {wahl('heizung', HEIZUNGEN, 'heizung')}
          {feld('heizung_jahr', { zahl: true })}
          {feld('waermeleistung_kw', { zahl: true })}
          <div className="flex flex-col justify-end gap-2 pb-1">
            {haken('heizungsersatz')}
            {haken('geschuetzt')}
          </div>
          <div className="sm:col-span-2">
            <Feld id="gp-notiz" label={t('grossprojekte.formular.notiz')}>
              <Textarea
                id="gp-notiz"
                rows={3}
                value={w.notiz}
                onChange={(e) => {
                  setW({ ...w, notiz: e.target.value })
                }}
              />
            </Feld>
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
