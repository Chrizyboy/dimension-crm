import { Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Button } from '@/components/ui/button'
import { formatChf, parseChf } from '@/lib/format'
import { useAusfuehren } from '../hooks/useAusfuehren'
import { entferneLeistung, speichereLeistung } from '../services/regeln'
import type { Leistung } from '../types'
import { PreisFeld } from './PreisFeld'

/** Text direkt in der Tabelle ändern, gleich wie PreisFeld, aber breiter und ohne Zahlenformat. */
function TextFeld({ wert, label, onSpeichern }: { wert: string; label: string; onSpeichern: (t: string) => void }) {
  return (
    <input
      aria-label={label}
      defaultValue={wert}
      onBlur={(e) => {
        if (e.target.value.trim() && e.target.value !== wert) onSpeichern(e.target.value.trim())
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className="hover:border-border focus-visible:border-ring h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-sm outline-none"
    />
  )
}

/**
 * Leistungen & Pauschalen: Montage, Elektriker, Service, Anfahrt, Gerüst, Planung, Pronovo … mit Kosten (was es
 * uns kostet) und Verkaufspreis je Einheit. In der Kalkulation sind sie ein Klick; die Marge rechnet sich daraus.
 */
export function RegelnLeistungen({ leistungen }: { leistungen: Leistung[] }) {
  const { t } = useTranslation()
  const { arbeitet, fuehreAus } = useAusfuehren('preise.leistungen')
  const setze = (l: Leistung, w: Partial<Leistung>) => void fuehreAus(() => speichereLeistung({ id: l.id, ...w }))

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('preise.regel.leistungen')}</KarteTitel>
        <Button
          size="sm"
          variant="secondary"
          disabled={arbeitet}
          onClick={() =>
            void fuehreAus(() =>
              speichereLeistung({
                nameDe: t('preise.regel.neueLeistung'),
                nameFr: t('preise.regel.neueLeistung'),
                einheit: 'h',
                verkaufRappen: 0,
                kostenRappen: 0,
                reihenfolge: leistungen.length + 1,
              }),
            )
          }
        >
          <Plus />
          {t('preise.regel.leistungDazu')}
        </Button>
      </KarteKopf>
      <KarteInhalt>
        <p className="text-muted-foreground mb-2 text-xs">{t('preise.regel.leistungenText')}</p>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="py-1.5 font-medium">{t('preise.regel.nameDe')}</th>
                <th className="py-1.5 font-medium">{t('preise.regel.nameFr')}</th>
                <th className="py-1.5 font-medium">{t('preise.regel.einheit')}</th>
                <th className="py-1.5 text-right font-medium">{t('preise.regel.kosten')}</th>
                <th className="py-1.5 text-right font-medium">{t('preise.regel.verkauf')}</th>
                <th className="py-1.5 text-right font-medium">{t('preise.spalte.marge')}</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {leistungen.map((l) => {
                const marge =
                  l.kostenRappen !== null && l.verkaufRappen > 0
                    ? Math.round(((l.verkaufRappen - l.kostenRappen) / l.verkaufRappen) * 1000) / 10
                    : null
                return (
                  <tr key={l.id} className="border-b last:border-b-0">
                    <td className="py-1 pr-2">
                      <TextFeld
                        key={l.nameDe}
                        wert={l.nameDe}
                        label={`${t('preise.regel.nameDe')} ${l.nameDe}`}
                        onSpeichern={(x) => {
                          setze(l, { nameDe: x })
                        }}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <TextFeld
                        key={l.nameFr}
                        wert={l.nameFr}
                        label={`${t('preise.regel.nameFr')} ${l.nameDe}`}
                        onSpeichern={(x) => {
                          setze(l, { nameFr: x })
                        }}
                      />
                    </td>
                    <td className="w-20 py-1 pr-2">
                      <TextFeld
                        key={l.einheit}
                        wert={l.einheit}
                        label={`${t('preise.regel.einheit')} ${l.nameDe}`}
                        onSpeichern={(x) => {
                          setze(l, { einheit: x })
                        }}
                      />
                    </td>
                    <td className="py-1 text-right">
                      <PreisFeld
                        label={`${t('preise.regel.kosten')} ${l.nameDe}`}
                        wert={l.kostenRappen === null ? '' : formatChf(l.kostenRappen)}
                        onSpeichern={(x) => {
                          setze(l, { kostenRappen: parseChf(x) ?? 0 })
                        }}
                      />
                    </td>
                    <td className="py-1 text-right">
                      <PreisFeld
                        label={`${t('preise.regel.verkauf')} ${l.nameDe}`}
                        wert={formatChf(l.verkaufRappen)}
                        onSpeichern={(x) => {
                          setze(l, { verkaufRappen: parseChf(x) ?? 0 })
                        }}
                      />
                    </td>
                    <td className="zahlen text-muted-foreground py-1 text-right font-mono text-[13px]">
                      {marge === null ? '–' : `${marge} %`}
                    </td>
                    <td className="py-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={arbeitet}
                        aria-label={t('preise.regel.leistungWeg', { name: l.nameDe })}
                        onClick={() => void fuehreAus(() => entferneLeistung(l.id))}
                      >
                        <X />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </KarteInhalt>
    </Karte>
  )
}
