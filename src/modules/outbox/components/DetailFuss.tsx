import { Ban, CalendarClock, ChevronDown, Pencil, Send, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useTaste } from '@/hooks/useTaste'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTrenner } from '@/components/ui/menue'
import { spaeterZeiten, VERWERF_GRUENDE, zeitpunkt } from '../lib/anzeige'

type Form =
  { art: 'verwerfen'; grund: string; frei: string } | { art: 'zurueck'; notiz: string } | { art: 'zeit'; wert: string }

/**
 * Fusszeile einer wartenden Nachricht: Nicht senden (mit Grund), Zurück an (mit Notiz), Ändern, Später senden und
 * die Hauptaktion «Freigeben und senden». Die kleinen Formulare klappen über den Knöpfen auf.
 */
export function DetailFuss({
  darf,
  mitFreigabe = true,
  laeuft,
  bearbeiten,
  vorbereitetVon,
  onBearbeiten,
  onFreigeben,
  onVerwerfen,
  onZurueck,
}: {
  darf: boolean
  /** Bei Fehlern sendet der Lösungskasten oben nochmals; hier dann nur Nebenaktionen. */
  mitFreigabe?: boolean
  laeuft: boolean
  bearbeiten: boolean
  vorbereitetVon: string | null
  onBearbeiten: () => void
  onFreigeben: (sendeAb: Date | null) => void
  onVerwerfen: (grund: string) => void
  onZurueck: (notiz: string) => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState<Form | null>(null)
  const zeiten = spaeterZeiten()
  useTaste(
    'v',
    () => {
      setForm({ art: 'verwerfen', grund: '', frei: '' })
    },
    form === null && !laeuft,
    t('ausgang.kuerzel.verwerfen'),
  )

  return (
    <div className="flex w-full flex-col gap-3">
      {form?.art === 'verwerfen' && (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <span className="text-sm font-medium">{t('ausgang.grundFrage')}</span>
          <div className="flex flex-wrap gap-1.5">
            {VERWERF_GRUENDE.map((g) => (
              <Button
                key={g}
                size="sm"
                variant={form.grund === g ? 'primary' : 'secondary'}
                onClick={() => {
                  setForm({ ...form, grund: g })
                }}
              >
                {t(`ausgang.verwerfGrund.${g}`)}
              </Button>
            ))}
          </div>
          {form.grund === 'anderes' && (
            <Feld id="ausgang-grund" label={t('ausgang.grund')}>
              <Input
                id="ausgang-grund"
                autoFocus
                value={form.frei}
                onChange={(x) => {
                  setForm({ ...form, frei: x.target.value })
                }}
              />
            </Feld>
          )}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setForm(null)
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              laedt={laeuft}
              disabled={!form.grund || (form.grund === 'anderes' && !form.frei.trim())}
              onClick={() => {
                onVerwerfen(form.grund === 'anderes' ? form.frei : t(`ausgang.verwerfGrund.${form.grund}`))
              }}
            >
              {t('ausgang.verwerfenJa')}
            </Button>
          </div>
        </div>
      )}
      {form?.art === 'zurueck' && (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <Feld id="ausgang-notiz" label={t('ausgang.zurueckFrage', { name: vorbereitetVon ?? '' })}>
            <Input
              id="ausgang-notiz"
              autoFocus
              value={form.notiz}
              placeholder={t('ausgang.zurueckBeispiel')}
              onChange={(x) => {
                setForm({ ...form, notiz: x.target.value })
              }}
            />
          </Feld>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setForm(null)
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              size="sm"
              laedt={laeuft}
              disabled={!form.notiz.trim()}
              onClick={() => {
                onZurueck(form.notiz)
              }}
            >
              {t('ausgang.zurueckSenden')}
            </Button>
          </div>
        </div>
      )}
      {form?.art === 'zeit' && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <Feld id="ausgang-zeit" label={t('ausgang.eigeneZeit')}>
            <Input
              id="ausgang-zeit"
              type="datetime-local"
              value={form.wert}
              onChange={(x) => {
                setForm({ ...form, wert: x.target.value })
              }}
            />
          </Feld>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setForm(null)
            }}
          >
            {t('allgemein.abbrechen')}
          </Button>
          <Button
            size="sm"
            laedt={laeuft}
            disabled={!form.wert || !darf}
            onClick={() => {
              onFreigeben(new Date(form.wert))
            }}
          >
            {t('ausgang.planen')}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Knopfleiste>
          <Button
            variant="ghost"
            disabled={laeuft}
            onClick={() => {
              setForm({ art: 'verwerfen', grund: '', frei: '' })
            }}
          >
            <Ban />
            {t('ausgang.verwerfen')}
            <Kbd className="max-sm:hidden">V</Kbd>
          </Button>
          {vorbereitetVon && (
            <Button
              variant="ghost"
              disabled={laeuft}
              onClick={() => {
                setForm({ art: 'zurueck', notiz: '' })
              }}
            >
              <Undo2 />
              {t('ausgang.zurueckAn', { name: vorbereitetVon })}
            </Button>
          )}
          {!bearbeiten && (
            <Button variant="secondary" disabled={laeuft} onClick={onBearbeiten}>
              <Pencil />
              {t('ausgang.bearbeiten')}
              <Kbd className="max-sm:hidden">E</Kbd>
            </Button>
          )}
        </Knopfleiste>
        {mitFreigabe && (
          <div className="flex items-center gap-2">
            <Menue>
              <MenueAusloeser asChild>
                <Button variant="secondary" disabled={laeuft || !darf}>
                  <CalendarClock />
                  {t('ausgang.spaeter')}
                  <ChevronDown />
                </Button>
              </MenueAusloeser>
              <MenueInhalt align="end">
                {zeiten.map((z) => (
                  <MenueEintrag
                    key={z.schluessel}
                    onSelect={() => {
                      onFreigeben(z.zeit)
                    }}
                  >
                    {t(`ausgang.zeit.${z.schluessel}`)}
                    <span className="text-muted-foreground ml-auto pl-4 text-xs">
                      {zeitpunkt(z.zeit.toISOString())}
                    </span>
                  </MenueEintrag>
                ))}
                <MenueTrenner />
                <MenueEintrag
                  onSelect={() => {
                    setForm({ art: 'zeit', wert: '' })
                  }}
                >
                  {t('ausgang.eigeneZeit')}
                </MenueEintrag>
              </MenueInhalt>
            </Menue>
            <Button
              variant="accent"
              laedt={laeuft}
              disabled={!darf}
              onClick={() => {
                onFreigeben(null)
              }}
            >
              <Send />
              {t('ausgang.freigebenSenden')}
              <Kbd className="max-sm:hidden">F</Kbd>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
