import { Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAutomationen'
import { gehtNachAussen, tabelleVon } from '../lib/anzeige'
import { automationInPapierkorb, speichereAutomation } from '../services/automationen'
import type { Entwurf } from '../lib/entwurf'
import type { Katalog, Modus } from '../types'
import { AktionenEditor } from './AktionenEditor'
import { BedingungenEditor } from './BedingungenEditor'

interface Props {
  start: Entwurf | null
  katalog: Katalog
  onSchliessen: () => void
}

/**
 * Automation bearbeiten: Auslöser → Bedingungen → Aktionen. Die Datenbank prüft beim Speichern noch einmal,
 * ob alles stimmt. «Automatisch» heisst: Mails und SMS gehen ohne Klick hinaus (Regel 6), darum ausdrücklich.
 */
export function AutomationEditor({ start, katalog, onSchliessen }: Props) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [e, setE] = useState<Entwurf | null>(start)
  const [wegFragen, setWegFragen] = useState(false)
  if (!e) return null
  const felder = katalog.felder[tabelleVon(katalog, e.ausloeser)] ?? []
  const setze = (teil: Partial<Entwurf>) => {
    setE({ ...e, ...teil })
  }
  const fehlt = !e.name_de.trim() || e.aktionen.length === 0

  async function speichern() {
    if (!e) return
    const ok = await aus(() => speichereAutomation({ ...e, name_fr: e.name_fr.trim() || e.name_de }), {
      de: 'Automation gespeichert',
      fr: 'Automatisation enregistrée',
    })
    if (ok) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        className="md:w-[46rem]"
        titel={e.id ? e.name_de || t('automationen.neu') : t('automationen.neu')}
        beschreibung={t('automationen.editor.beschreibung')}
        fuss={
          <div className="flex w-full items-center gap-2">
            {e.id && (
              <Button
                variant={wegFragen ? 'danger' : 'ghost'}
                disabled={laeuft}
                onClick={() => {
                  const id = e.id
                  if (!id) return
                  if (!wegFragen) {
                    setWegFragen(true)
                    return
                  }
                  void aus(() => automationInPapierkorb(id), { de: 'Im Papierkorb', fr: 'Dans la corbeille' }).then(
                    onSchliessen,
                  )
                }}
              >
                <Trash2 />
                {t(wegFragen ? 'automationen.editor.wirklichWeg' : 'automationen.editor.weg')}
              </Button>
            )}
            <span className="ml-auto" />
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button disabled={laeuft || fehlt} onClick={() => void speichern()}>
              {t('allgemein.speichern')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Feld id="auto-name-de" label={t('automationen.editor.nameDe')} pflicht>
              <Input
                id="auto-name-de"
                value={e.name_de}
                onChange={(x) => {
                  setze({ name_de: x.target.value })
                }}
              />
            </Feld>
            <Feld id="auto-name-fr" label={t('automationen.editor.nameFr')}>
              <Input
                id="auto-name-fr"
                value={e.name_fr}
                onChange={(x) => {
                  setze({ name_fr: x.target.value })
                }}
              />
            </Feld>
            <Feld id="auto-besch-de" label={t('automationen.editor.beschreibungDe')}>
              <Textarea
                id="auto-besch-de"
                className="min-h-14"
                value={e.beschreibung_de ?? ''}
                onChange={(x) => {
                  setze({ beschreibung_de: x.target.value })
                }}
              />
            </Feld>
            <Feld id="auto-besch-fr" label={t('automationen.editor.beschreibungFr')}>
              <Textarea
                id="auto-besch-fr"
                className="min-h-14"
                value={e.beschreibung_fr ?? ''}
                onChange={(x) => {
                  setze({ beschreibung_fr: x.target.value })
                }}
              />
            </Feld>
          </div>

          <Abschnitt nr={1} titel={t('automationen.editor.wenn')}>
            <Auswahl
              id="auto-ausloeser"
              aria-label={t('automationen.editor.ausloeser')}
              value={e.ausloeser}
              optionen={katalog.ereignisse.map((x) => ({
                wert: x.schluessel,
                text: t(`automationen.ereignis.${x.schluessel.replace('.', '_')}`),
              }))}
              onValueChange={(ausloeser) => {
                // Andere Tabelle, andere Felder: Bedingungen passen nicht mehr
                const gleich = tabelleVon(katalog, ausloeser) === tabelleVon(katalog, e.ausloeser)
                setze({ ausloeser, ...(gleich ? {} : { bedingungen: [] }) })
              }}
            />
            <p className="text-muted-foreground text-xs">
              {t(`automationen.ereignisHilfe.${e.ausloeser.replace('.', '_')}`)}
            </p>
          </Abschnitt>

          <Abschnitt nr={2} titel={t('automationen.editor.nurWenn')}>
            <BedingungenEditor
              id="auto-bed"
              wert={e.bedingungen}
              felder={felder}
              operatoren={katalog.operatoren}
              onChange={(bedingungen) => {
                setze({ bedingungen })
              }}
            />
          </Abschnitt>

          <Abschnitt nr={3} titel={t('automationen.editor.dann')}>
            <AktionenEditor
              wert={e.aktionen}
              katalog={katalog}
              felder={felder}
              modus={e.modus}
              onChange={(aktionen) => {
                setze({ aktionen })
              }}
            />
            <p className="text-muted-foreground text-xs">
              {t('automationen.editor.platzhalter')} {katalog.platzhalter.map((p) => `{${p}}`).join(' ')}
            </p>
          </Abschnitt>

          <div className="grid gap-3 sm:grid-cols-2">
            <Feld
              id="auto-modus"
              label={t('automationen.editor.modus')}
              hinweis={
                gehtNachAussen(e, katalog)
                  ? t(`automationen.modusHilfe.${e.modus}`)
                  : t('automationen.modusHilfe.innen')
              }
            >
              <Auswahl
                id="auto-modus"
                value={e.modus}
                optionen={(['freigabe', 'automatisch'] as const).map((m) => ({
                  wert: m,
                  text: t(`automationen.modus.${m}`),
                }))}
                onValueChange={(m) => {
                  setze({ modus: m as Modus })
                }}
              />
            </Feld>
            <label htmlFor="auto-aktiv" className="flex items-center gap-2 self-center text-sm">
              <Switch
                id="auto-aktiv"
                checked={e.aktiv}
                onCheckedChange={(aktiv) => {
                  setze({ aktiv })
                }}
              />
              {t('automationen.editor.aktiv')}
            </label>
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}

function Abschnitt({ nr, titel, children }: { nr: number; titel: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="bg-accent-soft text-accent-ink zahlen flex size-5 items-center justify-center rounded-full text-[11px]">
          {nr}
        </span>
        {titel}
      </h3>
      {children}
    </section>
  )
}
