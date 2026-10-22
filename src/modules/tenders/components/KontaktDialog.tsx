import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { feldFehler } from '@/lib/formular'
import { useAktion } from '../hooks/useAktion'
import { kontaktSchema, type KontaktFormular } from '../schema'
import { kontaktSpeichern } from '../services/ausschreibungen'
import type { DossierKontakt } from '../types'

const ROLLEN = ['bauherr', 'architekt', 'gu', 'planer', 'gemeinde', 'gewinner'] as const
const ARTEN = ['firma', 'gemeinde', 'behoerde', 'privat'] as const
type TextFeld = Exclude<keyof KontaktFormular, 'rolle' | 'art' | 'sprache'>

/**
 * Kontakt eines Dossiers erfassen oder ändern. Die Quelle ist Pflicht (woher stammt die Angabe?).
 * Bei Privatpersonen geht nie eine Mail hinaus, nur Brief oder Anruf: darum der Hinweis.
 */
export function KontaktDialog({
  dossierId,
  sprache,
  kontakt,
  onSchliessen,
}: {
  dossierId: string
  sprache: 'de' | 'fr'
  kontakt: DossierKontakt | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState<KontaktFormular>({
    rolle: kontakt?.rolle === 'vergabestelle' ? 'gemeinde' : (kontakt?.rolle ?? 'architekt'),
    art: kontakt?.art ?? 'firma',
    name: kontakt?.name ?? '',
    firma: kontakt?.firma ?? '',
    email: kontakt?.email ?? '',
    telefon: kontakt?.telefon ?? '',
    strasse: kontakt?.strasse ?? '',
    plz: kontakt?.plz ?? '',
    ort: kontakt?.ort ?? '',
    sprache: kontakt?.sprache ?? sprache,
    quelle_link: kontakt?.quelle_link ?? '',
    notiz: kontakt?.notiz ?? '',
  })
  const [fehler, setFehler] = useState<Partial<Record<keyof KontaktFormular, string>>>({})

  async function speichern() {
    const g = kontaktSchema.safeParse(w)
    if (!g.success) {
      setFehler(feldFehler(g.error.issues, t))
      return
    }
    const ok = await aus(
      () => kontaktSpeichern({ ...g.data, ausschreibung_id: dossierId, ...(kontakt ? { id: kontakt.id } : {}) }),
      {
        de: 'Kontakt gespeichert',
        fr: 'Contact enregistré',
      },
    )
    if (ok) onSchliessen()
  }

  const text = (f: TextFeld, typ = 'text', pflicht = false) => (
    <Feld id={`as-k-${f}`} label={t(`ausschreibungen.kontakt.${f}`)} fehler={fehler[f]} pflicht={pflicht}>
      <Input
        id={`as-k-${f}`}
        type={typ}
        value={w[f]}
        onChange={(e) => {
          setW({ ...w, [f]: e.target.value })
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
        titel={t(kontakt ? 'ausschreibungen.kontakt.aendern' : 'ausschreibungen.kontakt.neu')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Feld id="as-k-rolle" label={t('ausschreibungen.kontakt.rolle')}>
            <Auswahl
              id="as-k-rolle"
              value={w.rolle}
              onValueChange={(v) => {
                setW({ ...w, rolle: v as KontaktFormular['rolle'] })
              }}
              optionen={ROLLEN.map((r) => ({ wert: r, text: t(`ausschreibungen.rolle.${r}`) }))}
            />
          </Feld>
          <Feld id="as-k-art" label={t('ausschreibungen.kontakt.art')}>
            <Auswahl
              id="as-k-art"
              value={w.art}
              onValueChange={(v) => {
                setW({ ...w, art: v as KontaktFormular['art'] })
              }}
              optionen={ARTEN.map((a) => ({ wert: a, text: t(`ausschreibungen.kontaktart.${a}`) }))}
            />
          </Feld>
          {w.art === 'privat' && (
            <p className="bg-warn-soft text-warn col-span-2 rounded-md p-2 text-xs">
              {t('ausschreibungen.kontakt.privatHinweis')}
            </p>
          )}
          <div className="col-span-2">{text('name', 'text', true)}</div>
          {w.art !== 'privat' && <div className="col-span-2">{text('firma')}</div>}
          {text('email', 'email')}
          {text('telefon', 'tel')}
          <div className="col-span-2">{text('strasse')}</div>
          {text('plz')}
          {text('ort')}
          <div className="col-span-2">{text('quelle_link', 'text', true)}</div>
          <div className="col-span-2">{text('notiz')}</div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
