import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KundeWahl, type GewaehlterKunde } from '@/components/shared/KundeWahl'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { entwurfAnlegen, ladeKundenProjekte, ladeKundenWartung } from '../services/rechnungen'
import type { EntwurfVorgabe } from '../types'

/** Vorlagen von V233 «Neuer Rechnungsentwurf»: Anzahlung 30 %, Montage 60 %, Schluss (Rest), Gesamt, dazu Wartung und frei. */
const VORLAGEN = ['anzahlung', 'montage', 'schluss', 'gesamt', 'wartung', 'frei'] as const
type Vorlage = (typeof VORLAGEN)[number]
const PROZENT: Partial<Record<Vorlage, number>> = { anzahlung: 30, montage: 60 }

/** Was die Vorlage an die Datenbank schickt. */
function vorgabe(v: Vorlage, kunde: string, projekt: string, wartung: string, prozent: number): EntwurfVorgabe {
  switch (v) {
    case 'anzahlung':
      return { projekt_id: projekt, art: 'anzahlung', prozent }
    case 'montage':
      return { projekt_id: projekt, art: 'teilzahlung', prozent }
    case 'schluss':
      return { projekt_id: projekt, art: 'schluss' }
    case 'gesamt':
      return { projekt_id: projekt, art: 'schluss', prozent: 100 }
    case 'wartung':
      return { wartungsvertrag_id: wartung }
    default:
      return { kontakt_id: kunde }
  }
}

/** Neuer Rechnungsentwurf: Kunde, Vorlage, Projekt oder Wartungsvertrag; die Positionen schlägt die Datenbank vor. */
export function NeueRechnungDialog({
  onSchliessen,
  onAngelegt,
}: {
  onSchliessen: () => void
  onAngelegt: (id: string) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [kunde, setKunde] = useState<GewaehlterKunde | null>(null)
  const [vorlage, setVorlage] = useState<Vorlage>('anzahlung')
  const [projekt, setProjekt] = useState('')
  const [wartung, setWartung] = useState('')
  const [prozent, setProzent] = useState('30')
  const projekte = useQuery({
    queryKey: ['rechnungen', 'kunde-projekte', kunde?.id],
    enabled: !!kunde,
    queryFn: () => (kunde ? ladeKundenProjekte(kunde.id) : Promise.resolve([])),
  })
  const vertraege = useQuery({
    queryKey: ['rechnungen', 'kunde-wartung', kunde?.id],
    enabled: !!kunde && vorlage === 'wartung',
    queryFn: () => (kunde ? ladeKundenWartung(kunde.id) : Promise.resolve([])),
  })
  const mitProjekt = ['anzahlung', 'montage', 'schluss', 'gesamt'].includes(vorlage)
  const p = Number(prozent.replace(',', '.'))
  const fertig =
    !!kunde &&
    (vorlage === 'frei' ||
      (vorlage === 'wartung' && !!wartung) ||
      (mitProjekt && !!projekt && (!(vorlage in PROZENT) || (p > 0 && p <= 100))))

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('rechnungen.neuTitel')}
        beschreibung={t('rechnungen.neuText')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!fertig}
              onClick={() =>
                void aus(async () => {
                  onAngelegt(await entwurfAnlegen(vorgabe(vorlage, kunde?.id ?? '', projekt, wartung, p)))
                })
              }
            >
              {t('rechnungen.entwurfAnlegen')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Feld id="neu-kunde" label={t('rechnungen.spalte.kunde')} pflicht>
            <KundeWahl
              id="neu-kunde"
              wert={kunde}
              onWahl={(k) => {
                setKunde(k)
                setProjekt('')
                setWartung('')
              }}
            />
          </Feld>
          <Feld id="neu-vorlage" label={t('rechnungen.vorlage')}>
            <Auswahl
              id="neu-vorlage"
              value={vorlage}
              onValueChange={(v) => {
                setVorlage(v as Vorlage)
                const vorschlag = PROZENT[v as Vorlage]
                if (vorschlag) setProzent(String(vorschlag))
              }}
              optionen={VORLAGEN.map((v) => ({ wert: v, text: t(`rechnungen.vorlagen.${v}`) }))}
            />
          </Feld>
          {mitProjekt && kunde && (
            <Feld
              id="neu-projekt"
              label={t('rechnungen.spalte.projekt')}
              pflicht
              {...(projekte.data?.length === 0 ? { hinweis: t('rechnungen.keineProjekte') } : {})}
            >
              <Auswahl
                id="neu-projekt"
                value={projekt}
                onValueChange={setProjekt}
                platzhalter={t('rechnungen.projektWaehlen')}
                optionen={(projekte.data ?? []).map((x) => ({
                  wert: x.id,
                  text: [
                    x.nummer,
                    x.titel,
                    x.vertragswert_rappen ? formatChf(x.vertragswert_rappen, { mitWaehrung: true }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                }))}
              />
            </Feld>
          )}
          {vorlage in PROZENT && (
            <Feld id="neu-prozent" label={t('rechnungen.prozent')} hinweis={t('rechnungen.prozentHinweis')}>
              <Input
                id="neu-prozent"
                inputMode="decimal"
                className="w-24"
                value={prozent}
                onChange={(e) => {
                  setProzent(e.target.value)
                }}
              />
            </Feld>
          )}
          {vorlage === 'wartung' && kunde && (
            <Feld
              id="neu-wartung"
              label={t('rechnungen.wartungsvertrag')}
              pflicht
              {...(vertraege.data?.length === 0 ? { hinweis: t('rechnungen.keineVertraege') } : {})}
            >
              <Auswahl
                id="neu-wartung"
                value={wartung}
                onValueChange={setWartung}
                platzhalter={t('rechnungen.vertragWaehlen')}
                optionen={(vertraege.data ?? []).map((x) => ({
                  wert: x.id,
                  text: [x.nummer, x.preis_rappen ? formatChf(x.preis_rappen, { mitWaehrung: true }) : null]
                    .filter(Boolean)
                    .join(' · '),
                }))}
              />
            </Feld>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
