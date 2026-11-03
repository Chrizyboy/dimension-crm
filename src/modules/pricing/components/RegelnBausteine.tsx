import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAusfuehren } from '../hooks/useAusfuehren'
import { entferneBaustein, speichereBaustein } from '../services/regeln'
import type { Baustein, BausteinZeile, Leistung } from '../types'
import { PreisFeld } from './PreisFeld'

const REGELN = ['fest', 'je_modul', 'je_kwp'] as const

/**
 * Bausteine der Kalkulation (P3): z. B. «PV Aufdach Ziegel» = Module nach Wahl, Wechselrichter nach Wahl,
 * Unterkonstruktion je Modul, Montage je kWp, Gerüst, Anfahrt. Hier Faktor und Regel je Zeile ändern, Zeilen
 * dazu oder weg und neue Bausteine anlegen. Die Mengen rechnet die Kalkulation daraus.
 */
export function RegelnBausteine({ bausteine, leistungen }: { bausteine: Baustein[]; leistungen: Leistung[] }) {
  const { t, i18n } = useTranslation()
  const fr = i18n.language.startsWith('fr')
  const kat = useAuswahl('artikelkategorie')
  const { arbeitet, fuehreAus } = useAusfuehren('preise.bausteine')
  const [neuName, setNeuName] = useState('')
  const speichere = (b: Baustein, zeilen: BausteinZeile[]) =>
    void fuehreAus(() => speichereBaustein({ id: b.id, nameDe: b.nameDe, nameFr: b.nameFr, zeilen }))

  function beschreibe(z: BausteinZeile): string {
    if (z.art === 'leistung') {
      const l = leistungen.find((x) => x.schluessel === z.leistung)
      return l ? (fr ? l.nameFr : l.nameDe) : (z.leistung ?? '–')
    }
    return t(`preise.baustein.art.${z.art}`, { kategorie: z.kategorie ? kat.text(z.kategorie) : '–' })
  }

  const dazu = [
    ...leistungen.map((l) => ({ wert: `l:${l.schluessel}`, text: fr ? l.nameFr : l.nameDe })),
    ...kat.werte.map((k) => ({
      wert: `k:${k.schluessel}`,
      text: t('preise.baustein.art.wahl', { kategorie: kat.text(k.schluessel) }),
    })),
  ]
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('preise.regel.bausteine')}</KarteTitel>
        <span className="flex gap-2">
          <Input
            aria-label={t('preise.regel.bausteinName')}
            placeholder={t('preise.regel.bausteinName')}
            value={neuName}
            onChange={(e) => {
              setNeuName(e.target.value)
            }}
            className="h-8 w-48"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!neuName.trim() || arbeitet}
            onClick={() =>
              void fuehreAus(async () => {
                await speichereBaustein({ nameDe: neuName.trim(), nameFr: neuName.trim(), zeilen: [] })
                setNeuName('')
              })
            }
          >
            <Plus />
            {t('preise.regel.bausteinDazu')}
          </Button>
        </span>
      </KarteKopf>
      <KarteInhalt className="grid gap-3 md:grid-cols-2">
        {bausteine.map((b) => (
          <section
            key={b.id}
            className="flex flex-col gap-1 rounded-lg border p-3"
            aria-label={fr ? b.nameFr : b.nameDe}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{fr ? b.nameFr : b.nameDe}</h3>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t('preise.regel.bausteinWeg', { name: b.nameDe })}
                onClick={() => void fuehreAus(() => entferneBaustein(b.id))}
              >
                <X />
              </Button>
            </div>
            {b.zeilen.map((z, i) => (
              <div key={i} className="flex items-center gap-2 border-b py-1 text-sm last:border-b-0">
                <span className="min-w-0 flex-1 truncate">{beschreibe(z)}</span>
                <Auswahl
                  aria-label={t('preise.baustein.regel', { name: beschreibe(z) })}
                  className="w-32"
                  value={z.regel}
                  onValueChange={(r) => {
                    speichere(
                      b,
                      b.zeilen.map((x, j) => (j === i ? { ...x, regel: r as BausteinZeile['regel'] } : x)),
                    )
                  }}
                  optionen={REGELN.map((r) => ({ wert: r, text: t(`preise.baustein.regelArt.${r}`) }))}
                />
                <PreisFeld
                  label={t('preise.baustein.faktor', { name: beschreibe(z) })}
                  className="w-14"
                  wert={String(z.faktor)}
                  onSpeichern={(x) => {
                    const f = Number(x.replace(',', '.'))
                    if (Number.isFinite(f) && f >= 0)
                      speichere(
                        b,
                        b.zeilen.map((y, j) => (j === i ? { ...y, faktor: f } : y)),
                      )
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={t('preise.baustein.zeileWeg', { name: beschreibe(z) })}
                  onClick={() => {
                    speichere(
                      b,
                      b.zeilen.filter((_, j) => j !== i),
                    )
                  }}
                >
                  <X />
                </Button>
              </div>
            ))}
            <Auswahl
              aria-label={t('preise.baustein.zeileDazu')}
              platzhalter={t('preise.baustein.zeileDazu')}
              value=""
              onValueChange={(w) => {
                const [art, wert] = [w.slice(0, 1), w.slice(2)]
                const z: BausteinZeile =
                  art === 'l'
                    ? { art: 'leistung', leistung: wert, regel: 'fest', faktor: 1 }
                    : { art: 'wahl', kategorie: wert, regel: 'fest', faktor: 1 }
                speichere(b, [...b.zeilen, z])
              }}
              optionen={dazu}
              className="mt-1"
            />
          </section>
        ))}
      </KarteInhalt>
    </Karte>
  )
}
