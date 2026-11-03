import { CalendarClock, CheckCircle2, ExternalLink, FileText, Pencil, Receipt, Undo2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InPapierkorbKnopf } from '@/components/shared/papierkorb/InPapierkorbKnopf'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { useDrucken } from '@/hooks/useDrucken'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum, formatDatumZeit, formatTelefon } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useKatalog, useVertrag } from '../hooks/useVertraege'
import { inTagen, wartungTon } from '../lib/anzeige'
import { findePaket, rabattProzent } from '../lib/tarif'
import { jahresrechnungErstellen, kuendigungZuruecknehmen } from '../services/vertraege'
import { ErledigtDialog } from './ErledigtDialog'
import { KuendigenDialog } from './KuendigenDialog'
import { LaufzeitLeiste } from './LaufzeitLeiste'
import { RechnungenAbschnitt } from './RechnungenAbschnitt'
import { TerminDialog } from './TerminDialog'
import { VertragDialog } from './VertragDialog'
import { VertragDruck } from './VertragDruck'

/**
 * Akte eines Wartungsvertrags: Paket, Laufzeit (kündbar bis), Kunde und Anlage, Leistungen, Inspektionen,
 * Jahresrechnungen und Verlauf. Aktionen: Inspektion erledigt, Bearbeiten, Kündigung, Jahresrechnung, PDF.
 */
export function VertragAkte({ id, onSchliessen }: { id: string; onSchliessen: () => void }) {
  const { t, i18n } = useTranslation()
  const vertrag = useVertrag(id)
  const katalog = useKatalog().data ?? undefined
  const status = useAuswahl('wartungsstatus')
  const ich = useAnmeldung((z) => z.ich)
  const { aktiv: druckt, drucke } = useDrucken()
  const { aus } = useAktion()
  const [heute] = useState(() => new Date())
  const [offen, setOffen] = useState<'bearbeiten' | 'erledigt' | 'kuendigen' | 'termin' | null>(null)
  const v = vertrag.data
  const sprache = i18n.language === 'fr' ? 'fr' : 'de'
  const p = findePaket(katalog, v?.paket ?? null)
  const b = katalog?.bedingungen
  const rabatt = v ? rabattProzent(v.tarif_netto_rappen, v.preis_netto_rappen) : 0
  // Ohne gespeicherte Leistungen (z. B. Vertrag aus der Datenbank) gelten die des Pakets.
  const leistungen = v?.leistungen.length ? v.leistungen : (p?.leistungen ?? [])

  // Hauptaktion zuletzt (Knopfleiste): Inspektion erledigt, wenn das Paket Inspektionen hat.
  const fuss = v && (
    <Knopfleiste>
      <InPapierkorbKnopf
        tabelle="wartungsvertraege"
        id={v.id}
        name={[v.nummer, v.kunde].filter(Boolean).join(' ')}
        onFertig={onSchliessen}
      />
      <Button variant="ghost" onClick={drucke}>
        <FileText />
        {t('wartung.akte.pdf')}
      </Button>
      {v.status === 'gekuendigt' && (
        <Button variant="ghost" onClick={() => void aus(() => kuendigungZuruecknehmen(v.id))}>
          <Undo2 />
          {t('wartung.akte.zuruecknehmen')}
        </Button>
      )}
      {v.status === 'aktiv' && (
        <Button
          variant="ghost"
          onClick={() => {
            setOffen('kuendigen')
          }}
        >
          <XCircle />
          {t('wartung.akte.kuendigen')}
        </Button>
      )}
      {hatRecht(ich, 'finanzen') && v.paket && v.status !== 'beendet' && (
        <Button
          variant="secondary"
          onClick={() =>
            void aus(() => jahresrechnungErstellen(v.id), {
              de: 'Jahresrechnung als Entwurf erstellt',
              fr: 'Facture annuelle créée comme brouillon',
            })
          }
        >
          <Receipt />
          {t('wartung.akte.rechnung')}
        </Button>
      )}
      {v.status === 'aktiv' && v.naechste_wartung && (
        <Button
          variant="secondary"
          onClick={() => {
            setOffen('termin')
          }}
        >
          <CalendarClock />
          {v.termin_von ? t('wartung.insp.aendern') : t('wartung.insp.planen')}
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={() => {
          setOffen('bearbeiten')
        }}
      >
        <Pencil />
        {t('wartung.akte.bearbeiten')}
      </Button>
      {v.status === 'aktiv' && (v.rhythmus_monate || !v.paket) && (
        <Button
          onClick={() => {
            setOffen('erledigt')
          }}
        >
          <CheckCircle2 />
          {t('wartung.akte.erledigt')}
        </Button>
      )}
    </Knopfleiste>
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
        breite="breit"
        titel={v ? `${v.nummer ?? ''} · ${v.kunde}` : t('wartung.akte.titel')}
        {...(v ? { beschreibung: [v.ort, v.projekt].filter(Boolean).join(' · '), fuss } : {})}
      >
        {vertrag.error ? (
          <Fehlerzustand details={String(vertrag.error)} onNochmal={() => void vertrag.refetch()} />
        ) : !v ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {p && (
                <Badge
                  ton={v.paket === 'premium' ? 'info' : v.paket === 'comfort' ? 'marke' : 'neutral'}
                >{`${p.name} · ${p.art[sprache]}`}</Badge>
              )}
              <Badge ton={tonVonFarbe(status.finde(v.status)?.farbe)} punkt>
                {status.text(v.status)}
              </Badge>
              {v.status !== 'beendet' && v.naechste_wartung && (
                <Badge ton={wartungTon(v.naechste_wartung, heute)}>
                  {t('wartung.akte.naechste', { datum: formatDatum(v.naechste_wartung) })}
                </Badge>
              )}
              {v.termin_von && (
                <Badge ton={v.angekuendigt_am ? 'ok' : 'info'}>
                  {t('wartung.akte.termin', { zeit: formatDatumZeit(v.termin_von) })}
                  {v.angekuendigt_am ? ` · ${t('wartung.insp.angekuendigt')}` : ''}
                </Badge>
              )}
              {v.bestandsaufnahme !== 'keine' && (
                <Badge ton="warnung">{t(`wartung.bestand.status.${v.bestandsaufnahme}`)}</Badge>
              )}
            </div>
            <LaufzeitLeiste vertrag={v} heute={inTagen(heute, 0)} monate={b?.kuendigung_monate ?? 3} />
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
                {v.telefon && <Angabe label={t('wartung.akte.telefon')}>{formatTelefon(v.telefon)}</Angabe>}
                {v.projekt_id && (
                  <Angabe label={t('wartung.feld.projekt')}>
                    <a href={`#/projects?projekt=${v.projekt_id}`} className="text-accent-ink underline">
                      {v.projekt}
                    </a>
                  </Angabe>
                )}
                <Angabe label={t('wartung.akte.anlage')}>
                  {[
                    v.anlage_kwp != null ? t('wartung.druck.kwp', { kwp: v.anlage_kwp }) : null,
                    v.speicher_kwh ? t('wartung.druck.kwh', { kwh: v.speicher_kwh }) : null,
                    v.ibn_jahr ? t('wartung.druck.ibn', { jahr: v.ibn_jahr }) : null,
                    v.fremdanlage ? t('wartung.feld.fremd') : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '–'}
                </Angabe>
                {v.wechselrichter && <Angabe label={t('wartung.feld.wr')}>{v.wechselrichter}</Angabe>}
                {v.anlage_ort && <Angabe label={t('wartung.feld.ort')}>{v.anlage_ort}</Angabe>}
                <Angabe label={t('wartung.spalte.preis')}>
                  {v.preis_netto_rappen != null
                    ? `CHF ${formatChf(v.preis_netto_rappen)}`
                    : v.preis_rappen
                      ? `CHF ${formatChf(v.preis_rappen)}`
                      : '–'}
                  {rabatt > 0 && ` · ${t('wartung.preis.abweichung', { prozent: rabatt })}`}
                  {v.verrechnet_bis && (
                    <span className="text-muted-foreground">
                      {' '}
                      · {t('wartung.akte.verrechnetBis', { datum: formatDatum(v.verrechnet_bis) })}
                    </span>
                  )}
                </Angabe>
                <Angabe label={t('wartung.feld.sprache')}>{t(`wartung.sprache.${v.sprache}`)}</Angabe>
              </dl>
              {v.notiz && <p className="bg-muted/60 mt-2 rounded-md p-3 text-sm whitespace-pre-wrap">{v.notiz}</p>}
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('wartung.akte.leistungen')} zusatz={String(leistungen.length)}>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                {leistungen.map((l) => (
                  <li key={l.de}>{l[sprache]}</li>
                ))}
              </ul>
              {p && p.kleinreparatur_rappen > 0 && (
                <p className="text-muted-foreground mt-2 text-xs">
                  {t('wartung.akte.kleinreparatur', { betrag: `CHF ${formatChf(p.kleinreparatur_rappen)}` })}
                </p>
              )}
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('wartung.akte.inspektionen')} zusatz={String(v.verlauf.length)}>
              {v.paket && !v.rhythmus_monate && (
                <p className="text-muted-foreground text-sm">{t('wartung.akte.keineInspektion')}</p>
              )}
              {v.verlauf.length === 0 ? (
                (!v.paket || v.rhythmus_monate) && (
                  <p className="text-muted-foreground text-sm">{t('wartung.akte.keineWartung')}</p>
                )
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
            <RechnungenAbschnitt id={v.id} vorlauf={b?.rechnung_vorlauf_tage ?? 30} />
          </div>
        )}
        {v && offen === 'bearbeiten' && (
          <VertragDialog
            vertrag={v}
            onSchliessen={() => {
              setOffen(null)
            }}
            onGespeichert={() => {
              setOffen(null)
            }}
          />
        )}
        {v && offen === 'erledigt' && (
          <ErledigtDialog
            vertrag={v}
            onSchliessen={() => {
              setOffen(null)
            }}
          />
        )}
        {v && offen === 'termin' && (
          <TerminDialog
            vertrag={v}
            onSchliessen={() => {
              setOffen(null)
            }}
          />
        )}
        {v && offen === 'kuendigen' && (
          <KuendigenDialog
            vertrag={v}
            monate={b?.kuendigung_monate ?? 3}
            onSchliessen={() => {
              setOffen(null)
            }}
          />
        )}
        {v && druckt && <VertragDruck vertrag={v} {...(katalog ? { katalog } : {})} />}
      </DialogInhalt>
    </Dialog>
  )
}
