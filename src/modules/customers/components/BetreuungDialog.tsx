import { useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useKontaktAenderung } from '../hooks/useKunden'
import {
  ladeBetreuerAuswahl,
  rechnungsadresseAus,
  speichereBetreuung,
  type Betreuung,
  type Rechnungsadresse,
} from '../services/betreuung'
import type { Kontakt } from '../types'

const KEINE = '–'
const LEER: Rechnungsadresse = { name: '', zusatz: '', strasse: '', plz: '', ort: '' }

/** Betreuer, Herkunft und Rechnungsangaben am Kunden bearbeiten. */
export function BetreuungDialog({ kontakt, onSchliessen }: { kontakt: Kontakt; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const quelle = useAuswahl('quelle')
  const personen = useQuery({ queryKey: ['personen', 'betreuer'], queryFn: ladeBetreuerAuswahl, staleTime: 600_000 })
  const anfang = rechnungsadresseAus(kontakt.rechnungsadresse)
  const [abweichend, setAbweichend] = useState(anfang !== null)
  const [adresse, setAdresse] = useState<Rechnungsadresse>(anfang ?? LEER)
  const [w, setW] = useState<Omit<Betreuung, 'rechnungsadresse'>>({
    betreuer_id: kontakt.betreuer_id,
    herkunft: kontakt.herkunft,
    uid_nr: kontakt.uid_nr ?? '',
    rechnungs_email: kontakt.rechnungs_email ?? '',
    zahlungsfrist_tage: kontakt.zahlungsfrist_tage,
  })
  const speichern = useKontaktAenderung((b: Betreuung) => speichereBetreuung(kontakt.id, b))

  async function absenden() {
    try {
      await speichern.mutateAsync({ ...w, rechnungsadresse: abweichend ? adresse : null })
      melde('ok', { de: 'Gespeichert', fr: 'Enregistré' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'betreuung')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const adressFeld = (feld: keyof Rechnungsadresse) => (
    <Feld id={`ra-${feld}`} label={t(`kundenseite.betreuung.adresse.${feld}`)}>
      <Input
        id={`ra-${feld}`}
        value={adresse[feld]}
        onChange={(e) => {
          setAdresse((a) => ({ ...a, [feld]: e.target.value }))
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
        titel={t('kundenseite.betreuung.bearbeiten')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld id="betreuer" label={t('kundenseite.betreuung.betreuer')}>
              <Auswahl
                id="betreuer"
                value={w.betreuer_id ?? KEINE}
                onValueChange={(v) => {
                  setW((x) => ({ ...x, betreuer_id: v === KEINE ? null : v }))
                }}
                optionen={[
                  { wert: KEINE, text: t('kundenseite.betreuung.keinBetreuer') },
                  ...(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name })),
                ]}
              />
            </Feld>
            <Feld id="herkunft" label={t('kundenseite.betreuung.herkunft')}>
              <Auswahl
                id="herkunft"
                value={w.herkunft ?? KEINE}
                onValueChange={(v) => {
                  setW((x) => ({ ...x, herkunft: v === KEINE ? null : v }))
                }}
                optionen={[
                  { wert: KEINE, text: KEINE },
                  ...quelle.werte.map((q) => ({ wert: q.schluessel, text: quelle.text(q.schluessel) })),
                ]}
              />
            </Feld>
            <Feld id="rechnungs-email" label={t('kundenseite.betreuung.rechnungsEmail')}>
              <Input
                id="rechnungs-email"
                type="email"
                value={w.rechnungs_email}
                onChange={(e) => {
                  setW((x) => ({ ...x, rechnungs_email: e.target.value }))
                }}
              />
            </Feld>
            <Feld
              id="zahlungsfrist"
              label={t('kundenseite.betreuung.zahlungsfrist')}
              hinweis={t('kundenseite.betreuung.fristFirma')}
            >
              <Input
                id="zahlungsfrist"
                inputMode="numeric"
                value={w.zahlungsfrist_tage ?? ''}
                onChange={(e) => {
                  const z = e.target.value.replace(/\D/g, '').slice(0, 3)
                  setW((x) => ({ ...x, zahlungsfrist_tage: z ? Math.min(120, Number(z)) : null }))
                }}
              />
            </Feld>
            <Feld id="uid" label={t('kundenseite.betreuung.uid')} hinweis="CHE-123.456.789">
              <Input
                id="uid"
                value={w.uid_nr}
                onChange={(e) => {
                  setW((x) => ({ ...x, uid_nr: e.target.value }))
                }}
              />
            </Feld>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={abweichend}
              onCheckedChange={(c) => {
                setAbweichend(c === true)
              }}
            />
            {t('kundenseite.betreuung.abweichend')}
          </label>
          {abweichend && (
            <div className="flex flex-col gap-4">
              {adressFeld('name')}
              {adressFeld('zusatz')}
              {adressFeld('strasse')}
              <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
                {adressFeld('plz')}
                {adressFeld('ort')}
              </div>
            </div>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
