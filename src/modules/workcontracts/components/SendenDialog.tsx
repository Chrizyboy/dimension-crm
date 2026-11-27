import { useQueryClient } from '@tanstack/react-query'
import { FileText, ListChecks, Mail, PenLine, Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/schalter'
import i18n from '@/i18n'
import { formatChf } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { fachFehlerSchluessel } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { rechnungPdf } from '@/services/rechnungPdf'
import { ladeRechnung, rechnungPdfAblegen } from '@/services/rechnungsdaten'
import { ladeUnterschrift } from '@/services/unterschrift'
import { useAnmeldung } from '@/stores/anmeldung'
import { VERTRAG_SCHLUESSEL } from '../hooks/useWerkvertraege'
import { vertragInhalt } from '../lib/vertragInhalt'
import { ladePositionen } from '../services/auftragsdaten'
import { anzahlungsrechnung, ladeEinstellung, ladeVertragDateien, vertragPdfAblegen } from '../services/werkvertraege'
import { werkvertragPdf } from '../services/vertragPdf'
import type { Werkvertrag } from '../types'

type Datei = { id: string; name: string; vorgewaehlt?: boolean }

/** Punkte, die vor dem Versand abgehakt sein müssen (Fall Weller: Dokument muss zur Offerte passen). */
const PRUEFPUNKTE = ['positionen', 'ziele', 'termin', 'sprache'] as const
type Pruefpunkt = (typeof PRUEFPUNKTE)[number]

/** Kann die Anzahlungsrechnung beigelegt werden? Sonst der Grund (Text-Schlüssel). */
function rechnungMoeglich(w: Werkvertrag, finanzen: boolean): { ok: boolean; grund: string } {
  const a = w.anzahlung
  if (!a) return { ok: false, grund: 'keinPlan' }
  if (a.rechnungId) return { ok: finanzen, grund: finanzen ? 'vorhanden' : 'keinRecht' }
  if (a.rechnungNr || a.abaninja || a.bezahltAm) return { ok: false, grund: 'schonVerrechnet' }
  return { ok: finanzen, grund: finanzen ? 'neu' : 'keinRecht' }
}

/**
 * «An Kunden senden»: Werkvertrag als PDF und (wenn möglich) die Anzahlungsrechnung mit QR-Zahlteil in einer
 * Mail. Erst nach «Mail vorbereiten» wird die Rechnung gestellt; gesendet wird nur aus dem Mail-Fenster über
 * den Ausgangskorb (Regel 6). Danach steht der Vertrag auf «versendet».
 */
export function SendenDialog({
  vertrag: w,
  onSchliessen,
  onGesendet,
}: {
  vertrag: Werkvertrag
  onSchliessen: () => void
  onGesendet: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const moeglich = rechnungMoeglich(w, hatRecht(ich, 'finanzen'))
  const [mitRechnung, setMitRechnung] = useState(moeglich.ok)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [dateien, setDateien] = useState<Datei[] | null>(null)
  // Eigene Unterschrift (Mein Konto): undefined = lädt, null = keine abgelegt.
  const [unterschrift, setUnterschrift] = useState<Uint8Array | null | undefined>(undefined)
  const [mitUnterschrift, setMitUnterschrift] = useState(true)
  const [geprueft, setGeprueft] = useState<ReadonlySet<Pruefpunkt>>(new Set())
  const ab = w.angaben.art === 'auftragsbestaetigung'
  const fehlt: Record<Pruefpunkt, boolean> = {
    positionen: false,
    ziele: !w.angaben.ziele?.length,
    termin: !w.angaben.beginn?.trim(),
    sprache: false,
  }
  useEffect(() => {
    if (!ich) return
    ladeUnterschrift(ich.id)
      .then(setUnterschrift)
      .catch(() => {
        setUnterschrift(null)
      })
  }, [ich])
  const ts = i18n.getFixedT(w.sprache)
  const betrag = w.anzahlung ? formatChf(w.anzahlung.betragRappen, { mitWaehrung: true }) : ''

  async function vorbereiten() {
    setLaeuft(true)
    setFehler(null)
    try {
      const e = await ladeEinstellung()
      const inhalt = vertragInhalt(w, e, await ladePositionen(w.offerteId))
      // Wer mit eigener Unterschrift sendet, unterschreibt selbst: Bild in den Kasten, eigener Name darunter.
      const signiert =
        mitUnterschrift && unterschrift && ich
          ? { ...inhalt, unterzeichner: ich.name, unterschriftBild: unterschrift }
          : inhalt
      const vertrag = await vertragPdfAblegen(w, await werkvertragPdf(signiert))
      const neu: Datei[] = [{ ...vertrag, vorgewaehlt: true }]
      if (mitRechnung) {
        const r = await ladeRechnung(await anzahlungsrechnung(w.id))
        neu.push({ ...(await rechnungPdfAblegen(r, await rechnungPdf(r, ts))), vorgewaehlt: true })
        await qc.invalidateQueries({ queryKey: ['rechnungen'] })
      }
      const weitere = (await ladeVertragDateien(w)).filter((d) => !neu.some((n) => n.id === d.id))
      await qc.invalidateQueries({ queryKey: VERTRAG_SCHLUESSEL })
      setDateien([...neu, ...weitere])
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'werkvertraege.senden')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    } finally {
      setLaeuft(false)
    }
  }

  if (dateien) {
    const mitR = dateien.length > 1 && mitRechnung
    const m = ab ? 'mail.auftragsbestaetigung' : 'mail.werkvertrag'
    return (
      <MailDialog
        titel={t('mail.vertragTitel', { nummer: w.nummer })}
        vorlage={{
          an: w.email ?? '',
          betreff: ts(mitR ? `${m}.betreffMitRechnung` : `${m}.betreff`, { nummer: w.nummer }),
          text: ts(mitR ? `${m}.textMitRechnung` : `${m}.text`, {
            absender: ich?.name ?? '',
            betrag,
          }),
          sprache: w.sprache,
          art: 'werkvertrag',
          kontakt_id: w.kontaktId,
          bezug_tabelle: 'werkvertraege',
          bezug_id: w.id,
          ...(w.projektId ? { projekt_id: w.projektId } : {}),
          ...(w.offerteId ? { offerte_id: w.offerteId } : {}),
        }}
        dateien={dateien}
        onSchliessen={onSchliessen}
        onGesendet={onGesendet}
      />
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(ab ? 'werkvertraege.senden.titelAb' : 'werkvertraege.senden.titel')}
        beschreibung={`${w.name} · ${w.email ?? t('werkvertraege.senden.keineMail')}`}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={laeuft}
              disabled={!w.email || geprueft.size < PRUEFPUNKTE.length}
              onClick={() => void vorbereiten()}
            >
              <Mail />
              {t('werkvertraege.senden.weiter')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="flex items-center gap-2">
            <FileText className="text-muted-foreground size-4" />
            {t(ab ? 'werkvertraege.senden.ab' : 'werkvertraege.senden.vertrag', {
              sprache: w.sprache === 'fr' ? 'Français' : 'Deutsch',
            })}
          </p>
          <fieldset className="bg-muted/40 flex flex-col gap-2 rounded-md p-3">
            <legend className="flex items-center gap-2 text-xs font-medium">
              <ListChecks className="text-muted-foreground size-4" />
              {t('werkvertraege.senden.pruefen')}
            </legend>
            {PRUEFPUNKTE.map((p) => (
              <label key={p} className="flex items-start gap-2">
                <Checkbox
                  checked={geprueft.has(p)}
                  onCheckedChange={(an) => {
                    const neu = new Set(geprueft)
                    if (an === true) neu.add(p)
                    else neu.delete(p)
                    setGeprueft(neu)
                  }}
                />
                <span className="flex flex-col gap-0.5">
                  <span>
                    {t(`werkvertraege.senden.punkt.${p}`, {
                      nummer: w.offerteNummer ?? '',
                      sprache: w.sprache === 'fr' ? 'Français' : 'Deutsch',
                    })}
                  </span>
                  {fehlt[p] && <span className="text-warn text-xs">{t(`werkvertraege.senden.fehlt.${p}`)}</span>}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="flex items-start gap-2">
            <Checkbox
              checked={mitRechnung}
              disabled={!moeglich.ok}
              onCheckedChange={(an) => {
                setMitRechnung(an === true)
              }}
            />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <Receipt className="text-muted-foreground size-4" />
                {t('werkvertraege.senden.rechnung', { betrag })}
              </span>
              <span className="text-muted-foreground text-xs">
                {t(`werkvertraege.senden.grund.${moeglich.grund}`, { nummer: w.anzahlung?.rechnungNr ?? '' })}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <Checkbox
              checked={!!unterschrift && mitUnterschrift}
              disabled={!unterschrift}
              onCheckedChange={(an) => {
                setMitUnterschrift(an === true)
              }}
            />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <PenLine className="text-muted-foreground size-4" />
                {t('werkvertraege.senden.mitUnterschrift')}
              </span>
              <span className="text-muted-foreground text-xs">
                {unterschrift === null
                  ? t('werkvertraege.senden.keineUnterschrift')
                  : t('werkvertraege.senden.unterschriftHinweis')}
              </span>
            </span>
          </label>
          {fehler && (
            <p role="alert" className="text-bad">
              {fehler}
            </p>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
