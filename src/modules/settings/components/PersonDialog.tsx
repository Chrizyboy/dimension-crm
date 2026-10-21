import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Trenner } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld, Label } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import type { ModulMeta } from '@/types/modul'
import { useBenutzerAenderung } from '../hooks/useBenutzer'
import { ladeEin, speicherePerson } from '../services/benutzer'
import type { Person, Personenstatus, Rolle, Standort } from '../types'
import { BereicheAuswahl } from './BereicheAuswahl'
import { RechteAuswahl } from './RechteAuswahl'

interface PersonDialogProps {
  person: Person | null
  status: Personenstatus | null
  onSchliessen: () => void
  rollen: Rolle[]
  standorte: Standort[]
  module: readonly ModulMeta[]
}

/**
 * Seitenblatt zum Bearbeiten einer Person: Rolle, Zusatzrechte, sichtbare Bereiche, aktiv.
 * Die Liste setzt `key` auf die Person, damit der Entwurf bei jeder neuen Person frisch beginnt.
 */
export function PersonDialog({ person, status, onSchliessen, rollen, standorte, module }: PersonDialogProps) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const [entwurf, setEntwurf] = useState<Person | null>(person)
  const speichern = useBenutzerAenderung((p: Person) =>
    speicherePerson(p.id, {
      name: p.name,
      rolle: p.rolle,
      rechte: p.rechte,
      bereiche: p.bereiche,
      standort_id: p.standort_id,
      aktiv: p.aktiv,
      sprache: p.sprache,
    }),
  )
  const einladen = useBenutzerAenderung(ladeEin)

  if (!entwurf) return null
  const rolle = rollen.find((r) => r.schluessel === entwurf.rolle)
  const eigeneBereiche = entwurf.bereiche.length > 0
  const setze = (aenderung: Partial<Person>) => {
    setEntwurf({ ...entwurf, ...aenderung })
  }

  async function sichern() {
    if (!entwurf) return
    try {
      await speichern.mutateAsync(entwurf)
      melde('ok', { de: 'Gespeichert', fr: 'Enregistré' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'person-speichern')
      // Die Datenbank verhindert, dass die letzte Admin-Person ihr Recht verliert.
      const letzter = f instanceof Object && 'code' in f && f.code === 'P0001'
      melde(
        'kritisch',
        letzter
          ? {
              de: 'Mindestens eine Person braucht Administrationsrechte',
              fr: 'Au moins une personne doit rester administratrice',
            }
          : { de: 'Nicht gespeichert', fr: 'Non enregistré' },
      )
    }
  }

  async function erneutEinladen() {
    if (!entwurf?.email) return
    try {
      await einladen.mutateAsync({
        name: entwurf.name,
        email: entwurf.email,
        rolle: entwurf.rolle,
        standort_id: entwurf.standort_id,
        sprache: entwurf.sprache === 'fr' ? 'fr' : 'de',
      })
      melde('ok', { de: `Einladung an ${entwurf.email} gesendet`, fr: `Invitation envoyée à ${entwurf.email}` })
    } catch (f) {
      meldeFehler(f, 'einladen')
      melde('kritisch', { de: 'Einladung nicht gesendet', fr: 'Invitation non envoyée' })
    }
  }

  return (
    <Dialog
      open={person !== null}
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={entwurf.name}
        beschreibung={entwurf.email ?? t('benutzer.ohneEmail')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void sichern()}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Feld id="person-name" label={t('benutzer.name')}>
            <Input
              id="person-name"
              value={entwurf.name}
              onChange={(e) => {
                setze({ name: e.target.value })
              }}
            />
          </Feld>
          <div className="grid gap-4 sm:grid-cols-2">
            <Feld
              id="person-rolle"
              label={t('benutzer.rolle')}
              hinweis={sprache === 'fr' ? (rolle?.beschreibung_fr ?? '') : (rolle?.beschreibung_de ?? '')}
            >
              <Auswahl
                id="person-rolle"
                value={entwurf.rolle}
                onValueChange={(w) => {
                  setze({ rolle: w })
                }}
                optionen={rollen.map((r) => ({ wert: r.schluessel, text: sprache === 'fr' ? r.name_fr : r.name_de }))}
              />
            </Feld>
            <Feld id="person-standort" label={t('benutzer.standort')}>
              <Auswahl
                id="person-standort"
                value={entwurf.standort_id ?? ''}
                onValueChange={(w) => {
                  setze({ standort_id: w || null })
                }}
                platzhalter={t('benutzer.keinStandort')}
                optionen={standorte.map((s) => ({ wert: s.id, text: s.name }))}
              />
            </Feld>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="person-aktiv"
              checked={entwurf.aktiv}
              onCheckedChange={(aktiv) => {
                setze({ aktiv })
              }}
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="person-aktiv">{t('benutzer.aktiv')}</Label>
              <span className="text-muted-foreground text-xs">{t('benutzer.aktivText')}</span>
            </div>
          </div>

          <Trenner />
          <section className="flex flex-col gap-3" aria-labelledby="person-rechte-titel">
            <h3 id="person-rechte-titel" className="text-sm font-semibold">
              {t('benutzer.zusatzrechte')}
            </h3>
            <RechteAuswahl
              id="person-recht"
              wert={entwurf.rechte}
              vonRolle={rolle?.rechte ?? []}
              onChange={(rechte) => {
                setze({ rechte })
              }}
            />
          </section>

          <Trenner />
          <section className="flex flex-col gap-3" aria-labelledby="person-bereiche-titel">
            <h3 id="person-bereiche-titel" className="text-sm font-semibold">
              {t('benutzer.bereiche')}
            </h3>
            <div className="flex items-center gap-3">
              <Switch
                id="person-eigene-bereiche"
                checked={eigeneBereiche}
                onCheckedChange={(an) => {
                  // Beim Einschalten mit der Auswahl der Rolle starten, damit man nur ergänzt oder streicht.
                  setze({ bereiche: an ? (rolle?.bereiche.length ? rolle.bereiche : module.map((m) => m.id)) : [] })
                }}
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="person-eigene-bereiche">{t('benutzer.eigeneBereiche')}</Label>
                {!eigeneBereiche && (
                  <span className="text-muted-foreground text-xs">
                    {rolle?.bereiche.length
                      ? t('benutzer.bereicheWieRolle', { count: rolle.bereiche.length })
                      : t('benutzer.bereicheAlle')}
                  </span>
                )}
              </div>
            </div>
            {eigeneBereiche && (
              <BereicheAuswahl
                id="person-bereich"
                module={module}
                wert={entwurf.bereiche}
                onChange={(bereiche) => {
                  setze({ bereiche })
                }}
              />
            )}
          </section>

          {entwurf.email && (status === 'eingeladen' || status === 'bereit') && (
            <>
              <Trenner />
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs">
                  {t('benutzer.einladenHinweis', { email: entwurf.email })}
                </p>
                <Button variant="secondary" laedt={einladen.isPending} onClick={() => void erneutEinladen()}>
                  <Send />
                  {status === 'eingeladen' ? t('benutzer.erneutEinladen') : t('benutzer.einladungSenden')}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
