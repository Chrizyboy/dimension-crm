import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAktion } from '../hooks/useAktion'
import { useTeam } from '../hooks/useTeam'
import { formatAhv, formatIban, probezeitVorschlag } from '../lib/akte'
import { akteSchema } from '../schema'
import { akteSpeichern } from '../services/akte'
import type { PersonalAkte } from '../types'
import { ANSTELLUNG, PERSOENLICH, zuWerten, type AkteFeld } from './akteFelder'

const KEINE = '__keine__'

/**
 * Personal-Akte bearbeiten, in zwei Teilen: «Anstellung» (Vorgesetzt, Vertrag, Probezeit, Pensum, Ferien,
 * Kündigungsfrist, Austritt, Notiz) nur mit Recht «personal»; «Persönlich» (Adresse, Bewilligung, AHV, IBAN,
 * Notfallkontakt, Grössen) auch die Person selbst. Die Datenbank hält die Rechte ein. Lohn bleibt in AbaNinja,
 * hier steht er nur zur Info (eigener Abschnitt).
 */
export function AkteDialog({
  personId,
  akte,
  teil,
  onSchliessen,
}: {
  personId: string
  akte: PersonalAkte | null
  teil: 'anstellung' | 'persoenlich'
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const team = useTeam()
  const listen = {
    personal_vertragsart: useAuswahl('personal_vertragsart'),
    personal_bewilligung: useAuswahl('personal_bewilligung'),
    personal_zivilstand: useAuswahl('personal_zivilstand'),
  }
  const felder = teil === 'anstellung' ? ANSTELLUNG : PERSOENLICH
  const [w, setW] = useState<Record<string, string>>(() =>
    Object.fromEntries(felder.map((f) => [f.k, akte?.[f.k] == null ? '' : String(akte[f.k])])),
  )
  const werte = zuWerten(felder, w)
  const pruefung = akteSchema.safeParse(werte)
  const fehlerFelder = new Set(pruefung.success ? [] : pruefung.error.issues.map((i) => String(i.path[0])))
  const befristet = listen.personal_vertragsart.finde(w.vertragsart)?.eigenschaften.befristet === true
  const mitAblauf = listen.personal_bewilligung.finde(w.bewilligung)?.eigenschaften.ablauf !== false

  function setze(k: string, v: string) {
    const neu = { ...w, [k]: v }
    // Probezeit vorschlagen, sobald der Eintritt steht (3 Monate, OR 335b); ändern bleibt möglich.
    if (k === 'eintritt' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !w.probezeit_bis) neu.probezeit_bis = probezeitVorschlag(v)
    setW(neu)
  }

  async function speichern() {
    const daten = { ...werte, person_id: personId }
    if (daten.ahv_nr) daten.ahv_nr = formatAhv(daten.ahv_nr)
    if (daten.iban) daten.iban = daten.iban.replace(/\s/g, '').toUpperCase()
    const ok = await aus(() => akteSpeichern(daten, akte?.id ?? null), { de: 'Gespeichert', fr: 'Enregistré' })
    if (ok) onSchliessen()
  }

  function eingabe(f: AkteFeld) {
    const id = `pa-${f.k}`
    const wert = w[f.k] ?? ''
    if (f.typ === 'person' || f.typ === 'liste') {
      const optionen =
        f.typ === 'person'
          ? (team.data ?? []).filter((p) => p.id !== personId).map((p) => ({ wert: p.id, text: p.name }))
          : listen[f.liste as keyof typeof listen].werte.map((x) => ({
              wert: x.schluessel,
              text: listen[f.liste as keyof typeof listen].text(x.schluessel),
            }))
      return (
        <Auswahl
          id={id}
          value={wert || KEINE}
          onValueChange={(v) => {
            setze(f.k, v === KEINE ? '' : v)
          }}
          optionen={[{ wert: KEINE, text: '–' }, ...optionen]}
        />
      )
    }
    if (f.typ === 'lang') {
      return (
        <Textarea
          id={id}
          rows={2}
          value={wert}
          onChange={(e) => {
            setze(f.k, e.target.value)
          }}
        />
      )
    }
    return (
      <Input
        id={id}
        type={f.typ === 'datum' ? 'date' : 'text'}
        {...(f.typ === 'zahl' ? { inputMode: 'decimal' as const } : {})}
        {...(f.k.includes('telefon') ? { inputMode: 'tel' as const } : {})}
        {...(f.k === 'mail_privat' ? { inputMode: 'email' as const } : {})}
        {...(f.platzhalter ? { placeholder: f.platzhalter } : {})}
        value={wert}
        onChange={(e) => {
          setze(f.k, e.target.value)
        }}
        onBlur={() => {
          if (f.k === 'iban' && wert) setze('iban', formatIban(wert))
          if (f.k === 'ahv_nr' && wert) setze('ahv_nr', formatAhv(wert))
        }}
      />
    )
  }

  const sichtbar = felder.filter(
    (f) => (f.k !== 'befristet_bis' || befristet || w.befristet_bis) && (f.k !== 'bewilligung_bis' || mitAblauf),
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(teil === 'anstellung' ? 'team.akte.anstellung' : 'team.akte.persoenlich')}
        beschreibung={t(teil === 'anstellung' ? 'team.akte.textAnstellung' : 'team.akte.textPersoenlich')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!pruefung.success}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {sichtbar.map((f) => (
            <Feld
              key={f.k}
              id={`pa-${f.k}`}
              label={t(`team.akte.${f.k}`)}
              {...(f.k === 'notiz' ? { hinweis: t('team.akte.notizHinweis') } : {})}
              {...(fehlerFelder.has(f.k) && w[f.k] ? { fehler: t(`team.akte.fehler.${f.k}`) } : {})}
              {...(f.breit ? { className: 'sm:col-span-2' } : {})}
            >
              {eingabe(f)}
            </Feld>
          ))}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
