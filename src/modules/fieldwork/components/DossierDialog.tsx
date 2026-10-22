import { useQuery } from '@tanstack/react-query'
import { FileText, FolderArchive, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Checkbox } from '@/components/ui/schalter'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { dossierAblegen, dossierPdf, ladeDossier } from '../services/dossier'
import { pdfOeffnen } from '../services/pdf'
import type { Rapport } from '../types'

/**
 * Anlagedossier zur Übergabe: Dokumente wählen, PDF erstellen (wird beim Projekt abgelegt), ansehen und
 * per Mail an den Kunden schicken (über den Ausgangskorb, mit Freigabe).
 */
export function DossierDialog({ rapport: r, onSchliessen }: { rapport: Rapport; onSchliessen: () => void }) {
  const { t, i18n } = useTranslation()
  const projektId = r.projekt_id ?? ''
  const vorbereitung = useQuery({
    queryKey: ['baustelle', 'dossier', projektId],
    queryFn: () => ladeDossier(projektId, i18n.language === 'fr' ? 'fr' : 'de'),
  })
  const [abgewaehlt, setAbgewaehlt] = useState<Set<string>>(new Set())
  const [dazu, setDazu] = useState<Set<string>>(new Set())
  const [laeuft, setLaeuft] = useState(false)
  const [fertig, setFertig] = useState<{ id: string; name: string; bytes: Uint8Array } | null>(null)
  const [mail, setMail] = useState(false)
  const a = vorbereitung.data
  const gewaehlt = (a?.quellen ?? []).filter((q) => (q.vorgewaehlt ? !abgewaehlt.has(q.id) : dazu.has(q.id)))

  async function erstellen() {
    if (!a) return
    setLaeuft(true)
    try {
      const bytes = await dossierPdf(r, a, gewaehlt, i18n.getFixedT(a.kunde.sprache), a.kunde.sprache)
      const dok = await dossierAblegen(a.projekt, bytes)
      setFertig({ ...dok, bytes })
      melde('ok', { de: 'Anlagedossier beim Projekt abgelegt', fr: 'Dossier déposé dans le projet' })
    } catch (f) {
      meldeFehler(f, 'baustelle')
      melde('kritisch', { de: 'Dossier konnte nicht erstellt werden', fr: 'Le dossier n’a pas pu être créé' })
    } finally {
      setLaeuft(false)
    }
  }

  const umschalten = (id: string, vor: boolean) => {
    const [menge, setze] = vor ? [abgewaehlt, setAbgewaehlt] : [dazu, setDazu]
    const neu = new Set(menge)
    if (neu.has(id)) neu.delete(id)
    else neu.add(id)
    setze(neu)
  }

  const ts = a ? i18n.getFixedT(a.kunde.sprache) : t
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('baustelle.dossier.titel')}
        beschreibung={t('baustelle.dossier.beschreibung')}
        fuss={
          fertig ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  pdfOeffnen(fertig.bytes)
                }}
              >
                <FileText />
                {t('baustelle.dossier.ansehen')}
              </Button>
              <Button
                onClick={() => {
                  setMail(true)
                }}
              >
                <Mail />
                {t('baustelle.dossier.mail')}
              </Button>
            </>
          ) : (
            <Button laedt={laeuft} disabled={!a} onClick={() => void erstellen()}>
              <FolderArchive />
              {t('baustelle.dossier.erstellen')}
            </Button>
          )
        }
      >
        {vorbereitung.error ? (
          <Fehlerzustand details={String(vorbereitung.error)} onNochmal={() => void vorbereitung.refetch()} />
        ) : !a ? (
          <Skelett className="h-40" />
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {a.datenblaetter.length
                ? t('baustelle.dossier.immer', { anzahl: a.datenblaetter.length })
                : t('baustelle.dossier.immerOhne')}
            </p>
            {a.quellen.length === 0 ? (
              <p className="text-muted-foreground">{t('baustelle.dossier.keineDokumente')}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {a.quellen.map((q) => (
                  <li key={q.id}>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={q.vorgewaehlt ? !abgewaehlt.has(q.id) : dazu.has(q.id)}
                        disabled={Boolean(fertig)}
                        onCheckedChange={() => {
                          umschalten(q.id, q.vorgewaehlt)
                        }}
                      />
                      <span className="min-w-0 truncate">{q.name}</span>
                      {q.ordner && <span className="text-muted-foreground ml-auto text-xs">{q.ordner}</span>}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {mail && a && fertig && (
          <MailDialog
            titel={t('baustelle.dossier.mail')}
            vorlage={{
              an: a.kunde.email ?? '',
              betreff: ts('baustelle.dossier.mailBetreff', { nummer: a.projekt.nummer }),
              text: ts('baustelle.dossier.mailText', { name: a.kunde.name }),
              sprache: a.kunde.sprache,
              art: 'anlagedossier',
              projekt_id: a.projekt.id,
              ...(a.projekt.kontakt_id ? { kontakt_id: a.projekt.kontakt_id } : {}),
              bezug_tabelle: 'projekte',
              bezug_id: a.projekt.id,
            }}
            dateien={[{ id: fertig.id, name: fertig.name, vorgewaehlt: true }]}
            onSchliessen={() => {
              setMail(false)
            }}
          />
        )}
      </DialogInhalt>
    </Dialog>
  )
}
