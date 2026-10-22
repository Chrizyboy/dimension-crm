import { CircleAlert, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { useAbwesenheiten, usePersonen, useProjektEinsaetze, useSubunternehmer } from '../hooks/useProjekte'
import { alsIso, endeNachWerktagen, konflikte, naechsterWerktag } from '../lib/zeitplan'
import { zeitplanSpeichern } from '../services/planung'
import type { EinsatzArt, EinsatzEntwurf, Projekt } from '../types'

const ARTEN: EinsatzArt[] = ['intern', 'extern', 'geplant']
const BAU = ['ausstehend', 'terminiert', 'ibn', 'fertig'] as const
const MATERIAL = ['offen', 'bestellt', 'lager'] as const

/**
 * Zeitplan einer Baustelle bearbeiten (V233 «Bauplanung»): beliebig viele Einsätze (intern, extern,
 * voraussichtlich) tagesgenau, wer dabei ist, dazu Baustellen- und Material-Status. Ist jemand in der Zeit
 * abwesend (CRM oder Outlook), steht es gleich beim Einsatz.
 */
export function ZeitplanDialog({ projekt, onSchliessen }: { projekt: Projekt; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const vorhanden = useProjektEinsaetze(projekt.id)
  if (vorhanden.isPending) {
    return (
      <Rahmen titel={t('projekte.zeitplan.dialogTitel')} onSchliessen={onSchliessen}>
        <Skelett className="h-48" />
      </Rahmen>
    )
  }
  return (
    <Formular
      projekt={projekt}
      anfang={(vorhanden.data ?? []).map((e) => ({
        id: e.id,
        art: e.art,
        von: e.von,
        bis: e.bis,
        personen: e.personen,
        subunternehmer_id: e.subunternehmer_id,
        notiz: e.notiz,
      }))}
      onSchliessen={onSchliessen}
    />
  )
}

function Rahmen({
  titel,
  beschreibung,
  fuss,
  onSchliessen,
  children,
}: {
  titel: string
  beschreibung?: string
  fuss?: ReactNode
  onSchliessen: () => void
  children: ReactNode
}) {
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={titel}
        className="max-w-2xl"
        {...(beschreibung ? { beschreibung } : {})}
        {...(fuss ? { fuss } : {})}
      >
        {children}
      </DialogInhalt>
    </Dialog>
  )
}

function Formular({
  projekt,
  anfang,
  onSchliessen,
}: {
  projekt: Projekt
  anfang: EinsatzEntwurf[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const personen = usePersonen()
  const subs = useSubunternehmer()
  const [heute] = useState(() => alsIso(naechsterWerktag(new Date())))
  const [liste, setListe] = useState<EinsatzEntwurf[]>(anfang)
  const [bau, setBau] = useState<string>(projekt.bau_status ?? 'ausstehend')
  const [material, setMaterial] = useState<string>(projekt.material_status ?? 'offen')
  const von = liste.map((e) => e.von).sort()[0] ?? heute
  const bis =
    liste
      .map((e) => e.bis)
      .sort()
      .at(-1) ?? heute
  const abwesend = useAbwesenheiten(von, bis)

  const aendern = (i: number, e: Partial<EinsatzEntwurf>) => {
    setListe(liste.map((x, j) => (j === i ? { ...x, ...e } : x)))
  }
  const dazu = () => {
    const start = liste.at(-1)?.bis ?? projekt.baubeginn ?? heute
    const v = liste.length ? alsIso(naechsterWerktag(new Date(`${start}T12:00`))) : start
    setListe([
      ...liste,
      {
        art: 'intern',
        von: v,
        bis: endeNachWerktagen(v, projekt.werktage ?? 1),
        personen: [],
        subunternehmer_id: null,
        notiz: null,
      },
    ])
  }

  async function speichern() {
    const ok = await aus(
      () =>
        zeitplanSpeichern(projekt.id, {
          einsaetze: liste,
          bau_status: bau,
          material_status: material === 'offen' ? '' : material,
        }),
      { de: 'Zeitplan gespeichert', fr: 'Planning enregistré' },
    )
    if (ok) onSchliessen()
  }

  const name = (id: string) => personen.data?.find((p) => p.id === id)?.kuerzel ?? '?'

  return (
    <Rahmen
      titel={t('projekte.zeitplan.dialogTitel')}
      beschreibung={`${projekt.nummer} · ${projekt.kunde}`}
      onSchliessen={onSchliessen}
      fuss={
        <>
          <Button variant="ghost" onClick={onSchliessen}>
            {t('allgemein.abbrechen')}
          </Button>
          <Button onClick={() => void speichern()} laedt={laeuft}>
            {t('allgemein.speichern')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld id="zp-bau" label={t('projekte.feld.bauStatus')}>
            <Auswahl
              id="zp-bau"
              value={bau}
              onValueChange={setBau}
              optionen={BAU.map((b) => ({ wert: b, text: t(`projekte.bauStatus.${b}`) }))}
            />
          </Feld>
          <Feld id="zp-material" label={t('projekte.feld.material')}>
            <Auswahl
              id="zp-material"
              value={material}
              onValueChange={setMaterial}
              optionen={MATERIAL.map((m) => ({ wert: m, text: t(`projekte.material.${m}`) }))}
            />
          </Feld>
        </div>

        <ol className="flex flex-col gap-3">
          {liste.map((e, i) => {
            const fehlt = konflikte(e, abwesend.data ?? [])
            return (
              <li key={e.id ?? `neu-${String(i)}`} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Filterchips
                    einzeln
                    beschriftung={t('projekte.feld.art')}
                    optionen={ARTEN.map((a) => ({ wert: a, text: t(`projekte.einsatz.${a}`) }))}
                    gewaehlt={[e.art]}
                    onChange={([a]) => {
                      aendern(i, { art: (a ?? 'intern') as EinsatzArt })
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('projekte.zeitplan.entfernen')}
                    onClick={() => {
                      setListe(liste.filter((_, j) => j !== i))
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Feld id={`zp-von-${String(i)}`} label={t('projekte.feld.von')}>
                    <Input
                      id={`zp-von-${String(i)}`}
                      type="date"
                      value={e.von}
                      onChange={(x) => {
                        const v = x.target.value
                        aendern(i, { von: v, bis: e.bis < v ? v : e.bis })
                      }}
                    />
                  </Feld>
                  <Feld id={`zp-bis-${String(i)}`} label={t('projekte.feld.bis')}>
                    <Input
                      id={`zp-bis-${String(i)}`}
                      type="date"
                      min={e.von}
                      value={e.bis}
                      onChange={(x) => {
                        aendern(i, { bis: x.target.value })
                      }}
                    />
                  </Feld>
                </div>
                {e.art === 'extern' ? (
                  <Feld id={`zp-sub-${String(i)}`} label={t('projekte.feld.subunternehmer')}>
                    <Auswahl
                      id={`zp-sub-${String(i)}`}
                      value={e.subunternehmer_id ?? ''}
                      onValueChange={(v) => {
                        aendern(i, { subunternehmer_id: v })
                      }}
                      optionen={(subs.data ?? [])
                        .filter((s) => s.aktiv)
                        .map((s) => ({ wert: s.id, text: s.gewerk ? `${s.name} (${s.gewerk})` : s.name }))}
                    />
                  </Feld>
                ) : null}
                <Filterchips
                  beschriftung={t('projekte.feld.personen')}
                  optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.kuerzel || p.name }))}
                  gewaehlt={e.personen}
                  onChange={(p) => {
                    aendern(i, { personen: p })
                  }}
                />
                {fehlt.length > 0 && (
                  <p className="text-warn flex items-center gap-1.5 text-xs">
                    <CircleAlert className="size-3.5" aria-hidden="true" />
                    {t('projekte.zeitplan.abwesend', { namen: fehlt.map(name).join(', ') })}
                  </p>
                )}
                <Input
                  aria-label={t('projekte.feld.notiz')}
                  placeholder={t('projekte.feld.notiz')}
                  value={e.notiz ?? ''}
                  onChange={(x) => {
                    aendern(i, { notiz: x.target.value })
                  }}
                />
              </li>
            )
          })}
        </ol>
        <Button variant="secondary" onClick={dazu} className="self-start">
          <Plus />
          {t('projekte.zeitplan.dazu')}
        </Button>
      </div>
    </Rahmen>
  )
}
