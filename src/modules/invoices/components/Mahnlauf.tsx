import { BellRing, FileText, Gavel, Lock, Mail, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Checkbox } from '@/components/ui/schalter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { formatChf, formatDatum } from '@/lib/format'
import { zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useDarfMahnen, useMahnlauf } from '../hooks/useRechnungen'
import { heuteZuerich, pdfZeigen } from '../lib/rechnung'
import { mahnungAusfuehren, mahnungVorschau, pdfsZusammen } from '../services/mahnungSenden'
import type { MahnlaufZeile } from '../types'

/**
 * Mahnlauf (jeden Montag vorbereitet): je überfälliger Rechnung der nächste Schritt (Erinnerung, 1.–3. Mahnung,
 * Betreibung prüfen) oder warum sie übersprungen wird. Nur die Freigabe-Person (Chris) wählt und gibt frei;
 * alle anderen sehen den Vorschlag. Mails gehen freigegeben in den Ausgangskorb, Post kommt als ein PDF.
 */
export function Mahnlauf({ onRechnung }: { onRechnung: (id: string) => void }) {
  const { t, i18n } = useTranslation()
  const liste = useMahnlauf()
  const darf = useDarfMahnen().data === true
  const { mahnfrist_tage } = useFinanzEinstellungen()
  const { laeuft, aus } = useAktion()
  const zeilen = useMemo(() => liste.data ?? [], [liste.data])
  const sendbar = useMemo(() => zeilen.filter((z) => z.aktion === 'senden'), [zeilen])
  const [abgewaehlt, setAbgewaehlt] = useState<Set<string>>(new Set())
  const gewaehlt = sendbar.filter((z) => !abgewaehlt.has(z.rechnung_id))
  const sprache = (s: 'de' | 'fr') => i18n.getFixedT(s)

  async function vorschau(z: MahnlaufZeile) {
    try {
      pdfZeigen(await mahnungVorschau(z, sprache, mahnfrist_tage))
    } catch (f) {
      meldeFehler(f, 'rechnungen')
    }
  }

  function freigeben() {
    void aus(async () => {
      let mail = 0
      const post: Uint8Array[] = []
      for (const z of gewaehlt) {
        const e = await mahnungAusfuehren(z, sprache, mahnfrist_tage)
        if (e.weg === 'mail') mail++
        else if (e.pdf) post.push(e.pdf)
      }
      if (post.length) pdfZeigen(await pdfsZusammen(post))
      melde('ok', zweisprachig('rechnungen.mahnlauf.fertig', { mail, post: post.length }))
      setAbgewaehlt(new Set())
    })
  }

  if (liste.error) return <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
  if (!liste.data) return <Skelett className="h-64" />
  if (zeilen.length === 0)
    return (
      <Leerzustand icon={BellRing} titel={t('rechnungen.mahnlauf.leer')} text={t('rechnungen.mahnlauf.leerText')} />
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 className="font-display text-base font-semibold">
            {t('rechnungen.mahnlauf.titel', { datum: formatDatum(heuteZuerich()) })}
          </h2>
          <p className="text-muted-foreground text-sm">{t('rechnungen.mahnlauf.text')}</p>
          {!darf && (
            <p className="text-warn flex items-center gap-1.5 text-sm">
              <Lock className="size-4" aria-hidden="true" />
              {t('rechnungen.mahnlauf.nurFreigeber')}
            </p>
          )}
        </div>
        {darf && (
          <Button laedt={laeuft} disabled={gewaehlt.length === 0} onClick={freigeben}>
            <BellRing />
            {t('rechnungen.mahnlauf.freigeben', { n: gewaehlt.length })}
          </Button>
        )}
      </div>
      <Tabelle aria-label={t('rechnungen.reiter.mahnlauf')}>
        <TabelleKopf>
          <tr>
            {darf && (
              <Kopfzelle className="w-8">
                <Checkbox
                  aria-label={t('rechnungen.mahnlauf.alleWaehlen')}
                  checked={gewaehlt.length === sendbar.length && sendbar.length > 0}
                  onCheckedChange={(c) => {
                    setAbgewaehlt(c ? new Set() : new Set(sendbar.map((z) => z.rechnung_id)))
                  }}
                />
              </Kopfzelle>
            )}
            <Kopfzelle>{t('rechnungen.mahnlauf.spalte.kunde')}</Kopfzelle>
            <Kopfzelle className="hidden md:table-cell">{t('rechnungen.mahnlauf.spalte.tage')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('rechnungen.mahnlauf.spalte.offen')}</Kopfzelle>
            <Kopfzelle>{t('rechnungen.mahnlauf.spalte.schritt')}</Kopfzelle>
            <Kopfzelle className="hidden md:table-cell">{t('rechnungen.mahnlauf.spalte.versand')}</Kopfzelle>
            <Kopfzelle>
              <span className="sr-only">{t('tabelle.aktionen')}</span>
            </Kopfzelle>
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {zeilen.map((z) => {
            const aktiv = z.aktion === 'senden'
            const perMail = z.versandweg === 'mail' && !!z.email
            return (
              <Zeile key={z.rechnung_id} className={aktiv ? '' : 'text-muted-foreground'}>
                {darf && (
                  <Zelle>
                    {aktiv && (
                      <Checkbox
                        aria-label={z.nummer}
                        checked={!abgewaehlt.has(z.rechnung_id)}
                        onCheckedChange={(c) => {
                          setAbgewaehlt((alt) => {
                            const neu = new Set(alt)
                            if (c) neu.delete(z.rechnung_id)
                            else neu.add(z.rechnung_id)
                            return neu
                          })
                        }}
                      />
                    )}
                  </Zelle>
                )}
                <Zelle>
                  <button
                    type="button"
                    className="flex min-w-0 flex-col text-left hover:underline"
                    onClick={() => {
                      onRechnung(z.rechnung_id)
                    }}
                  >
                    <span className="line-clamp-2 font-medium">{z.kunde}</span>
                    <span className="text-muted-foreground text-xs">
                      <span className="zahlen font-mono">{z.nummer}</span>
                      {z.projekt_nummer ? ` · ${z.projekt_nummer}` : ''}
                      <span className="md:hidden"> · {t('rechnungen.mahnlauf.tage', { n: z.tage })}</span>
                    </span>
                  </button>
                </Zelle>
                <Zelle className="hidden md:table-cell">
                  <span className={aktiv ? 'text-bad' : ''}>{t('rechnungen.mahnlauf.tage', { n: z.tage })}</span>
                </Zelle>
                <Zelle className="zahlen text-right whitespace-nowrap">{formatChf(z.offen_rappen)}</Zelle>
                <Zelle>
                  <Schritt z={z} />
                </Zelle>
                <Zelle className="hidden md:table-cell">
                  {aktiv && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      {perMail ? (
                        <Mail className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Printer className="size-3.5" aria-hidden="true" />
                      )}
                      {perMail ? z.email : t('rechnungen.mahnlauf.keineMail')}
                    </span>
                  )}
                </Zelle>
                <Zelle className="text-right">
                  {aktiv && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`${t('rechnungen.mahnlauf.vorschau')} ${z.nummer}`}
                      onClick={() => void vorschau(z)}
                    >
                      <FileText />
                      <span className="hidden lg:inline">{t('rechnungen.mahnlauf.vorschau')}</span>
                    </Button>
                  )}
                </Zelle>
              </Zeile>
            )
          })}
        </TabelleKoerper>
      </Tabelle>
      {sendbar.some((z) => z.versandweg === 'post' || !z.email) && (
        <p className="text-muted-foreground text-xs">{t('rechnungen.mahnlauf.postPdf')}</p>
      )}
    </div>
  )
}

/** Nächster Schritt als Marke: Erinnerung, Mahnstufe, Betreibung oder Grund fürs Überspringen. */
function Schritt({ z }: { z: MahnlaufZeile }) {
  const { t } = useTranslation()
  if (z.aktion === 'betreibung')
    return (
      <Badge ton="kritisch">
        <Gavel className="size-3" aria-hidden="true" />
        {t('rechnungen.mahnlauf.betreibung')}
      </Badge>
    )
  if (z.aktion === 'ueberspringen')
    return (
      <span className="flex flex-col text-xs">
        <span>
          {t('rechnungen.mahnlauf.ueberspringen')}: {t(`rechnungen.mahnlauf.grund.${z.grund ?? 'klein'}`)}
        </span>
        {z.grund === 'sperre' && z.mahnsperre_grund && <span>{z.mahnsperre_grund}</span>}
        {z.grund === 'zusage' && z.zusage_bis && <span>{formatDatum(z.zusage_bis)}</span>}
      </span>
    )
  return <Badge ton={z.stufe === 0 ? 'warnung' : 'kritisch'}>{t(`rechnungen.mahnlauf.stufe.${String(z.stufe)}`)}</Badge>
}
