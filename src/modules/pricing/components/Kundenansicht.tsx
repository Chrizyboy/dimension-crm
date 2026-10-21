import { Printer, Tag } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useDrucken } from '@/hooks/useDrucken'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { DATENBLATT_SPRACHEN } from '../lib/datenblatt'
import type { Artikel } from '../types'
import { DatenblattLink } from './DatenblattLink'
import { PreislisteDruck } from './PreislisteDruck'

const spalte = spaltenHelfer<Artikel>()

/**
 * Preise für Kunden (V89, V226), für alle sichtbar: Produkt, Leistung, Masse, Datenblätter und Verkaufspreis
 * exkl. oder inkl. MWST, «auf Anfrage», wenn kein Preis da ist. «PDF für Kunden» druckt die gefilterte Liste.
 */
export default function Kundenansicht({ artikel }: { artikel: Artikel[] }) {
  const { t } = useTranslation()
  const satz = useMwst()
  const kategorien = useAuswahl('artikelkategorie')
  const druck = useDrucken()
  const [inkl, setInkl] = useState(true)
  const preis = (a: Artikel) => (a.vkRappen ? (inkl ? mitMwst(a.vkRappen, satz) : a.vkRappen) : null)

  const spalten = spalte.columns([
    spalte.accessor('name', {
      header: t('preise.kunden.produkt'),
      sortFn: (a, b) =>
        `${a.original.kategorie} ${a.original.gruppe ?? ''} ${a.original.name}`.localeCompare(
          `${b.original.kategorie} ${b.original.gruppe ?? ''} ${b.original.name}`,
          'de-CH',
        ),
      cell: (c) => (
        <span className="flex max-w-[24rem] min-w-0 flex-col">
          <span className="truncate font-medium">{c.getValue()}</span>
          <span className="text-muted-foreground truncate text-xs">
            {[c.row.original.gruppe, kategorien.text(c.row.original.kategorie)].filter(Boolean).join(' · ')}
          </span>
        </span>
      ),
    }),
    spalte.accessor((a) => a.leistungW ?? 0, {
      id: 'leistung',
      header: t('preise.kunden.leistung'),
      cell: (c) => <span className="zahlen font-mono text-[13px]">{c.getValue() ? `${c.getValue()} Wp` : '–'}</span>,
      meta: { nurBreit: true, breite: 'w-24' },
    }),
    spalte.accessor((a) => a.masse ?? '', {
      id: 'masse',
      header: t('preise.kunden.masse'),
      cell: (c) => (
        <span className="text-xs">
          {[c.getValue(), c.row.original.gewichtKg ? `${c.row.original.gewichtKg} kg` : null]
            .filter(Boolean)
            .join(' · ') || '–'}
        </span>
      ),
      meta: { nurBreit: true },
    }),
    spalte.display({
      id: 'datenblatt',
      header: t('preise.kunden.datenblatt'),
      cell: (c) => (
        <span className="flex gap-0.5">
          {DATENBLATT_SPRACHEN.map((s) => {
            const wert = c.row.original.datenblaetter[s]
            return wert ? <DatenblattLink key={s} wert={wert} sprache={s} /> : null
          })}
        </span>
      ),
    }),
    spalte.accessor((a) => preis(a) ?? 0, {
      id: 'preis',
      header: t(inkl ? 'preise.kunden.preisInkl' : 'preise.kunden.preisExkl'),
      cell: (c) => {
        const p = preis(c.row.original)
        return (
          <span className="zahlen block text-right font-mono text-[13px]">
            {p ? formatChf(p) : t('preise.kunden.aufAnfrage')}
          </span>
        )
      },
      meta: { breite: 'w-32' },
    }),
  ])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={inkl} onCheckedChange={setInkl} />
          {t('preise.kunden.inklMwst', { satz })}
        </label>
        <Button variant="secondary" disabled={artikel.length === 0} onClick={druck.drucke}>
          <Printer />
          {t('preise.kunden.pdf')}
        </Button>
      </div>
      <Datentabelle
        daten={artikel}
        spalten={spalten}
        kennung={(a) => a.id}
        sortierung={[{ id: 'name', desc: false }]}
        beschriftung={t('preise.ansicht.kunden')}
        leer={<Leerzustand icon={Tag} titel={t('preise.leer')} text={t('preise.leerText')} />}
      />
      {druck.aktiv && (
        <PreislisteDruck
          artikel={artikel}
          inkl={inkl}
          satz={satz}
          kategorieText={kategorien.text}
          reihenfolge={kategorien.werte.map((k) => k.schluessel)}
        />
      )}
    </div>
  )
}
