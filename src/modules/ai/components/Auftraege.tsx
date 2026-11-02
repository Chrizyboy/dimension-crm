import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquareText, PenLine, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KiAssistent } from '@/components/shared/ki/KiAssistent'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { hatRecht } from '@/lib/rechte'
import { meldeFehler } from '@/services/fehler'
import { KUNDEN_ARTEN, type KundenArt } from '@/services/ki'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { ladeVorlagen, speichereVorlage, vorlageEntfernen } from '../services/assistent'
import type { Vorlage } from '../types'

/** Reihenfolge der Rollen-Gruppen; «alle» sind Aufträge ohne Rolle. */
const ROLLEN = ['alle', 'verkauf', 'innendienst', 'projektleitung', 'montage', 'buchhaltung', 'admin'] as const

/**
 * Aufträge: fertige Fragen und Texte mit einem Klick, oben die eigene Rolle. Firmenvorlagen pflegt die Administration,
 * eigene Aufträge jede Person für sich.
 */
export function Auftraege({ onFrage }: { onFrage: (frage: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const admin = hatRecht(ich, 'admin')
  const qc = useQueryClient()
  const v = useQuery({ queryKey: ['assistent', 'vorlagen'], queryFn: ladeVorlagen })
  const [text, setText] = useState<Vorlage | null>(null)
  const [neu, setNeu] = useState(false)

  if (v.isLoading) return <Skelett className="h-48" />
  if (v.isError) return <Fehlerzustand details={String(v.error)} onNochmal={() => void v.refetch()} />

  const rolle = ich?.rolle ?? ''
  const gruppe = (x: Vorlage) => (x.person_id ? 'eigene' : (x.rollen[0] ?? 'alle'))
  const passt = (x: Vorlage) => x.person_id !== null || x.rollen.length === 0 || x.rollen.includes(rolle)
  const sortiert = [...(v.data ?? [])].sort((a, b) => Number(passt(b)) - Number(passt(a)))
  const gruppen = ['eigene', ...ROLLEN].map((g) => ({ g, liste: sortiert.filter((x) => gruppe(x) === g) }))

  async function entfernen(x: Vorlage) {
    try {
      await vorlageEntfernen(x.id)
      void qc.invalidateQueries({ queryKey: ['assistent', 'vorlagen'] })
    } catch (f) {
      meldeFehler(f, 'assistent')
      melde('kritisch', { de: 'Nicht gelöscht', fr: 'Non supprimé' })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{t('assistent.auftraegeText')}</p>
        <Button
          size="sm"
          onClick={() => {
            setNeu(true)
          }}
        >
          <Plus />
          {t('assistent.auftragNeu')}
        </Button>
      </div>
      {gruppen
        .filter((x) => x.liste.length)
        .map(({ g, liste }) => (
          <section key={g} className="flex flex-col gap-2">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t(`assistent.rolle.${g}`, { defaultValue: g })}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {liste.map((x) => (
                <div key={x.id} className="bg-surface flex flex-col gap-2 rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{sprache === 'fr' ? x.titel_fr : x.titel_de}</h3>
                    <Badge ton={x.art === 'frage' ? 'info' : 'marke'}>
                      {x.art === 'frage' ? t('assistent.artFrage') : t('assistent.artText')}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground flex-1 text-sm">
                    {(sprache === 'fr' ? x.text_fr : x.text_de) || x.auftrag}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (x.art === 'frage') onFrage(x.auftrag)
                        else setText(x)
                      }}
                    >
                      {x.art === 'frage' ? <MessageSquareText /> : <PenLine />}
                      {t('assistent.ausfuehren')}
                    </Button>
                    {(x.person_id === ich?.id || (x.person_id === null && admin)) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t('assistent.entfernen')}
                        onClick={() => void entfernen(x)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      {text && (
        <KiAssistent
          art={
            (KUNDEN_ARTEN as readonly string[]).includes(text.kundenart ?? '') ? (text.kundenart as KundenArt) : 'frei'
          }
          wunsch={text.auftrag}
          onSchliessen={() => {
            setText(null)
          }}
        />
      )}
      {neu && (
        <NeuerAuftrag
          admin={admin}
          onSchliessen={() => {
            setNeu(false)
          }}
        />
      )}
    </div>
  )
}

function NeuerAuftrag({ admin, onSchliessen }: { admin: boolean; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const qc = useQueryClient()
  const [titel, setTitel] = useState('')
  const [art, setArt] = useState<'frage' | 'text'>('frage')
  const [kundenart, setKundenart] = useState<KundenArt>('frei')
  const [auftrag, setAuftrag] = useState('')
  const [firma, setFirma] = useState(false)
  const [laeuft, setLaeuft] = useState(false)

  async function speichern() {
    setLaeuft(true)
    try {
      await speichereVorlage({
        person_id: firma ? null : (ich?.id ?? null),
        art,
        titel: titel.trim(),
        text: '',
        auftrag: auftrag.trim(),
        kundenart: art === 'text' ? kundenart : null,
        rollen: [],
      })
      void qc.invalidateQueries({ queryKey: ['assistent', 'vorlagen'] })
      melde('ok', { de: 'Auftrag gespeichert', fr: 'Tâche enregistrée' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'assistent')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('assistent.auftragNeu')}
        beschreibung={t('assistent.auftragNeuText')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} disabled={laeuft || !titel.trim() || !auftrag.trim()}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Feld id="auftrag-titel" label={t('assistent.auftragTitel')} pflicht>
            <Input
              id="auftrag-titel"
              value={titel}
              onChange={(e) => {
                setTitel(e.target.value)
              }}
            />
          </Feld>
          <Feld id="auftrag-art" label={t('assistent.auftragArt')}>
            <Auswahl
              id="auftrag-art"
              value={art}
              onValueChange={(w) => {
                setArt(w as 'frage' | 'text')
              }}
              optionen={[
                { wert: 'frage', text: t('assistent.artFrage') },
                { wert: 'text', text: t('assistent.artText') },
              ]}
            />
          </Feld>
          {art === 'text' && (
            <Feld id="auftrag-kundenart" label={t('assistent.auftragTextart')}>
              <Auswahl
                id="auftrag-kundenart"
                value={kundenart}
                onValueChange={(w) => {
                  setKundenart(w as KundenArt)
                }}
                optionen={KUNDEN_ARTEN.map((k) => ({ wert: k, text: t(`ki.art.${k}`, { defaultValue: k }) }))}
              />
            </Feld>
          )}
          <Feld id="auftrag-text" label={t('assistent.auftragAuftrag')} hinweis={t('assistent.auftragHinweis')} pflicht>
            <Textarea
              id="auftrag-text"
              rows={4}
              value={auftrag}
              onChange={(e) => {
                setAuftrag(e.target.value)
              }}
            />
          </Feld>
          {admin && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={firma}
                onCheckedChange={(c) => {
                  setFirma(c === true)
                }}
              />
              {t('assistent.fuerAlle')}
            </label>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
