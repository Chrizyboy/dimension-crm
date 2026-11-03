import { Mic, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { useDiktat } from '@/hooks/useDiktat'
import { useUi } from '@/stores/ui'
import type { MaterialZeile, Rapport, RapportEingabe } from '../types'

/** Ausgeführte Arbeiten (Pflicht zum Abschliessen) und Mehrmaterial, das nicht auf der Materialliste stand. */
export function ArbeitenAbschnitt({
  rapport: r,
  offen,
  onAendern,
}: {
  rapport: Rapport
  offen: boolean
  onAendern: (e: RapportEingabe) => void
}) {
  const { t, i18n } = useTranslation()
  // Diktat hängt fertige Sätze an den gespeicherten Text an (Hände voll, Handschuhe an).
  const diktat = useDiktat(i18n.language.startsWith('fr') ? 'fr' : 'de', (satz) => {
    onAendern({ arbeiten: r.arbeiten ? `${r.arbeiten} ${satz}` : satz })
  })
  // Einheit ist freier Text; vorgeschlagen in der Sprache der Person (Monteure in Bulle arbeiten französisch).
  const stueck = useUi((z) => z.sprache) === 'fr' ? 'pce' : 'Stk'
  const [neu, setNeu] = useState<MaterialZeile>({ text: '', menge: null, einheit: stueck })
  const material = r.material

  const hinzufuegen = () => {
    if (!neu.text.trim()) return
    onAendern({ material: [...material, { ...neu, text: neu.text.trim() }] })
    setNeu({ text: '', menge: null, einheit: neu.einheit })
  }

  return (
    <>
      <AkteAbschnitt titel={t('baustelle.rapport.arbeiten')}>
        <Textarea
          key={r.arbeiten ?? ''}
          aria-label={t('baustelle.rapport.arbeiten')}
          placeholder={t('baustelle.rapport.arbeitenPlatzhalter')}
          defaultValue={r.arbeiten ?? ''}
          disabled={!offen}
          rows={4}
          onBlur={(e) => {
            if (e.target.value !== (r.arbeiten ?? '')) onAendern({ arbeiten: e.target.value })
          }}
        />
        {offen && diktat.verfuegbar && (
          <Button className="mt-2" variant={diktat.laeuft ? 'danger' : 'secondary'} onClick={diktat.umschalten}>
            <Mic />
            {t(diktat.laeuft ? 'baustelle.diktat.stopp' : 'baustelle.diktat.start')}
          </Button>
        )}
      </AkteAbschnitt>
      <AkteAbschnitt
        titel={t('baustelle.rapport.mehrmaterial')}
        zusatz={material.length ? String(material.length) : undefined}
        offen={offen || material.length > 0}
      >
        <ul className="flex flex-col gap-1">
          {material.map((m, i) => (
            <li key={`${m.text}-${String(i)}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="zahlen">
                  {m.menge ?? ''} {m.einheit ?? ''}
                </span>{' '}
                {m.text}
              </span>
              {offen && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t('baustelle.rapport.materialEntfernen', { text: m.text })}
                  onClick={() => {
                    onAendern({ material: material.filter((_, j) => j !== i) })
                  }}
                >
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {offen && (
          <form
            className="mt-2 grid grid-cols-[4.5rem_4.5rem_1fr_auto] gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              hinzufuegen()
            }}
          >
            <Input
              inputMode="decimal"
              aria-label={t('baustelle.rapport.menge')}
              placeholder={t('baustelle.rapport.menge')}
              value={neu.menge ?? ''}
              onChange={(e) => {
                const n = Number(e.target.value.replace(',', '.'))
                setNeu({ ...neu, menge: e.target.value === '' || Number.isNaN(n) ? null : n })
              }}
            />
            <Input
              aria-label={t('baustelle.rapport.einheit')}
              value={neu.einheit ?? ''}
              onChange={(e) => {
                setNeu({ ...neu, einheit: e.target.value })
              }}
            />
            <Input
              aria-label={t('baustelle.rapport.materialText')}
              placeholder={t('baustelle.rapport.materialPlatzhalter')}
              value={neu.text}
              onChange={(e) => {
                setNeu({ ...neu, text: e.target.value })
              }}
            />
            <Button type="submit" size="icon" variant="secondary" aria-label={t('baustelle.rapport.materialDazu')}>
              <Plus />
            </Button>
          </form>
        )}
      </AkteAbschnitt>
    </>
  )
}
