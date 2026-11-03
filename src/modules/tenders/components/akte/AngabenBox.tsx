import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import type { Dossier } from '../../types'
import { Box, Zeile } from '../Box'
import { EckdatenDialog } from './EckdatenDialog'

const janein = (t: (k: string) => string, w: boolean | null) =>
  w == null ? null : t(w ? 'ausschreibungen.ja' : 'ausschreibungen.nein')

/**
 * Wer und was: Vergabestelle bzw. Bauherrschaft, Eckdaten der Submission (Leistung, Schätzung, Ausführung,
 * Varianten, ARGE, Bindefrist, Eingabe-Adresse) und der Text der Publikation. Eckdaten ändern über den Stift.
 */
export function AngabenBox({ d }: { d: Dossier }) {
  const { t } = useTranslation()
  const [bearbeiten, setBearbeiten] = useState(false)
  const angebot = d.spur === 'angebot'
  return (
    <Box
      titel={t(angebot ? 'ausschreibungen.akte.eckdaten' : 'ausschreibungen.akte.angaben')}
      rechts={
        angebot && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setBearbeiten(true)
            }}
          >
            <Pencil />
            {t('ausschreibungen.akte.bearbeiten')}
          </Button>
        )
      }
    >
      <dl className="flex flex-col gap-1">
        {d.vergabestelle && <Zeile label={t('ausschreibungen.feld.vergabestelle')}>{d.vergabestelle}</Zeile>}
        {d.bauherr && (
          <Zeile label={t('ausschreibungen.feld.bauherr')}>
            {d.bauherr}
            {d.bauherr_art ? ` (${t(`ausschreibungen.bauherrArt.${d.bauherr_art}`)})` : ''}
          </Zeile>
        )}
        {d.parzelle && <Zeile label={t('ausschreibungen.feld.parzelle')}>{d.parzelle}</Zeile>}
        {angebot && (
          <>
            <Zeile label={t('ausschreibungen.feld.auftragsart')}>
              {d.auftragsart ? t(`ausschreibungen.auftragsart.${d.auftragsart}`) : null}
            </Zeile>
            <Zeile label={t('ausschreibungen.feld.leistung')}>{d.leistung_kwp ? `${d.leistung_kwp} kWp` : null}</Zeile>
            <Zeile label={t('ausschreibungen.feld.schaetzung')}>
              {d.schaetzung_rappen ? formatChf(d.schaetzung_rappen, { mitWaehrung: true }) : null}
            </Zeile>
            <Zeile label={t('ausschreibungen.feld.ausfuehrung')}>
              {d.ausfuehrung_von || d.ausfuehrung_bis
                ? `${d.ausfuehrung_von ? formatDatum(d.ausfuehrung_von) : '…'} – ${d.ausfuehrung_bis ? formatDatum(d.ausfuehrung_bis) : '…'}`
                : null}
            </Zeile>
            <Zeile label={t('ausschreibungen.feld.varianten')}>{janein(t, d.varianten)}</Zeile>
            <Zeile label={t('ausschreibungen.feld.arge')}>{janein(t, d.arge)}</Zeile>
            <Zeile label={t('ausschreibungen.feld.eignungKwp')}>
              {d.eignung_ref_kwp ? `${d.eignung_ref_kwp} kWp` : null}
            </Zeile>
            <Zeile label={t('ausschreibungen.feld.bindefrist')}>
              {d.bindefrist_monate ? t('ausschreibungen.monate', { count: d.bindefrist_monate }) : null}
            </Zeile>
            <Zeile label={t('ausschreibungen.feld.eingabeAdresse')}>{d.eingabe_adresse}</Zeile>
          </>
        )}
        <Zeile label={t('ausschreibungen.feld.bewertung')}>
          {t('ausschreibungen.punkte', { count: d.punkte })}
          {d.begruendung ? `: ${d.begruendung}` : ''}
        </Zeile>
        {d.grund && <Zeile label={t('ausschreibungen.feld.grund')}>{d.grund}</Zeile>}
        {d.wiedervorlage_am && (
          <Zeile label={t('ausschreibungen.feld.wiedervorlage')}>{formatDatum(d.wiedervorlage_am)}</Zeile>
        )}
      </dl>
      {d.beschreibung && (
        <p className="bg-muted/60 max-h-56 overflow-y-auto rounded-md p-3 text-sm whitespace-pre-wrap">
          {d.beschreibung}
        </p>
      )}
      {bearbeiten && (
        <EckdatenDialog
          d={d}
          onSchliessen={() => {
            setBearbeiten(false)
          }}
        />
      )}
    </Box>
  )
}
