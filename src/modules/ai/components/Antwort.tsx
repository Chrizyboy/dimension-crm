import { Check, ExternalLink, ListTodo, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KiAssistent } from '@/components/shared/ki/KiAssistent'
import { Button } from '@/components/ui/button'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { KUNDEN_ARTEN, type KiBezug, type KiBezugTabelle, type KundenArt } from '@/services/ki'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { rechtsbuendig, zellwert } from '../lib/anzeige'
import { hatZiel } from '../lib/ziele'
import { legeAufgabeAn } from '../services/assistent'
import type { Runde, Vorschlag } from '../types'
import { ZielLink } from './ZielLink'

const BEZUEGE = new Set<string>(['kontakte', 'verkaufschancen', 'offerten', 'projekte', 'service_faelle'])
/** Feld, das in der Tabelle auf die Akte verlinkt. */
const LINKFELD = new Set(['nummer', 'titel', 'betreff', 'kunde', 'projekt'])
/** Spalten, die auf einen verknüpften Datensatz zeigen (Kunde, Projekt) statt auf die Zeile selbst. */
const VERWEIS: Record<string, { tabelle: string; feld: string }> = {
  kunde: { tabelle: 'kontakte', feld: 'kontakt_id' },
  projekt: { tabelle: 'projekte', feld: 'projekt_id' },
}

function bezugVon(v: { tabelle: string | null; id: string | null }): KiBezug | null {
  return v.tabelle && v.id && BEZUEGE.has(v.tabelle) ? { tabelle: v.tabelle as KiBezugTabelle, id: v.id } : null
}

/** Eine Runde: Frage, Antwort, Tabelle mit den echten Werten aus der Datenbank, Vorschläge zum Übernehmen. */
export function Antwort({ runde }: { runde: Runde }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const tab = runde.tabelle
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-info-soft max-w-[85%] self-end rounded-xl rounded-br-sm px-3 py-2 text-sm">{runde.frage}</div>
      <div className="border-accent flex flex-col gap-3 border-l-2 pl-3">
        <p className="text-sm leading-relaxed whitespace-pre-line">{runde.antwort}</p>
        {tab && (
          <div className="flex flex-col gap-1">
            <Tabelle aria-label={t('assistent.tabelle')}>
              <TabelleKopf>
                <Zeile>
                  {tab.spalten.map((s) => (
                    <Kopfzelle key={s} className={cn(rechtsbuendig(s) && 'text-right')}>
                      {t(`assistent.feld.${s}`, { defaultValue: s.replace(/_/g, ' ') })}
                    </Kopfzelle>
                  ))}
                </Zeile>
              </TabelleKopf>
              <TabelleKoerper>
                {tab.zeilen.map((z, i) => {
                  const erstesLink = tab.spalten.find((s) => LINKFELD.has(s))
                  return (
                    <Zeile key={typeof z.id === 'string' ? z.id : i}>
                      {tab.spalten.map((s) => {
                        const text = zellwert(s, z[s], sprache)
                        const verweis = s !== erstesLink || !hatZiel(tab.tabelle) ? VERWEIS[s] : undefined
                        const linkTabelle = verweis ? verweis.tabelle : tab.tabelle
                        const linkId = verweis ? z[verweis.feld] : z.id
                        return (
                          <Zelle
                            key={s}
                            className={cn('whitespace-nowrap', rechtsbuendig(s) && 'text-right tabular-nums')}
                          >
                            {LINKFELD.has(s) && typeof linkId === 'string' && text !== '–' ? (
                              <ZielLink tabelle={linkTabelle} id={linkId}>
                                {text}
                              </ZielLink>
                            ) : (
                              text
                            )}
                          </Zelle>
                        )
                      })}
                    </Zeile>
                  )
                })}
              </TabelleKoerper>
            </Tabelle>
            {tab.mehr && <p className="text-muted-foreground text-xs">{t('assistent.mehr')}</p>}
          </div>
        )}
        {runde.quellen.length > 0 && (
          <p className="text-muted-foreground text-xs">
            {t('assistent.quellen', {
              liste: runde.quellen.map((q) => t(`assistent.tabellen.${q}`, { defaultValue: q })).join(', '),
            })}
          </p>
        )}
        {runde.vorschlaege.map((v, i) => (
          <VorschlagKarte key={i} v={v} />
        ))}
      </div>
    </div>
  )
}

/** Ein Vorschlag: erst nach dem Klick wird etwas angelegt; Mails gehen über das Schreibfenster und den Ausgangskorb. */
function VorschlagKarte({ v }: { v: Vorschlag }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const [erledigt, setErledigt] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const [mail, setMail] = useState(false)
  const bezug = bezugVon(v)

  async function aufgabe() {
    setLaeuft(true)
    try {
      await legeAufgabeAn({
        titel: v.titel,
        text: v.begruendung || null,
        faellig_am: v.faellig_am,
        person_id: ich?.id ?? null,
        bezug,
      })
      setErledigt(true)
      melde('ok', { de: 'Aufgabe angelegt', fr: 'Tâche créée' })
    } catch (f) {
      meldeFehler(f, 'assistent')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="bg-surface-2 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-dashed p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{v.titel}</h3>
        {v.begruendung && <p className="text-muted-foreground text-xs">{v.begruendung}</p>}
      </div>
      {erledigt ? (
        <span className="text-ok flex items-center gap-1 text-sm">
          <Check className="size-4" aria-hidden="true" />
          {t('assistent.uebernommen')}
        </span>
      ) : v.art === 'aufgabe' ? (
        <Button size="sm" onClick={() => void aufgabe()} disabled={laeuft}>
          <ListTodo />
          {t('assistent.aufgabeAnlegen')}
        </Button>
      ) : v.art === 'mail' ? (
        <Button
          size="sm"
          onClick={() => {
            setMail(true)
          }}
        >
          <Mail />
          {t('assistent.mailEntwerfen')}
        </Button>
      ) : v.tabelle && v.id ? (
        <ZielLink tabelle={v.tabelle} id={v.id}>
          <span className="flex items-center gap-1 text-sm">
            <ExternalLink className="size-4" aria-hidden="true" />
            {t('assistent.oeffnen')}
          </span>
        </ZielLink>
      ) : null}
      {mail && (
        <KiAssistent
          bezug={bezug}
          art={(KUNDEN_ARTEN as readonly string[]).includes(v.kundenart ?? '') ? (v.kundenart as KundenArt) : 'frei'}
          wunsch={v.wunsch ?? ''}
          {...(bezug?.tabelle === 'kontakte' ? { mail: { kontakt_id: bezug.id } } : {})}
          onSchliessen={() => {
            setMail(false)
          }}
        />
      )}
    </div>
  )
}
