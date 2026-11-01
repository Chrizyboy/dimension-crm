import { ExternalLink, ListPlus, Plus, ShoppingCart, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useBestellungen, useMaterial } from '../hooks/useEinkauf'
import { bestellvorschlag, materialVorschlagen } from '../services/material'
import type { MaterialProjekt, MaterialZeile } from '../types'
import { MaterialTabelle } from './MaterialTabelle'
import { MaterialZeileDialog } from './MaterialZeileDialog'
import { NeueBestellungDialog } from './NeueBestellungDialog'

/**
 * Materialliste eines Projekts: Vorschlag aus Kalkulation oder Offerte, von Hand ergänzen, Deckung je Zeile
 * (Lager, unterwegs, fehlt) und «Bestellvorschlag»: zuerst Lager Bulle reservieren, Rest als Entwürfe.
 */
export function MaterialAkte({
  projektId,
  projekt,
  onBestellung,
  onSchliessen,
}: {
  projektId: string
  projekt: MaterialProjekt | null
  onBestellung: (id: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const material = useMaterial(projektId)
  const bestellungen = useBestellungen('alle', projektId)
  const status = useAuswahl('bestellstatus')
  const { laeuft, aus } = useAktion()
  const [zeile, setZeile] = useState<MaterialZeile | 'neu' | null>(null)
  const [neueBestellung, setNeueBestellung] = useState(false)
  const zeilen = material.data ?? []
  const fehlt = zeilen.filter((z) => z.fehlt > 0).length

  const vorschlag = () =>
    void aus(async () => {
      const r = await bestellvorschlag(projektId)
      melde(r.bestellungen.length || r.reserviert ? 'ok' : 'info', {
        de: `${String(r.reserviert)} aus dem Lager reserviert, ${String(r.bestellungen.length)} Entwürfe${r.ohne_lieferant ? `, ${String(r.ohne_lieferant)} ohne Lieferant` : ''}`,
        fr: `${String(r.reserviert)} réservé(s) au stock, ${String(r.bestellungen.length)} brouillon(s)${r.ohne_lieferant ? `, ${String(r.ohne_lieferant)} sans fournisseur` : ''}`,
      })
    })

  const fuss = (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setNeueBestellung(true)
        }}
      >
        <ShoppingCart />
        {t('einkauf.material.neueBestellung')}
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          setZeile('neu')
        }}
      >
        <Plus />
        {t('einkauf.material.zeile')}
      </Button>
      {zeilen.length === 0 ? (
        <Button laedt={laeuft} onClick={() => void aus(() => materialVorschlagen(projektId))}>
          <Wand2 />
          {t('einkauf.material.vorschlagen')}
        </Button>
      ) : (
        <Button laedt={laeuft} disabled={fehlt === 0} onClick={vorschlag}>
          <ListPlus />
          {t('einkauf.material.bestellvorschlag')}
        </Button>
      )}
    </>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        breite="breit"
        titel={projekt ? `${projekt.nummer} · ${projekt.kunde}` : t('einkauf.material.titel')}
        beschreibung={[
          projekt?.ort,
          projekt?.baubeginn ? t('einkauf.material.bau', { datum: formatDatum(projekt.baubeginn) }) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        fuss={fuss}
      >
        {material.error ? (
          <Fehlerzustand details={String(material.error)} onNochmal={() => void material.refetch()} />
        ) : !material.data ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col">
            <p className="pb-2 text-sm">
              <a
                href={`#/projects?projekt=${projektId}`}
                className="text-accent-ink inline-flex items-center gap-1 underline"
              >
                {t('einkauf.material.zumProjekt')}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </p>
            <AkteAbschnitt
              titel={t('einkauf.material.liste')}
              zusatz={fehlt ? t('einkauf.fehlen', { count: fehlt }) : String(zeilen.length)}
            >
              {zeilen.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('einkauf.material.leer')}</p>
              ) : (
                <MaterialTabelle zeilen={zeilen} onBearbeiten={setZeile} />
              )}
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('einkauf.material.bestellungen')} zusatz={String(bestellungen.data?.length ?? 0)}>
              {(bestellungen.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('einkauf.material.keineBestellung')}</p>
              ) : (
                <ul className="flex flex-col divide-y rounded-md border">
                  {(bestellungen.data ?? []).map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="hover:bg-surface-2 flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                        onClick={() => {
                          onBestellung(b.id)
                        }}
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-mono text-xs">{b.nummer}</span> · {b.lieferant}
                          {b.liefertermin && (
                            <span className="text-muted-foreground"> · {formatDatum(b.liefertermin)}</span>
                          )}
                        </span>
                        <Badge ton={tonVonFarbe(status.finde(b.status)?.farbe)} punkt>
                          {status.text(b.status)}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </AkteAbschnitt>
          </div>
        )}
        {zeile && (
          <MaterialZeileDialog
            projektId={projektId}
            zeile={zeile === 'neu' ? null : zeile}
            onSchliessen={() => {
              setZeile(null)
            }}
          />
        )}
        {neueBestellung && projekt && (
          <NeueBestellungDialog
            projekt={{ id: projekt.id, nummer: projekt.nummer }}
            onSchliessen={() => {
              setNeueBestellung(false)
            }}
            onAngelegt={(id) => {
              setNeueBestellung(false)
              onBestellung(id)
            }}
          />
        )}
      </DialogInhalt>
    </Dialog>
  )
}
