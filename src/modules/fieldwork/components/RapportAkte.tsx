import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileText, FolderArchive, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Textarea } from '@/components/ui/input'
import { formatDatum, formatDatumZeit } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useRapport } from '../hooks/useBaustelle'
import { adressText } from '../lib/links'
import { rapportOeffnen } from '../services/baustelle'
import { eingabeAnwenden, rapportAendern } from '../services/monteur'
import { Netzstand } from './Netzstand'
import type { Rapport, RapportEingabe } from '../types'
import { AbschlussDialog } from './AbschlussDialog'
import { ArbeitenAbschnitt } from './ArbeitenAbschnitt'
import { DossierDialog } from './DossierDialog'
import { FotoAbschnitt } from './FotoAbschnitt'
import { NachtragAbschnitt } from './NachtragAbschnitt'
import { PruefAbschnitt } from './PruefAbschnitt'
import { RapportPdfKnopf } from './RapportPdfKnopf'
import { RapportZeit } from './RapportZeit'
import { VerrechnungWahl } from './VerrechnungWahl'

/**
 * Ein Rapport für alles (Montage, Service, Wartung, IBN): Zeit, Arbeiten, Mehrmaterial, Fotos, Nachträge,
 * beim IBN die Prüfpunkte, beim Service die Verrechnung, dann «Abschliessen» mit Unterschrift des Kunden.
 * Jede Änderung ist sofort am Handy gespeichert und geht raus, sobald Netz da ist.
 */
export function RapportAkte({ id, onSchliessen }: { id: string; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const daten = useRapport(id)
  const ich = useAnmeldung((z) => z.ich)
  const { laeuft, aus } = useAktion()
  const [dialog, setDialog] = useState<'abschluss' | 'dossier' | null>(null)
  const r = daten.data
  const offen = Boolean(r && !r.abgeschlossen_am)

  const aendern = (e: RapportEingabe) => {
    qc.setQueryData<Rapport>(['baustelle', 'rapport', id], (alt) => (alt ? eingabeAnwenden(alt, e) : alt))
    void rapportAendern(id, e)
  }

  const fuss = r && (
    <>
      {/* Im Panel ist der Seitenkopf verdeckt: der Monteur soll auch hier sehen, dass Einträge noch warten. */}
      <Netzstand className="mr-auto" />
      {!offen && <RapportPdfKnopf rapport={r} />}
      {!offen && r.art === 'ibn' && r.projekt_id && (
        <Button
          variant="secondary"
          onClick={() => {
            setDialog('dossier')
          }}
        >
          <FolderArchive />
          {t('baustelle.dossier.knopf')}
        </Button>
      )}
      {!offen && hatRecht(ich, 'preise') && (
        <Button variant="ghost" laedt={laeuft} onClick={() => void aus(() => rapportOeffnen(r.id))}>
          <Undo2 />
          {t('baustelle.rapport.wiederOeffnen')}
        </Button>
      )}
      {offen && (
        <Button
          size="lg"
          variant="accent"
          onClick={() => {
            setDialog('abschluss')
          }}
        >
          <CheckCircle2 />
          {t('baustelle.rapport.abschliessen')}
        </Button>
      )}
    </>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        className="md:w-[40rem]"
        titel={
          r
            ? `${r.nummer || t('baustelle.rapport.neu')} · ${t(`baustelle.art.${r.art}`)}`
            : t('baustelle.rapport.titel')
        }
        {...(r
          ? { beschreibung: [r.kunde, r.projekt_nummer ?? r.service_nummer].filter(Boolean).join(' · '), fuss }
          : {})}
      >
        {daten.error ? (
          <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
        ) : !r ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              <Badge ton={offen ? 'warnung' : 'ok'} punkt>
                {t(offen ? 'baustelle.rapport.offen' : 'baustelle.rapport.abgeschlossen')}
              </Badge>
              {r.verrechnung && <Badge ton="info">{t(`baustelle.verrechnung.${r.verrechnung}`)}</Badge>}
              {r.montage_fertig && <Badge ton="ok">{t('baustelle.rapport.montageFertig')}</Badge>}
            </div>
            <dl>
              <Angabe label={t('baustelle.rapport.datum')}>{formatDatum(r.datum)}</Angabe>
              <Angabe label={t('baustelle.rapport.adresse')}>
                {adressText({ strasse: r.objekt_strasse, plz: r.objekt_plz, ort: r.objekt_ort }) || '–'}
              </Angabe>
              {r.person && <Angabe label={t('baustelle.rapport.person')}>{r.person}</Angabe>}
              {!offen && r.unterschrift_kunde && (
                <Angabe label={t('baustelle.rapport.unterschrift')}>
                  {r.unterschrift_kunde.ohne
                    ? t('baustelle.rapport.ohneUnterschrift', { grund: r.unterschrift_kunde.ohne })
                    : `${r.unterschrift_kunde.name ?? ''} · ${formatDatumZeit(r.unterschrift_kunde.am)}`}
                </Angabe>
              )}
            </dl>
            <RapportZeit rapport={r} offen={offen} />
            <ArbeitenAbschnitt rapport={r} offen={offen} onAendern={aendern} />
            {r.art === 'ibn' && <PruefAbschnitt rapport={r} offen={offen} onAendern={aendern} />}
            {(r.art === 'service' || r.art === 'wartung') && (
              <AkteAbschnitt titel={t('baustelle.verrechnung.titel')}>
                <VerrechnungWahl
                  wert={r.verrechnung}
                  gesperrt={!offen}
                  onWahl={(v) => {
                    aendern({ verrechnung: v })
                  }}
                />
              </AkteAbschnitt>
            )}
            <FotoAbschnitt rapportId={r.id} offen={offen} />
            {r.art !== 'ibn' && <NachtragAbschnitt rapportId={r.id} offen={offen} />}
            <AkteAbschnitt titel={t('baustelle.rapport.notizIntern')} offen={Boolean(r.notiz_intern)}>
              <Textarea
                aria-label={t('baustelle.rapport.notizIntern')}
                defaultValue={r.notiz_intern ?? ''}
                disabled={!offen}
                rows={2}
                onBlur={(e) => {
                  if (e.target.value !== (r.notiz_intern ?? '')) aendern({ notiz_intern: e.target.value })
                }}
              />
              <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <FileText className="size-3" aria-hidden="true" />
                {t('baustelle.rapport.notizInternHinweis')}
              </p>
            </AkteAbschnitt>
          </div>
        )}
        {r && dialog === 'abschluss' && (
          <AbschlussDialog
            rapport={r}
            onSchliessen={() => {
              setDialog(null)
            }}
          />
        )}
        {r?.projekt_id && dialog === 'dossier' && (
          <DossierDialog
            rapport={r}
            onSchliessen={() => {
              setDialog(null)
            }}
          />
        )}
      </DialogInhalt>
    </Dialog>
  )
}
