import { CheckCircle2, ExternalLink, FileText, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { useDrucken } from '@/hooks/useDrucken'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { useVertrag } from '../hooks/useVertraege'
import { vertragsende, wartungTon } from '../lib/anzeige'
import { ErledigtDialog } from './ErledigtDialog'
import { VertragDialog } from './VertragDialog'
import { VertragDruck } from './VertragDruck'

/**
 * Akte eines Wartungsvertrags: Angaben, Leistungen, Verlauf der durchgeführten Wartungen. Unten Vertrag als
 * PDF, Bearbeiten und «Wartung erledigt» (setzt die nächste Wartung nach Rhythmus).
 */
export function VertragAkte({ id, onSchliessen }: { id: string; onSchliessen: () => void }) {
  const { t, i18n } = useTranslation()
  const vertrag = useVertrag(id)
  const status = useAuswahl('wartungsstatus')
  const { aktiv: druckt, drucke } = useDrucken()
  const [heute] = useState(() => new Date())
  const [bearbeiten, setBearbeiten] = useState(false)
  const [erledigt, setErledigt] = useState(false)
  const v = vertrag.data
  const sprache = i18n.language === 'fr' ? 'fr' : 'de'

  const fuss = v && (
    <>
      <Button variant="ghost" onClick={drucke}>
        <FileText />
        {t('wartung.akte.pdf')}
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          setBearbeiten(true)
        }}
      >
        <Pencil />
        {t('wartung.akte.bearbeiten')}
      </Button>
      {v.status === 'aktiv' && (
        <Button
          onClick={() => {
            setErledigt(true)
          }}
        >
          <CheckCircle2 />
          {t('wartung.akte.erledigt')}
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
        className="md:w-[34rem]"
        titel={v ? `${v.nummer ?? ''} · ${v.kunde}` : t('wartung.akte.titel')}
        {...(v ? { beschreibung: [v.ort, v.projekt].filter(Boolean).join(' · '), fuss } : {})}
      >
        {vertrag.error ? (
          <Fehlerzustand details={String(vertrag.error)} onNochmal={() => void vertrag.refetch()} />
        ) : !v ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap gap-1.5 pb-2">
              <Badge ton={tonVonFarbe(status.finde(v.status)?.farbe)} punkt>
                {status.text(v.status)}
              </Badge>
              {v.status === 'aktiv' && v.naechste_wartung && (
                <Badge ton={wartungTon(v.naechste_wartung, heute)}>
                  {t('wartung.akte.naechste', { datum: formatDatum(v.naechste_wartung) })}
                </Badge>
              )}
            </div>
            <AkteAbschnitt titel={t('wartung.akte.angaben')}>
              <dl>
                <Angabe label={t('wartung.feld.kunde')}>
                  <a
                    href={`#/customers?kunde=${v.kontakt_id}`}
                    className="text-accent-ink inline-flex items-center gap-1 underline"
                  >
                    {v.kunde}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </Angabe>
                {v.projekt_id && (
                  <Angabe label={t('wartung.feld.projekt')}>
                    <a href={`#/projects?projekt=${v.projekt_id}`} className="text-accent-ink underline">
                      {v.projekt}
                    </a>
                  </Angabe>
                )}
                <Angabe label={t('wartung.feld.start')}>{v.start_am ? formatDatum(v.start_am) : '–'}</Angabe>
                <Angabe label={t('wartung.feld.laufzeit')}>
                  {t('wartung.jahre', { count: v.laufzeit_jahre })}
                  {vertragsende(v.start_am, v.laufzeit_jahre) &&
                    ` · ${t('wartung.druck.bis', { datum: formatDatum(vertragsende(v.start_am, v.laufzeit_jahre) ?? '') })}`}
                </Angabe>
                <Angabe label={t('wartung.feld.rhythmus')}>
                  {t('wartung.rhythmus', { count: v.rhythmus_monate ?? 12 })}
                </Angabe>
                <Angabe label={t('wartung.feld.preis')}>
                  {v.preis_rappen ? formatChf(v.preis_rappen, { mitWaehrung: true }) : '–'}
                </Angabe>
                <Angabe label={t('wartung.feld.letzte')}>
                  {v.letzte_wartung ? formatDatum(v.letzte_wartung) : '–'}
                </Angabe>
                <Angabe label={t('wartung.feld.sprache')}>{t(`wartung.sprache.${v.sprache}`)}</Angabe>
              </dl>
              {v.notiz && <p className="bg-muted/60 mt-2 rounded-md p-3 text-sm whitespace-pre-wrap">{v.notiz}</p>}
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('wartung.feld.leistungen')} zusatz={String(v.leistungen.length)}>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                {v.leistungen.map((l) => (
                  <li key={l.de}>{l[sprache]}</li>
                ))}
              </ul>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('wartung.akte.verlauf')} zusatz={String(v.verlauf.length)}>
              {v.verlauf.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('wartung.akte.keineWartung')}</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {[...v.verlauf].reverse().map((w, i) => (
                    <li key={`${w.am}-${String(i)}`} className="text-sm">
                      <span className="font-medium">{formatDatum(w.am)}</span>
                      {w.notiz && <p className="text-muted-foreground whitespace-pre-wrap">{w.notiz}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </AkteAbschnitt>
          </div>
        )}
        {v && bearbeiten && (
          <VertragDialog
            vertrag={v}
            onSchliessen={() => {
              setBearbeiten(false)
            }}
            onGespeichert={() => {
              setBearbeiten(false)
            }}
          />
        )}
        {v && erledigt && (
          <ErledigtDialog
            vertrag={v}
            onSchliessen={() => {
              setErledigt(false)
            }}
          />
        )}
        {v && druckt && <VertragDruck vertrag={v} />}
      </DialogInhalt>
    </Dialog>
  )
}
