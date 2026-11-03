import { useNavigate } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useOffertAenderung } from '../hooks/useOfferten'
import { inTagen } from '../lib/nachfassen'
import { erfasseNachfassen } from '../services/ablauf'
import type { NachfassErgebnis, Offerte } from '../types'

const ERGEBNISSE: readonly NachfassErgebnis[] = ['vergleicht', 'interessiert', 'neue_version', 'spaeter', 'ja', 'nein']
const ARTEN = ['anruf', 'mail', 'besuch', 'sms'] as const

/**
 * Ergebnis eines Gesprächs beim Nachfassen erfassen. Das Ergebnis setzt den nächsten Schritt nach dem Plan
 * (Datenbank), «später» braucht Datum und Grund, «Nein» einen Grund (mit Konkurrenz), «Ja» führt zum Werkvertrag.
 */
export default function ErgebnisDialog({
  o,
  start,
  onSchliessen,
}: {
  o: Offerte
  start?: NachfassErgebnis
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const gruende = useAuswahl('verlustgrund_offerte')
  const [ergebnis, setErgebnis] = useState<NachfassErgebnis>(start ?? 'vergleicht')
  const [art, setArt] = useState<string>('anruf')
  const [notiz, setNotiz] = useState('')
  const [datum, setDatum] = useState(inTagen(30))
  const [grund, setGrund] = useState('')
  const [konkurrenz, setKonkurrenz] = useState(o.konkurrenz ?? '')
  const [erwartet, setErwartet] = useState(o.entscheidErwartet ?? '')
  const [variante, setVariante] = useState(o.variante ?? o.varianten[0]?.k ?? '')
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = useOffertAenderung(() =>
    erfasseNachfassen(o.id, ergebnis, {
      art,
      ...(notiz.trim() ? { notiz: notiz.trim() } : {}),
      ...(ergebnis === 'spaeter' ? { datum, grund: grund.trim() || notiz.trim() } : {}),
      ...(ergebnis === 'nein' ? { grund: grund.trim() } : {}),
      ...(konkurrenz.trim() && (ergebnis === 'nein' || ergebnis === 'vergleicht' || ergebnis === 'interessiert')
        ? { konkurrenz: konkurrenz.trim() }
        : {}),
      ...(erwartet && ergebnis !== 'nein' && ergebnis !== 'ja' ? { entscheid_erwartet: erwartet } : {}),
      ...(ergebnis === 'ja' && variante ? { variante } : {}),
    }),
  )

  async function absenden() {
    setFehler(null)
    if ((ergebnis === 'nein' || ergebnis === 'spaeter') && !grund.trim() && !notiz.trim()) {
      setFehler(t('fachfehler.stand_grund_fehlt'))
      return
    }
    try {
      const naechst = await speichern.mutateAsync(undefined)
      melde(
        'ok',
        naechst
          ? zweisprachig('offerten.ergebnis.okNaechst', { datum: formatDatum(naechst) })
          : zweisprachig('offerten.ergebnis.ok'),
      )
      onSchliessen()
      if (ergebnis === 'ja') void navigate({ to: '/workcontracts', search: { auftrag: o.id } })
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'offerten.ergebnis')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('offerten.ergebnis.titel')}
        beschreibung={`${o.nummer} · ${o.name}${o.telefon ? ` · ${o.telefon}` : ''}`}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Check />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void absenden()
          }}
        >
          <Filterchips
            einzeln
            beschriftung={t('offerten.ergebnis.art')}
            gewaehlt={[art]}
            onChange={(w) => {
              setArt(w[0] ?? 'anruf')
            }}
            optionen={ARTEN.map((a) => ({ wert: a, text: t(`offerten.ergebnis.art_${a}`) }))}
          />
          <Filterchips
            einzeln
            beschriftung={t('offerten.ergebnis.was')}
            gewaehlt={[ergebnis]}
            onChange={(w) => {
              setErgebnis((w[0] as NachfassErgebnis | undefined) ?? 'vergleicht')
            }}
            optionen={ERGEBNISSE.map((e) => ({ wert: e, text: t(`offerten.ergebnis.e_${e}`) }))}
          />
          <Feld id="ergebnis-notiz" label={t('offerten.ergebnis.notiz')}>
            <Textarea
              id="ergebnis-notiz"
              rows={3}
              value={notiz}
              placeholder={t('offerten.ergebnis.notizHinweis')}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
          {ergebnis === 'spaeter' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Feld id="ergebnis-datum" label={t('offerten.ergebnis.wann')} pflicht>
                <Input
                  id="ergebnis-datum"
                  type="date"
                  min={inTagen(1)}
                  value={datum}
                  onChange={(e) => {
                    setDatum(e.target.value)
                  }}
                />
              </Feld>
              <Feld id="ergebnis-grund-s" label={t('offerten.entscheid.grund')} pflicht fehler={fehler ?? undefined}>
                <Input
                  id="ergebnis-grund-s"
                  value={grund}
                  onChange={(e) => {
                    setGrund(e.target.value)
                  }}
                />
              </Feld>
            </div>
          )}
          {ergebnis === 'nein' && (
            <Feld id="ergebnis-grund" label={t('offerten.entscheid.grund')} pflicht fehler={fehler ?? undefined}>
              <Auswahl
                id="ergebnis-grund"
                value={grund}
                onValueChange={setGrund}
                optionen={gruende.werte.map((g) => ({
                  wert: gruende.text(g.schluessel),
                  text: gruende.text(g.schluessel),
                }))}
              />
            </Feld>
          )}
          {(ergebnis === 'nein' || ergebnis === 'vergleicht' || ergebnis === 'interessiert') && (
            <Feld id="ergebnis-konkurrenz" label={t('offerten.chance.konkurrenz')}>
              <Input
                id="ergebnis-konkurrenz"
                value={konkurrenz}
                placeholder={t('offerten.chance.konkurrenzHinweis')}
                onChange={(e) => {
                  setKonkurrenz(e.target.value)
                }}
              />
            </Feld>
          )}
          {(ergebnis === 'vergleicht' || ergebnis === 'interessiert' || ergebnis === 'neue_version') && (
            <Feld id="ergebnis-erwartet" label={t('offerten.chance.erwartet')}>
              <Input
                id="ergebnis-erwartet"
                type="date"
                value={erwartet}
                onChange={(e) => {
                  setErwartet(e.target.value)
                }}
              />
            </Feld>
          )}
          {ergebnis === 'ja' && o.varianten.length > 0 && (
            <Feld id="ergebnis-variante" label={t('offerten.varianten.gewaehlt')}>
              <Auswahl
                id="ergebnis-variante"
                value={variante}
                onValueChange={setVariante}
                optionen={o.varianten.map((v) => ({ wert: v.k, text: `${v.k} · ${v.titel ?? ''}` }))}
              />
            </Feld>
          )}
          <p className="text-muted-foreground text-xs">{t(`offerten.ergebnis.folge_${ergebnis}`)}</p>
          {fehler && ergebnis !== 'nein' && ergebnis !== 'spaeter' && (
            <p role="alert" className="text-bad text-sm">
              {fehler}
            </p>
          )}
        </form>
      </DialogInhalt>
    </Dialog>
  )
}
