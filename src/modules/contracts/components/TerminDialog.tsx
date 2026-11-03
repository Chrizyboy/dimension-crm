import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { usePlanPersonen } from '../hooks/useVertraege'
import { inTagen } from '../lib/anzeige'
import { jetztAnkuendigen, terminSetzen } from '../services/vertraege'
import type { Vertrag } from '../types'

/** Uhrzeit HH:MM aus einem Zeitpunkt (Ortszeit). */
function uhr(iso: string | null, ersatz: string): string {
  if (!iso) return ersatz
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Inspektion planen: Tag, Zeitfenster und wer geht. Die Ankündigung an den Kunden legt der Zeitplan 14 Tage vorher
 * im Ausgangskorb an (Freigabe per Klick); «Jetzt ankündigen» legt sie sofort an.
 */
export function TerminDialog({ vertrag: v, onSchliessen }: { vertrag: Vertrag; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const personen = usePlanPersonen()
  const { laeuft, aus } = useAktion()
  const [tag, setTag] = useState(() =>
    v.termin_von ? inTagen(new Date(v.termin_von), 0) : (v.naechste_wartung ?? inTagen(new Date(), 14)),
  )
  const [von, setVon] = useState(() => uhr(v.termin_von, '08:00'))
  const [bis, setBis] = useState(() => uhr(v.termin_bis, v.paket === 'premium' ? '11:00' : '10:00'))
  const [person, setPerson] = useState(v.termin_person_id ?? '')
  const fehlt = !tag || !von || !bis || !person || bis <= von

  async function speichern() {
    const ok = await aus(
      () =>
        terminSetzen(v.id, new Date(`${tag}T${von}`).toISOString(), new Date(`${tag}T${bis}`).toISOString(), person),
      { de: 'Termin gespeichert', fr: 'Rendez-vous enregistré' },
    )
    if (ok) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('wartung.termin.titel', { nummer: v.nummer ?? '' })}
        beschreibung={`${v.kunde}${v.ort ? ` · ${v.ort}` : ''}`}
        fuss={
          <>
            {v.termin_von && (
              <Button
                variant="ghost"
                onClick={() => {
                  void aus(() => terminSetzen(v.id, null, null, null)).then((ok) => {
                    if (ok) onSchliessen()
                  })
                }}
              >
                {t('wartung.termin.entfernen')}
              </Button>
            )}
            {v.termin_von && !v.angekuendigt_am && (
              <Button
                variant="secondary"
                onClick={() =>
                  void aus(() => jetztAnkuendigen(v.id), {
                    de: 'Ankündigung im Ausgangskorb',
                    fr: 'Annonce dans la corbeille de sortie',
                  })
                }
              >
                <Send />
                {t('wartung.termin.ankuendigen')}
              </Button>
            )}
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={fehlt}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Feld id="wt-tag" label={t('wartung.termin.tag')} pflicht>
              <Input
                id="wt-tag"
                type="date"
                value={tag}
                onChange={(e) => {
                  setTag(e.target.value)
                }}
              />
            </Feld>
            <Feld id="wt-von" label={t('wartung.termin.von')} pflicht>
              <Input
                id="wt-von"
                type="time"
                value={von}
                onChange={(e) => {
                  setVon(e.target.value)
                }}
              />
            </Feld>
            <Feld id="wt-bis" label={t('wartung.termin.bis')} pflicht>
              <Input
                id="wt-bis"
                type="time"
                value={bis}
                onChange={(e) => {
                  setBis(e.target.value)
                }}
              />
            </Feld>
          </div>
          <Feld id="wt-person" label={t('wartung.termin.person')} pflicht>
            <Auswahl
              id="wt-person"
              value={person}
              onValueChange={setPerson}
              platzhalter={t('wartung.termin.personWaehlen')}
              optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
            />
          </Feld>
          <p className="text-muted-foreground text-xs">
            {v.angekuendigt_am
              ? t('wartung.termin.angekuendigt', { datum: formatDatum(v.angekuendigt_am) })
              : t('wartung.termin.hinweis')}
          </p>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
