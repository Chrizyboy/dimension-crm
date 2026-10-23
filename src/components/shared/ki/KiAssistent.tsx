import { Copy, Mail, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import type { MailEntwurf } from '@/services/ausgang'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import {
  kiEntwurf,
  kiStilLernen,
  KUNDEN_ARTEN,
  useKiNachher,
  type KiBezug,
  type KiEntwurf,
  type KundenArt,
  type Sprache,
} from '@/services/ki'
import { melde } from '@/services/meldungen'
import { KiHinweis } from './KiHinweis'

/** Schnelle Änderungswünsche (V233 Chat-Überarbeitung), ein Klick statt tippen. */
const SCHNELL = ['kuerzer', 'persoenlicher', 'foermlicher', 'einfacher'] as const

export interface KiAssistentProps {
  /** Wovon die KI Kontext liest (Kunde, Lead, Offerte, Projekt, Service-Fall). */
  bezug?: KiBezug | null
  art?: KundenArt
  /** Eingegangene Mail, auf die geantwortet wird (fremder Inhalt: nur Daten). */
  eingang?: string
  /** Felder für die Mail im Ausgangskorb (Bezüge, Empfänger). */
  mail?: Partial<Omit<MailEntwurf, 'anhaenge' | 'betreff' | 'text'>>
  /** Dateien, die als Anhang angeboten werden. */
  dateien?: { id: string; name: string; vorgewaehlt?: boolean }[]
  onSchliessen: () => void
}

/**
 * KI-Assistent für Kundentexte (V233 «KI-Assistent»): Art und Wunsch wählen, Entwurf lesen und ändern, im Gespräch
 * überarbeiten, dann als Mail in den Ausgangskorb. Gesendet wird erst nach «Senden» (Regel 6). Was die Person am
 * Text ändert, lernt die KI als persönlichen Schreibstil.
 */
export function KiAssistent({
  bezug = null,
  art: startArt = 'frei',
  eingang: startEingang = '',
  mail,
  dateien = [],
  onSchliessen,
}: KiAssistentProps) {
  const { t } = useTranslation()
  const nachher = useKiNachher()
  const [art, setArt] = useState<KundenArt>(startArt)
  const [sprache, setSprache] = useState<Sprache | 'auto'>(mail?.sprache ?? 'auto')
  const [wunsch, setWunsch] = useState('')
  const [eingang, setEingang] = useState(startEingang)
  const [anhaenge, setAnhaenge] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const [ki, setKi] = useState<KiEntwurf | null>(null)
  const [betreff, setBetreff] = useState('')
  const [text, setText] = useState('')
  const [wuensche, setWuensche] = useState<string[]>([])
  const [aenderung, setAenderung] = useState('')
  const [weiter, setWeiter] = useState(false)

  async function schreiben(neuerWunsch?: string) {
    setLaeuft(true)
    try {
      const liste = neuerWunsch ? [...wuensche, neuerWunsch] : wuensche
      const r = await kiEntwurf({
        art,
        bezug,
        ...(sprache === 'auto' ? {} : { sprache }),
        // Beim Überarbeiten ist der neue Wunsch der Auftrag, die früheren geben den Rahmen.
        wunsch: neuerWunsch ?? wunsch,
        eingang,
        bisher: ki && neuerWunsch ? { betreff, text } : null,
        wuensche: neuerWunsch ? wuensche : [],
        anhaenge,
      })
      setKi(r)
      setBetreff(r.betreff)
      setText(r.text)
      setWuensche(liste)
      setAenderung('')
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(false)
      nachher()
    }
  }

  if (weiter && ki) {
    return (
      <MailDialog
        titel={t('ki.assistent.mailTitel')}
        beschreibung={t('ki.assistent.mailBeschreibung')}
        vorlage={{
          an: mail?.an ?? ki.an ?? '',
          ...mail,
          art: mail?.art ?? `ki_${art}`,
          sprache: ki.sprache,
          betreff,
          text,
        }}
        dateien={dateien}
        onSchliessen={onSchliessen}
        onFertig={(w) => {
          kiStilLernen({ entwurf: ki.text, endfassung: w.text, art, wuensche, bezug })
        }}
      />
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('ki.assistent.titel')}
        beschreibung={t('ki.assistent.beschreibung')}
        className="max-w-2xl"
        fuss={
          ki ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(`${betreff}\n\n${text}`)
                  melde('ok', { de: 'Kopiert', fr: 'Copié' })
                }}
              >
                <Copy />
                {t('ki.assistent.kopieren')}
              </Button>
              <Button
                onClick={() => {
                  setWeiter(true)
                }}
              >
                <Mail />
                {t('ki.assistent.alsMail')}
              </Button>
            </>
          ) : (
            <Button laedt={laeuft} onClick={() => void schreiben()}>
              <Sparkles />
              {t('ki.assistent.schreiben')}
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <KiHinweis />
          {!ki ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Feld id="ki-art" label={t('ki.assistent.art')}>
                  <Auswahl
                    id="ki-art"
                    value={art}
                    onValueChange={(w) => {
                      setArt(w as KundenArt)
                    }}
                    optionen={KUNDEN_ARTEN.map((a) => ({ wert: a, text: t(`ki.art.${a}`) }))}
                  />
                </Feld>
                <Feld id="ki-sprache" label={t('ki.assistent.sprache')}>
                  <Auswahl
                    id="ki-sprache"
                    value={sprache}
                    onValueChange={(w) => {
                      setSprache(w as Sprache | 'auto')
                    }}
                    optionen={[
                      { wert: 'auto', text: t('ki.assistent.spracheKunde') },
                      { wert: 'de', text: 'Deutsch' },
                      { wert: 'fr', text: 'Français' },
                    ]}
                  />
                </Feld>
              </div>
              <Feld id="ki-wunsch" label={t('ki.assistent.wunsch')} hinweis={t('ki.assistent.wunschHilfe')}>
                <Textarea
                  id="ki-wunsch"
                  rows={3}
                  autoFocus
                  value={wunsch}
                  placeholder={t(`ki.assistent.beispiel.${art}`)}
                  onChange={(e) => {
                    setWunsch(e.target.value)
                  }}
                />
              </Feld>
              {(art === 'antwort' || eingang) && (
                <Feld id="ki-eingang" label={t('ki.assistent.eingang')} hinweis={t('ki.assistent.eingangHilfe')}>
                  <Textarea
                    id="ki-eingang"
                    rows={5}
                    value={eingang}
                    onChange={(e) => {
                      setEingang(e.target.value)
                    }}
                  />
                </Feld>
              )}
              {bezug && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={anhaenge}
                    onCheckedChange={(an) => {
                      setAnhaenge(an === true)
                    }}
                  />
                  {t('ki.assistent.anhaenge')}
                </label>
              )}
            </>
          ) : (
            <>
              <Feld id="ki-betreff" label={t('ausgang.betreff')}>
                <Input
                  id="ki-betreff"
                  value={betreff}
                  onChange={(e) => {
                    setBetreff(e.target.value)
                  }}
                />
              </Feld>
              <Feld id="ki-text" label={t('ausgang.text')}>
                <Textarea
                  id="ki-text"
                  rows={14}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                  }}
                />
              </Feld>
              {ki.hinweise.length > 0 && (
                <ul className="bg-warn-soft text-warn flex flex-col gap-1 rounded-lg px-3 py-2 text-xs">
                  {ki.hinweise.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
              {(ki.anhaenge.gelesen.length > 0 || ki.anhaenge.uebersprungen.length > 0) && (
                <p className="text-muted-foreground text-xs">
                  {t('ki.assistent.gelesen', { liste: ki.anhaenge.gelesen.join(', ') || '–' })}
                  {ki.anhaenge.uebersprungen.length > 0 &&
                    ` · ${t('ki.assistent.uebersprungen', { liste: ki.anhaenge.uebersprungen.join(', ') })}`}
                </p>
              )}
              <div className="bg-surface-2 flex flex-col gap-2 rounded-lg border p-3">
                <div className="text-xs font-medium">{t('ki.assistent.ueberarbeiten')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {SCHNELL.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="secondary"
                      disabled={laeuft}
                      onClick={() => void schreiben(t(`ki.assistent.schnell.${s}`))}
                    >
                      {t(`ki.assistent.schnell.${s}`)}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    aria-label={t('ki.assistent.aenderung')}
                    placeholder={t('ki.assistent.aenderung')}
                    value={aenderung}
                    onChange={(e) => {
                      setAenderung(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && aenderung.trim()) void schreiben(aenderung.trim())
                    }}
                  />
                  <Button
                    variant="secondary"
                    laedt={laeuft}
                    disabled={!aenderung.trim()}
                    onClick={() => void schreiben(aenderung.trim())}
                  >
                    <RefreshCw />
                    {t('ki.assistent.anpassen')}
                  </Button>
                </div>
                {wuensche.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {t('ki.assistent.bisherigeWuensche', { liste: wuensche.join(' · ') })}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
