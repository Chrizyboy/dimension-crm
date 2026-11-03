import { ArrowLeft, CalendarPlus, FileText, MoreHorizontal, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AblageLink } from '@/components/shared/AblageLink'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTrenner } from '@/components/ui/menue'
import { useDrucken } from '@/hooks/useDrucken'
import { formatChf, formatDatum } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useNeuLaden } from '../hooks/useProjekte'
import { anlageKurz, ortZeile } from '../lib/anzeige'
import { BAU_TON } from '../lib/fahrplan'
import { bauRueckgaengig, bauZuruecknehmen } from '../services/projekte'
import { GESUCHE, type Akte, type Gesuch, type Hinweis, type Projekt } from '../types'
import { BauDialog } from './BauDialog'
import { GesuchDruck } from './GesuchDruck'

/**
 * Kopf der Projekt-Akte: zurück, Nummer, Kunde und Anlage, Status und was blockiert, wer zuständig ist.
 * Rechts Ablage, Gesuche, Rücknahme und als Hauptaktion «Bautermin», solange es keinen gibt.
 */
export function SeiteKopf({
  p,
  akte,
  hinweise,
  onZurueck,
}: {
  p: Projekt
  akte: Akte | undefined
  hinweise: Hinweis[]
  onZurueck: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const neuLaden = useNeuLaden()
  const [planen, setPlanen] = useState(false)
  const [gesuch, setGesuch] = useState<Gesuch | null>(null)
  const { aktiv: druckt, drucke } = useDrucken()

  const zuruecknehmen = async () => {
    const ok = await aus(() => bauZuruecknehmen(p.id))
    if (ok)
      melde(
        'ok',
        { de: 'Zurück bei den Aufträgen', fr: 'Retour aux commandes' },
        {
          aktion: {
            text: { de: 'Rückgängig', fr: 'Annuler' },
            ausfuehren: () => {
              void bauRueckgaengig(p.id).then(neuLaden)
            },
          },
        },
      )
  }
  const wer = [
    p.verantwortlich && t('projekte.seite.leitung', { name: p.verantwortlich }),
    akte?.verkauf && t('projekte.seite.verkauf', { name: akte.verkauf }),
    p.standort,
  ].filter(Boolean)

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <button
          type="button"
          onClick={onZurueck}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-xs"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {t('projekte.titel')} · <span className="zahlen font-mono">{p.nummer}</span>
        </button>
        <h1 className="text-xl font-semibold text-balance">
          {p.kunde}
          {p.ort ? `, ${p.ort}` : ''}
        </h1>
        <p className="text-muted-foreground text-sm">
          {[anlageKurz(p, t), [p.strasse, ortZeile(p)].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{t(`projekte.status.${p.status}`)}</Badge>
          {p.status === 'im_bau' && p.bau_status && (
            <Badge ton={BAU_TON[p.bau_status] ?? 'neutral'} punkt>
              {t(`projekte.bauStatus.${p.bau_status}`)}
            </Badge>
          )}
          {p.baubeginn && <Badge ton="info">{t('projekte.leitstand.bau', { datum: formatDatum(p.baubeginn) })}</Badge>}
          {p.vertragswert_rappen ? (
            <Badge>
              {t('projekte.seite.vertrag', { betrag: formatChf(p.vertragswert_rappen, { mitWaehrung: true }) })}
            </Badge>
          ) : null}
          {hinweise
            .filter((h) => h.ton === 'kritisch' || h.ton === 'warnung')
            .map((h) => (
              <Badge key={h.schluessel} ton={h.ton}>
                {t(`projekte.hinweis.${h.schluessel}`, h.werte ?? {})}
              </Badge>
            ))}
          <span className="text-muted-foreground text-xs">{wer.join(' · ')}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AblageLink projektId={p.id} offerteId={p.offerte_id} />
        <Menue>
          <MenueAusloeser asChild>
            <Button variant="secondary" size="icon" aria-label={t('projekte.akte.mehr')} laedt={laeuft}>
              <MoreHorizontal />
            </Button>
          </MenueAusloeser>
          <MenueInhalt align="end">
            {GESUCHE.map((g) => (
              <MenueEintrag
                key={g}
                onSelect={() => {
                  setGesuch(g)
                  queueMicrotask(drucke)
                }}
              >
                <FileText />
                {t(`projekte.gesuch.${g}.knopf`)}
              </MenueEintrag>
            ))}
            {(p.status === 'im_bau' || p.bau_vorher != null) && <MenueTrenner />}
            {p.status === 'im_bau' && (
              <MenueEintrag onSelect={() => void zuruecknehmen()}>
                <Undo2 />
                {t('projekte.akte.zuruecknehmen')}
              </MenueEintrag>
            )}
            {p.bau_vorher != null && (
              <MenueEintrag
                onSelect={() => {
                  void aus(() => bauRueckgaengig(p.id), { de: 'Rückgängig gemacht', fr: 'Annulé' })
                }}
              >
                <Undo2 />
                {t('projekte.akte.rueckgaengig')}
              </MenueEintrag>
            )}
          </MenueInhalt>
        </Menue>
        {p.status === 'auftrag' && (
          <Button
            onClick={() => {
              setPlanen(true)
            }}
          >
            <CalendarPlus />
            {t('projekte.bau.knopf')}
          </Button>
        )}
      </div>
      {planen && (
        <BauDialog
          projekt={p}
          onSchliessen={() => {
            setPlanen(false)
          }}
          onGeplant={() => {
            setPlanen(false)
          }}
        />
      )}
      {gesuch && druckt && <GesuchDruck projekt={p} gesuch={gesuch} />}
    </div>
  )
}
