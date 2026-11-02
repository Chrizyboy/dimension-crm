import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Auswahl } from '@/components/ui/auswahl'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich, plusTage } from '../lib/rechnung'
import { angabenSpeichern, ausbuchen, mahnsperreSetzen, zusageEintragen } from '../services/akte'
import type { RechnungAn, RechnungVoll } from '../types'

/** Rahmen der kleinen Dialoge in der Akte: Abbrechen + ein Knopf. */
function Rahmen(props: {
  titel: string
  text: string
  knopf: string
  bereit: boolean
  laeuft: boolean
  onLos: () => void
  onSchliessen: () => void
  extra?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) props.onSchliessen()
      }}
    >
      <DialogInhalt
        titel={props.titel}
        beschreibung={props.text}
        fuss={
          <>
            <Button variant="ghost" onClick={props.onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            {props.extra}
            <Button laedt={props.laeuft} disabled={!props.bereit} onClick={props.onLos}>
              {props.knopf}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">{props.children}</div>
      </DialogInhalt>
    </Dialog>
  )
}

/** Textfeld mit Beschriftung; `breit` über beide Spalten. */
function Text(p: {
  id: string
  label: string
  wert: string
  setze: (w: string) => void
  breit?: boolean
  typ?: string
}) {
  return (
    <Feld id={p.id} label={p.label} {...(p.breit ? { className: 'sm:col-span-2' } : {})}>
      <Input
        id={p.id}
        type={p.typ ?? 'text'}
        value={p.wert}
        onChange={(e) => {
          p.setze(e.target.value)
        }}
      />
    </Feld>
  )
}

/** Abweichende Rechnungsadresse, Referenz des Kunden und Versandweg (auch nach dem Stellen). */
export function AngabenDialog({ rechnung: r, onSchliessen }: { rechnung: RechnungVoll; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [an, setAn] = useState<RechnungAn>(r.rechnung_an ?? {})
  const [referenz, setReferenz] = useState(r.kunden_referenz ?? '')
  const [weg, setWeg] = useState<'mail' | 'post'>(r.versandweg)
  const feld = (k: keyof RechnungAn) => ({
    wert: an[k] ?? '',
    setze: (w: string) => {
      setAn((a) => ({ ...a, [k]: w }))
    },
  })
  const los = () =>
    void aus(
      () =>
        angabenSpeichern(r.id, {
          rechnung_an: an.name?.trim() ? an : null,
          kunden_referenz: referenz.trim() || null,
          versandweg: weg,
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    ).then((ok) => {
      if (ok) onSchliessen()
    })
  const a = 'rechnungen.angaben'
  return (
    <Rahmen
      titel={t(`${a}.titel`, { nummer: r.nummer ?? t('rechnungen.entwurf') })}
      text={t(`${a}.text`)}
      knopf={t(`${a}.speichern`)}
      bereit
      laeuft={laeuft}
      onLos={los}
      onSchliessen={onSchliessen}
    >
      <p className="text-sm font-medium sm:col-span-2">{t(`${a}.abweichend`)}</p>
      <Text id="an-name" label={t(`${a}.name`)} {...feld('name')} />
      <Text id="an-zusatz" label={t(`${a}.zusatz`)} {...feld('zusatz')} />
      <Text id="an-strasse" label={t(`${a}.strasse`)} breit {...feld('strasse')} />
      <Text id="an-plz" label={t(`${a}.plz`)} {...feld('plz')} />
      <Text id="an-ort" label={t(`${a}.ort`)} {...feld('ort')} />
      <Text id="an-mail" label={t(`${a}.email`)} typ="email" breit {...feld('email')} />
      <Text id="an-referenz" label={t(`${a}.referenz`)} wert={referenz} setze={setReferenz} />
      <Feld id="an-weg" label={t(`${a}.versandweg`)}>
        <Auswahl
          id="an-weg"
          value={weg}
          onValueChange={(w) => {
            setWeg(w as 'mail' | 'post')
          }}
          optionen={[
            { wert: 'mail', text: t('rechnungen.akte.versand.mail') },
            { wert: 'post', text: t('rechnungen.akte.versand.post') },
          ]}
        />
      </Feld>
    </Rahmen>
  )
}

/** Mahnsperre (bis Datum, mit Grund) oder Zahlungszusage des Kunden. */
export function SperreDialog({
  rechnung: r,
  art,
  onSchliessen,
}: {
  rechnung: RechnungVoll
  art: 'sperre' | 'zusage'
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [bis, setBis] = useState(
    art === 'sperre' ? (r.mahnsperre_bis ?? plusTage(heuteZuerich(), 30)) : plusTage(heuteZuerich(), 10),
  )
  const [grund, setGrund] = useState(art === 'sperre' ? (r.mahnsperre_grund ?? '') : '')
  const fertig = (ok: boolean) => {
    if (ok) onSchliessen()
  }
  const k = `rechnungen.${art}`
  return (
    <Rahmen
      titel={t(`${k}.titel`)}
      text={t(`${k}.text`)}
      knopf={t(`${k}.setzen`)}
      bereit={!!bis && (art === 'zusage' || !!grund.trim())}
      laeuft={laeuft}
      onLos={() =>
        void aus(() => (art === 'sperre' ? mahnsperreSetzen(r.id, bis, grund) : zusageEintragen(r.id, bis, grund)), {
          de: 'Gespeichert',
          fr: 'Enregistré',
        }).then(fertig)
      }
      onSchliessen={onSchliessen}
      {...(art === 'sperre' && r.mahnsperre_bis
        ? {
            extra: (
              <Button
                variant="secondary"
                laedt={laeuft}
                onClick={() => void aus(() => mahnsperreSetzen(r.id, null, '')).then(fertig)}
              >
                {t('rechnungen.sperre.aufheben')}
              </Button>
            ),
          }
        : {})}
    >
      <Text id="sperre-bis" label={t(`${k}.bis`)} typ="date" wert={bis} setze={setBis} />
      <Text
        id="sperre-grund"
        label={art === 'sperre' ? t('rechnungen.sperre.grund') : t('rechnungen.zusage.text2')}
        wert={grund}
        setze={setGrund}
        breit
      />
    </Rahmen>
  )
}

const ARTEN = ['rundung', 'skonto', 'kulanz', 'verlust'] as const

/** Rest ausbuchen: höchstens der offene Betrag, mit Art und Grund. */
export function AusbuchenDialog({ rechnung: r, onSchliessen }: { rechnung: RechnungVoll; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [betrag, setBetrag] = useState(() => formatChf(r.offen_rappen))
  const [art, setArt] = useState<(typeof ARTEN)[number]>(r.offen_rappen <= 500 ? 'rundung' : 'kulanz')
  const [grund, setGrund] = useState('')
  const rappen = parseChf(betrag)
  return (
    <Rahmen
      titel={t('rechnungen.ausbuchen.titel')}
      text={t('rechnungen.ausbuchen.text', { offen: formatChf(r.offen_rappen, { mitWaehrung: true }) })}
      knopf={t('rechnungen.ausbuchen.setzen')}
      bereit={!!rappen && rappen > 0 && rappen <= r.offen_rappen && !!grund.trim()}
      laeuft={laeuft}
      onLos={() =>
        void aus(() => ausbuchen(r.id, rappen ?? 0, art, grund), { de: 'Ausgebucht', fr: 'Passé en perte' }).then(
          (ok) => {
            if (ok) onSchliessen()
          },
        )
      }
      onSchliessen={onSchliessen}
    >
      <Text id="aus-betrag" label={t('rechnungen.ausbuchen.betrag')} wert={betrag} setze={setBetrag} />
      <Feld id="aus-art" label={t('rechnungen.ausbuchen.art')}>
        <Auswahl
          id="aus-art"
          value={art}
          onValueChange={(w) => {
            setArt(w as (typeof ARTEN)[number])
          }}
          optionen={ARTEN.map((a) => ({ wert: a, text: t(`rechnungen.ausbuchen.arten.${a}`) }))}
        />
      </Feld>
      <Text id="aus-grund" label={t('rechnungen.ausbuchen.grund')} wert={grund} setze={setGrund} breit />
    </Rahmen>
  )
}
