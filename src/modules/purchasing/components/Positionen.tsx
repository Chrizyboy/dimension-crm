import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { alsZahl, formatMenge } from '../lib/anzeige'
import { positionEntfernen, positionSpeichern } from '../services/bestellungen'
import { lieferantenpreis } from '../services/material'
import type { ArtikelTreffer, Bestellung, Position } from '../types'
import { ArtikelWahl } from './ArtikelWahl'

/**
 * Positionen einer Bestellung. Im Entwurf: Menge und Einkaufspreis direkt ändern, Artikel dazunehmen
 * (Preis und Artikelnummer des Lieferanten kommen aus der Preisliste) oder entfernen. Danach nur lesen.
 */
export function Positionen({ bestellung: b, positionen }: { bestellung: Bestellung; positionen: Position[] }) {
  const { t } = useTranslation()
  const { aus } = useAktion()
  const entwurf = b.status === 'entwurf'
  const mitLieferung = ['bestellt', 'teilgeliefert', 'geliefert'].includes(b.status)
  const naechste = (positionen.at(-1)?.reihenfolge ?? 0) + 10

  const aendern = (p: Position, felder: Partial<Pick<Position, 'menge' | 'ek_rappen'>>) => {
    const { id, bestellung_id, artikel_id, bezeichnung, artikelnummer, menge, einheit, ek_rappen, reihenfolge } = p
    void aus(() =>
      positionSpeichern({
        id,
        bestellung_id,
        artikel_id,
        bezeichnung,
        artikelnummer,
        menge,
        einheit,
        ek_rappen,
        reihenfolge,
        ...felder,
      }),
    )
  }

  const dazu = (a: ArtikelTreffer | null, text: string) =>
    void aus(async () => {
      const preis = a ? await lieferantenpreis(a.id, b.lieferant_id) : null
      await positionSpeichern({
        bestellung_id: b.id,
        artikel_id: a?.id ?? null,
        bezeichnung: a?.name ?? text,
        artikelnummer: preis?.artikelnummer ?? a?.artikelnummer ?? null,
        menge: 1,
        einheit: a?.einheit ?? 'Stk',
        ek_rappen: preis?.ek_rappen ?? null,
        reihenfolge: naechste,
      })
    })

  return (
    <div className="flex flex-col gap-2">
      {positionen.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('einkauf.akte.keinePositionen')}</p>
      ) : (
        <Tabelle>
          <TabelleKopf>
            <tr>
              <Kopfzelle>{t('einkauf.pos.bezeichnung')}</Kopfzelle>
              <Kopfzelle zahl>{t('einkauf.pos.menge')}</Kopfzelle>
              {mitLieferung && <Kopfzelle zahl>{t('einkauf.pos.geliefert')}</Kopfzelle>}
              <Kopfzelle zahl>{t('einkauf.pos.ek')}</Kopfzelle>
              {entwurf && <Kopfzelle className="w-8" />}
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {positionen.map((p) => (
              <Zeile key={p.id}>
                <Zelle className="min-w-0 py-1.5">
                  <span className="block max-w-[16rem] truncate">{p.bezeichnung}</span>
                  {p.artikelnummer && <span className="text-muted-foreground block text-xs">{p.artikelnummer}</span>}
                </Zelle>
                <Zelle zahl>
                  {entwurf ? (
                    <Input
                      key={`${p.id}-${String(p.menge)}`}
                      aria-label={t('einkauf.pos.mengeVon', { name: p.bezeichnung })}
                      className="ml-auto w-20 text-right"
                      inputMode="decimal"
                      defaultValue={formatMenge(p.menge)}
                      onBlur={(e) => {
                        const n = alsZahl(e.target.value)
                        if (n !== null && n > 0 && n !== p.menge) aendern(p, { menge: n })
                      }}
                    />
                  ) : (
                    `${formatMenge(p.menge)} ${p.einheit}`
                  )}
                </Zelle>
                {mitLieferung && <Zelle zahl>{formatMenge(p.geliefert_menge)}</Zelle>}
                <Zelle zahl>
                  {entwurf ? (
                    <Input
                      key={`${p.id}-${String(p.ek_rappen)}`}
                      aria-label={t('einkauf.pos.ekVon', { name: p.bezeichnung })}
                      className="ml-auto w-24 text-right"
                      inputMode="decimal"
                      defaultValue={p.ek_rappen === null ? '' : formatChf(p.ek_rappen)}
                      onBlur={(e) => {
                        const r = e.target.value.trim() ? parseChf(e.target.value) : null
                        if (r !== p.ek_rappen) aendern(p, { ek_rappen: r })
                      }}
                    />
                  ) : p.ek_rappen === null ? (
                    '–'
                  ) : (
                    formatChf(p.ek_rappen)
                  )}
                </Zelle>
                {entwurf && (
                  <Zelle className="px-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('einkauf.pos.entfernen', { name: p.bezeichnung })}
                      onClick={() => void aus(() => positionEntfernen(p.id))}
                    >
                      <Trash2 />
                    </Button>
                  </Zelle>
                )}
              </Zeile>
            ))}
          </TabelleKoerper>
        </Tabelle>
      )}
      {entwurf && (
        <ArtikelWahl
          id="bestellung-artikel"
          onWahl={(a) => {
            dazu(a, a.name)
          }}
          onFrei={(text) => {
            if (text) dazu(null, text)
          }}
        />
      )}
    </div>
  )
}
