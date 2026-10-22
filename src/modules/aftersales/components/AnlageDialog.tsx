import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAktion } from '../hooks/useAktion'
import { anlageSpeichern } from '../services/service'
import type { Anlage, Komponente } from '../types'

const LEER: Komponente = { art: 'pv', hersteller: '', modell: '', anzahl: null, seriennummer: '', garantie_bis: null }

/**
 * Anlage-Daten bearbeiten: IBN, Garantie, nächste Kontrolle, Leistung, Monitoring (Hersteller, Link, Kennung)
 * und die Komponenten mit Seriennummer und Garantie (PV, Wechselrichter, Batterie, Wallbox, Wärmepumpe, Notstrom).
 */
export function AnlageDialog({ anlage, onSchliessen }: { anlage: Anlage; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const arten = useAuswahl('komponente')
  const monitoring = useAuswahl('monitoring')
  const [w, setW] = useState({
    ibn_am: anlage.ibn_am ?? '',
    garantie_bis: anlage.garantie_bis ?? '',
    naechste_kontrolle: anlage.naechste_kontrolle ?? '',
    leistung_kwp: anlage.leistung_kwp != null ? String(anlage.leistung_kwp) : '',
    notiz: anlage.notiz ?? '',
    mon_hersteller: anlage.monitoring?.hersteller ?? '',
    mon_link: anlage.monitoring?.link ?? '',
    mon_kennung: anlage.monitoring?.kennung ?? '',
  })
  const [teile, setTeile] = useState<Komponente[]>(anlage.komponenten)
  const teil = (i: number, k: Partial<Komponente>) => {
    setTeile(teile.map((x, j) => (j === i ? { ...x, ...k } : x)))
  }

  async function speichern() {
    const link = w.mon_link.trim()
    const ok = await aus(
      () =>
        anlageSpeichern(anlage.id, {
          ibn_am: w.ibn_am || null,
          garantie_bis: w.garantie_bis || null,
          naechste_kontrolle: w.naechste_kontrolle || null,
          leistung_kwp: w.leistung_kwp ? Number(w.leistung_kwp) : null,
          notiz: w.notiz.trim() || null,
          komponenten: teile,
          monitoring:
            w.mon_hersteller || link || w.mon_kennung
              ? {
                  hersteller: w.mon_hersteller,
                  // Nur Webadressen speichern, damit der Link nichts anderes öffnen kann.
                  link: /^https:\/\//.test(link) ? link : '',
                  kennung: w.mon_kennung.trim(),
                }
              : null,
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onSchliessen()
  }

  const datum = (f: 'ibn_am' | 'garantie_bis' | 'naechste_kontrolle') => (
    <Feld id={`an-${f}`} label={t(`service.anlagen.feld.${f}`)}>
      <Input
        id={`an-${f}`}
        type="date"
        value={w[f]}
        onChange={(e) => {
          setW({ ...w, [f]: e.target.value })
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
        titel={anlage.kunde}
        beschreibung={[anlage.adresse, anlage.projekt].filter(Boolean).join(' · ')}
        className="max-w-2xl"
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {datum('ibn_am')}
            {datum('garantie_bis')}
            {datum('naechste_kontrolle')}
            <Feld id="an-kwp" label={t('service.anlagen.feld.leistung')}>
              <Input
                id="an-kwp"
                inputMode="decimal"
                value={w.leistung_kwp}
                onChange={(e) => {
                  setW({ ...w, leistung_kwp: e.target.value.replace(',', '.') })
                }}
              />
            </Feld>
          </div>
          <fieldset className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
            <legend className="px-1 text-sm font-semibold">{t('service.anlagen.monitoring')}</legend>
            <Feld id="an-mon" label={t('service.anlagen.feld.hersteller')}>
              <Auswahl
                id="an-mon"
                value={w.mon_hersteller}
                onValueChange={(v) => {
                  setW({ ...w, mon_hersteller: v })
                }}
                optionen={monitoring.werte.map((m) => ({ wert: m.schluessel, text: monitoring.text(m.schluessel) }))}
              />
            </Feld>
            <Feld id="an-link" label={t('service.anlagen.feld.link')}>
              <Input
                id="an-link"
                type="url"
                placeholder="https://"
                value={w.mon_link}
                onChange={(e) => {
                  setW({ ...w, mon_link: e.target.value })
                }}
              />
            </Feld>
            <Feld id="an-kennung" label={t('service.anlagen.feld.kennung')}>
              <Input
                id="an-kennung"
                value={w.mon_kennung}
                onChange={(e) => {
                  setW({ ...w, mon_kennung: e.target.value })
                }}
              />
            </Feld>
          </fieldset>
          <section className="flex flex-col gap-2" aria-labelledby="an-teile">
            <h3 id="an-teile" className="text-sm font-semibold">
              {t('service.anlagen.komponenten')}
            </h3>
            {teile.map((k, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-2 rounded-lg border p-2 sm:grid-cols-[9rem_1fr_1fr_4rem_auto]"
              >
                <Auswahl
                  aria-label={t('service.anlagen.feld.art')}
                  value={k.art}
                  onValueChange={(v) => {
                    teil(i, { art: v })
                  }}
                  optionen={arten.werte.map((a) => ({ wert: a.schluessel, text: arten.text(a.schluessel) }))}
                />
                <Input
                  aria-label={t('service.anlagen.feld.hersteller')}
                  placeholder={t('service.anlagen.feld.hersteller')}
                  value={k.hersteller}
                  onChange={(e) => {
                    teil(i, { hersteller: e.target.value })
                  }}
                />
                <Input
                  aria-label={t('service.anlagen.feld.modell')}
                  placeholder={t('service.anlagen.feld.modell')}
                  value={k.modell}
                  onChange={(e) => {
                    teil(i, { modell: e.target.value })
                  }}
                />
                <Input
                  aria-label={t('service.anlagen.feld.anzahl')}
                  placeholder={t('service.anlagen.feld.anzahl')}
                  inputMode="numeric"
                  value={k.anzahl ?? ''}
                  onChange={(e) => {
                    teil(i, { anzahl: e.target.value ? Number(e.target.value) : null })
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('service.anlagen.entfernen')}
                  onClick={() => {
                    setTeile(teile.filter((_, j) => j !== i))
                  }}
                >
                  <Trash2 />
                </Button>
                <Input
                  className="col-span-2 sm:col-span-3"
                  aria-label={t('service.anlagen.feld.seriennummer')}
                  placeholder={t('service.anlagen.feld.seriennummer')}
                  value={k.seriennummer}
                  onChange={(e) => {
                    teil(i, { seriennummer: e.target.value })
                  }}
                />
                <Input
                  className="col-span-2"
                  type="date"
                  aria-label={t('service.anlagen.feld.garantie_bis')}
                  title={t('service.anlagen.feld.garantie_bis')}
                  value={k.garantie_bis ?? ''}
                  onChange={(e) => {
                    teil(i, { garantie_bis: e.target.value || null })
                  }}
                />
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => {
                setTeile([...teile, LEER])
              }}
            >
              <Plus />
              {t('service.anlagen.dazu')}
            </Button>
          </section>
          <Feld id="an-notiz" label={t('service.anlagen.feld.notiz')}>
            <Textarea
              id="an-notiz"
              rows={2}
              value={w.notiz}
              onChange={(e) => {
                setW({ ...w, notiz: e.target.value })
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
