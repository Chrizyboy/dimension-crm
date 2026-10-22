import { MoreHorizontal, PackageMinus, PackagePlus, Pencil, Trash2, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTrenner } from '@/components/ui/menue'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { useAktion } from '../hooks/useAktion'
import { useLagerorte } from '../hooks/useEinkauf'
import { formatMenge } from '../lib/anzeige'
import { lagerBuchen } from '../services/lager'
import { zeileEntfernen } from '../services/material'
import type { MaterialZeile } from '../types'

/**
 * Zeilen der Materialliste mit Deckung: «da» (reserviert, entnommen oder direkt geliefert), «unterwegs»
 * (bestellt) und «fehlt». Im Menü: bearbeiten, aus dem Lager reservieren, ausgeben, freigeben, entfernen.
 */
export function MaterialTabelle({
  zeilen,
  onBearbeiten,
}: {
  zeilen: MaterialZeile[]
  onBearbeiten: (z: MaterialZeile) => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const lager = useLagerorte().data?.[0]

  const buchen = (z: MaterialZeile, art: 'reservierung' | 'freigabe' | 'entnahme', menge: number) => {
    if (!lager || !z.artikel_id) return
    void aus(() =>
      lagerBuchen({ art, lagerort_id: lager.id, artikel_id: z.artikel_id ?? '', menge, projekt_material_id: z.id }),
    )
  }

  return (
    <Tabelle>
      <TabelleKopf>
        <tr>
          <Kopfzelle>{t('einkauf.pos.bezeichnung')}</Kopfzelle>
          <Kopfzelle zahl>{t('einkauf.pos.menge')}</Kopfzelle>
          <Kopfzelle zahl>{t('einkauf.material.da')}</Kopfzelle>
          <Kopfzelle zahl className="hidden sm:table-cell">
            {t('einkauf.material.unterwegs')}
          </Kopfzelle>
          <Kopfzelle zahl>{t('einkauf.material.fehlt')}</Kopfzelle>
          <Kopfzelle className="w-8" />
        </tr>
      </TabelleKopf>
      <TabelleKoerper>
        {zeilen.map((z) => (
          <Zeile key={z.id}>
            <Zelle className="py-1.5">
              <span className="block max-w-[18rem] truncate">{z.bezeichnung}</span>
              <span className="text-muted-foreground block text-xs">
                {[z.artikelnummer, !z.artikel_id ? t('einkauf.material.ohneArtikel') : null, z.notiz]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </Zelle>
            <Zelle zahl>
              {formatMenge(z.menge)} <span className="text-muted-foreground text-xs">{z.einheit}</span>
            </Zelle>
            <Zelle zahl>{formatMenge(z.vorhanden)}</Zelle>
            <Zelle zahl className="hidden sm:table-cell">
              {formatMenge(z.unterwegs)}
            </Zelle>
            <Zelle zahl>
              {z.fehlt > 0 ? <Badge ton="warnung">{formatMenge(z.fehlt)}</Badge> : <Badge ton="ok">0</Badge>}
            </Zelle>
            <Zelle className="px-1">
              <Menue>
                <MenueAusloeser asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    laedt={laeuft}
                    aria-label={t('einkauf.material.aktionen', { name: z.bezeichnung })}
                  >
                    <MoreHorizontal />
                  </Button>
                </MenueAusloeser>
                <MenueInhalt align="end">
                  <MenueEintrag
                    onSelect={() => {
                      onBearbeiten(z)
                    }}
                  >
                    <Pencil />
                    {t('allgemein.bearbeiten')}
                  </MenueEintrag>
                  {z.fehlt > 0 && z.frei_im_lager > 0 && (
                    <MenueEintrag
                      onSelect={() => {
                        buchen(z, 'reservierung', Math.min(z.fehlt, z.frei_im_lager))
                      }}
                    >
                      <PackagePlus />
                      {t('einkauf.material.reservieren', { menge: formatMenge(Math.min(z.fehlt, z.frei_im_lager)) })}
                    </MenueEintrag>
                  )}
                  {z.reserviert > 0 && (
                    <>
                      <MenueEintrag
                        onSelect={() => {
                          buchen(z, 'entnahme', z.reserviert)
                        }}
                      >
                        <Truck />
                        {t('einkauf.material.ausgeben', { menge: formatMenge(z.reserviert) })}
                      </MenueEintrag>
                      <MenueEintrag
                        onSelect={() => {
                          buchen(z, 'freigabe', z.reserviert)
                        }}
                      >
                        <PackageMinus />
                        {t('einkauf.material.freigeben')}
                      </MenueEintrag>
                    </>
                  )}
                  <MenueTrenner />
                  <MenueEintrag
                    disabled={z.vorhanden > 0 || z.unterwegs > 0}
                    onSelect={() => void aus(() => zeileEntfernen(z.id))}
                  >
                    <Trash2 />
                    {t('einkauf.material.entfernen')}
                  </MenueEintrag>
                </MenueInhalt>
              </Menue>
            </Zelle>
          </Zeile>
        ))}
      </TabelleKoerper>
    </Tabelle>
  )
}
