import { ChevronLeft, ChevronRight, Download, ListChecks, Plus, Timer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Checkbox } from '@/components/ui/schalter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { usePersonen, useZeiten } from '../hooks/useBaustelle'
import { lohnCsv } from '../lib/lohnExport'
import { dauerText, heute, minuten, plusTage, summeJePerson, wochenStart, zuerich } from '../lib/zeit'
import { ladeZeiten, zeitenExportieren, zeitenPruefen } from '../services/baustelle'
import type { Zeit } from '../types'
import { ZeitDialog } from './ZeitDialog'

const ALLE = 'alle'

function herunterladen(text: string, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(a.href)
  }, 10_000)
}

/**
 * Zeiten einer Woche: jede Person sieht ihre eigenen, Projektleitung und Buchhaltung alle. Prüfen sperrt sie,
 * der Lohn-Export (Buchhaltung) schreibt die geprüften als CSV für AbaNinja und markiert sie als exportiert.
 */
export function Zeiten() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const darfPruefen = hatRecht(ich, 'preise') || hatRecht(ich, 'finanzen')
  const darfExport = hatRecht(ich, 'finanzen')
  const [woche, setWoche] = useState(() => wochenStart(heute()))
  const [person, setPerson] = useState<string>(darfPruefen ? ALLE : (ich?.id ?? ALLE))
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<Zeit | 'neu' | null>(null)
  const personen = usePersonen()
  const bis = plusTage(woche, 6)
  const zeiten = useZeiten(woche, bis, person === ALLE ? null : person)
  const { laeuft, aus } = useAktion()
  const liste = useMemo(() => zeiten.data ?? [], [zeiten.data])
  const summen = useMemo(() => summeJePerson(liste), [liste])
  const pruefbar = liste.filter((z) => z.stopp && !z.freigegeben_am && !z.exportiert_am)
  const ungeprueft = liste.filter((z) => !z.freigegeben_am).length

  const umschalten = (id: string) => {
    const neu = new Set(gewaehlt)
    if (neu.has(id)) neu.delete(id)
    else neu.add(id)
    setGewaehlt(neu)
  }

  async function exportieren() {
    await aus(async () => {
      const neu = liste.filter((z) => z.freigegeben_am && !z.exportiert_am && z.stopp)
      if (neu.length) await zeitenExportieren(neu.map((z) => z.id))
      const frisch = await ladeZeiten(woche, bis, person === ALLE ? null : person)
      herunterladen(
        lohnCsv(
          frisch.filter((z) => z.exportiert_am),
          sprache,
        ),
        `lohn-${woche}-${bis}.csv`,
      )
    })
  }

  const stand = (z: Zeit) =>
    !z.stopp ? (
      <Badge ton="info">{t('baustelle.zeiten.laeuft')}</Badge>
    ) : z.exportiert_am ? (
      <Badge ton="neutral">{t('baustelle.zeiten.exportiert')}</Badge>
    ) : z.freigegeben_am ? (
      <Badge ton="ok">{t('baustelle.zeiten.geprueft')}</Badge>
    ) : (
      <Badge ton="warnung">{t('baustelle.zeiten.offen')}</Badge>
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('baustelle.zeiten.vorher')}
            onClick={() => {
              setWoche(plusTage(woche, -7))
              setGewaehlt(new Set())
            }}
          >
            <ChevronLeft />
          </Button>
          <span className="zahlen min-w-44 text-center text-sm font-medium">
            {formatDatum(woche)} – {formatDatum(bis)}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t('baustelle.zeiten.nachher')}
            onClick={() => {
              setWoche(plusTage(woche, 7))
              setGewaehlt(new Set())
            }}
          >
            <ChevronRight />
          </Button>
          {darfPruefen && (
            <Auswahl
              aria-label={t('baustelle.zeiten.person')}
              className="ml-2 w-48"
              value={person}
              onValueChange={setPerson}
              optionen={[
                { wert: ALLE, text: t('baustelle.zeiten.allePersonen') },
                ...(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name })),
              ]}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setDialog('neu')
            }}
          >
            <Plus />
            {t('baustelle.zeiten.erfassen')}
          </Button>
          {darfPruefen && (
            <Button
              variant="secondary"
              laedt={laeuft}
              disabled={gewaehlt.size === 0}
              onClick={() =>
                void aus(() => zeitenPruefen([...gewaehlt]), { de: 'Zeiten geprüft', fr: 'Temps contrôlés' }).then(
                  () => {
                    setGewaehlt(new Set())
                  },
                )
              }
            >
              <ListChecks />
              {t('baustelle.zeiten.pruefen', { count: gewaehlt.size })}
            </Button>
          )}
          {darfExport && (
            <Button laedt={laeuft} disabled={liste.every((z) => !z.freigegeben_am)} onClick={() => void exportieren()}>
              <Download />
              {t('baustelle.zeiten.export')}
            </Button>
          )}
        </div>
      </div>
      {darfExport && ungeprueft > 0 && liste.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t('baustelle.zeiten.ungeprueftHinweis', { count: ungeprueft })}
        </p>
      )}
      {zeiten.error ? (
        <Fehlerzustand details={String(zeiten.error)} onNochmal={() => void zeiten.refetch()} />
      ) : zeiten.isPending ? (
        <Skelett className="h-48" />
      ) : liste.length === 0 ? (
        <Leerzustand icon={Timer} titel={t('baustelle.zeiten.leer')} text={t('baustelle.zeiten.leerText')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Tabelle aria-label={t('baustelle.reiter.zeiten')}>
            <TabelleKopf>
              <Zeile>
                {darfPruefen && (
                  <Kopfzelle className="w-8">
                    <Checkbox
                      aria-label={t('baustelle.zeiten.alleWaehlen')}
                      checked={pruefbar.length > 0 && pruefbar.every((z) => gewaehlt.has(z.id))}
                      onCheckedChange={(v) => {
                        setGewaehlt(new Set(v ? pruefbar.map((z) => z.id) : []))
                      }}
                    />
                  </Kopfzelle>
                )}
                <Kopfzelle>{t('baustelle.spalte.datum')}</Kopfzelle>
                {person === ALLE && <Kopfzelle>{t('baustelle.spalte.person')}</Kopfzelle>}
                <Kopfzelle>{t('baustelle.zeiten.vonBis')}</Kopfzelle>
                <Kopfzelle className="text-right">{t('baustelle.zeiten.pause')}</Kopfzelle>
                <Kopfzelle className="text-right">{t('baustelle.spalte.zeit')}</Kopfzelle>
                <Kopfzelle>{t('baustelle.zeiten.bezug')}</Kopfzelle>
                <Kopfzelle>{t('baustelle.spalte.stand')}</Kopfzelle>
              </Zeile>
            </TabelleKopf>
            <TabelleKoerper>
              {liste.map((z) => (
                <Zeile
                  key={z.id}
                  className={z.exportiert_am ? '' : 'cursor-pointer'}
                  onClick={() => {
                    if (!z.exportiert_am && z.stopp) setDialog(z)
                  }}
                >
                  {darfPruefen && (
                    <Zelle
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      {pruefbar.includes(z) && (
                        <Checkbox
                          aria-label={t('baustelle.zeiten.waehlen')}
                          checked={gewaehlt.has(z.id)}
                          onCheckedChange={() => {
                            umschalten(z.id)
                          }}
                        />
                      )}
                    </Zelle>
                  )}
                  <Zelle className="zahlen">{formatDatum(z.tag)}</Zelle>
                  {person === ALLE && <Zelle>{z.person}</Zelle>}
                  <Zelle className="zahlen">
                    {zuerich(z.start).zeit} – {z.stopp ? zuerich(z.stopp).zeit : '…'}
                  </Zelle>
                  <Zelle className="zahlen text-right">{z.pause_min ? `${String(z.pause_min)}′` : ''}</Zelle>
                  <Zelle className="zahlen text-right">{dauerText(minuten(z))}</Zelle>
                  <Zelle>
                    <span className="text-muted-foreground text-xs">
                      {t(`baustelle.zeitart.${z.art}`)}
                      {[z.projekt_nummer, z.rapport_nummer].filter(Boolean).length > 0 &&
                        ` · ${[z.projekt_nummer, z.rapport_nummer].filter(Boolean).join(' · ')}`}
                    </span>
                  </Zelle>
                  <Zelle>{stand(z)}</Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </div>
      )}
      {summen.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('baustelle.zeiten.summen')}>
          {summen.map((s) => (
            <li key={s.person_id} className="bg-surface rounded-md border px-3 py-1.5 text-sm">
              {s.person}: <span className="zahlen font-semibold">{dauerText(s.minuten)}</span>
            </li>
          ))}
        </ul>
      )}
      {dialog && (
        <ZeitDialog
          zeit={dialog === 'neu' ? null : dialog}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}
