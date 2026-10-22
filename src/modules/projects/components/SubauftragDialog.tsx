import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useSubunternehmer } from '../hooks/useProjekte'
import { subauftragSpeichern } from '../services/subunternehmer'
import type { Subauftrag, SubauftragStatus } from '../types'

const STATUS: SubauftragStatus[] = ['angefragt', 'bestaetigt', 'erledigt', 'abgesagt']

/** Auftrag an einen Subunternehmer erfassen oder ändern: wer, was, wann, wie viel. */
export function SubauftragDialog({
  projektId,
  auftrag,
  onSchliessen,
}: {
  projektId: string
  auftrag: Subauftrag | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const subs = useSubunternehmer()
  const [w, setW] = useState({
    subunternehmer_id: auftrag?.subunternehmer_id ?? '',
    leistung: auftrag?.leistung ?? '',
    betrag: auftrag?.betrag_rappen != null ? formatChf(auftrag.betrag_rappen) : '',
    termin_von: auftrag?.termin_von ?? '',
    termin_bis: auftrag?.termin_bis ?? '',
    status: auftrag?.status ?? 'angefragt',
    notiz: auftrag?.notiz ?? '',
  })
  const [fehler, setFehler] = useState<string | null>(null)

  async function speichern() {
    if (!w.subunternehmer_id) {
      setFehler(t('projekte.sub.waehlen'))
      return
    }
    const ok = await aus(
      () =>
        subauftragSpeichern({
          ...(auftrag ? { id: auftrag.id } : {}),
          projekt_id: projektId,
          subunternehmer_id: w.subunternehmer_id,
          leistung: w.leistung.trim(),
          betrag_rappen: w.betrag ? parseChf(w.betrag) : null,
          termin_von: w.termin_von || null,
          termin_bis: w.termin_bis || null,
          status: w.status,
          notiz: w.notiz.trim() || null,
          bestaetigt_am: auftrag?.bestaetigt_am ?? null,
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onSchliessen()
  }

  const datum = (f: 'termin_von' | 'termin_bis') => (
    <Feld id={`sa-${f}`} label={t(`projekte.sub.${f}`)}>
      <Input
        id={`sa-${f}`}
        type="date"
        value={w[f]}
        onChange={(e) => {
          setW({ ...w, [f]: e.target.value })
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
        titel={t(auftrag ? 'projekte.sub.aendern' : 'projekte.sub.neu')}
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Feld id="sa-sub" label={t('projekte.feld.subunternehmer')} pflicht {...(fehler ? { fehler } : {})}>
              <Auswahl
                id="sa-sub"
                value={w.subunternehmer_id}
                onValueChange={(v) => {
                  setW({ ...w, subunternehmer_id: v })
                }}
                optionen={(subs.data ?? [])
                  .filter((s) => s.aktiv || s.id === w.subunternehmer_id)
                  .map((s) => ({ wert: s.id, text: s.gewerk ? `${s.name} (${s.gewerk})` : s.name }))}
              />
            </Feld>
          </div>
          <div className="sm:col-span-2">
            <Feld id="sa-leistung" label={t('projekte.sub.leistung')}>
              <Input
                id="sa-leistung"
                value={w.leistung}
                onChange={(e) => {
                  setW({ ...w, leistung: e.target.value })
                }}
              />
            </Feld>
          </div>
          {datum('termin_von')}
          {datum('termin_bis')}
          <Feld id="sa-betrag" label={t('projekte.sub.betrag')}>
            <Input
              id="sa-betrag"
              inputMode="decimal"
              value={w.betrag}
              onChange={(e) => {
                setW({ ...w, betrag: e.target.value })
              }}
            />
          </Feld>
          <Feld id="sa-status" label={t('projekte.feld.stand')}>
            <Auswahl
              id="sa-status"
              value={w.status}
              onValueChange={(v) => {
                setW({ ...w, status: v as SubauftragStatus })
              }}
              optionen={STATUS.map((s) => ({ wert: s, text: t(`projekte.subStatus.${s}`) }))}
            />
          </Feld>
          <div className="sm:col-span-2">
            <Feld id="sa-notiz" label={t('projekte.feld.notiz')}>
              <Textarea
                id="sa-notiz"
                rows={2}
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
