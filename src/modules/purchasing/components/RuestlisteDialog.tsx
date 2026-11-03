import { Printer, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { useDrucken } from '@/hooks/useDrucken'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useRuestliste } from '../hooks/useEinkauf'
import { alsZahl, formatMenge } from '../lib/anzeige'
import { ruestVorschlag } from '../lib/lagerTypen'
import { ruesten } from '../services/lager'
import { RuestlisteDruck } from './RuestlisteDruck'

/**
 * Rüstliste: was für das Projekt noch aus dem Lager an die Baustelle geht, nach Lagerplatz sortiert. Menge
 * vorgeschlagen (offen, höchstens reserviert + frei), drucken zum Abhaken, «Ausgeben» bucht die Entnahmen.
 */
export function RuestlisteDialog({
  projektId,
  titel,
  onSchliessen,
}: {
  projektId: string
  titel: string
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const liste = useRuestliste(projektId)
  const druck = useDrucken()
  const { laeuft, aus } = useAktion()
  const [eingabe, setEingabe] = useState<Record<string, string>>({})
  const zeilen = liste.data ?? []
  const mengen = zeilen.map((z) => {
    const e = eingabe[z.material_id]
    return e === undefined ? ruestVorschlag(z) : (alsZahl(e) ?? 0)
  })
  const auszugeben = zeilen.filter((_, i) => (mengen[i] ?? 0) > 0).length

  async function ausgeben() {
    const ok = await aus(async () => {
      const n = await ruesten(
        projektId,
        zeilen.map((z, i) => ({ id: z.material_id, menge: mengen[i] ?? 0, lagerort_id: z.lagerort_id })),
      )
      melde('ok', { de: `${String(n)} Positionen ausgegeben`, fr: `${String(n)} position(s) sortie(s)` })
    })
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
        className="sm:max-w-3xl"
        titel={t('einkauf.ruest.titel')}
        beschreibung={t('einkauf.ruest.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button variant="secondary" disabled={zeilen.length === 0} onClick={druck.drucke}>
              <Printer />
              {t('einkauf.ruest.drucken')}
            </Button>
            <Button laedt={laeuft} disabled={auszugeben === 0} onClick={() => void ausgeben()}>
              <Truck />
              {t('einkauf.ruest.ausgeben', { count: auszugeben })}
            </Button>
          </>
        }
      >
        {!liste.data ? (
          <Skelett className="h-48" />
        ) : zeilen.length === 0 ? (
          <Leerzustand icon={Truck} titel={t('einkauf.ruest.leer')} text={t('einkauf.ruest.leerText')} />
        ) : (
          <Tabelle>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('einkauf.lager.platz')}</Kopfzelle>
                <Kopfzelle>{t('einkauf.lager.artikel')}</Kopfzelle>
                <Kopfzelle zahl>{t('einkauf.ruest.offen')}</Kopfzelle>
                <Kopfzelle zahl className="hidden sm:table-cell">
                  {t('einkauf.lager.reserviert')}
                </Kopfzelle>
                <Kopfzelle zahl className="hidden sm:table-cell">
                  {t('einkauf.lager.frei')}
                </Kopfzelle>
                <Kopfzelle zahl>{t('einkauf.ruest.menge')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {zeilen.map((z, i) => (
                <Zeile key={z.material_id}>
                  <Zelle className="font-mono text-xs">{z.lagerplatz ?? '–'}</Zelle>
                  <Zelle>
                    <span className="line-clamp-2 max-w-[20rem]">{z.bezeichnung}</span>
                    {z.artikelnummer && <span className="text-muted-foreground block text-xs">{z.artikelnummer}</span>}
                  </Zelle>
                  <Zelle zahl>
                    {formatMenge(z.offen)} <span className="text-muted-foreground text-xs">{z.einheit}</span>
                  </Zelle>
                  <Zelle zahl className="hidden sm:table-cell">
                    {formatMenge(z.reserviert)}
                  </Zelle>
                  <Zelle zahl className="hidden sm:table-cell">
                    {formatMenge(z.frei)}
                  </Zelle>
                  <Zelle zahl className="py-1">
                    <Input
                      inputMode="decimal"
                      className="ml-auto h-8 w-20 text-right"
                      aria-label={t('einkauf.ruest.mengeFuer', { name: z.bezeichnung })}
                      value={eingabe[z.material_id] ?? formatMenge(mengen[i] ?? 0)}
                      onChange={(e) => {
                        setEingabe((alt) => ({ ...alt, [z.material_id]: e.target.value }))
                      }}
                    />
                  </Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        )}
        {druck.aktiv && <RuestlisteDruck titel={titel} zeilen={zeilen} mengen={mengen} />}
      </DialogInhalt>
    </Dialog>
  )
}
