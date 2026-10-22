import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { feldFehler } from '@/lib/formular'
import { useAktion } from '../hooks/useAktion'
import { erfassenSchema, type ErfassenFormular } from '../schema'
import { erfassen } from '../services/ausschreibungen'

/** Quellen, die von Hand gelesen werden (kein lesbares Portal), mit dem Kanton dazu. */
const QUELLEN: Record<string, string | null> = {
  amtsblatt_ag: 'AG',
  amtsblatt_lu: 'LU',
  feuille_fr: 'FR',
  feuille_vd: 'VD',
  feuille_ne: 'NE',
  gemeinde: null,
  hand: null,
}
const ARTEN = ['baugesuch', 'ausschreibung', 'zuschlag', 'planermandat', 'vorankuendigung'] as const
const BAUHERR = ['', 'privat', 'firma', 'gemeinde', 'landwirtschaft'] as const
type TextFeld = 'quell_url' | 'titel' | 'gemeinde' | 'plz' | 'parzelle' | 'bauherr' | 'vergabestelle' | 'frist'

/**
 * Meldung von Hand erfassen, z. B. ein Baugesuch aus dem Amtsblatt Aargau oder der Feuille officielle
 * Fribourg. Danach läuft sie gleich wie eine gelesene: Bewertung, Spur, Doppelte, Sperren.
 */
export function ErfassenDialog({
  onSchliessen,
  onErfasst,
}: {
  onSchliessen: () => void
  onErfasst: (id: string) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState<ErfassenFormular>({
    art: 'baugesuch',
    quelle: 'amtsblatt_ag',
    quell_url: '',
    titel: '',
    gemeinde: '',
    plz: '',
    parzelle: '',
    bauherr: '',
    bauherr_art: '',
    vergabestelle: '',
    frist: '',
    beschreibung: '',
  })
  const [fehler, setFehler] = useState<Partial<Record<keyof ErfassenFormular, string>>>({})

  async function speichern() {
    const g = erfassenSchema.safeParse(w)
    if (!g.success) {
      setFehler(feldFehler(g.error.issues, t))
      return
    }
    const { frist, ...rest } = g.data
    const kanton = QUELLEN[rest.quelle]
    let id = ''
    const ok = await aus(
      async () => {
        id = await erfassen({
          ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== '')),
          ...(frist ? { frist_eingabe: frist } : {}),
          ...(kanton ? { kanton } : {}),
        })
      },
      { de: 'Meldung erfasst', fr: 'Publication saisie' },
    )
    if (ok) onErfasst(id)
  }

  const text = (f: TextFeld, o: { typ?: string; pflicht?: boolean; breit?: boolean } = {}) => (
    <div className={o.breit ? 'sm:col-span-2' : undefined}>
      <Feld id={`as-e-${f}`} label={t(`ausschreibungen.erfassen.${f}`)} fehler={fehler[f]} pflicht={o.pflicht ?? false}>
        <Input
          id={`as-e-${f}`}
          type={o.typ ?? 'text'}
          value={w[f]}
          onChange={(e) => {
            setW({ ...w, [f]: e.target.value })
          }}
        />
      </Feld>
    </div>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('ausschreibungen.erfassen.dialogTitel')}
        beschreibung={t('ausschreibungen.erfassen.beschreibung')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft}>
              {t('ausschreibungen.erfassen.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld id="as-e-quelle" label={t('ausschreibungen.feld.quelle')} pflicht>
            <Auswahl
              id="as-e-quelle"
              value={w.quelle}
              onValueChange={(v) => {
                setW({ ...w, quelle: v })
              }}
              optionen={Object.keys(QUELLEN).map((q) => ({ wert: q, text: t(`ausschreibungen.quelle.${q}`) }))}
            />
          </Feld>
          <Feld id="as-e-art" label={t('ausschreibungen.feld.art')}>
            <Auswahl
              id="as-e-art"
              value={w.art}
              onValueChange={(v) => {
                setW({ ...w, art: v as ErfassenFormular['art'] })
              }}
              optionen={ARTEN.map((a) => ({ wert: a, text: t(`ausschreibungen.art.${a}`) }))}
            />
          </Feld>
          {text('quell_url', { pflicht: true, breit: true })}
          {text('titel', { pflicht: true, breit: true })}
          {text('gemeinde', { pflicht: true })}
          {text('plz')}
          {w.art === 'baugesuch' ? (
            <>
              {text('bauherr')}
              <Feld id="as-e-bauherr_art" label={t('ausschreibungen.feld.bauherrArt')}>
                <Auswahl
                  id="as-e-bauherr_art"
                  value={w.bauherr_art || 'unbekannt'}
                  onValueChange={(v) => {
                    setW({ ...w, bauherr_art: (v === 'unbekannt' ? '' : v) as ErfassenFormular['bauherr_art'] })
                  }}
                  optionen={BAUHERR.map((b) => ({
                    wert: b || 'unbekannt',
                    text: t(`ausschreibungen.bauherrArt.${b || 'unbekannt'}`),
                  }))}
                />
              </Feld>
              {text('parzelle')}
            </>
          ) : (
            text('vergabestelle')
          )}
          {text('frist', { typ: 'date' })}
          <div className="sm:col-span-2">
            <Feld id="as-e-beschreibung" label={t('ausschreibungen.erfassen.beschreibung_feld')}>
              <Textarea
                id="as-e-beschreibung"
                rows={4}
                value={w.beschreibung}
                onChange={(e) => {
                  setW({ ...w, beschreibung: e.target.value })
                }}
              />
            </Feld>
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
