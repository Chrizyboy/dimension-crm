import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { useAktion } from '../../hooks/useAktion'
import { useWerbemittel } from '../../hooks/useKampagnen'
import { speichereWerbemittel, werbemittelPapierkorb } from '../../services/kampagnen'
import { WERBEMITTEL_ARTEN, type Werbemittel as Mittel } from '../../types'

const zahl = (w: string) => (w === '' ? null : Math.max(0, Math.round(Number(w))))

/** Werbemittel bearbeiten: Name, Art, Sprache, Version, Link (SharePoint), Bestand und Mindestbestand. */
function MittelDialog({ start, onSchliessen }: { start: Partial<Mittel>; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState<Partial<Mittel>>({ art: 'flyer', sprache: 'de', ...start })
  const linkOk = !w.link || w.link.startsWith('https://')
  const text = (f: 'name' | 'version' | 'link') => (
    <Feld
      id={`wm-${f}`}
      label={t(`werbung.mittel.${f}`)}
      pflicht={f === 'name'}
      {...(f === 'link' && !linkOk ? { fehler: t('werbung.mittel.linkFehler') } : {})}
    >
      <Input
        id={`wm-${f}`}
        value={w[f] ?? ''}
        onChange={(e) => {
          setW({ ...w, [f]: e.target.value || null })
        }}
      />
    </Feld>
  )
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={w.id ? (w.name ?? '') : t('werbung.mittel.neu')}
        fuss={
          <>
            {w.id && (
              <Button
                variant="ghost"
                disabled={laeuft}
                onClick={() => void aus(() => werbemittelPapierkorb(w.id ?? '')).then(onSchliessen)}
              >
                <Trash2 />
                {t('werbung.papierkorb')}
              </Button>
            )}
            <Button
              laedt={laeuft}
              disabled={!w.name?.trim() || !linkOk}
              onClick={() =>
                void aus(() => speichereWerbemittel({ ...w, name: (w.name ?? '').trim() }), {
                  de: 'Gespeichert',
                  fr: 'Enregistré',
                }).then(onSchliessen)
              }
            >
              {t('werbung.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {text('name')}
          <div className="grid grid-cols-2 gap-3">
            <Feld id="wm-art" label={t('werbung.mittel.art')}>
              <Auswahl
                id="wm-art"
                optionen={WERBEMITTEL_ARTEN.map((a) => ({ wert: a, text: t(`werbung.mittel.arten.${a}`) }))}
                value={w.art ?? 'flyer'}
                onValueChange={(a) => {
                  setW({ ...w, art: a as Mittel['art'] })
                }}
              />
            </Feld>
            <Feld id="wm-sprache" label={t('werbung.feld.sprache')}>
              <Auswahl
                id="wm-sprache"
                optionen={(['de', 'fr', 'de_fr'] as const).map((s) => ({ wert: s, text: t(`werbung.sprache.${s}`) }))}
                value={w.sprache ?? 'de'}
                onValueChange={(s) => {
                  setW({ ...w, sprache: s as Mittel['sprache'] })
                }}
              />
            </Feld>
            {(['bestand', 'mindestbestand'] as const).map((f) => (
              <Feld key={f} id={`wm-${f}`} label={t(`werbung.mittel.${f}`)}>
                <Input
                  id={`wm-${f}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={w[f] ?? ''}
                  onChange={(e) => {
                    setW({ ...w, [f]: zahl(e.target.value) })
                  }}
                />
              </Feld>
            ))}
          </div>
          {text('version')}
          {text('link')}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}

/** Werbemittel mit Lagerbestand; unter dem Mindestbestand rot und als Vorschlag auf der Übersicht. */
export function Werbemittel() {
  const { t } = useTranslation()
  const liste = useWerbemittel().data ?? []
  const [offen, setOffen] = useState<Partial<Mittel> | null>(null)
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">{t('werbung.mittel.titel')}</h2>
        <Button
          variant="secondary"
          onClick={() => {
            setOffen({})
          }}
        >
          <Plus />
          {t('werbung.mittel.neu')}
        </Button>
      </div>
      {liste.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('werbung.mittel.leer')}</p>
      ) : (
        <Tabelle>
          <TabelleKopf>
            <Zeile>
              <Kopfzelle>{t('werbung.mittel.name')}</Kopfzelle>
              <Kopfzelle>{t('werbung.mittel.art')}</Kopfzelle>
              <Kopfzelle>{t('werbung.feld.sprache')}</Kopfzelle>
              <Kopfzelle>{t('werbung.mittel.version')}</Kopfzelle>
              <Kopfzelle zahl>{t('werbung.mittel.bestand')}</Kopfzelle>
              <Kopfzelle>{t('werbung.mittel.link')}</Kopfzelle>
            </Zeile>
          </TabelleKopf>
          <TabelleKoerper>
            {liste.map((w) => {
              const knapp = w.bestand !== null && w.mindestbestand !== null && w.bestand < w.mindestbestand
              return (
                <Zeile
                  key={w.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setOffen(w)
                  }}
                >
                  <Zelle className="font-medium">{w.name}</Zelle>
                  <Zelle>{t(`werbung.mittel.arten.${w.art}`)}</Zelle>
                  <Zelle>{w.sprache ? t(`werbung.sprache.${w.sprache}`) : '–'}</Zelle>
                  <Zelle>{w.version ?? '–'}</Zelle>
                  <Zelle zahl>
                    {w.bestand ?? '–'}
                    {knapp && (
                      <Badge ton="kritisch" className="ml-2">
                        {t('werbung.mittel.knapp', { min: w.mindestbestand })}
                      </Badge>
                    )}
                  </Zelle>
                  <Zelle>
                    {w.link ? (
                      <a
                        href={w.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary inline-flex items-center gap-1 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                        {t('werbung.mittel.oeffnen')}
                      </a>
                    ) : (
                      '–'
                    )}
                  </Zelle>
                </Zeile>
              )
            })}
          </TabelleKoerper>
        </Tabelle>
      )}
      {offen && (
        <MittelDialog
          start={offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </section>
  )
}
