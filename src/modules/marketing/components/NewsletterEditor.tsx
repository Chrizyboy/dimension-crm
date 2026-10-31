import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Send, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useVorlagen } from '../hooks/useMarketing'
import { newsletterPruefen } from '../lib/texte'
import { fuellen } from '../lib/zielgruppe'
import { marketingMitKi, textDa } from '../lib/kiTexte'
import { KiWunschZeile } from '@/components/shared/ki/KiWunschZeile'
import { abmeldeLink, ladeEmpfaenger, newsletterPapierkorb, senden, speichereNewsletter } from '../services/marketing'
import { GRUPPEN, type Gruppe, type Newsletter, type NewsletterSegment, type Sprache } from '../types'

const ALLE = '_alle'

/**
 * Newsletter erstellen (V179): Thema → Zielgruppe → Text DE/FR → Vorschau → Prüfung → Senden. Gesendet wird einzeln
 * über das eigene Outlook (Ausgangskorb) mit persönlicher Anrede und Abmelde-Link; wer ihn schon hat, wird übersprungen.
 */
export function NewsletterEditor({
  newsletter,
  onSchliessen,
}: {
  newsletter: Partial<Newsletter>
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const vorlagen = useVorlagen()
  const { laeuft, aus } = useAktion()
  const [id, setId] = useState(newsletter.id)
  const [thema, setThema] = useState(newsletter.thema ?? '')
  const [segment, setSegment] = useState<NewsletterSegment>(
    newsletter.segment ?? { gruppen: ['kunde'], einzelne: true },
  )
  const [texte, setTexte] = useState<Record<Sprache, { betreff: string; text: string }>>({
    de: { betreff: newsletter.betreff_de ?? '', text: newsletter.text_de ?? '{Anrede}\n\n' },
    fr: { betreff: newsletter.betreff_fr ?? '', text: newsletter.text_fr ?? '{Anrede}\n\n' },
  })
  const fest = newsletter.status === 'versendet'
  const empf = useQuery({
    queryKey: ['marketing', 'empfaenger', id],
    queryFn: () => ladeEmpfaenger(id ?? ''),
    enabled: Boolean(id),
  })
  const neu = (empf.data ?? []).filter((e) => !e.erhalten)
  // Nur «de»/«fr» schränken ein; alles andere (alte oder fehlende Werte) heisst beide Sprachen.
  const sprachen: Sprache[] = segment.sprache === 'de' || segment.sprache === 'fr' ? [segment.sprache] : ['de', 'fr']
  const hinweise = newsletterPruefen(
    texte,
    sprachen.filter((s) => !empf.data || neu.some((e) => e.sprache === s)),
    vorlagen.data?.newsletter_max_woerter ?? 450,
  )
  const unterschrift = ich?.name ?? 'Dimension Solaire'

  async function speichern() {
    const r = await aus(() =>
      speichereNewsletter({
        ...(id ? { id } : {}),
        thema: thema.trim() || t('marketing.newsletter.ohneThema'),
        segment,
        betreff_de: texte.de.betreff,
        betreff_fr: texte.fr.betreff,
        text_de: texte.de.text,
        text_fr: texte.fr.text,
      }),
    )
    if (r) setId(r)
    return r
  }
  const mailText = (e: (typeof neu)[number]) => {
    const link = abmeldeLink(e.abmelde_schluessel)
    const person = { vorname: e.vorname, nachname: e.nachname, firma: e.firma, name: e.name ?? '' }
    const fuss = fuellen(vorlagen.data?.abmelden[e.sprache] ?? '', person, e.sprache, { abmeldelink: link })
    return `${fuellen(texte[e.sprache].text, person, e.sprache, { absender: unterschrift, abmeldelink: link })}\n\n—\n${fuss}`
  }
  async function los() {
    const nid = await speichern()
    if (!nid) return
    const r = await aus(
      () =>
        senden({
          art: 'newsletter',
          newsletter_id: nid,
          betreff: texte[sprachen[0] ?? 'de'].betreff,
          mails: neu.map((e) => ({
            kontakt_id: e.kontakt_id,
            empfaenger_id: e.empfaenger_id,
            an: e.email,
            betreff: texte[e.sprache].betreff,
            text: mailText(e),
            sprache: e.sprache,
          })),
        }),
      { de: 'Newsletter im Ausgangskorb', fr: 'Newsletter dans la boîte d’envoi' },
    )
    if (r) onSchliessen()
  }

  const beispiel = neu[0]
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        breite="breit"
        titel={id ? thema : t('marketing.newsletter.neu')}
        beschreibung={t('marketing.newsletter.ablauf')}
        fuss={
          <div className="flex w-full flex-wrap justify-end gap-2">
            {id && !fest && (
              <Button
                variant="ghost"
                disabled={laeuft}
                onClick={() => void aus(() => newsletterPapierkorb(id).then(onSchliessen))}
              >
                <Trash2 />
                {t('marketing.post.papierkorb')}
              </Button>
            )}
            {!fest && (
              <>
                <Button variant="secondary" disabled={laeuft} onClick={() => void speichern()}>
                  <Users />
                  {t('marketing.newsletter.speichernPruefen')}
                </Button>
                <Button
                  laedt={laeuft}
                  disabled={!empf.data || neu.length === 0 || hinweise.some((h) => h.schwer)}
                  onClick={() => void los()}
                >
                  <Send />
                  {t('marketing.newsletter.senden', { count: neu.length })}
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <Feld id="nl-thema" label={t('marketing.newsletter.thema')}>
            <Input
              id="nl-thema"
              readOnly={fest}
              value={thema}
              onChange={(e) => {
                setThema(e.target.value)
              }}
            />
          </Feld>
          <section className="flex flex-col gap-2" aria-label={t('marketing.newsletter.zielgruppe')}>
            <h3 className="text-sm font-semibold">{t('marketing.newsletter.zielgruppe')}</h3>
            <Filterchips
              beschriftung={t('marketing.filter.gruppe')}
              optionen={GRUPPEN.map((g) => ({ wert: g, text: t(`marketing.gruppe.${g}`) }))}
              gewaehlt={segment.gruppen ?? []}
              onChange={(g) => {
                if (!fest) setSegment({ ...segment, gruppen: g as Gruppe[] })
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              {(['sprache', 'standort'] as const).map((k) => (
                <Auswahl
                  key={k}
                  aria-label={t(`marketing.filter.${k}`)}
                  className="w-auto min-w-36"
                  disabled={fest}
                  value={segment[k] || ALLE}
                  onValueChange={(w) => {
                    setSegment({ ...segment, [k]: w === ALLE ? '' : w })
                  }}
                  optionen={[
                    { wert: ALLE, text: t(`marketing.filter.${k}Alle`) },
                    ...(k === 'sprache' ? ['de', 'fr'] : ['muri', 'bulle']).map((w) => ({
                      wert: w,
                      text: t(`marketing.${k}.${w}`),
                    })),
                  ]}
                />
              ))}
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  disabled={fest}
                  checked={segment.einzelne ?? true}
                  onCheckedChange={(an) => {
                    setSegment({ ...segment, einzelne: an })
                  }}
                />
                {t('marketing.newsletter.einzelne')}
              </label>
            </div>
            <p className="text-muted-foreground text-xs">{t('marketing.newsletter.versandgrund')}</p>
          </section>
          <KiWunschZeile
            fest={fest}
            hatText={textDa(texte, sprachen)}
            onSchreiben={async (wunsch) => {
              setTexte(await marketingMitKi('newsletter', sprachen, [thema, wunsch].filter(Boolean).join('. '), texte))
            }}
          />
          {sprachen.map((s) => (
            <section key={s} className="flex flex-col gap-2" aria-label={t(`marketing.sprache.${s}`)}>
              <h3 className="text-sm font-semibold">{t(`marketing.sprache.${s}`)}</h3>
              <Feld id={`nl-betreff-${s}`} label={t('marketing.serien.betreff')}>
                <Input
                  id={`nl-betreff-${s}`}
                  readOnly={fest}
                  value={texte[s].betreff}
                  onChange={(e) => {
                    setTexte({ ...texte, [s]: { ...texte[s], betreff: e.target.value } })
                  }}
                />
              </Feld>
              <Feld id={`nl-text-${s}`} label={t('marketing.serien.text')} hinweis={t('marketing.serien.platzhalter')}>
                <Textarea
                  id={`nl-text-${s}`}
                  rows={10}
                  readOnly={fest}
                  value={texte[s].text}
                  onChange={(e) => {
                    setTexte({ ...texte, [s]: { ...texte[s], text: e.target.value } })
                  }}
                />
              </Feld>
            </section>
          ))}
          {id && !fest && (
            <section className="flex flex-col gap-2" aria-label={t('marketing.newsletter.pruefung')}>
              <h3 className="text-sm font-semibold">{t('marketing.newsletter.pruefung')}</h3>
              <p className="text-sm">
                {empf.data
                  ? t('marketing.newsletter.empfaengerZahl', { neu: neu.length, schon: empf.data.length - neu.length })
                  : '…'}
              </p>
              {hinweise.map((h) => (
                <p
                  key={`${h.schluessel}-${h.sprache}`}
                  className={`flex items-center gap-1.5 text-sm ${h.schwer ? 'text-bad' : 'text-warn'}`}
                >
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  {t(`marketing.newsletter.hinweis.${h.schluessel}`, {
                    sprache: h.sprache.toUpperCase(),
                    wert: h.wert,
                    max: vorlagen.data?.newsletter_max_woerter ?? 450,
                  })}
                </p>
              ))}
              {beispiel && (
                <div className="bg-muted/40 rounded-md border p-3 text-sm">
                  <p className="text-muted-foreground mb-1 text-xs">
                    {t('marketing.serien.vorschau', { name: beispiel.name ?? beispiel.email })}
                  </p>
                  <p className="font-medium">{texte[beispiel.sprache].betreff}</p>
                  <p className="whitespace-pre-line">{mailText(beispiel)}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
