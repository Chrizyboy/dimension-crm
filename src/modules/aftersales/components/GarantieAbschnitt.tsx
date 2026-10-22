import { useQuery } from '@tanstack/react-query'
import { PackageX, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum, parseChf } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { useAktion } from '../hooks/useAktion'
import { garantiefallSpeichern, ladeGarantiefaelle } from '../services/garantie'
import { GARANTIE_STATUS, type Garantiefall, type ServiceFall } from '../types'

type Entwurf = Omit<Garantiefall, 'id' | 'gemeldet_am' | 'eingeschickt_am' | 'ersatz_am' | 'abgeschlossen_am'> & {
  id?: string
}

/**
 * Garantiefall beim Hersteller im Service-Fall: welche Komponente, RMA-Nummer, Stand der Rücksendung
 * (das Datum je Stand setzt die Datenbank) und die Gutschrift, damit nichts beim Hersteller liegen bleibt.
 */
export function GarantieAbschnitt({ fall }: { fall: ServiceFall }) {
  const { t } = useTranslation()
  const status = useAuswahl('garantiestatus')
  const liste = useQuery({ queryKey: ['service', 'garantie', fall.id], queryFn: () => ladeGarantiefaelle(fall.id) })
  const [entwurf, setEntwurf] = useState<Entwurf | null>(null)
  const [gutschrift, setGutschrift] = useState('')
  const { laeuft, aus } = useAktion()

  const oeffnen = (g?: Garantiefall) => {
    setGutschrift(g?.gutschrift_rappen != null ? formatChf(g.gutschrift_rappen) : '')
    setEntwurf(
      g ?? {
        service_fall_id: fall.id,
        anlage_id: fall.anlage_id,
        hersteller: '',
        komponente: '',
        seriennummer: null,
        rma_nummer: null,
        status: 'offen',
        gutschrift_rappen: null,
        notiz: null,
      },
    )
  }
  const feld = (name: keyof Entwurf, wert: string) => {
    if (entwurf) setEntwurf({ ...entwurf, [name]: wert || null })
  }

  async function speichern() {
    if (!entwurf) return
    const e = entwurf
    const ok = await aus(
      () =>
        garantiefallSpeichern({
          ...(e.id ? { id: e.id } : {}),
          service_fall_id: e.service_fall_id,
          anlage_id: e.anlage_id,
          hersteller: e.hersteller.trim(),
          komponente: e.komponente.trim(),
          seriennummer: e.seriennummer,
          rma_nummer: e.rma_nummer,
          status: e.status,
          gutschrift_rappen: gutschrift.trim() ? parseChf(gutschrift) : null,
          notiz: e.notiz,
        }),
      { de: 'Garantiefall gespeichert', fr: 'Cas de garantie enregistré' },
    )
    if (ok) {
      setEntwurf(null)
      void liste.refetch()
    }
  }

  const faelle = liste.data ?? []
  return (
    <AkteAbschnitt
      titel={t('service.garantiefall.titel')}
      zusatz={faelle.length ? String(faelle.length) : undefined}
      offen={faelle.length > 0}
    >
      <ul className="flex flex-col gap-2 text-sm">
        {faelle.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              className="hover:bg-muted flex w-full flex-col gap-0.5 rounded-md border p-2 text-left"
              onClick={() => {
                oeffnen(g)
              }}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {g.hersteller} · {g.komponente}
                </span>
                <Badge ton={tonVonFarbe(status.finde(g.status)?.farbe)} punkt>
                  {status.text(g.status)}
                </Badge>
              </span>
              <span className="text-muted-foreground text-xs">
                {[
                  g.rma_nummer && `RMA ${g.rma_nummer}`,
                  g.seriennummer && `S/N ${g.seriennummer}`,
                  g.eingeschickt_am &&
                    t('service.garantiefall.eingeschicktAm', { datum: formatDatum(g.eingeschickt_am) }),
                  g.gutschrift_rappen != null && formatChf(g.gutschrift_rappen, { mitWaehrung: true }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        className="mt-2"
        onClick={() => {
          oeffnen()
        }}
      >
        <Plus />
        {t('service.garantiefall.neu')}
      </Button>
      {entwurf && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setEntwurf(null)
          }}
        >
          <DialogInhalt
            titel={t(entwurf.id ? 'service.garantiefall.bearbeiten' : 'service.garantiefall.neu')}
            beschreibung={t('service.garantiefall.beschreibung')}
            fuss={
              <Button
                laedt={laeuft}
                disabled={!entwurf.hersteller.trim() || !entwurf.komponente.trim()}
                onClick={() => void speichern()}
              >
                <PackageX />
                {t('allgemein.speichern')}
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Feld id="g-hersteller" label={t('service.garantiefall.hersteller')} pflicht>
                <Input
                  id="g-hersteller"
                  value={entwurf.hersteller}
                  onChange={(e) => {
                    feld('hersteller', e.target.value)
                  }}
                />
              </Feld>
              <Feld id="g-komponente" label={t('service.garantiefall.komponente')} pflicht>
                <Input
                  id="g-komponente"
                  value={entwurf.komponente}
                  onChange={(e) => {
                    feld('komponente', e.target.value)
                  }}
                />
              </Feld>
              <Feld id="g-sn" label={t('service.garantiefall.seriennummer')}>
                <Input
                  id="g-sn"
                  value={entwurf.seriennummer ?? ''}
                  onChange={(e) => {
                    feld('seriennummer', e.target.value)
                  }}
                />
              </Feld>
              <Feld id="g-rma" label={t('service.garantiefall.rma')}>
                <Input
                  id="g-rma"
                  value={entwurf.rma_nummer ?? ''}
                  onChange={(e) => {
                    feld('rma_nummer', e.target.value)
                  }}
                />
              </Feld>
              <Feld id="g-status" label={t('service.garantiefall.stand')}>
                <Auswahl
                  id="g-status"
                  value={entwurf.status}
                  onValueChange={(v) => {
                    feld('status', v)
                  }}
                  optionen={GARANTIE_STATUS.map((s) => ({ wert: s, text: status.text(s) }))}
                />
              </Feld>
              <Feld id="g-gutschrift" label={t('service.garantiefall.gutschrift')}>
                <Input
                  id="g-gutschrift"
                  inputMode="decimal"
                  value={gutschrift}
                  onChange={(e) => {
                    setGutschrift(e.target.value)
                  }}
                />
              </Feld>
              <Feld id="g-notiz" label={t('service.garantiefall.notiz')} className="col-span-2">
                <Textarea
                  id="g-notiz"
                  rows={2}
                  value={entwurf.notiz ?? ''}
                  onChange={(e) => {
                    feld('notiz', e.target.value)
                  }}
                />
              </Feld>
            </div>
          </DialogInhalt>
        </Dialog>
      )}
    </AkteAbschnitt>
  )
}
