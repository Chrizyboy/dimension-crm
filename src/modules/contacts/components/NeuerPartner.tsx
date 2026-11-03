import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Save } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatKundennummer } from '@/lib/kontakt'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { useAdressbuchAenderung } from '../hooks/useAdressbuch'
import { feldEingabe, normalisiereUid, rollenfelder, uidGueltig } from '../lib/rollen'
import { legePartnerAn, suchePartnerDubletten } from '../services/anlegen'
import type { NeuerPartnerEingabe } from '../types'
import { UidSuche } from './UidSuche'

type Text = 'name' | 'vorname' | 'email' | 'telefon' | 'strasse' | 'plz' | 'ort' | 'webseite' | 'uidNr' | 'rechtsform'
type PersonText = 'vorname' | 'nachname' | 'funktion' | 'telefon' | 'email'

/**
 * «Neuer Eintrag» im Adressbuch: Firma (mit Vorschlag aus dem UID-Register) oder Person, Rollen mit ihren
 * wichtigsten Angaben und die erste Ansprechperson. Vor dem Speichern warnt die Datenbank vor Doppelten.
 */
export default function NeuerPartner({
  rolle,
  onSchliessen,
}: {
  rolle: string | null
  onSchliessen: (id?: string) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const rollen = useAuswahl('partnerrolle')
  const [w, setW] = useState<Omit<NeuerPartnerEingabe, 'rollen' | 'angaben' | 'person'>>({
    art: 'firma',
    name: '',
    vorname: '',
    email: '',
    telefon: '',
    sprache,
    strasse: '',
    plz: '',
    ort: '',
    webseite: '',
    uidNr: '',
    rechtsform: '',
  })
  const [gewaehlt, setGewaehlt] = useState<string[]>(rolle ? [rolle] : [])
  const [angaben, setAngaben] = useState<Record<string, Record<string, string>>>({})
  const [person, setPerson] = useState({ vorname: '', nachname: '', funktion: '', telefon: '', email: '' })
  const pruefung = useDeferredValue({ name: w.name, email: w.email, telefon: w.telefon, uid: w.uidNr })
  const dubletten = useQuery({
    queryKey: ['partner-dubletten', pruefung],
    queryFn: () => suchePartnerDubletten(pruefung),
    enabled: pruefung.name.trim().length >= 3 || Boolean(pruefung.email) || Boolean(pruefung.uid),
  })
  const anlegen = useAdressbuchAenderung((e: NeuerPartnerEingabe) => legePartnerAn(e))
  const uidFehler =
    w.uidNr.trim() && !uidGueltig(normalisiereUid(w.uidNr)) ? t('adressbuch.feld.uidUngueltig') : undefined

  async function absenden() {
    if (!w.name.trim() || uidFehler) return
    const umgewandelt: Record<string, Record<string, unknown>> = {}
    for (const r of gewaehlt) {
      umgewandelt[r] = {}
      for (const f of rollenfelder(rollen.finde(r))) {
        const x = feldEingabe(f, angaben[r]?.[f.k] ?? '')
        if (x.wert !== null) umgewandelt[r][f.k] = x.wert
      }
    }
    try {
      const id = await anlegen.mutateAsync({
        ...w,
        uidNr: w.uidNr.trim() ? normalisiereUid(w.uidNr) : '',
        rollen: gewaehlt,
        angaben: umgewandelt,
        ...(w.art === 'firma' ? { person } : {}),
      })
      melde('ok', { de: 'Partner angelegt', fr: 'Partenaire créé' })
      onSchliessen(id)
    } catch (f) {
      meldeFehler(f, 'adressbuch.neu')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const feld = (k: Text, label: string, typ = 'text', fehler?: string) => (
    <Feld id={`neu-${k}`} label={label} fehler={fehler} pflicht={k === 'name'}>
      <Input
        id={`neu-${k}`}
        type={typ}
        value={w[k] ?? ''}
        onChange={(e) => {
          setW((x) => ({ ...x, [k]: e.target.value }))
        }}
      />
    </Feld>
  )
  const personFeld = (k: PersonText, label: string, typ = 'text') => (
    <Feld id={`neu-person-${k}`} label={label}>
      <Input
        id={`neu-person-${k}`}
        type={typ}
        value={person[k]}
        onChange={(e) => {
          setPerson((x) => ({ ...x, [k]: e.target.value }))
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
        art="seite"
        titel={t('adressbuch.neu')}
        beschreibung={t('adressbuch.neuDialog.text')}
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
            <Button laedt={anlegen.isPending} disabled={!w.name.trim()} onClick={() => void absenden()}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Filterchips
            einzeln
            beschriftung={t('adressbuch.neuDialog.art')}
            gewaehlt={[w.art]}
            onChange={(a) => {
              setW((x) => ({ ...x, art: a[0] === 'person' ? 'person' : 'firma' }))
            }}
            optionen={[
              { wert: 'firma', text: t('adressbuch.neuDialog.firma') },
              { wert: 'person', text: t('adressbuch.neuDialog.person') },
            ]}
          />
          {w.art === 'firma' ? (
            <div className="flex flex-col gap-2">
              {feld('name', t('adressbuch.feld.firma'))}
              <UidSuche
                name={w.name}
                onWahl={(f) => {
                  setW((x) => ({
                    ...x,
                    name: f.name,
                    uidNr: f.uid,
                    rechtsform: f.rechtsform ?? '',
                    strasse: f.strasse ?? x.strasse,
                    plz: f.plz ?? x.plz,
                    ort: f.ort ?? x.ort,
                  }))
                }}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {feld('vorname', t('adressbuch.feld.vorname'))}
              {feld('name', t('adressbuch.feld.nachname'))}
            </div>
          )}

          {(dubletten.data?.length ?? 0) > 0 && (
            <div className="border-warn bg-warn-soft flex flex-col gap-1 rounded-md border p-3 text-sm" role="status">
              <span className="text-warn flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" aria-hidden="true" />
                {t('adressbuch.neuDialog.dubletten')}
              </span>
              {dubletten.data?.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="text-left hover:underline"
                  onClick={() => {
                    onSchliessen(d.id)
                  }}
                >
                  {[formatKundennummer(d.kundennummer), d.name, d.ort].filter(Boolean).join(' · ')}
                  <span className="text-muted-foreground"> ({t(`adressbuch.neuDialog.grund.${d.grund}`)})</span>
                </button>
              ))}
            </div>
          )}

          <Filterchips
            beschriftung={t('adressbuch.neuDialog.rollen')}
            gewaehlt={gewaehlt}
            onChange={setGewaehlt}
            optionen={rollen.werte.map((r) => ({ wert: r.schluessel, text: rollen.text(r.schluessel) }))}
          />
          {gewaehlt.map((r) => {
            const felder = rollenfelder(rollen.finde(r))
              .filter((f) => f.t !== 'lang')
              .slice(0, 4)
            if (felder.length === 0) return null
            return (
              <fieldset key={r} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                <legend className="px-1 text-xs font-medium">{rollen.text(r)}</legend>
                {felder.map((f) => (
                  <Feld key={f.k} id={`neu-${r}-${f.k}`} label={sprache === 'fr' ? f.fr : f.de}>
                    <Input
                      id={`neu-${r}-${f.k}`}
                      value={angaben[r]?.[f.k] ?? ''}
                      onChange={(e) => {
                        setAngaben((x) => ({ ...x, [r]: { ...x[r], [f.k]: e.target.value } }))
                      }}
                    />
                  </Feld>
                ))}
              </fieldset>
            )
          })}

          <div className="grid gap-4 sm:grid-cols-2">
            {feld('telefon', t('adressbuch.feld.telefon'), 'tel')}
            {feld('email', t('adressbuch.feld.email'), 'email')}
          </div>
          {feld('strasse', t('adressbuch.feld.strasse'))}
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4">
            {feld('plz', t('adressbuch.feld.plz'))}
            {feld('ort', t('adressbuch.feld.ort'))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {feld('webseite', t('adressbuch.feld.webseite'), 'url')}
            {feld('uidNr', t('adressbuch.feld.uid'), 'text', uidFehler)}
          </div>

          {w.art === 'firma' && (
            <fieldset className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
              <legend className="px-1 text-xs font-medium">{t('adressbuch.neuDialog.erstePerson')}</legend>
              {personFeld('vorname', t('adressbuch.feld.vorname'))}
              {personFeld('nachname', t('adressbuch.feld.nachname'))}
              {personFeld('funktion', t('adressbuch.feld.funktion'))}
              {personFeld('telefon', t('adressbuch.feld.telefon'), 'tel')}
              {personFeld('email', t('adressbuch.feld.email'), 'email')}
            </fieldset>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
