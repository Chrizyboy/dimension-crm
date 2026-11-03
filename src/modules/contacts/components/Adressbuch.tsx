import { ArrowLeft, BookUser, Plus, SearchX, Trash2 } from 'lucide-react'
import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/diverses'
import { Label } from '@/components/ui/feld'
import { Switch } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useKontakte } from '@/hooks/useKontakte'
import { useTaste } from '@/hooks/useTaste'
import { passtZurSuche } from '@/lib/kontakt'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import type { Kontaktzeile } from '@/types/kontakt'
import { usePartner } from '../hooks/useAdressbuch'
import { listenZahlen, rollenZaehlen } from '../lib/rollen'
import { adressbuchSpalten, type Listenzeile } from './adressbuchSpalten'
import { ListenZahlen } from './ListenZahlen'
import { NetzVerzeichnis } from './NetzVerzeichnis'

export interface AdressbuchProps {
  /** Offener Partner aus der Adresse (?kontakt=…), für die Markierung in der Liste. */
  aktiveId: string | null
  onOeffnen: (id: string) => void
  /** Kunden öffnen sich in ihrer Kundenakte (Modul «Kunden»), die Route leitet weiter. */
  onKunde: (id: string) => void
  /** «Neuer Eintrag»; die gewählte Rolle wird vorbelegt. */
  onNeu: (rolle: string | null) => void
}

const heuteIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })

/** Kunde als Zeile der Partnerliste (ohne Rolle), für «auch Kunden zeigen» und den Papierkorb. */
function alsZeile(k: Kontaktzeile): Listenzeile {
  return {
    id: k.id,
    kundennummer: k.kundennummer,
    art: k.art,
    name: k.name,
    email: k.email,
    telefon: k.telefon,
    sprache: k.sprache,
    geloeschtAm: null,
    rollen: [],
    strasse: k.strasse,
    plz: k.plz,
    ort: k.ort,
    webseite: null,
    uidNr: null,
    hauptkontakt: null,
    hauptkontaktTelefon: null,
    hauptkontaktEmail: null,
    anzahlPersonen: 0,
    zuletzt: k.letzterKontakt,
    nachweisBis: null,
    gesucheOffen: 0,
    gesucheAlt: 0,
    gesucheTage: null,
    gemeinden: 0,
    auftraegeLaufend: 0,
    auftraege: 0,
    bewertung: null,
    provisionProzent: null,
    kundennummerBei: null,
    gewerk: null,
    suchtext: k.suchtext,
    telefonZiffern: k.telefonZiffern,
    kunde: true,
  }
}

/**
 * Adressbuch der Geschäftspartner (Chris 03.11.2026): Netzbetreiber, Lieferanten, Hersteller, Subunternehmer,
 * Gemeinden, Planer, Elektriker, Vermittler. Kunden stehen unter «Kunden» und erscheinen hier nur mit dem Schalter.
 * Der Papierkorb zeigt alle gelöschten Kontakte, damit man auch Kunden wiederherstellen kann.
 */
export default function Adressbuch({ aktiveId, onOeffnen, onKunde, onNeu }: AdressbuchProps) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const [papierkorb, setPapierkorb] = useState(false)
  const [mitKunden, setMitKunden] = useState(false)
  const partner = usePartner(papierkorb)
  const kontakte = useKontakte(papierkorb)
  const rollen = useAuswahl('partnerrolle')
  const [suche, setSuche] = useState('')
  const [gewaehlt, setGewaehlt] = useState<string[]>([])
  const suchfeld = useRef<HTMLInputElement>(null)
  const verzoegert = useDeferredValue(suche)
  const heute = heuteIso()

  const neu = () => {
    onNeu(gewaehlt.length === 1 ? (gewaehlt[0] ?? null) : null)
  }
  useTaste('n', neu, !papierkorb, t('adressbuch.neu'))
  useTaste('/', () => suchfeld.current?.focus(), true, t('kuerzel.suche'))

  const partnerZeilen = useMemo(() => partner.data ?? [], [partner.data])
  const alle = useMemo<Listenzeile[]>(() => {
    const ids = new Set(partnerZeilen.map((p) => p.id))
    const kunden = mitKunden || papierkorb ? (kontakte.data ?? []).filter((k) => !ids.has(k.id)).map(alsZeile) : []
    return [...partnerZeilen, ...kunden]
  }, [partnerZeilen, kontakte.data, mitKunden, papierkorb])
  const anzahl = useMemo(() => rollenZaehlen(partnerZeilen), [partnerZeilen])
  const sichtbar = useMemo(
    () =>
      alle.filter(
        (p) =>
          (gewaehlt.length === 0 ||
            p.rollen.some((r) => gewaehlt.includes(r)) ||
            (p.kunde && gewaehlt.includes('kunde'))) &&
          passtZurSuche(p, verzoegert),
      ),
    [alle, gewaehlt, verzoegert],
  )
  const rolle = rollen.finde
  const spalten = useMemo(
    () => adressbuchSpalten(t, (r) => ({ text: rollen.text(r), farbe: rolle(r)?.farbe ?? null }), heute),
    // rollen.text/finde ändern sich nur mit den Daten der Auswahlliste
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, rollen.werte, heute],
  )

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={BookUser} titel={t('kunden.vorschau')} text={t('kunden.vorschauText')} />
      </div>
    )
  }

  const chips = [
    ...rollen.werte.map((r) => ({
      wert: r.schluessel,
      text: rollen.text(r.schluessel),
      anzahl: anzahl[r.schluessel] ?? 0,
    })),
    ...(mitKunden ? [{ wert: 'kunde', text: t('adressbuch.kunde'), anzahl: alle.length - partnerZeilen.length }] : []),
  ].filter((c) => c.anzahl > 0 || gewaehlt.includes(c.wert))
  const laedt = partner.isPending || ((mitKunden || papierkorb) && kontakte.isPending)

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-5 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={papierkorb ? t('adressbuch.papierkorbTitel') : t('adressbuch.titel')}
        beschreibung={papierkorb ? t('adressbuch.papierkorbText') : t('adressbuch.beschreibung')}
        aktionen={
          <Knopfleiste>
            {!papierkorb && hatRecht(ich, 'admin') && <NetzVerzeichnis />}
            <Button
              variant={papierkorb ? 'primary' : 'ghost'}
              aria-pressed={papierkorb}
              onClick={() => {
                setPapierkorb((p) => !p)
              }}
            >
              {papierkorb ? <ArrowLeft /> : <Trash2 />}
              {papierkorb ? t('adressbuch.zurueck') : t('adressbuch.papierkorb')}
            </Button>
            {!papierkorb && (
              <Button onClick={neu}>
                <Plus />
                {t('adressbuch.neu')}
                <Kbd className="bg-primary-foreground/15 text-primary-foreground ml-1 border-0">N</Kbd>
              </Button>
            )}
          </Knopfleiste>
        }
      />

      {!papierkorb && partner.isSuccess && (
        <ListenZahlen
          z={listenZahlen(partnerZeilen, heute)}
          onFilter={(r) => {
            setGewaehlt([r])
          }}
        />
      )}

      <Werkzeugleiste
        suche={
          <Suchfeld
            ref={suchfeld}
            kuerzel="/"
            beschriftung={t('adressbuch.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
        rechts={
          <div className="flex items-center gap-4">
            {!papierkorb && (
              <span className="flex items-center gap-2">
                <Switch id="adressbuch-kunden" checked={mitKunden} onCheckedChange={setMitKunden} />
                <Label htmlFor="adressbuch-kunden">{t('adressbuch.mitKunden')}</Label>
              </span>
            )}
            <span aria-live="polite">{!laedt && t('adressbuch.anzahl', { count: sichtbar.length })}</span>
          </div>
        }
      >
        {!papierkorb && (
          <Filterchips
            beschriftung={t('adressbuch.rolleFilter')}
            gewaehlt={gewaehlt}
            onChange={setGewaehlt}
            optionen={chips}
          />
        )}
      </Werkzeugleiste>

      <Datentabelle
        beschriftung={t('adressbuch.titel')}
        daten={sichtbar}
        spalten={spalten}
        kennung={(p) => p.id}
        aktiveId={aktiveId}
        onOeffnen={(p) => {
          if (p.kunde) onKunde(p.id)
          else onOeffnen(p.id)
        }}
        sortierung={[{ id: 'name', desc: false }]}
        laedt={laedt}
        fehler={partner.error ?? (mitKunden || papierkorb ? kontakte.error : null)}
        onNochmal={() => {
          void partner.refetch()
          void kontakte.refetch()
        }}
        leer={
          alle.length === 0 ? (
            <Leerzustand
              icon={papierkorb ? Trash2 : BookUser}
              titel={papierkorb ? t('adressbuch.papierkorbLeer') : t('adressbuch.leer')}
              text={papierkorb ? t('adressbuch.papierkorbLeerText') : t('adressbuch.leerText')}
            />
          ) : (
            <Leerzustand
              icon={SearchX}
              titel={t('kunden.keineTreffer')}
              text={t('kunden.keineTrefferText')}
              aktion={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSuche('')
                    setGewaehlt([])
                  }}
                >
                  {t('kunden.filterZuruecksetzen')}
                </Button>
              }
            />
          )
        }
      />
    </div>
  )
}
