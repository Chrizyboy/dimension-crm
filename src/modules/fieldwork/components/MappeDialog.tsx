import { FileText, Phone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum, formatTelefon } from '@/lib/format'
import { useMappe } from '../hooks/useLeitung'
import { adressText, telLink } from '../lib/links'

/** Was am Gerät als «geladen» abgehakt ist (nur für die Person am Handy, darum im Browser-Speicher). */
function geladenLesen(projekt: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`mappe-geladen:${projekt}`) ?? '[]') as string[]
  } catch {
    return []
  }
}

/**
 * Baustellen-Mappe: alles zur Baustelle auf einen Blick, am Handy abgelegt (geht auf dem Dach ohne Netz).
 * Anlage, Dach, Hinweise, Pläne, Kontakte und Material zum Abhaken beim Laden im Lager.
 */
export function MappeDialog({ projektId, onSchliessen }: { projektId: string; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const mappe = useMappe(projektId)
  const [geladen, setGeladen] = useState(() => new Set(geladenLesen(projektId)))
  const m = mappe.data

  const haken = (id: string, an: boolean) => {
    const n = new Set(geladen)
    if (an) n.add(id)
    else n.delete(id)
    setGeladen(n)
    try {
      localStorage.setItem(`mappe-geladen:${projektId}`, JSON.stringify([...n]))
    } catch {
      // ohne Speicher bleibt der Haken nur bis zum Schliessen
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
        art="seite"
        titel={m ? `${t('baustelle.mappe.titel')} · ${m.projekt.nummer}` : t('baustelle.mappe.titel')}
        {...(m ? { beschreibung: adressText(m.adresse) } : {})}
      >
        {mappe.error ? (
          <Fehlerzustand details={String(mappe.error)} onNochmal={() => void mappe.refetch()} />
        ) : !m ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col">
            {m.hinweise.length > 0 && (
              <ul className="bg-warn-soft mb-3 flex flex-col gap-1 rounded-md p-3 text-sm">
                {m.hinweise.map((h) => (
                  <li key={`${h.von}-${h.text}`}>{h.text}</li>
                ))}
              </ul>
            )}
            <AkteAbschnitt titel={t('baustelle.mappe.anlage')}>
              <dl>
                {m.anlage.kwp != null && <Angabe label="kWp">{m.anlage.kwp}</Angabe>}
                {m.anlage.module != null && <Angabe label={t('baustelle.mappe.module')}>{m.anlage.module}</Angabe>}
                {m.anlage.wechselrichter && (
                  <Angabe label={t('baustelle.mappe.wechselrichter')}>{m.anlage.wechselrichter}</Angabe>
                )}
                {m.anlage.batterie && <Angabe label={t('baustelle.mappe.batterie')}>{m.anlage.batterie}</Angabe>}
                {m.dach.dachform && <Angabe label={t('baustelle.mappe.dach')}>{m.dach.dachform}</Angabe>}
              </dl>
            </AkteAbschnitt>
            <AkteAbschnitt
              titel={t('baustelle.mappe.material')}
              zusatz={`${String(geladen.size)}/${String(m.material.length)}`}
            >
              <ul className="flex flex-col gap-1">
                {m.material.map((z) => (
                  <li key={z.id}>
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <Checkbox
                        checked={geladen.has(z.id)}
                        onCheckedChange={(v) => {
                          haken(z.id, v === true)
                        }}
                      />
                      <span className="zahlen w-16 shrink-0">
                        {z.menge} {z.einheit}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{z.bezeichnung}</span>
                      {z.fehlt > 0 && <Badge ton="warnung">{t('baustelle.mappe.fehlt', { count: z.fehlt })}</Badge>}
                    </label>
                  </li>
                ))}
              </ul>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('baustelle.mappe.plaene')} zusatz={String(m.dokumente.length)}>
              <ul className="flex flex-col gap-1 text-sm">
                {m.dokumente.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <FileText className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    {d.sharepoint_url ? (
                      <a
                        href={d.sharepoint_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary truncate underline"
                      >
                        {d.name}
                      </a>
                    ) : (
                      <span className="truncate">{d.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('baustelle.mappe.kontakte')}>
              <ul className="flex flex-col gap-2 text-sm">
                {m.kontakte.map((k) => (
                  <li key={`${k.rolle}-${k.name ?? ''}`} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="text-muted-foreground">{t(`baustelle.mappe.rolle.${k.rolle}`, k.rolle)}</span>{' '}
                      {k.name}
                    </span>
                    {k.telefon && telLink(k.telefon) && (
                      <a href={telLink(k.telefon) ?? ''} className="text-primary inline-flex items-center gap-1">
                        <Phone className="size-3.5" aria-hidden="true" />
                        {formatTelefon(k.telefon)}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </AkteAbschnitt>
            {m.meldungen.length > 0 && (
              <AkteAbschnitt titel={t('baustelle.mappe.meldungen')} zusatz={String(m.meldungen.length)}>
                <ul className="flex flex-col gap-1 text-sm">
                  {m.meldungen.map((x) => (
                    <li key={x.id}>
                      <Badge ton="warnung">{t(`baustelle.meldung.arten.${x.art}`)}</Badge> {x.text}{' '}
                      <span className="text-muted-foreground text-xs">{formatDatum(x.erstellt_am)}</span>
                    </li>
                  ))}
                </ul>
              </AkteAbschnitt>
            )}
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
