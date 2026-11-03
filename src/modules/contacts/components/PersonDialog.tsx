import { useQuery } from '@tanstack/react-query'
import { Save, Trash2, UserPlus } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld, Label } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { entferneZugehoerigkeit, speichereZugehoerigkeit, type Zugehoerigkeit } from '@/services/zugehoerigkeiten'
import { useAdressbuchAenderung } from '../hooks/useAdressbuch'
import { legePersonAn, suchePersonen } from '../services/anlegen'

type Merker = 'hauptkontakt' | 'unterschreibt' | 'rechnungen' | 'vorOrt'
const MERKER: Merker[] = ['hauptkontakt', 'unterschreibt', 'rechnungen', 'vorOrt']

/**
 * Ansprechperson hinzufügen (neu erfassen oder eine bestehende Person verknüpfen) oder ändern: Funktion, direkte
 * Nummer, bevorzugter Weg und Merker. Entfernen legt nur die Verbindung in den Papierkorb, die Person bleibt.
 */
export function PersonDialog({
  firmaId,
  sprache,
  person,
  onSchliessen,
}: {
  firmaId: string
  sprache: 'de' | 'fr'
  person: Zugehoerigkeit | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const [w, setW] = useState({
    vorname: '',
    nachname: '',
    funktion: person?.funktion ?? '',
    telefon: person?.telefonDirekt ?? '',
    email: person?.emailDirekt ?? '',
    bevorzugt: person?.bevorzugt ?? '',
    hauptkontakt: person?.hauptkontakt ?? false,
    unterschreibt: person?.unterschreibt ?? false,
    rechnungen: person?.rechnungen ?? false,
    vorOrt: person?.vorOrt ?? false,
  })
  const [bestehend, setBestehend] = useState<{ id: string; name: string } | null>(null)
  const suche = useDeferredValue(`${w.vorname} ${w.nachname}`.trim())
  const treffer = useQuery({
    queryKey: ['personen-suche', suche],
    queryFn: () => suchePersonen(suche),
    enabled: !person && !bestehend && suche.length >= 3,
  })
  const speichern = useAdressbuchAenderung(async () => {
    const merker = {
      hauptkontakt: w.hauptkontakt,
      unterschreibt: w.unterschreibt,
      rechnungen: w.rechnungen,
      vorOrt: w.vorOrt,
    }
    if (person) {
      await speichereZugehoerigkeit({
        id: person.id,
        personId: person.personId,
        firmaId,
        funktion: w.funktion,
        telefonDirekt: w.telefon,
        emailDirekt: w.email,
        bevorzugt: w.bevorzugt,
        ...merker,
      })
    } else if (bestehend) {
      await speichereZugehoerigkeit({
        personId: bestehend.id,
        firmaId,
        funktion: w.funktion,
        bevorzugt: w.bevorzugt,
        ...merker,
      })
    } else {
      await legePersonAn(firmaId, { ...w, sprache })
    }
  })
  const entfernen = useAdressbuchAenderung((id: string) => entferneZugehoerigkeit(id))
  const ohneName = !person && !bestehend && !w.vorname.trim() && !w.nachname.trim()

  async function absenden() {
    try {
      await speichern.mutateAsync(undefined)
      melde('ok', { de: 'Gespeichert', fr: 'Enregistré' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'adressbuch.person')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const feld = (
    k: 'vorname' | 'nachname' | 'funktion' | 'telefon' | 'email' | 'bevorzugt',
    label: string,
    typ = 'text',
  ) => (
    <Feld id={`person-${k}`} label={label}>
      <Input
        id={`person-${k}`}
        type={typ}
        value={w[k]}
        onChange={(e) => {
          setW((x) => ({ ...x, [k]: e.target.value }))
        }}
      />
    </Feld>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={person ? person.personName : t('adressbuch.akte.personNeu')}
        fuss={
          <>
            {person && (
              <Button
                variant="ghost"
                className="mr-auto"
                laedt={entfernen.isPending}
                onClick={() => {
                  void entfernen.mutateAsync(person.id).then(onSchliessen, (f: unknown) => {
                    meldeFehler(f, 'adressbuch.person')
                  })
                }}
              >
                <Trash2 />
                {t('adressbuch.akte.personEntfernen')}
              </Button>
            )}
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} disabled={ohneName} onClick={() => void absenden()}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!person && !bestehend && (
            <div className="grid gap-4 sm:grid-cols-2">
              {feld('vorname', t('adressbuch.feld.vorname'))}
              {feld('nachname', t('adressbuch.feld.nachname'))}
            </div>
          )}
          {!person && !bestehend && (treffer.data?.length ?? 0) > 0 && (
            <div className="bg-muted/50 flex flex-col gap-1 rounded-md p-2 text-sm">
              <span className="text-muted-foreground text-xs">{t('adressbuch.akte.personGibtEs')}</span>
              {treffer.data?.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="hover:bg-surface flex items-center gap-2 rounded px-2 py-1 text-left"
                  onClick={() => {
                    setBestehend({ id: p.id, name: p.name })
                  }}
                >
                  <UserPlus className="size-3.5" aria-hidden="true" />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{p.email ?? p.telefon ?? ''}</span>
                </button>
              ))}
            </div>
          )}
          {bestehend && (
            <p className="text-sm">
              {t('adressbuch.akte.personVerknuepfen', { name: bestehend.name })}{' '}
              <button
                type="button"
                className="text-accent-ink hover:underline"
                onClick={() => {
                  setBestehend(null)
                }}
              >
                {t('adressbuch.akte.personDochNeu')}
              </button>
            </p>
          )}
          {feld('funktion', t('adressbuch.feld.funktion'))}
          {!bestehend && (
            <div className="grid gap-4 sm:grid-cols-2">
              {feld('telefon', person ? t('adressbuch.feld.telefonDirekt') : t('adressbuch.feld.telefon'), 'tel')}
              {feld('email', person ? t('adressbuch.feld.emailDirekt') : t('adressbuch.feld.email'), 'email')}
            </div>
          )}
          {feld('bevorzugt', t('adressbuch.feld.bevorzugt'))}
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="text-foreground mb-1 text-xs font-medium">{t('adressbuch.akte.merker')}</legend>
            {MERKER.map((m) => (
              <span key={m} className="flex items-center gap-2">
                <Checkbox
                  id={`person-${m}`}
                  checked={w[m]}
                  onCheckedChange={(c) => {
                    setW((x) => ({ ...x, [m]: c === true }))
                  }}
                />
                <Label htmlFor={`person-${m}`}>{t(`zugehoerigkeit.${m}`)}</Label>
              </span>
            ))}
          </fieldset>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
