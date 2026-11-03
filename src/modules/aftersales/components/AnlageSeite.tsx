import { ArrowLeft, ExternalLink, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InPapierkorbKnopf } from '@/components/shared/papierkorb/InPapierkorbKnopf'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { useAnlageAkte } from '../hooks/useAkte'
import { useAnlagen } from '../hooks/useService'
import { AnlageDialog } from './AnlageDialog'
import { AnlageKomponenten } from './AnlageKomponenten'
import { AnlageVerlauf } from './AnlageVerlauf'
import { Box, Zeile } from './Box'
import { FallDialog } from './FallDialog'
import { GarantieListe } from './GarantieListe'

/**
 * Anlage-Akte als ganze Seite (#/aftersales?anlage=…): Kunde und Ort, Komponenten mit Seriennummer und Garantie,
 * Monitoring, Wartung, alle Service-Fälle, Rapporte und Dokumente. «Neuer Fall» übernimmt Kunde und Anlage.
 */
export function AnlageSeite({
  id,
  onZurueck,
  onFall,
}: {
  id: string
  onZurueck: () => void
  onFall: (id: string) => void
}) {
  const { t } = useTranslation()
  const akte = useAnlageAkte(id)
  const liste = useAnlagen()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [neu, setNeu] = useState(false)
  if (akte.error) return <Fehlerzustand details={String(akte.error)} onNochmal={() => void akte.refetch()} />
  if (akte.isPending) return <Skelett className="h-96" />
  const { anlage: a, kunde, ort, projekt } = akte.data
  if (!a) return <Fehlerzustand details={t('service.anlage.nichtGefunden')} onNochmal={onZurueck} />
  const adresse = [ort?.strasse, [ort?.plz, ort?.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const zumBearbeiten = liste.data?.find((x) => x.id === id)
  const offen = akte.data.faelle.filter((f) => f.status !== 'erledigt').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onZurueck}
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('service.anlage.zurueck')}
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-semibold text-balance">
              {kunde?.name ?? '–'}
              {a.leistung_kwp ? (
                <span className="text-muted-foreground zahlen ml-2 font-mono text-base">
                  {String(a.leistung_kwp)} kWp
                </span>
              ) : null}
            </h1>
            <p className="text-muted-foreground text-sm">
              {[adresse, projekt ? `${t('service.akte.projekt')} ${projekt.nummer}` : null].filter(Boolean).join(' · ')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {offen > 0 && <Badge ton="warnung">{t('service.anlage.offen', { count: offen })}</Badge>}
              {akte.data.rma_offen > 0 && (
                <Badge ton="info">{t('service.anlage.rma', { count: akte.data.rma_offen })}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <InPapierkorbKnopf
              tabelle="anlagen"
              id={id}
              name={[kunde?.name, a.leistung_kwp ? `${String(a.leistung_kwp)} kWp` : null].filter(Boolean).join(' ')}
              onFertig={onZurueck}
            />
            {zumBearbeiten && (
              <Button
                variant="secondary"
                onClick={() => {
                  setBearbeiten(true)
                }}
              >
                <Pencil />
                {t('service.anlage.bearbeiten')}
              </Button>
            )}
            <Button
              onClick={() => {
                setNeu(true)
              }}
            >
              <Plus />
              {t('service.neu')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Box titel={t('service.akte.kunde')}>
            <dl className="flex flex-col gap-1">
              <Zeile label={t('service.feld.kunde')}>
                {kunde && (
                  <a href={`#/customers?kunde=${kunde.id}`} className="text-accent-ink underline">
                    {kunde.name}
                  </a>
                )}
              </Zeile>
              <Zeile label={t('service.akte.telefon')}>{kunde?.telefon}</Zeile>
              <Zeile label={t('service.akte.mail')}>{kunde?.email}</Zeile>
              <Zeile label={t('service.akte.einsatzort')}>{adresse || null}</Zeile>
              <Zeile label={t('service.anlage.netzbetreiber')}>{ort?.netzbetreiber}</Zeile>
              <Zeile label={t('service.anlage.elektriker')}>{projekt?.elektriker}</Zeile>
            </dl>
          </Box>
          <Box titel={t('service.anlage.betrieb')}>
            <dl className="flex flex-col gap-1">
              <Zeile label={t('service.anlagen.feld.ibn_am')}>{a.ibn_am ? formatDatum(a.ibn_am) : null}</Zeile>
              <Zeile label={t('service.anlagen.feld.naechste_kontrolle')}>
                {a.naechste_kontrolle ? formatDatum(a.naechste_kontrolle) : null}
              </Zeile>
              <Zeile label={t('service.anlagen.monitoring')}>
                {a.monitoring?.link ? (
                  <a
                    href={a.monitoring.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent-ink inline-flex items-center gap-1 underline"
                  >
                    {a.monitoring.hersteller || t('service.anlage.portal')}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  a.monitoring?.hersteller
                )}
              </Zeile>
              {a.notiz && <Zeile label={t('service.anlagen.feld.notiz')}>{a.notiz}</Zeile>}
            </dl>
          </Box>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:order-last lg:col-span-2 2xl:order-none 2xl:col-span-1">
          <AnlageKomponenten komponenten={a.komponenten} />
          <AnlageVerlauf akte={akte.data} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Box titel={t('service.garantieCheck.titel')}>
            <GarantieListe anlage={a} />
          </Box>
          <Box titel={t('service.anlage.wartung')}>
            {akte.data.vertraege.length === 0 ? (
              <p className="text-muted-foreground text-xs">{t('service.anlage.keinVertrag')}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {akte.data.vertraege.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <a
                      href={`#/contracts?vertrag=${v.id}`}
                      className="min-w-0 truncate underline-offset-2 hover:underline"
                    >
                      {v.nummer ?? t('service.anlage.vertrag')}
                    </a>
                    <span className="text-muted-foreground zahlen text-xs">
                      {v.naechste_wartung
                        ? t('service.anlage.naechste', { datum: formatDatum(v.naechste_wartung) })
                        : '–'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Box>
        </div>
      </div>

      {bearbeiten && zumBearbeiten && (
        <AnlageDialog
          anlage={zumBearbeiten}
          onSchliessen={() => {
            setBearbeiten(false)
            void akte.refetch()
          }}
        />
      )}
      {neu && (
        <FallDialog
          vorlage={{
            titel: '',
            beschreibung: '',
            quelle: 'anruf',
            anlageId: a.id,
            kunde: kunde
              ? {
                  id: kunde.id,
                  name: kunde.name,
                  ort: ort?.ort ?? null,
                  sprache: kunde.sprache === 'fr' ? 'fr' : 'de',
                  objektId: a.objekt_id,
                }
              : null,
          }}
          onSchliessen={() => {
            setNeu(false)
          }}
          onErfasst={(fallId) => {
            setNeu(false)
            onFall(fallId)
          }}
        />
      )}
    </div>
  )
}
