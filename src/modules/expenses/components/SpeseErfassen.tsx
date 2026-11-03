import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { formatChf, parseChf } from '@/lib/format'
import type { KiBeleg } from '@/services/ki'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich, kmBetrag, mwstAusBetrag } from '../lib/spesen'
import { speseSchema } from '../schema'
import { speseAendern, speseErfassen } from '../services/spesen'
import type { NeueSpese, Spese } from '../types'
import { BelegFeld } from './BelegFeld'
import { ProjektWahl } from './ProjektWahl'
import { Umschalter } from './Umschalter'

const MWST = ['8.1', '3.8', '2.6', '0']

/** Formularwerte als Text, wie sie in den Feldern stehen. */
interface Werte {
  art: 'beleg' | 'kilometer'
  datum: string
  betrag: string
  kategorie: string
  zweck: string
  notiz: string
  projekt_id: string | null
  bezahlt_mit: 'eigen' | 'firmenkarte'
  mwst: string
  personen: string
  km: string
  strecke: string
}

const leer = (art: 'beleg' | 'kilometer'): Werte => ({
  art,
  datum: heuteZuerich(),
  betrag: '',
  kategorie: '',
  zweck: '',
  notiz: '',
  projekt_id: null,
  bezahlt_mit: 'eigen',
  mwst: '',
  personen: '',
  km: '',
  strecke: '',
})

const ausSpese = (s: Spese): Werte => ({
  art: s.art,
  datum: s.datum,
  betrag: formatChf(s.betrag_rappen),
  kategorie: s.kategorie,
  zweck: s.zweck ?? '',
  notiz: s.notiz ?? '',
  projekt_id: s.projekt_id,
  bezahlt_mit: s.bezahlt_mit,
  mwst: s.mwst_satz === null ? '' : String(s.mwst_satz),
  personen: s.personen ? String(s.personen) : '',
  km: s.km ? String(s.km) : '',
  strecke: s.strecke ?? '',
})

/**
 * Spese erfassen oder ändern (V233 «Spese erfassen mit Beleg»): Beleg zuerst (die KI füllt die Felder), dann
 * Betrag, Datum, Kategorie, MWST, Zweck, Projekt und «bezahlt mit». Kilometer mit dem Privatauto ohne Beleg:
 * Betrag = km × Ansatz aus den Einstellungen. Die Spese gehört immer der Person, für die sie erfasst wird.
 */
export function SpeseErfassen({
  personId,
  spese,
  start = 'beleg',
  onSchliessen,
}: {
  personId: string
  spese?: Spese
  start?: 'beleg' | 'kilometer'
  onSchliessen: () => void
}) {
  const { t, i18n } = useTranslation()
  const { spesen_kategorien: kategorien, spesen: regeln } = useFinanzEinstellungen()
  const { laeuft, aus } = useAktion()
  const kmKategorie = kategorien.find((k) => k.art === 'kilometer')
  const [w, setW] = useState<Werte>(() =>
    spese
      ? ausSpese(spese)
      : { ...leer(start), kategorie: start === 'kilometer' ? (kmKategorie?.schluessel ?? '') : '' },
  )
  const [beleg, setBeleg] = useState<File | null>(null)
  const [kiNotiz, setKiNotiz] = useState<string | null>(null)
  const setze = (x: Partial<Werte>) => {
    setW((alt) => ({ ...alt, ...x }))
  }

  const km = Number(w.km.replace(',', '.')) || 0
  const satz = spese?.km_satz_rappen ?? regeln.km_satz_rappen
  const rappen = w.art === 'kilometer' ? kmBetrag(km, satz) : (parseChf(w.betrag) ?? 0)
  const mwstSatz = w.mwst === '' ? null : Number(w.mwst)
  const kat = kategorien.find((k) => k.schluessel === w.kategorie)
  const gueltig =
    speseSchema.safeParse({ datum: w.datum, betrag_rappen: rappen, kategorie: w.kategorie, zweck: w.zweck }).success &&
    (w.art === 'beleg' || km > 0)

  function gelesen(r: KiBeleg) {
    setze({
      ...(r.datum ? { datum: r.datum } : {}),
      ...(r.betrag_rappen ? { betrag: formatChf(r.betrag_rappen) } : {}),
      ...(r.kategorie ? { kategorie: r.kategorie } : {}),
      ...(r.zweck ? { zweck: r.zweck } : {}),
      ...(r.mwst_satz ? { mwst: String(r.mwst_satz) } : {}),
      ...(r.personen ? { personen: String(r.personen) } : {}),
    })
    const fremd = r.waehrung && r.waehrung !== 'CHF' ? r.waehrung : null
    setKiNotiz(
      [fremd ? t('ki.beleg.waehrung', { waehrung: fremd }) : null, r.bemerkung].filter(Boolean).join(' · ') || null,
    )
  }

  function kategorieWaehlen(k: string) {
    const neu = kategorien.find((x) => x.schluessel === k)
    setze({
      kategorie: k,
      ...(neu?.art === 'kilometer' ? { art: 'kilometer' as const } : { art: 'beleg' as const }),
      // Übliche MWST der Kategorie vorschlagen, wenn noch keine eingetragen ist.
      ...(w.mwst === '' && neu?.mwst_satz ? { mwst: String(neu.mwst_satz) } : {}),
    })
  }

  async function speichern(weiter: boolean) {
    if (!gueltig) return
    const n: NeueSpese = {
      art: w.art,
      datum: w.datum,
      betrag_rappen: rappen,
      kategorie: w.kategorie,
      zweck: w.zweck,
      notiz: w.notiz.trim() || null,
      projekt_id: w.projekt_id,
      bezahlt_mit: w.bezahlt_mit,
      mwst_satz: w.art === 'beleg' ? mwstSatz : null,
      mwst_rappen: w.art === 'beleg' && mwstSatz ? mwstAusBetrag(rappen, mwstSatz) : null,
      personen: Number(w.personen) || null,
      km: w.art === 'kilometer' ? km : null,
      strecke: w.strecke.trim() || null,
      beleg: w.art === 'beleg' ? beleg : null,
    }
    const ok = await aus(
      () => (spese ? speseAendern(spese.id, n) : speseErfassen(personId, n)),
      spese ? { de: 'Gespeichert', fr: 'Enregistré' } : { de: 'Spese erfasst', fr: 'Frais saisis' },
    )
    if (!ok) return
    if (weiter) {
      // Gleicher Tag und gleiches Projekt bleiben: oft kommen mehrere Belege vom selben Einsatz.
      setW({ ...leer(w.art), datum: w.datum, projekt_id: w.projekt_id, bezahlt_mit: w.bezahlt_mit })
      setBeleg(null)
      setKiNotiz(null)
    } else onSchliessen()
  }

  const optionen = kategorien
    .filter((k) => (w.art === 'kilometer' ? k.art === 'kilometer' : k.art !== 'kilometer'))
    .map((k) => ({ wert: k.schluessel, text: i18n.language === 'fr' ? k.fr : k.de }))
  // Alte Kategorie einer bestehenden Spese bleibt wählbar.
  if (w.kategorie && !optionen.some((o) => o.wert === w.kategorie))
    optionen.push({ wert: w.kategorie, text: w.kategorie })

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={spese ? t('spesen.erfassen.aendern') : t('spesen.erfassen.titel')}
        beschreibung={
          spese?.rueckfrage ? t('spesen.erfassen.rueckfrage', { text: spese.rueckfrage }) : t('spesen.erfassen.text')
        }
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            {!spese && (
              <Button variant="secondary" onClick={() => void speichern(true)} laedt={laeuft} disabled={!gueltig}>
                {t('spesen.erfassen.speichernWeiter')}
              </Button>
            )}
            <Button onClick={() => void speichern(false)} laedt={laeuft} disabled={!gueltig}>
              {t('spesen.erfassen.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {!spese && kmKategorie && (
            <div className="sm:col-span-2">
              <Umschalter
                beschriftung={t('spesen.erfassen.art')}
                wert={w.art}
                optionen={[
                  { wert: 'beleg', text: t('spesen.art.beleg') },
                  { wert: 'kilometer', text: t('spesen.art.kilometer') },
                ]}
                onChange={(a) => {
                  setze({ art: a, kategorie: a === 'kilometer' ? kmKategorie.schluessel : '' })
                }}
              />
            </div>
          )}
          {w.art === 'beleg' ? (
            <>
              <div className="sm:col-span-2">
                <BelegFeld beleg={beleg} vorhanden={spese?.beleg_name ?? null} onBeleg={setBeleg} onGelesen={gelesen} />
                {kiNotiz && <p className="bg-warn-soft text-warn mt-2 rounded-md px-3 py-1.5 text-xs">{kiNotiz}</p>}
              </div>
              <Feld id="spese-betrag" label={t('spesen.spalte.betrag')} pflicht>
                <Input
                  id="spese-betrag"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={w.betrag}
                  onChange={(e) => {
                    setze({ betrag: e.target.value })
                  }}
                />
              </Feld>
            </>
          ) : (
            <>
              <Feld id="spese-strecke" label={t('spesen.erfassen.strecke')} className="sm:col-span-2">
                <Input
                  id="spese-strecke"
                  placeholder={t('spesen.erfassen.streckeBeispiel')}
                  value={w.strecke}
                  onChange={(e) => {
                    setze({ strecke: e.target.value })
                  }}
                />
              </Feld>
              <Feld
                id="spese-km"
                label={t('spesen.erfassen.km')}
                pflicht
                hinweis={t('spesen.erfassen.kmRechnung', {
                  satz: formatChf(satz),
                  betrag: formatChf(rappen, { mitWaehrung: true }),
                })}
              >
                <Input
                  id="spese-km"
                  inputMode="decimal"
                  placeholder="0"
                  value={w.km}
                  onChange={(e) => {
                    setze({ km: e.target.value })
                  }}
                />
              </Feld>
            </>
          )}
          <Feld id="spese-datum" label={t('spesen.spalte.datum')} pflicht>
            <Input
              id="spese-datum"
              type="date"
              max={heuteZuerich()}
              value={w.datum}
              onChange={(e) => {
                setze({ datum: e.target.value })
              }}
            />
          </Feld>
          <Feld id="spese-kategorie" label={t('spesen.spalte.kategorie')} pflicht>
            <Auswahl
              id="spese-kategorie"
              value={w.kategorie}
              onValueChange={kategorieWaehlen}
              platzhalter={t('spesen.erfassen.kategorieWaehlen')}
              optionen={optionen}
            />
          </Feld>
          {w.art === 'beleg' && (
            <Feld
              id="spese-mwst"
              label={t('spesen.erfassen.mwst')}
              {...(mwstSatz ? { hinweis: formatChf(mwstAusBetrag(rappen, mwstSatz), { mitWaehrung: true }) } : {})}
            >
              <Auswahl
                id="spese-mwst"
                value={w.mwst}
                onValueChange={(v) => {
                  setze({ mwst: v })
                }}
                platzhalter={t('spesen.erfassen.mwstUnbekannt')}
                optionen={MWST.map((m) => ({ wert: m, text: m === '0' ? t('spesen.erfassen.ohneMwst') : `${m} %` }))}
              />
            </Feld>
          )}
          <Feld id="spese-zweck" label={t('spesen.spalte.zweck')} pflicht className="sm:col-span-2">
            <Input
              id="spese-zweck"
              placeholder={t('spesen.erfassen.zweckBeispiel')}
              value={w.zweck}
              onChange={(e) => {
                setze({ zweck: e.target.value })
              }}
            />
          </Feld>
          <Feld id="spese-projekt" label={t('spesen.spalte.projekt')} hinweis={t('spesen.erfassen.projektHinweis')}>
            <ProjektWahl
              id="spese-projekt"
              projektId={w.projekt_id}
              onChange={(p) => {
                setze({ projekt_id: p })
              }}
            />
          </Feld>
          {w.art === 'beleg' && kat?.richtwert_je === 'person' ? (
            <Feld id="spese-personen" label={t('spesen.erfassen.personen')}>
              <Input
                id="spese-personen"
                inputMode="numeric"
                placeholder="1"
                value={w.personen}
                onChange={(e) => {
                  setze({ personen: e.target.value.replace(/\D/g, '') })
                }}
              />
            </Feld>
          ) : (
            <span className="hidden sm:block" />
          )}
          {w.art === 'beleg' && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-medium">{t('spesen.erfassen.bezahltMit')}</span>
              <Umschalter
                beschriftung={t('spesen.erfassen.bezahltMit')}
                wert={w.bezahlt_mit}
                optionen={[
                  { wert: 'eigen', text: t('spesen.bezahlt.eigen') },
                  { wert: 'firmenkarte', text: t('spesen.bezahlt.firmenkarte') },
                ]}
                onChange={(b) => {
                  setze({ bezahlt_mit: b })
                }}
              />
              {w.bezahlt_mit === 'firmenkarte' && (
                <p className="text-muted-foreground text-xs">{t('spesen.erfassen.firmenkarteHinweis')}</p>
              )}
            </div>
          )}
          <Feld id="spese-notiz" label={t('spesen.erfassen.notiz')} className="sm:col-span-2">
            <Textarea
              id="spese-notiz"
              rows={2}
              value={w.notiz}
              onChange={(e) => {
                setze({ notiz: e.target.value })
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
