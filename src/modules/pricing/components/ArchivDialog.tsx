import { useQueryClient } from '@tanstack/react-query'
import { Archive } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { PREIS_SCHLUESSEL, usePreisAenderung } from '../hooks/usePreise'
import { archiviere } from '../services/preise'
import type { Artikel } from '../types'

/** Gründe fürs Archivieren (V97), «anders» mit eigenem Text. */
const GRUENDE = ['nachfolger', 'lieferbar', 'sortiment', 'preis', 'anders'] as const
const KEINER = 'keiner'

/**
 * Artikel archivieren: Grund und wahlweise ein Nachfolger aus derselben Kategorie. Der Artikel bleibt für
 * alte Offerten und Kalkulationen erhalten; «Rückgängig» in der Meldung holt ihn sofort zurück.
 */
export default function ArchivDialog({
  artikel: a,
  alle,
  onSchliessen,
}: {
  artikel: Artikel
  alle: Artikel[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [grund, setGrund] = useState<(typeof GRUENDE)[number]>('nachfolger')
  const [eigener, setEigener] = useState('')
  const [nachfolger, setNachfolger] = useState(KEINER)
  const [fehler, setFehler] = useState<string | null>(null)
  const speichern = usePreisAenderung((g: { text: string | null; nachfolger: string | null }) =>
    archiviere(a.id, g.text, g.nachfolger),
  )
  const kandidaten = alle.filter((x) => x.id !== a.id && x.archiviertAm === null && x.kategorie === a.kategorie)

  async function absenden() {
    setFehler(null)
    const text = grund === 'anders' ? eigener.trim() : t(`preise.archiv.grund.${grund}`)
    if (!text) {
      setFehler(t('fachfehler.stand_grund_fehlt'))
      return
    }
    try {
      await speichern.mutateAsync({ text, nachfolger: nachfolger === KEINER ? null : nachfolger })
      onSchliessen()
      melde('ok', zweisprachig('preise.archiv.erledigt', { name: a.name }), {
        aktion: {
          text: zweisprachig('allgemein.rueckgaengig'),
          // Direkt aufrufen: der Dialog ist dann schon geschlossen.
          ausfuehren: () =>
            void archiviere(a.id, null)
              .then(() => qc.invalidateQueries({ queryKey: PREIS_SCHLUESSEL }))
              .catch((f: unknown) => {
                meldeFehler(f, 'preise.archiv')
              }),
        },
      })
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'preise.archiv')
      setFehler(t(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('preise.archiv.titel')}
        beschreibung={a.name}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Archive />
              {t('preise.archiv.knopf')}
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void absenden()
          }}
        >
          <Feld id="archiv-grund" label={t('preise.archiv.grundLabel')} pflicht {...(fehler ? { fehler } : {})}>
            <Auswahl
              id="archiv-grund"
              value={grund}
              onValueChange={(v) => {
                setGrund(v as (typeof GRUENDE)[number])
              }}
              optionen={GRUENDE.map((g) => ({ wert: g, text: t(`preise.archiv.grund.${g}`) }))}
            />
          </Feld>
          {grund === 'anders' && (
            <Feld id="archiv-eigener" label={t('preise.archiv.eigener')} pflicht>
              <Input
                id="archiv-eigener"
                value={eigener}
                onChange={(e) => {
                  setEigener(e.target.value)
                }}
              />
            </Feld>
          )}
          <Feld id="archiv-nachfolger" label={t('preise.archiv.nachfolger')}>
            <Auswahl
              id="archiv-nachfolger"
              value={nachfolger}
              onValueChange={setNachfolger}
              optionen={[
                { wert: KEINER, text: t('preise.archiv.keiner') },
                ...kandidaten.map((x) => ({ wert: x.id, text: [x.gruppe, x.name].filter(Boolean).join(' · ') })),
              ]}
            />
          </Feld>
        </form>
      </DialogInhalt>
    </Dialog>
  )
}
