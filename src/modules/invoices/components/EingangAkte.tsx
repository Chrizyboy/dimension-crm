import { CheckCircle2, FileText, PencilLine, Wallet, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { InPapierkorbKnopf } from '@/components/shared/papierkorb/InPapierkorbKnopf'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useAktion } from '../hooks/useAktion'
import { useEingangEine, useVergleich } from '../hooks/useRechnungen'
import { heuteZuerich } from '../lib/rechnung'
import { belegAdresse, eingangBezahlt, visieren } from '../services/eingang'
import type { Eingangsrechnung } from '../types'
import { EingangDialog } from './EingangDialog'
import { eingangTon } from './status'

/**
 * Akte einer Eingangsrechnung: Angaben, Beleg, Vergleich mit der Bestellung (bestellt, geliefert, Differenz) und
 * die Visa. Wer an der Reihe ist, gibt das Visum oder lehnt mit Grund ab; das Zweitvisum braucht eine andere
 * Person (Vier-Augen). Die Buchhaltung ändert Angaben und markiert bezahlt (normal über den Abgleich).
 */
export function EingangAkte({
  id,
  finanzen,
  onSchliessen,
}: {
  id: string
  finanzen: boolean
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const daten = useEingangEine(id)
  const vergleich = useVergleich(id)
  const { laeuft, aus } = useAktion()
  const [bemerkung, setBemerkung] = useState('')
  const [ablehnen, setAblehnen] = useState(false)
  const [aendern, setAendern] = useState(false)
  const e = daten.data
  const a = 'rechnungen.eingang.akte'

  async function beleg(dokumentId: string) {
    try {
      const url = await belegAdresse(dokumentId)
      if (url) window.open(url, '_blank', 'noopener')
    } catch (f) {
      meldeFehler(f, 'rechnungen')
    }
  }

  const fuss = e && (
    <>
      {e.dokument_id && (
        <Button variant="ghost" onClick={() => void beleg(e.dokument_id ?? '')}>
          <FileText />
          {t(`${a}.beleg`)}
        </Button>
      )}
      {finanzen && e.status !== 'bezahlt' && e.quelle === 'hand' && (
        <InPapierkorbKnopf
          tabelle="eingangsrechnungen"
          id={e.id}
          name={[e.lieferant, e.nummer].filter(Boolean).join(' ')}
          onFertig={onSchliessen}
        />
      )}
      {finanzen && e.status !== 'bezahlt' && e.quelle === 'hand' && (
        <Button
          variant="ghost"
          onClick={() => {
            setAendern(true)
          }}
        >
          <PencilLine />
          {t(`${a}.aendern`)}
        </Button>
      )}
      {finanzen && e.status === 'bereit' && (
        <Button
          variant="secondary"
          laedt={laeuft}
          onClick={() => void aus(() => eingangBezahlt(e.id, heuteZuerich()), { de: 'Bezahlt', fr: 'Payée' })}
        >
          <Wallet />
          {t(`${a}.bezahlt`)}
        </Button>
      )}
      {e.ich_visiere && (
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setAblehnen(!ablehnen)
            }}
          >
            <XCircle />
            {t(`${a}.ablehnen`)}
          </Button>
          <Button
            laedt={laeuft}
            disabled={ablehnen}
            onClick={() =>
              void aus(() => visieren(e.id, true, bemerkung), { de: 'Visum gegeben', fr: 'Visa donné' }).then((ok) => {
                if (ok) setBemerkung('')
              })
            }
          >
            <CheckCircle2 />
            {t(`${a}.visieren`)}
          </Button>
        </>
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
        titel={e ? `${e.lieferant} · ${e.nummer ?? '–'}` : t(`${a}.titel`)}
        {...(e ? { beschreibung: formatChf(e.betrag_rappen, { mitWaehrung: true }), fuss } : {})}
      >
        {daten.error ? (
          <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
        ) : !e ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5 pb-3">
              <Badge ton={eingangTon(e.status)} punkt>
                {t(`rechnungen.eingang.status.${e.status}`)}
              </Badge>
              {e.ueberfaellig && <Badge ton="kritisch">{t('rechnungen.ueberfaellig')}</Badge>}
              {e.quelle === 'abaninja' && <Badge ton="neutral">AbaNinja</Badge>}
            </div>
            {e.status === 'abgelehnt' && (
              <p className="bg-bad-soft text-bad rounded-md p-3 text-sm">
                {t(`${a}.abgelehnt`, { wer: e.abgelehnt_von_name ?? '–', grund: e.abgelehnt_grund ?? '' })}
              </p>
            )}
            {e.ich_visiere && (
              <Feld
                id="eingang-bemerkung"
                label={ablehnen ? t(`${a}.grund`) : t(`${a}.bemerkung`)}
                pflicht={ablehnen}
                className="pt-2"
              >
                <div className="flex gap-2">
                  <Input
                    id="eingang-bemerkung"
                    value={bemerkung}
                    onChange={(x) => {
                      setBemerkung(x.target.value)
                    }}
                  />
                  {ablehnen && (
                    <Button
                      variant="danger"
                      laedt={laeuft}
                      disabled={!bemerkung.trim()}
                      onClick={() =>
                        void aus(() => visieren(e.id, false, bemerkung), {
                          de: 'Abgelehnt, die Buchhaltung klärt es mit dem Lieferanten',
                          fr: 'Refusée, la comptabilité clarifie avec le fournisseur',
                        })
                      }
                    >
                      {t(`${a}.ablehnen`)}
                    </Button>
                  )}
                </div>
              </Feld>
            )}
            <Visa e={e} />
            <AkteAbschnitt titel={t(`${a}.angaben`)}>
              <dl>
                <Angabe label={t('rechnungen.eingang.dialog.datum')}>{e.datum ? formatDatum(e.datum) : '–'}</Angabe>
                <Angabe label={t('rechnungen.eingang.spalte.faellig')}>
                  {e.faellig_am ? formatDatum(e.faellig_am) : '–'}
                  {e.skonto_prozent && e.skonto_bis && (
                    <span className="text-ok">
                      {' '}
                      ·{' '}
                      {t('rechnungen.eingang.skonto', { prozent: e.skonto_prozent, datum: formatDatum(e.skonto_bis) })}
                    </span>
                  )}
                </Angabe>
                <Angabe label={t('rechnungen.eingang.spalte.projekt')}>
                  {[e.projekt_nummer, e.projekt_titel, e.kunde].filter(Boolean).join(' · ') || '–'}
                </Angabe>
                {e.text && <Angabe label={t('rechnungen.eingang.dialog.text')}>{e.text}</Angabe>}
                {e.bezahlt_am && (
                  <Angabe label={t('rechnungen.eingang.status.bezahlt')}>{formatDatum(e.bezahlt_am)}</Angabe>
                )}
              </dl>
            </AkteAbschnitt>
            <AkteAbschnitt
              titel={
                e.bestellung_nummer
                  ? t(`${a}.bestellung`, { nummer: e.bestellung_nummer })
                  : t('rechnungen.eingang.spalte.bestellung')
              }
            >
              {!e.bestellung_id ? (
                <p className="text-muted-foreground text-sm">{t(`${a}.keineBestellung`)}</p>
              ) : vergleich.error ? (
                <Fehlerzustand
                  details={String(vergleich.error)}
                  onNochmal={() => void vergleich.refetch()}
                  ebene="h2"
                />
              ) : !vergleich.data?.bestellung ? (
                <Skelett className="h-24" />
              ) : (
                <Vergleich b={vergleich.data.bestellung} />
              )}
            </AkteAbschnitt>
          </div>
        )}
        {e && aendern && (
          <EingangDialog
            eingang={e}
            onSchliessen={() => {
              setAendern(false)
            }}
            onGespeichert={() => {
              setAendern(false)
            }}
          />
        )}
      </DialogInhalt>
    </Dialog>
  )
}

/** Erst- und Zweitvisum mit wer/wann; offenes Visum mit der zuständigen Person. */
function Visa({ e }: { e: Eingangsrechnung }) {
  const { t } = useTranslation()
  const a = 'rechnungen.eingang.akte'
  const zeile = (von: string | null, am: string | null, bemerkung: string | null, wartet: string | null) =>
    am ? (
      <span className="text-ok">
        {t(`${a}.visiert`, { wer: von ?? '–', datum: formatDatum(am.slice(0, 10)) })}
        {bemerkung ? <span className="text-muted-foreground"> · {bemerkung}</span> : null}
      </span>
    ) : (
      <span className="text-muted-foreground">
        {wartet ? t('rechnungen.eingang.wartetAuf', { wer: wartet }) : t(`${a}.offen`)}
      </span>
    )
  return (
    <AkteAbschnitt titel={t(`${a}.visa`)}>
      <dl>
        <Angabe label={t(`${a}.erstvisum`)}>
          {zeile(e.visum_pl_von_name, e.visum_pl_am, e.visum_pl_bemerkung, e.visum_pl_person)}
        </Angabe>
        <Angabe label={t(`${a}.zweitvisum`)}>
          {e.visum_gl_noetig ? (
            zeile(e.visum_gl_von_name, e.visum_gl_am, e.visum_gl_bemerkung, null)
          ) : (
            <span className="text-muted-foreground">{t(`${a}.nichtNoetig`)}</span>
          )}
        </Angabe>
      </dl>
    </AkteAbschnitt>
  )
}

function Vergleich({ b }: { b: NonNullable<import('../types').EingangVergleich['bestellung']> }) {
  const { t } = useTranslation()
  const a = 'rechnungen.eingang.akte'
  return (
    <div className="flex flex-col gap-2">
      <Tabelle aria-label={t(`${a}.bestellung`, { nummer: b.nummer })}>
        <TabelleKopf>
          <tr>
            <Kopfzelle>{t(`${a}.artikel`)}</Kopfzelle>
            <Kopfzelle className="text-right">{t(`${a}.bestellt`)}</Kopfzelle>
            <Kopfzelle className="text-right">{t(`${a}.geliefert`)}</Kopfzelle>
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {b.positionen.map((p, i) => (
            <Zeile key={`${p.bezeichnung}-${String(i)}`}>
              <Zelle>{p.bezeichnung}</Zelle>
              <Zelle className="zahlen text-right">
                {p.menge} {p.einheit ?? ''}
              </Zelle>
              <Zelle className={`zahlen text-right ${(p.geliefert ?? 0) < p.menge ? 'text-warn' : 'text-ok'}`}>
                {p.geliefert ?? 0}
              </Zelle>
            </Zeile>
          ))}
        </TabelleKoerper>
      </Tabelle>
      {b.differenz_rappen != null && (
        <p className={`text-sm ${Math.abs(b.differenz_rappen) > 100 ? 'text-warn' : 'text-ok'}`}>
          {t(`${a}.differenz`)}:{' '}
          <span className="zahlen font-medium">{formatChf(b.differenz_rappen, { mitWaehrung: true })}</span>
        </p>
      )}
    </div>
  )
}
