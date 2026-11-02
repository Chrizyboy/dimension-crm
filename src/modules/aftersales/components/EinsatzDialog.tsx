import { useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/useService'
import { dauerText } from '../lib/reaktion'
import { alsLokal } from '../lib/zeit'
import { einsatzPlanen, ladeBelegung } from '../services/akte'
import { DAUERN, type ServiceFall } from '../types'

/**
 * Einsatz planen: Termin, Dauer, wer leitet und wer mitkommt. Zeigt pro Person, ob sie an dem Tag abwesend,
 * auf einer Baustelle oder bei einem anderen Service-Termin ist; planen lässt es sich trotzdem.
 */
export function EinsatzDialog({ f, onSchliessen }: { f: ServiceFall; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const personen = usePersonen()
  const [w, setW] = useState({
    termin: alsLokal(f.termin_am) ?? '',
    dauer: f.dauer_minuten ?? 120,
    person: f.person_id ?? '',
    team: f.team,
  })
  const datum = w.termin.slice(0, 10)
  const belegung = useQuery({
    queryKey: ['service', 'belegung', datum, f.id],
    queryFn: () => ladeBelegung(datum, f.id),
    enabled: datum.length === 10,
  })
  const eingeteilt = [w.person, ...w.team].filter(Boolean)
  const hinweise = (belegung.data ?? []).filter((b) => eingeteilt.includes(b.person_id))
  const name = (id: string) => personen.data?.find((p) => p.id === id)?.name ?? ''

  async function speichern(ohne = false) {
    const ok = await aus(
      () =>
        einsatzPlanen(f.id, {
          termin_am: ohne || !w.termin ? null : new Date(w.termin).toISOString(),
          dauer_minuten: w.dauer,
          person_id: w.person || null,
          team: w.team,
        }),
      ohne
        ? { de: 'Einsatz entfernt', fr: 'Intervention retirée' }
        : { de: 'Einsatz geplant', fr: 'Intervention planifiée' },
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
        titel={t('service.planung.dialog')}
        beschreibung={`${f.nummer} · ${f.titel}`}
        className="max-w-xl"
        fuss={
          <>
            {f.termin_am && (
              <Button variant="ghost" className="mr-auto" onClick={() => void speichern(true)} disabled={laeuft}>
                {t('service.planung.entfernen')}
              </Button>
            )}
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!w.termin}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld id="ep-termin" label={t('service.feld.termin')}>
            <Input
              id="ep-termin"
              type="datetime-local"
              value={w.termin}
              onChange={(e) => {
                setW({ ...w, termin: e.target.value })
              }}
            />
          </Feld>
          <Feld id="ep-dauer" label={t('service.planung.dauerFeld')}>
            <Auswahl
              id="ep-dauer"
              value={String(w.dauer)}
              onValueChange={(v) => {
                setW({ ...w, dauer: Number(v) })
              }}
              optionen={DAUERN.map((d) => ({
                wert: String(d),
                text: d === 480 ? t('service.planung.ganzerTag') : dauerText(d),
              }))}
            />
          </Feld>
          <div className="sm:col-span-2">
            <Feld id="ep-leitung" label={t('service.planung.leitung')}>
              <Auswahl
                id="ep-leitung"
                value={w.person}
                onValueChange={(v) => {
                  setW({ ...w, person: v, team: w.team.filter((x) => x !== v) })
                }}
                optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
              />
            </Feld>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium">{t('service.planung.team')}</span>
            <Filterchips
              beschriftung={t('service.planung.team')}
              optionen={(personen.data ?? [])
                .filter((p) => p.id !== w.person)
                .map((p) => ({ wert: p.id, text: p.name }))}
              gewaehlt={w.team}
              onChange={(team) => {
                setW({ ...w, team })
              }}
            />
          </div>
          {hinweise.length > 0 && (
            <ul
              className="bg-warn-soft text-warn flex flex-col gap-1 rounded-md p-2 text-sm sm:col-span-2"
              aria-label={t('service.planung.hinweise')}
            >
              {hinweise.map((h) => (
                <li key={`${h.person_id}-${h.grund}-${h.text}`} className="flex items-center gap-2">
                  <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
                  {t(`service.planung.belegt.${h.grund}`, { name: name(h.person_id), was: h.text })}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
