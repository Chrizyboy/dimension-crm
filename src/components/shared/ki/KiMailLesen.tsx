import { Link } from '@tanstack/react-router'
import { CalendarPlus, FileUp, MailOpen, Reply, Sparkles, UserPlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatTelefon } from '@/lib/format'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { kiAufgabeAnlegen, rufeKi, useKiNachher, type KiMailErgebnis } from '@/services/ki'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { KiAssistent } from './KiAssistent'
import { KiHinweis } from './KiHinweis'

const TON = { lead: 'ok', anliegen: 'info', rechnung: 'warnung', werbung: 'neutral', sonstiges: 'neutral' } as const

const plusTage = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

/**
 * Eingegangene Mail mit KI lesen (Bau-Auftrag 3.4): Lead oder Anliegen, Kontakt- und Lead-Felder, passende Kunden
 * (die sucht die Datenbank) und eine nächste Aufgabe. Nichts wird gespeichert, bis jemand einen Knopf drückt.
 * Der Mail-Text ist fremder Inhalt: Die KI liest ihn nur als Daten, Anweisungen darin werden nicht befolgt.
 */
export function KiMailLesen({
  startText = '',
  onLead,
  onSchliessen,
}: {
  /** Mail-Text, der gleich gelesen wird (z. B. aus dem Posteingang). */
  startText?: string
  /** Lead-Formular mit den erkannten Feldern öffnen (das Modul «Anfragen & Leads» kennt seine Felder). */
  onLead?: (e: KiMailErgebnis) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const interesse = useAuswahl('interesse')
  const nachher = useKiNachher()
  const ich = useAnmeldung((z) => z.ich)
  const datei = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(startText)
  const [eml, setEml] = useState<{ name: string; inhalt: string } | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [r, setR] = useState<KiMailErgebnis | null>(null)
  const [antwort, setAntwort] = useState<string | null>(null)
  const [aufgabeDa, setAufgabeDa] = useState(false)

  async function lesen() {
    setLaeuft(true)
    try {
      setR(await rufeKi<KiMailErgebnis>('mail_erkennen', eml ? { eml: eml.inhalt } : { text }))
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(false)
      nachher()
    }
  }

  if (antwort !== null && r) {
    const k = r.kandidaten.find((x) => x.kontakt_id === antwort)
    return (
      <KiAssistent
        art="antwort"
        bezug={k ? { tabelle: 'kontakte', id: k.kontakt_id } : null}
        eingang={`Von: ${r.mail.von}\nBetreff: ${r.mail.betreff}\n\n${r.mail.text}`}
        mail={{
          an: r.erkannt.kontakt.email ?? /<([^>]+)>/.exec(r.mail.von)?.[1] ?? r.mail.von,
          sprache: r.erkannt.sprache,
          ...(k ? { kontakt_id: k.kontakt_id } : {}),
        }}
        onSchliessen={onSchliessen}
      />
    )
  }

  const e = r?.erkannt
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('ki.mail.titel')}
        beschreibung={t('ki.mail.beschreibung')}
        className="max-w-2xl"
        fuss={
          !r ? (
            <Button laedt={laeuft} disabled={!text.trim() && !eml} onClick={() => void lesen()}>
              <Sparkles />
              {t('ki.mail.lesen')}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setAntwort(r.kandidaten[0]?.kontakt_id ?? '')
                }}
              >
                <Reply />
                {t('ki.mail.antworten')}
              </Button>
              {onLead && e?.typ === 'lead' && (
                <Button
                  onClick={() => {
                    onLead(r)
                  }}
                >
                  <UserPlus />
                  {t('ki.mail.alsLead')}
                </Button>
              )}
            </>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <KiHinweis />
          {!r || !e ? (
            <>
              <Feld id="ki-mail-text" label={t('ki.mail.text')} hinweis={t('ki.mail.textHilfe')}>
                <Textarea
                  id="ki-mail-text"
                  rows={10}
                  autoFocus
                  disabled={Boolean(eml)}
                  value={eml ? t('ki.mail.datei', { name: eml.name }) : text}
                  onChange={(x) => {
                    setText(x.target.value)
                  }}
                />
              </Feld>
              <input
                ref={datei}
                type="file"
                accept=".eml,message/rfc822"
                className="hidden"
                data-testid="ki-mail-datei"
                onChange={(x) => {
                  const f = x.target.files?.[0]
                  if (f)
                    void f.text().then((inhalt) => {
                      setEml({ name: f.name, inhalt })
                    })
                }}
              />
              <Button variant="secondary" size="sm" className="self-start" onClick={() => datei.current?.click()}>
                <FileUp />
                {t('ki.mail.eml')}
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge ton={TON[e.typ]}>{t(`ki.mail.typ.${e.typ}`)}</Badge>
                {e.anliegen.dringend && <Badge ton="kritisch">{t('ki.mail.dringend')}</Badge>}
                <span className="text-muted-foreground truncate text-xs">
                  <MailOpen className="mr-1 inline size-3.5" aria-hidden="true" />
                  {r.mail.betreff}
                </span>
              </div>
              <p className="text-sm">{e.zusammenfassung}</p>
              <dl className="bg-surface-2 grid grid-cols-[8rem_1fr] gap-x-2 gap-y-1 rounded-lg border p-3 text-sm">
                {[
                  [
                    t('ki.mail.name'),
                    [e.kontakt.vorname, e.kontakt.nachname].filter(Boolean).join(' ') || e.kontakt.firma,
                  ],
                  [t('kontakt.feld.email'), e.kontakt.email],
                  [t('kontakt.feld.telefon'), e.kontakt.telefon ? formatTelefon(e.kontakt.telefon) : null],
                  [
                    t('ki.mail.adresse'),
                    [e.adresse.strasse, [e.adresse.plz, e.adresse.ort].filter(Boolean).join(' ')]
                      .filter(Boolean)
                      .join(', '),
                  ],
                  ...(e.typ === 'lead'
                    ? [
                        [t('ki.mail.interesse'), e.lead.interesse.map((x) => interesse.text(x)).join(', ')],
                        [t('ki.mail.kommentar'), e.lead.kommentar],
                      ]
                    : []),
                  ...(e.anliegen.thema ? [[t('ki.mail.thema'), e.anliegen.thema]] : []),
                ].map(([l, w]) => (
                  <div key={l} className="contents">
                    <dt className="text-muted-foreground text-xs leading-6">{l}</dt>
                    <dd className="min-w-0 break-words">{w || '–'}</dd>
                  </div>
                ))}
              </dl>
              <section className="flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold">{t('ki.mail.kandidaten')}</h3>
                {r.kandidaten.length === 0 ? (
                  <p className="text-muted-foreground text-xs">{t('ki.mail.keinKunde')}</p>
                ) : (
                  <ul className="flex flex-col divide-y rounded-lg border">
                    {r.kandidaten.map((k) => (
                      <li key={k.kontakt_id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                        <Link to="/customers" search={{ kunde: k.kontakt_id }} className="font-medium hover:underline">
                          {k.name}
                        </Link>
                        <Badge>{t(`ki.mail.grund.${k.grund}`)}</Badge>
                        {k.leads.map((l) => (
                          <Link
                            key={l.id}
                            to="/sales"
                            search={{ lead: l.id }}
                            className="text-muted-foreground text-xs hover:underline"
                          >
                            {l.nummer}
                          </Link>
                        ))}
                        {k.offerten.map((o) => (
                          <Link
                            key={o.id}
                            to="/quotes"
                            search={{ offerte: o.id }}
                            className="text-muted-foreground text-xs hover:underline"
                          >
                            {o.nummer}
                          </Link>
                        ))}
                        {k.projekte.map((p) => (
                          <Link
                            key={p.id}
                            to="/projects"
                            search={{ projekt: p.id }}
                            className="text-muted-foreground text-xs hover:underline"
                          >
                            {p.nummer}
                          </Link>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto"
                          onClick={() => {
                            setAntwort(k.kontakt_id)
                          }}
                        >
                          <Reply />
                          {t('ki.mail.antworten')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {e.aufgabe && ich && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
                  <CalendarPlus className="text-muted-foreground size-4" aria-hidden="true" />
                  <span>{t('ki.aufgabeVorschlag', { titel: e.aufgabe.titel, count: e.aufgabe.in_tagen })}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto"
                    disabled={aufgabeDa}
                    onClick={() => {
                      const a = e.aufgabe
                      if (!a) return
                      const k = r.kandidaten[0]
                      void kiAufgabeAnlegen({
                        titel: a.titel,
                        faellig_am: plusTage(a.in_tagen),
                        person_id: ich.id,
                        bezug: k ? { tabelle: 'kontakte', id: k.kontakt_id } : null,
                        text: r.mail.betreff,
                      })
                        .then(() => {
                          setAufgabeDa(true)
                          melde('ok', { de: 'Aufgabe angelegt', fr: 'Tâche créée' })
                        })
                        .catch((f: unknown) => {
                          meldeFehler(f, 'ki')
                          melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
                        })
                    }}
                  >
                    {aufgabeDa ? t('ki.aufgabeDa') : t('ki.aufgabeAnlegen')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
