import { Check, ExternalLink, Forward, Reply, RotateCcw, UserPlus, Wrench } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Auswahl } from '@/components/ui/auswahl'
import { formatDatumZeit } from '@/lib/format'
import type { KiBezug } from '@/services/ki'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { useMails, useText } from '../hooks/usePosteingang'
import { absender, antwortSprache, ART_TON } from '../lib/anzeige'
import { artAendern, erledigen, oeffnen } from '../services/posteingang'
import { ARTEN, type Art, type Mail } from '../types'
import { FristMarke } from './FristMarke'
import { KundeDialog } from './KundeDialog'
import { WeitergebenDialog } from './WeitergebenDialog'

const KiAssistent = lazy(() => import('@/components/shared/ki/KiAssistent').then((m) => ({ default: m.KiAssistent })))

/** Worauf sich die KI-Antwort stützt: Service-Fall, Projekt, Offerte, Lead, sonst der Kunde. */
function bezug(m: Mail): KiBezug | null {
  if (m.fall) return { tabelle: 'service_faelle', id: m.fall.id }
  if (m.projekt) return { tabelle: 'projekte', id: m.projekt.id }
  if (m.offerte) return { tabelle: 'offerten', id: m.offerte.id }
  if (m.lead) return { tabelle: 'verkaufschancen', id: m.lead.id }
  if (m.kontakt) return { tabelle: 'kontakte', id: m.kontakt.id }
  return null
}

const link = 'text-accent-ink underline underline-offset-2'

/**
 * Eine Mail als Seitenpanel: worum es geht (Kurzfassung der KI), wohin sie gehört (Kunde, Lead, Projekt, Rechnung …),
 * wer zuständig ist und bis wann, dann der ganze Text aus Outlook. Antworten öffnet den KI-Assistenten mit Akte und
 * Mail; gesendet wird wie immer erst nach «Senden». Die Antwort erkennt der Posteingang selbst (auch aus Outlook).
 */
export function MailAkte({ id, onSchliessen }: { id: string; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const m = useMails().data?.find((x) => x.id === id)
  const text = useText(id)
  const { laeuft, aus } = useAktion()
  const [fenster, setFenster] = useState<'antworten' | 'weitergeben' | 'kunde' | null>(null)
  const zu = () => {
    setFenster(null)
  }

  const fuss = (x: Mail) =>
    x.stand === 'erledigt' || x.stand === 'abgelegt' ? (
      <Button variant="secondary" laedt={laeuft} onClick={() => void aus(() => oeffnen(x.id))}>
        <RotateCcw />
        {t('posteingang.akte.oeffnen')}
      </Button>
    ) : (
      <>
        <Button
          variant="ghost"
          onClick={() => {
            setFenster('weitergeben')
          }}
        >
          <Forward />
          {t('posteingang.akte.weitergeben')}
        </Button>
        <Button
          variant="secondary"
          laedt={laeuft}
          onClick={() =>
            void aus(() => erledigen(x.id), { de: 'Erledigt', fr: 'Terminé' }).then((ok) => {
              if (ok) onSchliessen()
            })
          }
        >
          <Check />
          {t('posteingang.akte.erledigt')}
        </Button>
        {x.von_email && (
          <Button
            onClick={() => {
              setFenster('antworten')
            }}
          >
            <Reply />
            {t('posteingang.akte.antworten')}
          </Button>
        )}
      </>
    )

  return (
    <>
      <Dialog
        open={fenster === null}
        onOpenChange={(o) => {
          if (!o && fenster === null) onSchliessen()
        }}
      >
        <DialogInhalt
          art="seite"
          className="md:w-[38rem]"
          titel={m ? m.betreff || t('posteingang.ohneBetreff') : t('posteingang.akte.titel')}
          {...(m
            ? {
                beschreibung: [absender(m), m.von_name ? m.von_email : null, formatDatumZeit(m.eingang_am)]
                  .filter(Boolean)
                  .join(' · '),
                fuss: fuss(m),
              }
            : {})}
        >
          {!m ? (
            <p className="text-muted-foreground py-6 text-sm">{t('posteingang.akte.weg')}</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2 pb-2">
                {m.art && <Badge ton={ART_TON[m.art]}>{t(`posteingang.art.${m.art}`)}</Badge>}
                <FristMarke m={m} t={t} sprache={sprache} />
                {m.dringend && <Badge ton="kritisch">{t('posteingang.dringend')}</Badge>}
                <span className="text-muted-foreground text-xs">
                  {m.postfach === 'me' ? t('posteingang.akte.persoenlich') : m.postfach}
                </span>
              </div>

              <AkteAbschnitt titel={t('posteingang.akte.kurz')}>
                <p className="text-sm">{m.zusammenfassung ?? m.vorschau ?? '–'}</p>
                {m.sortiert === 'ohne_ki' && (
                  <p className="text-muted-foreground mt-1 text-xs">{t('posteingang.akte.ohneKi')}</p>
                )}
              </AkteAbschnitt>

              <AkteAbschnitt titel={t('posteingang.akte.zugeordnet')}>
                <dl>
                  <Angabe label={t('posteingang.feld.kunde')}>
                    {m.kontakt ? (
                      <a href={`#/customers?kunde=${m.kontakt.id}`} className={link}>
                        {m.kontakt.name}
                      </a>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFenster('kunde')
                        }}
                      >
                        <UserPlus />
                        {t('posteingang.akte.kundeZuordnen')}
                      </Button>
                    )}
                  </Angabe>
                  {m.lead && (
                    <Angabe label={t('posteingang.feld.lead')}>
                      <a href={`#/sales?lead=${m.lead.id}`} className={link}>
                        {m.lead.nummer}
                      </a>
                    </Angabe>
                  )}
                  {m.offerte && (
                    <Angabe label={t('posteingang.feld.offerte')}>
                      <a href={`#/quotes?offerte=${m.offerte.id}`} className={link}>
                        {m.offerte.nummer}
                      </a>
                    </Angabe>
                  )}
                  {m.projekt && (
                    <Angabe label={t('posteingang.feld.projekt')}>
                      <a href={`#/projects?projekt=${m.projekt.id}`} className={link}>
                        {m.projekt.nummer}
                      </a>
                    </Angabe>
                  )}
                  {m.fall && (
                    <Angabe label={t('posteingang.feld.fall')}>
                      <a href={`#/aftersales?fall=${m.fall.id}`} className={link}>
                        {m.fall.nummer}
                      </a>
                    </Angabe>
                  )}
                  {m.rechnung && (
                    <Angabe label={t('posteingang.feld.rechnung')}>
                      <a href={`#/invoices?rechnung=${m.rechnung.id}`} className={link}>
                        {m.rechnung.nummer ?? t('posteingang.akte.entwurf')}
                      </a>
                    </Angabe>
                  )}
                  {m.bestellung && (
                    <Angabe label={t('posteingang.feld.bestellung')}>
                      <a href={`#/purchasing?bestellung=${m.bestellung.id}`} className={link}>
                        {m.bestellung.nummer}
                      </a>
                    </Angabe>
                  )}
                  <Angabe label={t('posteingang.feld.art')}>
                    <Auswahl
                      className="max-w-56"
                      aria-label={t('posteingang.feld.art')}
                      value={m.art ?? ''}
                      platzhalter={t('posteingang.wirdEingeordnet')}
                      onValueChange={(a) => void aus(() => artAendern(m.id, a as Art))}
                      optionen={ARTEN.map((a) => ({ wert: a, text: t(`posteingang.art.${a}`) }))}
                    />
                  </Angabe>
                  <Angabe label={t('posteingang.feld.zustaendig')}>
                    {m.zustaendig ?? t('posteingang.akte.niemand')}
                    {m.vertretung_fuer && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({t('posteingang.vertretung', { name: m.vertretung_fuer })})
                      </span>
                    )}
                  </Angabe>
                  {m.stand === 'erledigt' && (
                    <Angabe label={t('posteingang.feld.erledigt')}>
                      {[m.erledigt_von, m.erledigt_am ? formatDatumZeit(m.erledigt_am) : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Angabe>
                  )}
                </dl>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!m.lead && (m.art === 'anfrage' || (!m.kontakt && m.art !== 'werbung')) && (
                    <a
                      href={`#/sales?ausMail=${m.id}`}
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                      <UserPlus />
                      {t('posteingang.akte.leadAnlegen')}
                    </a>
                  )}
                  {!m.fall && m.art === 'stoerung' && (
                    <a
                      href={`#/aftersales?ausMail=${m.id}`}
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                      <Wrench />
                      {t('posteingang.akte.fallEroeffnen')}
                    </a>
                  )}
                  {m.web_link && (
                    <a
                      href={m.web_link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                    >
                      <ExternalLink />
                      {t('posteingang.akte.outlook')}
                    </a>
                  )}
                </div>
              </AkteAbschnitt>

              <AkteAbschnitt titel={t('posteingang.akte.mail')}>
                {text.isPending ? (
                  <p className="text-muted-foreground text-sm">{t('posteingang.akte.laedt')}</p>
                ) : (
                  <>
                    {text.isError && (
                      <p className="text-muted-foreground mb-2 text-xs">{t('posteingang.akte.nurVorschau')}</p>
                    )}
                    <p className="text-sm break-words whitespace-pre-wrap">{text.data ?? m.vorschau ?? '–'}</p>
                  </>
                )}
              </AkteAbschnitt>
            </div>
          )}
        </DialogInhalt>
      </Dialog>
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
    </>
  )
}
