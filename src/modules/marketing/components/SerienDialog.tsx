import { FileDown, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { herunterladen } from '@/lib/datei'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { serienbriefPdf } from '../lib/serienbrief'
import { empfaenger, fuellen } from '../lib/zielgruppe'
import { abmeldeLink, senden, speichereVorlagen, vermerken } from '../services/marketing'
import type { MarketingVorlagen, Sprache, Textvorlage, Zielkontakt } from '../types'

/**
 * Serienbrief (PDF) oder Serien-E-Mail an die Auswahl (V233). Nur wer Post- bzw. Mail-Adresse hat und nicht
 * abgemeldet ist, jede Adresse einmal. Texte je Sprache mit Platzhaltern und Vorschau am ersten Empfänger.
 * Mails gehen nach dem Klick auf «Senden» freigegeben in den Ausgangskorb, mit Abmelde-Link (Regel 6).
 */
export function SerienDialog({
  art,
  auswahl,
  vorlagen,
  onSchliessen,
}: {
  art: 'brief' | 'mail'
  auswahl: Zielkontakt[]
  vorlagen: MarketingVorlagen
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const { laeuft, aus } = useAktion()
  const r = empfaenger(auswahl, art)
  // Ohne Empfänger trotzdem die Texte zeigen (Sprachen der Auswahl), damit man die Vorlage bearbeiten kann.
  const basis = r.liste.length ? r.liste : auswahl
  const gefunden = (['de', 'fr'] as const).filter((s) => basis.some((k) => k.sprache === s))
  const sprachen = gefunden.length ? gefunden : (['de'] as const)
  const [texte, setTexte] = useState<Record<Sprache, Textvorlage>>(vorlagen[art])
  const [absender, setAbsender] = useState(vorlagen.absender)
  const unterschrift = ich?.name ?? 'Dimension Solaire'

  const mailText = (k: Zielkontakt) => {
    const link = abmeldeLink(k.abmelde_schluessel)
    const fuss = fuellen(vorlagen.abmelden[k.sprache], k, k.sprache, { abmeldelink: link })
    return `${fuellen(texte[k.sprache].text, k, k.sprache, { absender: unterschrift, abmeldelink: link })}\n\n—\n${fuss}`
  }

  async function los() {
    if (art === 'brief') {
      const ok = await aus(
        async () => {
          const v = (s: Sprache) => ({ absender: absender[s], ort: vorlagen.ort[s], ...texte[s] })
          const pdf = await serienbriefPdf(r.liste, { de: v('de'), fr: v('fr') }, unterschrift)
          herunterladen(new Uint8Array(pdf), `${t('marketing.serien.dateiname')}.pdf`, 'application/pdf')
          await vermerken(
            'serienbrief',
            texte[sprachen[0]].betreff,
            r.liste.map((k) => k.id),
          )
          return true
        },
        { de: 'PDF erstellt', fr: 'PDF créé' },
      )
      if (ok) onSchliessen()
      return
    }
    const e = await aus(() =>
      senden({
        art: 'serienmail',
        betreff: texte[sprachen[0]].betreff,
        mails: r.liste.map((k) => ({
          kontakt_id: k.id,
          an: (k.email ?? '').trim(),
          betreff: fuellen(texte[k.sprache].betreff, k, k.sprache, { absender: unterschrift }),
          text: mailText(k),
          sprache: k.sprache,
        })),
      }),
    )
    if (e) {
      melde('ok', {
        de: `${String(e.angelegt)} Mails im Ausgangskorb`,
        fr: `${String(e.angelegt)} e-mails dans la boîte d’envoi`,
      })
      onSchliessen()
    }
  }

  const beispiel = (s: Sprache) => r.liste.find((k) => k.sprache === s)
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        className="md:w-[40rem]"
        titel={t(`marketing.serien.titel.${art}`)}
        beschreibung={t('marketing.serien.info', {
          anzahl: r.liste.length,
          de: r.liste.filter((k) => k.sprache === 'de').length,
          fr: r.liste.filter((k) => k.sprache === 'fr').length,
          ohne: r.ohne,
          doppelt: r.doppelt,
        })}
        fuss={
          <>
            <Button
              variant="ghost"
              disabled={laeuft}
              onClick={() =>
                void aus(() => speichereVorlagen({ ...vorlagen, [art]: texte, absender }), {
                  de: 'Vorlage gespeichert',
                  fr: 'Modèle enregistré',
                })
              }
            >
              {t('marketing.serien.alsVorlage')}
            </Button>
            <Button onClick={() => void los()} laedt={laeuft} disabled={r.liste.length === 0}>
              {art === 'brief' ? <FileDown /> : <Send />}
              {t(`marketing.serien.los.${art}`, { count: r.liste.length })}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {r.liste.length === 0 && (
            <p role="status" className="bg-warn-soft text-warn rounded-md p-3 text-sm">
              {t(`marketing.serien.keiner.${art}`)}
            </p>
          )}
          {art === 'mail' && (
            <p className="text-muted-foreground text-sm">
              {t('marketing.serien.mailHinweis', { absender: ich?.email ?? '' })}
            </p>
          )}
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {t('marketing.kiSpaeter')}
          </p>
          {sprachen.map((s) => {
            const b = beispiel(s)
            return (
              <section key={s} className="flex flex-col gap-3" aria-label={t(`marketing.sprache.${s}`)}>
                <h3 className="text-sm font-semibold">{t(`marketing.sprache.${s}`)}</h3>
                {art === 'brief' && (
                  <Feld id={`absender-${s}`} label={t('marketing.serien.absender')}>
                    <Textarea
                      id={`absender-${s}`}
                      rows={3}
                      value={absender[s]}
                      onChange={(e) => {
                        setAbsender({ ...absender, [s]: e.target.value })
                      }}
                    />
                  </Feld>
                )}
                <Feld id={`betreff-${s}`} label={t('marketing.serien.betreff')}>
                  <Input
                    id={`betreff-${s}`}
                    value={texte[s].betreff}
                    onChange={(e) => {
                      setTexte({ ...texte, [s]: { ...texte[s], betreff: e.target.value } })
                    }}
                  />
                </Feld>
                <Feld id={`text-${s}`} label={t('marketing.serien.text')} hinweis={t('marketing.serien.platzhalter')}>
                  <Textarea
                    id={`text-${s}`}
                    rows={8}
                    value={texte[s].text}
                    onChange={(e) => {
                      setTexte({ ...texte, [s]: { ...texte[s], text: e.target.value } })
                    }}
                  />
                </Feld>
                {b && (
                  <div className="bg-muted/40 rounded-md border p-3 text-sm">
                    <p className="text-muted-foreground mb-1 text-xs">
                      {t('marketing.serien.vorschau', { name: b.name })}
                    </p>
                    <p className="font-medium">{fuellen(texte[s].betreff, b, s, { absender: unterschrift })}</p>
                    <p className="whitespace-pre-line">
                      {art === 'mail' ? mailText(b) : fuellen(texte[s].text, b, s, { absender: unterschrift })}
                    </p>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
