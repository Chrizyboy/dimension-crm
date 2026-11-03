import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf } from '@/lib/format'
import { bausteinPositionen } from '../lib/bausteine'
import type { Artikel, Baustein, KalkPosition, Kalkulation, Leistung } from '../types'

const KEIN = 'kein'

/**
 * Baustein einfügen: je «Wahl»-Zeile den Artikel aus der Kategorie wählen (am Lager zuerst), feste Mengen
 * anpassen, Variante wählen. Zeilen mit Regel rechnen ihre Menge selbst (je Modul, je kWp).
 */
export function BausteinDialog({
  b,
  k,
  artikel,
  leistungen,
  sprache,
  onDazu,
  onSchliessen,
}: {
  b: Baustein
  k: Kalkulation
  artikel: Artikel[]
  leistungen: Leistung[]
  sprache: 'de' | 'fr'
  onDazu: (p: KalkPosition[]) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const kategorien = useAuswahl('artikelkategorie')
  const [wahl, setWahl] = useState<Record<number, string | undefined>>({})
  const [mengen, setMengen] = useState<Record<number, number | undefined>>({})
  const [variante, setVariante] = useState<string | null>(k.variante ?? k.varianten?.[0]?.id ?? null)
  const vorschau = bausteinPositionen(b, {
    wahl,
    mengen,
    artikel,
    leistungen,
    bestehend: k.positionen,
    variante,
    sprache,
  })
  const name = sprache === 'fr' ? b.nameFr : b.nameDe

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('preise.baustein.titel', { name })}
        beschreibung={t('preise.baustein.beschreibung')}
        fuss={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              disabled={vorschau.length === 0}
              onClick={() => {
                onDazu(vorschau)
              }}
            >
              {t('preise.baustein.einfuegen', { count: vorschau.length })}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {(k.varianten?.length ?? 0) > 0 && (
            <Feld id="bs-variante" label={t('preise.baustein.variante')}>
              <Auswahl
                id="bs-variante"
                value={variante ?? ''}
                onValueChange={setVariante}
                optionen={(k.varianten ?? []).map((v) => ({ wert: v.id, text: `${v.id} · ${v.name}` }))}
              />
            </Feld>
          )}
          {b.zeilen.map((z, i) => {
            if (z.art === 'leistung') {
              const l = leistungen.find((x) => x.schluessel === z.leistung)
              const p = vorschau.find((x) => x.leistung === z.leistung)
              return (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span>{l ? (sprache === 'fr' ? l.nameFr : l.nameDe) : z.leistung}</span>
                  <span className="text-muted-foreground zahlen text-xs">
                    {p ? `${p.menge} ${p.einheit} · ${formatChf((p.preisRappen ?? 0) * p.menge)}` : '–'}
                  </span>
                </div>
              )
            }
            const auswahl = artikel
              .filter(
                (a) =>
                  a.archiviertAm === null &&
                  (z.art === 'artikel' ? a.id === z.artikel_id : a.kategorie === z.kategorie),
              )
              .sort((a, c) => c.lagerFrei - a.lagerFrei || a.name.localeCompare(c.name, 'de-CH'))
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_6rem]">
                <Feld id={`bs-wahl-${i}`} label={kategorien.text(z.kategorie ?? '') || t('preise.baustein.artikel')}>
                  <Auswahl
                    id={`bs-wahl-${i}`}
                    value={wahl[i] ?? (z.art === 'artikel' ? (z.artikel_id ?? KEIN) : KEIN)}
                    onValueChange={(v) => {
                      setWahl({ ...wahl, [i]: v === KEIN ? undefined : v })
                    }}
                    optionen={[
                      { wert: KEIN, text: t('preise.baustein.ohne') },
                      ...auswahl.map((a) => ({
                        wert: a.id,
                        text: `${a.name}${a.lagerFrei > 0 ? ` · ${t('preise.lager.frei', { n: a.lagerFrei })}` : ''}`,
                      })),
                    ]}
                  />
                </Feld>
                {z.regel === 'fest' ? (
                  <Feld id={`bs-menge-${i}`} label={t('preise.kalk.menge')}>
                    <Input
                      id={`bs-menge-${i}`}
                      type="number"
                      min={0}
                      value={mengen[i] ?? z.faktor}
                      onChange={(e) => {
                        setMengen({ ...mengen, [i]: Math.max(0, Number(e.target.value) || 0) })
                      }}
                    />
                  </Feld>
                ) : (
                  <p className="text-muted-foreground self-end pb-1.5 text-xs">
                    {t(`preise.regel.${z.regel}`, { faktor: z.faktor })}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
