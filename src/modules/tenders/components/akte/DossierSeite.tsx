import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Karte } from '@/components/ui/karte'
import { Skelett } from '@/components/ui/diverses'
import { useDossier } from '../../hooks/useAusschreibungen'
import { schritte } from '../../lib/schritte'
import { Box } from '../Box'
import { DossierKontakte } from '../DossierKontakte'
import { AkteKopf } from './AkteKopf'
import { AkteSchritte } from './AkteSchritte'
import { AngabenBox } from './AngabenBox'
import { ChecklisteBox } from './ChecklisteBox'
import { FristenBox } from './FristenBox'
import { GngBox } from './GngBox'
import { KalkulationBox } from './KalkulationBox'
import { KriterienBox } from './KriterienBox'
import { ProtokollBox } from './ProtokollBox'
import { VerlaufBox } from './VerlaufBox'

/**
 * Akte eines Dossiers als ganze Seite (#/tenders?dossier=…). Submission: links Eckdaten, Kriterien, Fristen;
 * Mitte Go/No-Go, Kalkulation, Checkliste, Öffnungsprotokoll; rechts Verlauf mit Notizen. Akquise und Beobachten:
 * Mitte die Kontakte und Anschreiben. Texte aus der Quelle werden nur angezeigt, nie ausgeführt (Regel 7).
 */
export function DossierSeite({ id, onZurueck }: { id: string; onZurueck: () => void }) {
  const { t } = useTranslation()
  const { dossier, kontakte, anschreiben, verlauf } = useDossier(id)
  const d = dossier.data?.dossier
  if (dossier.error) return <Fehlerzustand details={String(dossier.error)} onNochmal={() => void dossier.refetch()} />
  if (!d) return <Skelett className="h-[70vh]" />
  const doppelte = dossier.data?.doppelte ?? []
  const angebot = d.spur === 'angebot'

  return (
    <article className="flex flex-col gap-4" aria-label={d.titel}>
      <AkteKopf d={d} onZurueck={onZurueck} />
      <AkteSchritte schritte={schritte(d)} />
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <AngabenBox d={d} />
          <KriterienBox d={d} />
          <FristenBox d={d} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {angebot ? (
            <>
              <GngBox d={d} />
              <KalkulationBox d={d} />
              <ChecklisteBox d={d} />
              <ProtokollBox d={d} />
            </>
          ) : null}
          {(!angebot || (kontakte.data?.length ?? 0) > 0) && (
            <Karte className="min-w-0 px-3 py-1">
              <DossierKontakte dossier={d} kontakte={kontakte.data ?? []} anschreiben={anschreiben.data ?? []} />
            </Karte>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2 2xl:col-span-1">
          <VerlaufBox dossierId={d.id} eintraege={verlauf.data ?? []} />
          {doppelte.length > 0 && (
            <Box titel={t('ausschreibungen.akte.doppelte')} rechts={doppelte.length}>
              <ul className="flex flex-col gap-1">
                {doppelte.map((x) => (
                  <li key={x.id} className="flex gap-2">
                    <span className="zahlen text-muted-foreground font-mono text-xs">{x.nummer}</span>
                    <span className="truncate">{x.titel}</span>
                  </li>
                ))}
              </ul>
            </Box>
          )}
        </div>
      </div>
    </article>
  )
}
