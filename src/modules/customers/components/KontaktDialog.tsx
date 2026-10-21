import { AlertTriangle, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { feldFehler } from '@/lib/formular'
import { formatKundennummer } from '@/lib/kontakt'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useKontaktAenderung } from '../hooks/useKunden'
import { kontaktSchema, LEERER_KONTAKT, type KontaktEingabe } from '../schema'
import { aendereKontakt, legeKontaktAn, pruefeDubletten } from '../services/kundenakte'
import type { Dublette, Kontakt } from '../types'

export interface KontaktDialogProps {
  /** Vorbelegung für neue Kontakte (Kunden: «privat», Adressbuch: gewählter Filter). */
  kontaktart: string
  /** Bestehender Kontakt zum Bearbeiten; ohne wird ein neuer angelegt. */
  kontakt?: Kontakt
  /** Mit ID, wenn ein Kontakt gespeichert oder eine Dublette gewählt wurde. */
  onSchliessen: (id?: string) => void
}

function ausKontakt(k: Kontakt): KontaktEingabe {
  return {
    ...LEERER_KONTAKT,
    art: k.art === 'firma' ? 'firma' : 'person',
    kontaktart: k.kontaktart,
    anrede: k.anrede ?? '',
    vorname: k.vorname ?? '',
    nachname: k.nachname ?? '',
    firma: k.firma ?? '',
    email: k.email ?? '',
    telefon: k.telefon ?? '',
    sprache: k.sprache === 'fr' ? 'fr' : 'de',
    werbesperre: k.werbesperre,
    notiz: k.notiz ?? '',
  }
}

/**
 * Kontakt anlegen oder ändern. Vor dem Speichern sucht die Datenbank nach gleicher Mail, Telefon
 * oder gleichem Namen (V233 V170); Treffer werden gezeigt, damit niemand doppelt erfasst wird.
 */
export default function KontaktDialog({ kontaktart, kontakt, onSchliessen }: KontaktDialogProps) {
  const { t } = useTranslation()
  const arten = useAuswahl('kontaktart')
  const [werte, setWerte] = useState<KontaktEingabe>(() =>
    kontakt ? ausKontakt(kontakt) : { ...LEERER_KONTAKT, kontaktart },
  )
  const [fehler, setFehler] = useState<Partial<Record<keyof KontaktEingabe, string>>>({})
  const [dubletten, setDubletten] = useState<Dublette[] | null>(null)
  const speichern = useKontaktAenderung(async (e: KontaktEingabe) => {
    if (kontakt) {
      await aendereKontakt(kontakt.id, e)
      return kontakt.id
    }
    return legeKontaktAn(e)
  })
  const neu = !kontakt

  function setze<K extends keyof KontaktEingabe>(feld: K, wert: KontaktEingabe[K]) {
    setWerte((w) => ({ ...w, [feld]: wert }))
    // Nach einer Änderung wird neu geprüft; die alte Warnung passt sonst nicht mehr.
    if (feld === 'email' || feld === 'telefon' || feld === 'vorname' || feld === 'nachname' || feld === 'firma')
      setDubletten(null)
  }

  async function absenden() {
    const geprueft = kontaktSchema.safeParse(werte)
    if (!geprueft.success) {
      setFehler(feldFehler(geprueft.error.issues, t))
      return
    }
    setFehler({})
    try {
      // Erster Klick prüft auf Dubletten; wer die Warnung gesehen hat, speichert mit dem zweiten.
      if (dubletten === null) {
        const treffer = await pruefeDubletten(geprueft.data, kontakt?.id)
        if (treffer.length > 0) {
          setDubletten(treffer)
          return
        }
      }
      const id = await speichern.mutateAsync(geprueft.data)
      melde('ok', neu ? { de: 'Kontakt angelegt', fr: 'Contact créé' } : { de: 'Gespeichert', fr: 'Enregistré' })
      onSchliessen(id)
    } catch (f) {
      meldeFehler(f, 'kontakt')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const textfeld = (
    feld: 'anrede' | 'vorname' | 'nachname' | 'firma' | 'strasse' | 'plz' | 'ort',
    pflicht = false,
    typ = 'text',
  ) => (
    <Feld id={`kontakt-${feld}`} label={t(`kontakt.feld.${feld}`)} fehler={fehler[feld]} pflicht={pflicht}>
      <Input
        id={`kontakt-${feld}`}
        type={typ}
        value={werte[feld]}
        autoComplete="off"
        aria-invalid={fehler[feld] ? true : undefined}
        onChange={(e) => {
          setze(feld, e.target.value)
        }}
      />
    </Feld>
  )

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={neu ? t('kontakt.neuTitel') : t('kontakt.bearbeitenTitel')}
        className="max-w-xl"
        fuss={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                onSchliessen()
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              laedt={speichern.isPending}
              onClick={() => void absenden()}
              variant={dubletten?.length ? 'accent' : 'primary'}
            >
              <Save />
              {dubletten?.length ? t('kontakt.trotzdemSpeichern') : t('allgemein.speichern')}
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
          {dubletten && dubletten.length > 0 && (
            <div role="alert" className="bg-warn-soft flex flex-col gap-2 rounded-lg p-3 text-sm">
              <p className="text-warn flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" aria-hidden="true" />
                {t('kontakt.dublettenTitel', { count: dubletten.length })}
              </p>
              <ul className="flex flex-col gap-1">
                {dubletten.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="zahlen text-muted-foreground">{formatKundennummer(d.kundennummer)}</span>{' '}
                      {d.name}
                      {d.ort ? `, ${d.ort}` : ''}
                      <span className="text-muted-foreground"> · {t(`kontakt.grund.${d.grund}`)}</span>
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        onSchliessen(d.id)
                      }}
                    >
                      {t('kontakt.dubletteOeffnen')}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Feld id="kontakt-art" label={t('kontakt.feld.art')}>
              <Auswahl
                id="kontakt-art"
                value={werte.art}
                onValueChange={(w) => {
                  setze('art', w === 'firma' ? 'firma' : 'person')
                }}
                optionen={[
                  { wert: 'person', text: t('kontakt.art.person') },
                  { wert: 'firma', text: t('kontakt.art.firma') },
                ]}
              />
            </Feld>
            <Feld id="kontakt-kontaktart" label={t('kontakt.feld.kontaktart')}>
              <Auswahl
                id="kontakt-kontaktart"
                value={werte.kontaktart}
                onValueChange={(w) => {
                  setze('kontaktart', w)
                }}
                optionen={arten.werte.map((a) => ({ wert: a.schluessel, text: arten.text(a.schluessel) }))}
              />
            </Feld>
          </div>

          {werte.art === 'firma' && textfeld('firma', true)}
          <div className="grid gap-4 sm:grid-cols-[6rem_1fr_1fr]">
            {textfeld('anrede')}
            {textfeld('vorname')}
            {textfeld('nachname', werte.art === 'person')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld
              id="kontakt-telefon"
              label={t('kontakt.feld.telefon')}
              fehler={fehler.telefon}
              hinweis="+41 76 123 45 67"
            >
              <Input
                id="kontakt-telefon"
                type="tel"
                value={werte.telefon}
                aria-invalid={fehler.telefon ? true : undefined}
                onChange={(e) => {
                  setze('telefon', e.target.value)
                }}
              />
            </Feld>
            <Feld id="kontakt-email" label={t('kontakt.feld.email')} fehler={fehler.email}>
              <Input
                id="kontakt-email"
                type="email"
                value={werte.email}
                aria-invalid={fehler.email ? true : undefined}
                onChange={(e) => {
                  setze('email', e.target.value)
                }}
              />
            </Feld>
          </div>

          {neu && (
            <div className="grid gap-4 sm:grid-cols-[1fr_6rem_1fr]">
              {textfeld('strasse')}
              {textfeld('plz')}
              {textfeld('ort')}
            </div>
          )}

          <div className="grid items-end gap-4 sm:grid-cols-2">
            <Feld id="kontakt-sprache" label={t('kontakt.feld.sprache')}>
              <Auswahl
                id="kontakt-sprache"
                value={werte.sprache}
                onValueChange={(w) => {
                  setze('sprache', w === 'fr' ? 'fr' : 'de')
                }}
                optionen={[
                  { wert: 'de', text: 'Deutsch' },
                  { wert: 'fr', text: 'Français' },
                ]}
              />
            </Feld>
            <label className="flex h-8 items-center gap-2 text-sm">
              <Switch
                checked={werte.werbesperre}
                onCheckedChange={(w) => {
                  setze('werbesperre', w)
                }}
              />
              {t('kontakt.feld.werbesperre')}
            </label>
          </div>

          <Feld id="kontakt-notiz" label={t('kontakt.feld.notiz')}>
            <Textarea
              id="kontakt-notiz"
              rows={3}
              value={werte.notiz}
              onChange={(e) => {
                setze('notiz', e.target.value)
              }}
            />
          </Feld>
          {/* Enter in einem Feld speichert, wie gewohnt. */}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </DialogInhalt>
    </Dialog>
  )
}
