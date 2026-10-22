import { ArchiveRestore, Tag, X } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf, formatDatum, parseChf } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { usePreisAenderung } from '../hooks/usePreise'
import { leseProzent, prozentText } from '../lib/prozent'
import { archiviere, setzePreis } from '../services/preise'
import type { Artikel } from '../types'
import { PreisFeld } from './PreisFeld'

const ArchivDialog = lazy(() => import('./ArchivDialog'))
const spalte = spaltenHelfer<Artikel>()

/**
 * Preisliste «Aktuell» bzw. «Archiv» (V61, V87): Wp, EK, Marge und Skonto direkt in der Zeile ändern,
 * VK exkl. und inkl. MWST rechnet die Datenbank. ✕ archiviert mit Grund (und Nachfolger), «Rückgängig»
 * in der Meldung holt den Artikel zurück. Im Archiv steht «Wiederherstellen».
 */
export default function PreisListe({
  artikel,
  alle,
  archiv,
  aktiveId,
  onOeffnen,
}: {
  artikel: Artikel[]
  alle: Artikel[]
  archiv: boolean
  aktiveId: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const satz = useMwst()
  const kategorien = useAuswahl('artikelkategorie')
  const [archivieren, setArchivieren] = useState<Artikel | null>(null)
  const preis = usePreisAenderung((a: { id: string; p: Parameters<typeof setzePreis>[1] }) => setzePreis(a.id, a.p))
  const zurueck = usePreisAenderung((id: string) => archiviere(id, null))

  async function speichere(a: Artikel, p: Parameters<typeof setzePreis>[1]) {
    try {
      await preis.mutateAsync({ id: a.id, p })
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'preise.speichern')
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
    }
  }

  async function wiederherstellen(a: Artikel) {
    try {
      await zurueck.mutateAsync(a.id)
      melde('ok', zweisprachig('preise.archiv.zurueck', { name: a.name }))
    } catch (f) {
      meldeFehler(f, 'preise.archiv')
      melde('kritisch', zweisprachig('fachfehler.allgemein'))
    }
  }

  const zahl = (
    id: string,
    wert: (a: Artikel) => string,
    speichern: (a: Artikel, text: string) => void,
    nurBreit = false,
  ) =>
    spalte.display({
      id,
      header: t(`preise.spalte.${id}`),
      cell: (c) => (
        <PreisFeld
          label={`${t(`preise.spalte.${id}`)} ${c.row.original.name}`}
          wert={wert(c.row.original)}
          onSpeichern={(text) => {
            speichern(c.row.original, text)
          }}
        />
      ),
      meta: { nurBreit, breite: 'w-24' },
    })

  const nameSpalte = spalte.accessor('name', {
    header: t('preise.spalte.artikel'),
    sortFn: (a, b) =>
      `${a.original.gruppe ?? ''} ${a.original.name}`.localeCompare(
        `${b.original.gruppe ?? ''} ${b.original.name}`,
        'de-CH',
      ),
    cell: (c) => (
      <span className="flex max-w-[22rem] min-w-0 flex-col">
        <span className="truncate font-medium" title={c.getValue()}>
          {c.getValue()}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {[c.row.original.gruppe, c.row.original.artikelnummer, kategorien.text(c.row.original.kategorie)]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
    ),
  })
  const archivSpalte = spalte.accessor((a) => a.archiviertAm ?? '', {
    id: 'archiviert',
    header: t('preise.spalte.archiviert'),
    sortDescFirst: true,
    cell: (c) => (
      <span className="flex flex-col text-xs">
        <span>
          {[c.getValue() ? formatDatum(c.getValue()) : null, c.row.original.archiviertVon].filter(Boolean).join(' · ')}
        </span>
        <span className="text-muted-foreground">{c.row.original.archivGrund}</span>
      </span>
    ),
  })
  const wpSpalte = zahl(
    'wp',
    (a) => String(a.leistungW ?? ''),
    (a, x) => void speichere(a, { leistung_w: x.trim() ? Math.round(Number(x.replace(',', '.'))) : null }),
  )
  const ekSpalte = zahl(
    'ek',
    (a) => (a.ekRappen === null ? '' : formatChf(a.ekRappen)),
    (a, x) => void speichere(a, { ek_rappen: parseChf(x) }),
  )
  const margeSpalte = zahl(
    'marge',
    (a) => prozentText(a.marge),
    (a, x) => void speichere(a, { marge: leseProzent(x) }),
    true,
  )
  const skontoSpalte = zahl(
    'skonto',
    (a) => prozentText(a.skonto),
    (a, x) => void speichere(a, { skonto: leseProzent(x) }),
    true,
  )
  const vkSpalte = spalte.accessor((a) => a.vkRappen ?? 0, {
    id: 'vk',
    header: t('preise.spalte.vk'),
    cell: (c) => (
      <span className="zahlen flex flex-col text-right font-mono text-[13px]">
        <span>{c.row.original.vkRappen ? formatChf(c.row.original.vkRappen) : '–'}</span>
        {c.row.original.vkRappen ? (
          <span className="text-muted-foreground text-[11px]">
            {t('preise.inkl', { betrag: formatChf(mitMwst(c.row.original.vkRappen, satz)) })}
          </span>
        ) : null}
      </span>
    ),
    meta: { breite: 'w-32' },
  })
  const lieferantSpalte = spalte.accessor((a) => a.lieferant ?? '', {
    id: 'lieferant',
    header: t('preise.spalte.lieferant'),
    cell: (c) => <span className="text-xs">{c.getValue() || '–'}</span>,
    meta: { nurBreit: true },
  })
  const aktionSpalte = spalte.display({
    id: 'aktion',
    header: () => <span className="sr-only">{t('preise.spalte.aktion')}</span>,
    cell: (c) =>
      archiv ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            void wiederherstellen(c.row.original)
          }}
        >
          <ArchiveRestore />
          {t('preise.archiv.wiederherstellen')}
        </Button>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          aria-label={t('preise.archiv.archivieren', { name: c.row.original.name })}
          onClick={(e) => {
            e.stopPropagation()
            setArchivieren(c.row.original)
          }}
        >
          <X />
        </Button>
      ),
    meta: { breite: 'w-10' },
  })
  const spalten = archiv
    ? spalte.columns([nameSpalte, archivSpalte, vkSpalte, lieferantSpalte, aktionSpalte])
    : spalte.columns([
        nameSpalte,
        wpSpalte,
        ekSpalte,
        margeSpalte,
        skontoSpalte,
        vkSpalte,
        lieferantSpalte,
        aktionSpalte,
      ])

  return (
    <>
      <Datentabelle
        daten={artikel}
        spalten={spalten}
        kennung={(a) => a.id}
        aktiveId={aktiveId}
        sortierung={archiv ? [{ id: 'archiviert', desc: true }] : [{ id: 'name', desc: false }]}
        onOeffnen={(a) => {
          onOeffnen(a.id)
        }}
        beschriftung={t(archiv ? 'preise.ansicht.archiv' : 'preise.ansicht.liste')}
        leer={<Leerzustand icon={Tag} titel={t('preise.leer')} text={t('preise.leerText')} />}
      />
      <Suspense>
        {archivieren && (
          <ArchivDialog
            artikel={archivieren}
            alle={alle}
            onSchliessen={() => {
              setArchivieren(null)
            }}
          />
        )}
      </Suspense>
    </>
  )
}
