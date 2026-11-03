import {
  Ban,
  BellRing,
  CheckCircle2,
  CircleSlash,
  FileText,
  Handshake,
  Mail,
  MoreHorizontal,
  PauseCircle,
  PencilLine,
  Send,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { Skelett } from '@/components/ui/diverses'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { formatChf, formatDatum } from '@/lib/format'
import { useVerbindungsStatus } from '@/services/integrationen'
import { meldeFehler } from '@/services/fehler'
import { useAktion } from '../hooks/useAktion'
import { useDarfMahnen, useRechnung } from '../hooks/useRechnungen'
import { heuteZuerich, mahnbar, pdfZeigen } from '../lib/rechnung'
import { anAbaninja, stellen, zahlungEntfernen } from '../services/rechnungen'
import { rechnungPdf } from '@/services/rechnungPdf'
import type { RechnungVoll } from '../types'
import { AngabenDialog, AusbuchenDialog, SperreDialog } from './AkteDialoge'
import { MahnenDialog } from './MahnenDialog'
import { PositionenEditor } from './PositionenEditor'
import { RechnungSenden } from './RechnungSenden'
import { statusTon } from './status'
import { StornoDialog } from './StornoDialog'
import { Schritte, Verlauf } from './Verlauf'
import { ZahlungDialog } from './ZahlungDialog'

type Fenster =
  | 'zahlung'
  | 'mahnen'
  | 'storno'
  | 'senden'
  | 'angaben'
  | 'sperre'
  | 'zusage'
  | 'ausbuchen'
  | { mahnung: number; vorschau: RechnungVoll }
  | null

/**
 * Akte einer Rechnung: Schritte, Stand, Angaben (Rechnungsadresse, Referenz, Versand), Positionen (im Entwurf
 * bearbeitbar), Zahlungen und Verlauf. Je Stand: Entwurf → Stellen → an AbaNinja oder per Mail → Zahlung (von
 * Hand oder Abgleich) → Erinnerung/Mahnung (nur Freigabe-Person). Dazu Mahnsperre, Zusage und Ausbuchen.
 */
export function RechnungAkte({ id, onSchliessen }: { id: string; onSchliessen: () => void }) {
  const { t, i18n } = useTranslation()
  const daten = useRechnung(id)
  const einstellungen = useFinanzEinstellungen()
  const verbindungen = useVerbindungsStatus()
  const { laeuft, aus } = useAktion()
  const darfMahnen = useDarfMahnen().data === true
  const [fenster, setFenster] = useState<Fenster>(null)
  const [pdfLaeuft, setPdfLaeuft] = useState(false)
  const r = daten.data
  const zu = () => {
    setFenster(null)
  }

  async function pdf() {
    if (!r) return
    setPdfLaeuft(true)
    try {
      pdfZeigen(await rechnungPdf(r, i18n.getFixedT(r.sprache)))
    } catch (f) {
      meldeFehler(f, 'rechnungen')
    } finally {
      setPdfLaeuft(false)
    }
  }

  const gestellt = r && (r.status === 'gestellt' || r.status === 'teilbezahlt')
  const fuss = r && (
    <>
      <Button variant="ghost" laedt={pdfLaeuft} onClick={() => void pdf()}>
        <FileText />
        {t('rechnungen.akte.pdf')}
      </Button>
      {(r.status === 'entwurf' || (gestellt && r.bezahlt_rappen === 0)) && (
        <Button
          variant="ghost"
          onClick={() => {
            setFenster('storno')
          }}
        >
          {r.status === 'entwurf' ? <Trash2 /> : <Ban />}
          {r.status === 'entwurf' ? t('rechnungen.akte.entwurfLoeschen') : t('rechnungen.akte.stornieren')}
        </Button>
      )}
      {r.status === 'entwurf' && (
        <Button
          laedt={laeuft}
          disabled={r.positionen.length === 0 || r.total_rappen === 0}
          onClick={() => void aus(() => stellen(r.id), { de: 'Rechnung gestellt', fr: 'Facture émise' })}
        >
          <CheckCircle2 />
          {t('rechnungen.akte.stellen')}
        </Button>
      )}
      <Menue>
        <MenueAusloeser asChild>
          <Button variant="ghost" aria-label={t('rechnungen.akte.mehr')}>
            <MoreHorizontal />
          </Button>
        </MenueAusloeser>
        <MenueInhalt align="end">
          {r.status !== 'storniert' && (
            <MenueEintrag
              onSelect={() => {
                setFenster('angaben')
              }}
            >
              <PencilLine />
              {t('rechnungen.akte.angabenAendern')}
            </MenueEintrag>
          )}
          {gestellt && (
            <MenueEintrag
              onSelect={() => {
                setFenster('sperre')
              }}
            >
              <PauseCircle />
              {t('rechnungen.akte.mahnsperre')}
            </MenueEintrag>
          )}
          {gestellt && (
            <MenueEintrag
              onSelect={() => {
                setFenster('zusage')
              }}
            >
              <Handshake />
              {t('rechnungen.akte.zusage')}
            </MenueEintrag>
          )}
          {gestellt && r.offen_rappen > 0 && (
            <MenueEintrag
              onSelect={() => {
                setFenster('ausbuchen')
              }}
            >
              <CircleSlash />
              {t('rechnungen.akte.ausbuchen')}
            </MenueEintrag>
          )}
        </MenueInhalt>
      </Menue>
      {gestellt && darfMahnen && mahnbar(r, heuteZuerich()) && (
        <Button
          variant="secondary"
          onClick={() => {
            setFenster('mahnen')
          }}
        >
          <BellRing />
          {t('rechnungen.akte.mahnen')}
        </Button>
      )}
      {gestellt && !r.abaninja_uuid && verbindungen.data?.eingerichtet.abaninja && (
        <Button
          variant="secondary"
          laedt={laeuft}
          onClick={() =>
            void aus(() => anAbaninja(r.id), {
              de: 'In AbaNinja als Entwurf angelegt',
              fr: 'Créée comme brouillon dans AbaNinja',
            })
          }
        >
          <Send />
          {t('rechnungen.akte.abaninja')}
        </Button>
      )}
      {gestellt && (
        <Button
          variant="secondary"
          onClick={() => {
            setFenster('senden')
          }}
        >
          <Mail />
          {t('rechnungen.akte.mail')}
        </Button>
      )}
      {gestellt && (
        <Button
          onClick={() => {
            setFenster('zahlung')
          }}
        >
          <Wallet />
          {t('rechnungen.akte.zahlung')}
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
        breite="breit"
        titel={r ? `${r.nummer ?? t('rechnungen.entwurf')} · ${r.kunde}` : t('rechnungen.akte.titel')}
        {...(r ? { beschreibung: r.titel, fuss } : {})}
      >
        {daten.error ? (
          <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
        ) : !r ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5 pb-3">
              <Badge ton={statusTon(r)} punkt>
                {r.ueberfaellig ? t('rechnungen.ueberfaellig') : t(`rechnungen.status.${r.status}`)}
              </Badge>
              <Badge ton="neutral">{t(`rechnungen.art.${r.art}`)}</Badge>
              {r.mahnstufe > 0 && <Badge ton="kritisch">{t('rechnungen.mahnstufeKurz', { stufe: r.mahnstufe })}</Badge>}
              {r.abaninja_uuid && <Badge ton="info">AbaNinja: {r.abaninja_status ?? '–'}</Badge>}
              {gestellt && r.versendet === false && !r.abaninja_uuid && (
                <Badge ton="warnung">{t('rechnungen.akte.versendetNein')}</Badge>
              )}
            </div>
            <Schritte r={r} />
            <Hinweise r={r} />
            {r.status === 'entwurf' && (
              <p className={`mb-3 rounded-md p-3 text-sm ${r.visum.am ? 'bg-ok-soft' : 'bg-muted'}`}>
                {r.visum.am
                  ? t('rechnungen.visum.akteVisiert', { name: r.visum.name ?? '–', datum: formatDatum(r.visum.am) })
                  : r.visum.bemerkung
                    ? t('rechnungen.visum.akteKorrektur', { name: r.visum.name ?? '–', text: r.visum.bemerkung })
                    : t('rechnungen.visum.akteOhne')}
              </p>
            )}
            {r.status === 'storniert' && r.storniert_grund && (
              <p className="bg-muted rounded-md p-3 text-sm">
                {t('rechnungen.akte.storniertGrund', { grund: r.storniert_grund })}
              </p>
            )}
            <AkteAbschnitt titel={t('rechnungen.akte.angaben')}>
              <dl>
                <Angabe label={t('rechnungen.spalte.kunde')}>
                  {r.kunde}
                  {r.empfaenger.ort && (
                    <span className="text-muted-foreground"> · {[r.empfaenger.plz, r.empfaenger.ort].join(' ')}</span>
                  )}
                </Angabe>
                {r.rechnung_an?.name && (
                  <Angabe label={t('rechnungen.akte.rechnungAn')}>
                    {[
                      r.empfaenger.name,
                      r.empfaenger.zusatz,
                      r.empfaenger.strasse,
                      [r.empfaenger.plz, r.empfaenger.ort].filter(Boolean).join(' '),
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Angabe>
                )}
                <Angabe label={t('rechnungen.spalte.projekt')}>
                  {[r.projekt_nummer, r.projekt_titel].filter(Boolean).join(' · ') || '–'}
                </Angabe>
                {r.projektleiter && <Angabe label={t('rechnungen.akte.projektleiter')}>{r.projektleiter}</Angabe>}
                {r.kunden_referenz && <Angabe label={t('rechnungen.akte.referenz')}>{r.kunden_referenz}</Angabe>}
                <Angabe label={t('rechnungen.akte.versandweg')}>
                  {t(`rechnungen.akte.versand.${r.versandweg}`)}
                  {r.empfaenger.email && r.versandweg === 'mail' && (
                    <span className="text-muted-foreground"> · {r.empfaenger.email}</span>
                  )}
                </Angabe>
                <Angabe label={t('rechnungen.akte.firma')}>{r.firma_daten.name}</Angabe>
                <Angabe label={t('rechnungen.spalte.datum')}>{r.datum ? formatDatum(r.datum) : '–'}</Angabe>
                <Angabe label={t('rechnungen.spalte.faellig')}>
                  {r.faellig_am
                    ? formatDatum(r.faellig_am)
                    : t('rechnungen.akte.faelligNachFrist', { tage: r.firma_daten.zahlungsfrist_tage })}
                </Angabe>
                {r.mahnstufe > 0 && (
                  <Angabe label={t('rechnungen.mahnen.frist')}>{r.mahnfrist ? formatDatum(r.mahnfrist) : '–'}</Angabe>
                )}
                <Angabe label={t('rechnungen.akte.sprache')}>{r.sprache.toUpperCase()}</Angabe>
              </dl>
            </AkteAbschnitt>
            <AkteAbschnitt
              titel={t('rechnungen.akte.positionen')}
              zusatz={formatChf(r.total_rappen, { mitWaehrung: true })}
            >
              <PositionenEditor key={`${JSON.stringify(r.positionen)}${String(r.inkl_mwst)}`} rechnung={r} />
            </AkteAbschnitt>
            {r.status !== 'entwurf' && (
              <AkteAbschnitt
                titel={t('rechnungen.akte.zahlungen')}
                zusatz={`${formatChf(r.bezahlt_rappen)} / ${formatChf(r.total_rappen)}`}
              >
                {r.zahlungen.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('rechnungen.akte.keineZahlung')}</p>
                ) : (
                  <ul className="flex flex-col divide-y text-sm">
                    {r.zahlungen.map((z) => (
                      <li key={z.id} className="flex items-center justify-between gap-2 py-1.5">
                        <span>
                          {formatDatum(z.datum)}
                          <span className="text-muted-foreground ml-2 text-xs">
                            {z.quelle === 'abaninja' ? 'AbaNinja' : t('rechnungen.akte.vonHand')}
                            {z.notiz ? ` · ${z.notiz}` : ''}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="zahlen">{formatChf(z.betrag_rappen)}</span>
                          {z.quelle === 'hand' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('rechnungen.akte.zahlungEntfernen')}
                              onClick={() => void aus(() => zahlungEntfernen(z.id))}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </AkteAbschnitt>
            )}
            <Verlauf id={r.id} darfSchreiben={r.status !== 'storniert'} />
          </div>
        )}
        {r && fenster === 'zahlung' && <ZahlungDialog rechnung={r} onSchliessen={zu} />}
        {r && fenster === 'storno' && (
          <StornoDialog rechnung={r} onSchliessen={zu} onFertig={r.status === 'entwurf' ? onSchliessen : zu} />
        )}
        {r && fenster === 'mahnen' && (
          <MahnenDialog
            rechnung={r}
            mahnfristTage={einstellungen.mahnfrist_tage}
            onSchliessen={zu}
            onGemahnt={(stufe, vorschau) => {
              setFenster({ mahnung: stufe, vorschau })
            }}
          />
        )}
        {r && fenster === 'senden' && <RechnungSenden rechnung={r} onSchliessen={zu} />}
        {r && typeof fenster === 'object' && fenster && (
          <RechnungSenden
            rechnung={fenster.vorschau}
            mahnstufe={fenster.mahnung}
            erinnerung={fenster.mahnung === 0}
            onSchliessen={zu}
          />
        )}
        {r && fenster === 'angaben' && <AngabenDialog rechnung={r} onSchliessen={zu} />}
        {r && (fenster === 'sperre' || fenster === 'zusage') && (
          <SperreDialog rechnung={r} art={fenster} onSchliessen={zu} />
        )}
        {r && fenster === 'ausbuchen' && <AusbuchenDialog rechnung={r} onSchliessen={zu} />}
      </DialogInhalt>
    </Dialog>
  )
}

/** Mahnsperre, Zusage, Erinnerung und Ausgebuchtes als kurze Hinweise über den Angaben. */
function Hinweise({ r }: { r: RechnungVoll }) {
  const { t } = useTranslation()
  const heute = heuteZuerich()
  const zeilen = [
    r.mahnsperre_bis && r.mahnsperre_bis >= heute
      ? t('rechnungen.akte.mahnsperreBis', { datum: formatDatum(r.mahnsperre_bis), grund: r.mahnsperre_grund ?? '' })
      : null,
    r.zusage_bis && r.zusage_bis >= heute ? t('rechnungen.akte.zusageBis', { datum: formatDatum(r.zusage_bis) }) : null,
    r.erinnert_am && r.mahnstufe === 0 ? t('rechnungen.akte.erinnert', { datum: formatDatum(r.erinnert_am) }) : null,
    r.ausgebucht_rappen > 0
      ? t('rechnungen.akte.ausgebucht', {
          betrag: formatChf(r.ausgebucht_rappen, { mitWaehrung: true }),
          art: t(`rechnungen.ausbuchen.arten.${r.ausgebucht_art ?? 'rundung'}`),
          grund: r.ausgebucht_grund ?? '',
        })
      : null,
  ].filter((z): z is string => Boolean(z))
  if (zeilen.length === 0) return null
  return (
    <ul className="bg-muted mb-1 flex flex-col gap-0.5 rounded-md p-3 text-sm">
      {zeilen.map((z) => (
        <li key={z}>{z}</li>
      ))}
    </ul>
  )
}
