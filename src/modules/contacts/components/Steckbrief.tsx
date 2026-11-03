import { Pencil, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { useAdressbuchAenderung } from '../hooks/useAdressbuch'
import { feldAlsText, feldAnzeige, feldEingabe, rollenfelder } from '../lib/rollen'
import { entferneRolle, speichereRolle } from '../services/partnerTeile'
import type { PartnerRolle, Rollenfeld } from '../types'
import { Box, Leer, Zeile } from './Box'

/** Wert eines Felds: Webseiten und Mails als Link, Telefon zum Anrufen. */
function Wert({ feld, wert }: { feld: Rollenfeld; wert: unknown }) {
  const text = feldAnzeige(feld, wert)
  if (!text) return <span className="text-muted-foreground">–</span>
  if (feld.t === 'url') {
    return (
      <a
        href={String(wert)}
        target="_blank"
        rel="noreferrer noopener"
        className="text-accent-ink break-all hover:underline"
      >
        {text.replace(/^https?:\/\//, '')}
      </a>
    )
  }
  if (feld.t === 'email')
    return (
      <a href={`mailto:${text}`} className="hover:underline">
        {text}
      </a>
    )
  if (feld.t === 'telefon')
    return (
      <a href={`tel:${String(wert)}`} className="zahlen hover:underline">
        {text}
      </a>
    )
  return <>{text}</>
}

/** Steckbrief einer Rolle: ihre Felder (aus der Auswahlliste) mit Werten, Knopf zum Ändern. */
export function Steckbrief({ rolle, onBearbeiten }: { rolle: PartnerRolle; onBearbeiten: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const rollen = useAuswahl('partnerrolle')
  const felder = rollenfelder(rollen.finde(rolle.rolle))
  const gefuellt = felder.filter((f) => feldAnzeige(f, rolle.angaben[f.k]) !== null)
  return (
    <Box
      titel={t('adressbuch.akte.steckbrief', { rolle: rollen.text(rolle.rolle) })}
      rechts={
        <Button size="sm" variant="ghost" className="h-7" onClick={onBearbeiten}>
          <Pencil />
          {t('allgemein.bearbeiten')}
        </Button>
      }
    >
      {gefuellt.length === 0 ? (
        <Leer>{t('adressbuch.akte.steckbriefLeer')}</Leer>
      ) : (
        <dl className="flex flex-col gap-1.5">
          {gefuellt.map((f) => (
            <Zeile key={f.k} label={sprache === 'fr' ? f.fr : f.de}>
              <Wert feld={f} wert={rolle.angaben[f.k]} />
            </Zeile>
          ))}
        </dl>
      )}
    </Box>
  )
}

/**
 * Rolle hinzufügen oder ihre Angaben ändern. Welche Felder es gibt, steht in der Auswahlliste «partnerrolle»;
 * Lieferant und Subunternehmer erscheinen danach auch im Einkauf bzw. in den Projekten (Datenbank-Trigger).
 */
export function RolleDialog({
  kontaktId,
  rolle,
  vorhanden,
  onSchliessen,
}: {
  kontaktId: string
  rolle: PartnerRolle | null
  vorhanden: string[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const rollen = useAuswahl('partnerrolle')
  const waehlbar = rollen.werte.filter((r) => !vorhanden.includes(r.schluessel))
  const [wahl, setWahl] = useState(rolle?.rolle ?? waehlbar[0]?.schluessel ?? '')
  const felder = rollenfelder(rollen.finde(wahl))
  // Nur Geändertes steht in `texte`; sonst gilt der gespeicherte Wert (die Felder laden evtl. erst nach dem Öffnen).
  const [texte, setTexte] = useState<Record<string, string>>({})
  const text = (f: Rollenfeld) => texte[f.k] ?? (wahl === rolle?.rolle ? feldAlsText(f, rolle.angaben[f.k]) : '')
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const speichern = useAdressbuchAenderung((angaben: Record<string, unknown>) =>
    speichereRolle(kontaktId, wahl, angaben, rolle?.id),
  )
  const entfernen = useAdressbuchAenderung((id: string) => entferneRolle(id))

  async function absenden() {
    const angaben: Record<string, unknown> = { ...(rolle?.angaben ?? {}) }
    const f: Record<string, string> = {}
    for (const feld of felder) {
      const r = feldEingabe(feld, text(feld))
      if (r.fehler) f[feld.k] = t('adressbuch.akte.feldUngueltig')
      angaben[feld.k] = r.wert
    }
    setFehler(f)
    if (Object.keys(f).length > 0 || !wahl) return
    try {
      await speichern.mutateAsync(Object.fromEntries(Object.entries(angaben).filter(([, v]) => v !== null)))
      melde('ok', { de: 'Gespeichert', fr: 'Enregistré' })
      onSchliessen()
    } catch (e) {
      meldeFehler(e, 'adressbuch.rolle')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  async function weg() {
    if (!rolle) return
    try {
      await entfernen.mutateAsync(rolle.id)
      melde('ok', { de: 'Rolle entfernt', fr: 'Rôle retiré' })
      onSchliessen()
    } catch (e) {
      meldeFehler(e, 'adressbuch.rolle')
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={
          rolle
            ? t('adressbuch.akte.rolleBearbeiten', { rolle: rollen.text(rolle.rolle) })
            : t('adressbuch.akte.rolleNeu')
        }
        fuss={
          <>
            {rolle && (
              <Button variant="ghost" className="mr-auto" laedt={entfernen.isPending} onClick={() => void weg()}>
                <Trash2 />
                {t('adressbuch.akte.rolleEntfernen')}
              </Button>
            )}
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} disabled={!wahl} onClick={() => void absenden()}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!rolle && (
            <Feld id="rolle-wahl" label={t('adressbuch.akte.rolle')}>
              <Auswahl
                id="rolle-wahl"
                value={wahl}
                onValueChange={(w) => {
                  setWahl(w)
                  setTexte({})
                }}
                optionen={waehlbar.map((r) => ({ wert: r.schluessel, text: rollen.text(r.schluessel) }))}
              />
            </Feld>
          )}
          {felder.map((f) => {
            const id = `rolle-${f.k}`
            const props = {
              id,
              value: text(f),
              onChange: (e: { target: { value: string } }) => {
                setTexte((x) => ({ ...x, [f.k]: e.target.value }))
              },
            }
            return (
              <Feld key={f.k} id={id} label={sprache === 'fr' ? f.fr : f.de} fehler={fehler[f.k]}>
                {f.t === 'lang' ? (
                  <Textarea rows={3} {...props} />
                ) : (
                  <Input
                    {...props}
                    type={f.t === 'email' ? 'email' : f.t === 'datum' ? 'date' : f.t === 'telefon' ? 'tel' : 'text'}
                    inputMode={['zahl', 'prozent', 'chf'].includes(f.t) ? 'decimal' : undefined}
                  />
                )}
              </Feld>
            )
          })}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
