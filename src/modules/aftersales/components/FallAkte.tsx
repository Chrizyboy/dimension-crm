import { CheckCircle2, ExternalLink, ListTodo, Paperclip } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum, formatDatumZeit } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { dokumentAdresse } from '@/services/dokumente'
import { useAktion } from '../hooks/useAktion'
import { useFall, usePersonen } from '../hooks/useService'
import { anhangHochladen, aufgabeZumFall, fallNotiz, fallSpeichern } from '../services/service'
import { KATEGORIEN, PRIORITAETEN, STATUS, type FallEingabe } from '../types'

/**
 * Akte eines Service-Falls: Stand, Priorität, Zuständig und Termin direkt änderbar, Beschreibung, Verlauf mit
 * Notizen, Anhänge (Fotos, Rapporte) und «Aufgabe erstellen». Der Kunde öffnet sich im Adressbuch.
 */
export function FallAkte({ id, onSchliessen }: { id: string; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { fall, anhaenge } = useFall(id)
  const { laeuft, aus } = useAktion()
  const personen = usePersonen()
  const kat = useAuswahl('servicekategorie')
  const prio = useAuswahl('prioritaet')
  const status = useAuswahl('servicestatus')
  const [notiz, setNotiz] = useState('')
  const datei = useRef<HTMLInputElement>(null)
  const f = fall.data

  const setze = (e: Partial<FallEingabe>) => {
    void aus(() => fallSpeichern(e, id))
  }
  const auswahl = (
    label: string,
    wert: string | null,
    optionen: { wert: string; text: string }[],
    feld: keyof FallEingabe,
  ) => (
    <Angabe label={label}>
      <Auswahl
        aria-label={label}
        value={wert ?? ''}
        onValueChange={(v) => {
          setze({ [feld]: v })
        }}
        optionen={optionen}
      />
    </Angabe>
  )
  const personName = (pid: string | null) => personen.data?.find((p) => p.id === pid)?.name ?? '–'

  const fuss = f && (
    <>
      <Button
        variant="secondary"
        laedt={laeuft}
        onClick={() => {
          const d = f.termin_am ?? new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
          void aus(() => aufgabeZumFall(f, d), { de: 'Aufgabe erstellt', fr: 'Tâche créée' })
        }}
      >
        <ListTodo />
        {t('service.akte.aufgabe')}
      </Button>
      {f.status !== 'erledigt' && (
        <Button
          laedt={laeuft}
          onClick={() => {
            setze({ status: 'erledigt' })
          }}
        >
          <CheckCircle2 />
          {t('service.akte.erledigt')}
        </Button>
      )}
    </>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        className="md:w-[34rem]"
        titel={f ? `${f.nummer} · ${f.titel}` : t('service.akte.titel')}
        {...(f ? { beschreibung: [f.kunde, f.ort, f.projekt].filter(Boolean).join(' · '), fuss } : {})}
      >
        {fall.error ? (
          <Fehlerzustand details={String(fall.error)} onNochmal={() => void fall.refetch()} />
        ) : !f ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap gap-1.5 pb-2">
              <Badge ton={tonVonFarbe(status.finde(f.status)?.farbe)} punkt>
                {status.text(f.status)}
              </Badge>
              <Badge ton={tonVonFarbe(prio.finde(f.prioritaet)?.farbe)}>{prio.text(f.prioritaet)}</Badge>
              {f.garantie && <Badge ton="info">{t('service.garantie')}</Badge>}
              {f.erledigt_am && (
                <Badge ton="ok">{t('service.akte.erledigtAm', { datum: formatDatum(f.erledigt_am) })}</Badge>
              )}
            </div>
            <AkteAbschnitt titel={t('service.akte.angaben')}>
              <dl>
                <Angabe label={t('service.feld.kunde')}>
                  {f.kontakt_id ? (
                    <a
                      href={`#/customers?kunde=${f.kontakt_id}`}
                      className="text-accent-ink inline-flex items-center gap-1 underline"
                    >
                      {f.kunde}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    '–'
                  )}
                </Angabe>
                {auswahl(
                  t('service.feld.status'),
                  f.status,
                  STATUS.map((s) => ({ wert: s, text: status.text(s) })),
                  'status',
                )}
                {auswahl(
                  t('service.feld.prioritaet'),
                  f.prioritaet,
                  PRIORITAETEN.map((p) => ({ wert: p, text: prio.text(p) })),
                  'prioritaet',
                )}
                {auswahl(
                  t('service.feld.kategorie'),
                  f.kategorie,
                  KATEGORIEN.map((k) => ({ wert: k, text: kat.text(k) })),
                  'kategorie',
                )}
                {auswahl(
                  t('service.feld.zustaendig'),
                  f.person_id,
                  (personen.data ?? []).map((p) => ({ wert: p.id, text: p.name })),
                  'person_id',
                )}
                <Angabe label={t('service.feld.termin')}>
                  <Input
                    type="date"
                    aria-label={t('service.feld.termin')}
                    defaultValue={f.termin_am ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (f.termin_am ?? '')) setze({ termin_am: e.target.value || null })
                    }}
                  />
                </Angabe>
                <Angabe label={t('service.feld.garantieFall')}>
                  <Switch
                    aria-label={t('service.feld.garantieFall')}
                    checked={f.garantie ?? false}
                    onCheckedChange={(g) => {
                      setze({ garantie: g })
                    }}
                  />
                </Angabe>
              </dl>
              {f.beschreibung && (
                <p className="bg-muted/60 mt-2 rounded-md p-3 text-sm whitespace-pre-wrap">{f.beschreibung}</p>
              )}
            </AkteAbschnitt>

            <AkteAbschnitt titel={t('service.akte.verlauf')} zusatz={String(f.verlauf.length)}>
              <ol className="flex flex-col gap-2">
                {[...f.verlauf].reverse().map((v, i) => (
                  <li key={`${v.am}-${String(i)}`} className="text-sm">
                    <span className="text-muted-foreground text-xs">
                      {formatDatumZeit(v.am)} · {personName(v.person_id)}
                    </span>
                    <p className="whitespace-pre-wrap">{v.text}</p>
                  </li>
                ))}
                <li className="text-muted-foreground text-xs">
                  {formatDatumZeit(f.erstellt_am)} · {t('service.akte.erfasst')}
                </li>
              </ol>
              <div className="mt-3 flex flex-col gap-2">
                <Textarea
                  aria-label={t('service.akte.notiz')}
                  placeholder={t('service.akte.notiz')}
                  rows={2}
                  value={notiz}
                  onChange={(e) => {
                    setNotiz(e.target.value)
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="self-end"
                  disabled={!notiz.trim()}
                  laedt={laeuft}
                  onClick={() => {
                    void aus(() => fallNotiz(id, notiz)).then((ok) => {
                      if (ok) setNotiz('')
                    })
                  }}
                >
                  {t('service.akte.notizSpeichern')}
                </Button>
              </div>
            </AkteAbschnitt>

            <AkteAbschnitt titel={t('service.akte.anhaenge')} zusatz={String(anhaenge.data?.length ?? 0)}>
              <ul className="flex flex-col gap-1 text-sm">
                {(anhaenge.data ?? []).map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="text-accent-ink inline-flex items-center gap-1 underline"
                      onClick={() => {
                        void dokumentAdresse(d).then((u) => {
                          if (u) window.open(u, '_blank', 'noopener')
                        })
                      }}
                    >
                      <Paperclip className="size-3.5" aria-hidden="true" />
                      {d.name}
                    </button>
                  </li>
                ))}
              </ul>
              <input
                ref={datei}
                type="file"
                hidden
                aria-label={t('service.akte.hochladen')}
                onChange={(e) => {
                  const d = e.target.files?.[0]
                  if (d) void aus(() => anhangHochladen(id, d), { de: 'Datei abgelegt', fr: 'Fichier déposé' })
                  e.target.value = ''
                }}
              />
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => datei.current?.click()}>
                <Paperclip />
                {t('service.akte.hochladen')}
              </Button>
            </AkteAbschnitt>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
