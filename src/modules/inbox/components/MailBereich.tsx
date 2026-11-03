import { lazy, Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatDatumZeit } from '@/lib/format'
import type { KiBezug } from '@/services/ki'
import { useUi } from '@/stores/ui'
import { useText } from '../hooks/usePosteingang'
import { absender, antwortSprache, ART_TON, istZurueck } from '../lib/anzeige'
import type { Mail } from '../types'
import { AnhaengeBox } from './AnhaengeBox'
import { AufgabeDialog } from './AufgabeDialog'
import { FristMarke } from './FristMarke'
import { KundeDialog } from './KundeDialog'
import { LieferterminDialog } from './LieferterminDialog'
import { MailAktionen } from './MailAktionen'
import { NaechsterSchritt } from './NaechsterSchritt'
import { NotizenBox } from './NotizenBox'
import { RegelDialog } from './RegelDialog'
import { VerlaufBox } from './VerlaufBox'
import { VerteilenHinweis } from './VerteilenHinweis'
import { WeitergebenDialog } from './WeitergebenDialog'
import { ZahlungDialog } from './ZahlungDialog'
import { ZuordnungBox } from './ZuordnungBox'

const KiAssistent = lazy(() => import('@/components/shared/ki/KiAssistent').then((m) => ({ default: m.KiAssistent })))

/** Welches Fenster über der Mail offen ist. */
export type Fenster = 'antworten' | 'weitergeben' | 'kunde' | 'aufgabe' | 'regel' | 'zahlung' | 'liefertermin' | null

/** Worauf sich die KI-Antwort stützt: Service-Fall, Projekt, Offerte, Lead, sonst der Kunde. */
function bezug(m: Mail): KiBezug | null {
  if (m.fall) return { tabelle: 'service_faelle', id: m.fall.id }
  if (m.projekt) return { tabelle: 'projekte', id: m.projekt.id }
  if (m.offerte) return { tabelle: 'offerten', id: m.offerte.id }
  if (m.lead) return { tabelle: 'verkaufschancen', id: m.lead.id }
  if (m.kontakt) return { tabelle: 'kontakte', id: m.kontakt.id }
  return null
}

/**
 * Eine Mail mit allem, was man zum Bearbeiten braucht: wer, was (Kurzfassung), was als Nächstes zu tun ist, wohin sie
 * gehört, die ganze Unterhaltung, Anhänge und interne Notizen; unten die Aktionen. Am breiten Bildschirm rechts neben
 * der Liste, sonst als Seitenpanel (`alsPanel`). Gesendet wird nur aus dem Mail-Fenster nach «Senden».
 */
export function MailBereich({
  m,
  alsPanel,
  leer = false,
  fenster,
  onFenster,
  onSchliessen,
  onWeiter,
}: {
  m: Mail | null
  alsPanel: boolean
  /** Breiter Bildschirm, noch keine Mail gewählt: Hinweis statt «nicht mehr da». */
  leer?: boolean
  fenster: Fenster
  onFenster: (f: Fenster) => void
  onSchliessen: () => void
  /** Nach Erledigt/Zurückstellen: nächste Mail öffnen. */
  onWeiter: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const text = useText(m?.id ?? '')
  const zu = () => {
    onFenster(null)
  }

  if (leer)
    return (
      <aside className="bg-surface text-muted-foreground grid min-h-64 place-items-center rounded-xl border border-dashed p-6 text-center text-sm">
        {t('posteingang.akte.waehlen')}
      </aside>
    )
  const inhalt: ReactNode = !m ? (
    <p className="text-muted-foreground py-6 text-sm">{t('posteingang.akte.weg')}</p>
  ) : (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {m.art && <Badge ton={ART_TON[m.art]}>{t(`posteingang.art.${m.art}`)}</Badge>}
        <FristMarke m={m} t={t} sprache={sprache} />
        {m.dringend && m.stand === 'offen' && <Badge ton="kritisch">{t('posteingang.dringend')}</Badge>}
        {m.nachfassen && m.stand === 'offen' && <Badge ton="warnung">{t('posteingang.nachfassen')}</Badge>}
        {m.warten_bis && m.stand === 'erledigt' && (
          <Badge ton="info">{t('posteingang.wartetBis', { datum: formatDatumZeit(m.warten_bis) })}</Badge>
        )}
        {m.zurueck_am && istZurueck(m) && (
          <Badge>{t('posteingang.zurueckBis', { datum: formatDatumZeit(m.zurueck_am) })}</Badge>
        )}
        <span className="text-muted-foreground text-xs">
          {m.postfach === 'me' ? t('posteingang.akte.persoenlich') : m.postfach}
        </span>
      </div>
      <VerteilenHinweis
        m={m}
        onAndere={() => {
          onFenster('weitergeben')
        }}
      />
      <AkteAbschnitt titel={t('posteingang.akte.kurz')}>
        <p className="text-sm">{m.zusammenfassung ?? m.vorschau ?? '–'}</p>
        {m.sortiert === 'ohne_ki' && (
          <p className="text-muted-foreground mt-1 text-xs">{t('posteingang.akte.ohneKi')}</p>
        )}
        <NaechsterSchritt m={m} onFenster={onFenster} />
      </AkteAbschnitt>
      <ZuordnungBox m={m} onFenster={onFenster} />
      <VerlaufBox m={m} />
      <AnhaengeBox m={m} />
      <NotizenBox m={m} />
    </div>
  )
  const titel = m ? m.betreff || t('posteingang.ohneBetreff') : t('posteingang.akte.titel')
  const beschreibung = m
    ? [absender(m), m.von_name ? m.von_email : null, formatDatumZeit(m.eingang_am)].filter(Boolean).join(' · ')
    : ''
  const aktionen = m ? <MailAktionen m={m} onFenster={onFenster} onWeiter={onWeiter} /> : null

  return (
    <>
      {alsPanel ? (
        <Dialog
          open={fenster === null}
          onOpenChange={(o) => {
            if (!o && fenster === null) onSchliessen()
          }}
        >
          <DialogInhalt art="seite" titel={titel} beschreibung={beschreibung} {...(aktionen ? { fuss: aktionen } : {})}>
            {inhalt}
          </DialogInhalt>
        </Dialog>
      ) : (
        <aside
          aria-label={titel}
          className="bg-surface flex max-h-[calc(100dvh-7rem)] min-w-0 flex-col rounded-xl border lg:sticky lg:top-4"
        >
          <header className="border-b px-5 py-4">
            <h2 className="font-display text-lg leading-snug font-semibold text-balance">{titel}</h2>
            <p className="text-muted-foreground text-sm">{beschreibung}</p>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{inhalt}</div>
          {aktionen && <footer className="flex flex-wrap items-center gap-2 border-t px-5 py-3">{aktionen}</footer>}
        </aside>
      )}
      {m && fenster === 'antworten' && (
        <Suspense>
          <KiAssistent
            bezug={bezug(m)}
            art={m.art === 'stoerung' ? 'service' : 'antwort'}
            eingang={[`${t('posteingang.feld.betreff')}: ${m.betreff ?? ''}`, text.data ?? m.vorschau ?? ''].join(
              '\n\n',
            )}
            mail={{
              an: m.von_email ?? '',
              sprache: antwortSprache(m),
              ...(m.kontakt ? { kontakt_id: m.kontakt.id } : {}),
              ...(m.lead ? { verkaufschance_id: m.lead.id } : {}),
              ...(m.offerte ? { offerte_id: m.offerte.id } : {}),
              ...(m.projekt ? { projekt_id: m.projekt.id } : {}),
              bezug_tabelle: 'posteingang',
              bezug_id: m.id,
            }}
            onSchliessen={zu}
          />
        </Suspense>
      )}
      {m && fenster === 'weitergeben' && <WeitergebenDialog mail={m} onSchliessen={zu} />}
      {m && fenster === 'kunde' && <KundeDialog mail={m} onSchliessen={zu} />}
      {m && fenster === 'aufgabe' && <AufgabeDialog mail={m} onSchliessen={zu} />}
      {m && fenster === 'regel' && <RegelDialog mail={m} onSchliessen={zu} />}
      {m && fenster === 'zahlung' && <ZahlungDialog mail={m} onSchliessen={zu} />}
      {m && fenster === 'liefertermin' && <LieferterminDialog mail={m} onSchliessen={zu} />}
    </>
  )
}
