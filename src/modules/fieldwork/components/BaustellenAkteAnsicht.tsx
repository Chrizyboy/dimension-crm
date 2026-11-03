import { Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { formatChf, formatDatum, formatTelefon } from '@/lib/format'
import { useAkte } from '../hooks/useLeitung'
import { adressText, telLink } from '../lib/links'
import { Balken } from './Balken'
import { Bautagebuch } from './Bautagebuch'
import { MeldungZeileAnzeige } from './MeldungZeileAnzeige'
import { SollStunden } from './SollStunden'

/**
 * Baustellen-Akte für Projektleitung und GL: Fortschritt nach Schritten, Soll/Ist, Einsätze, Bautagebuch,
 * Meldungen, Nachträge, Pflichtfotos und Seriennummern. #/fieldwork?reiter=baustellen&baustelle=…
 */
export function BaustellenAkteAnsicht({
  projektId,
  onSchliessen,
  onRapport,
}: {
  projektId: string
  onSchliessen: () => void
  onRapport: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const sprache = i18n.language.startsWith('fr') ? 'fr' : 'de'
  const akte = useAkte(projektId)
  const a = akte.data
  const tel = a ? telLink(a.projekt.telefon) : null
  const fotoKat = new Set(a?.fotos.map((f) => f.kategorie).filter(Boolean))

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        breite="breit"
        titel={a ? `${a.projekt.nummer} · ${a.projekt.kunde ?? '–'}` : t('baustelle.akte.titel')}
        {...(a ? { beschreibung: adressText(a.projekt) } : {})}
      >
        {akte.error ? (
          <Fehlerzustand details={String(akte.error)} onNochmal={() => void akte.refetch()} />
        ) : !a ? (
          <Skelett className="h-96" />
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap gap-1.5 pb-3">
              <Badge ton="marke">{t(`baustelle.vorlage.${a.projekt.vorlage}`, a.projekt.vorlage)}</Badge>
              {a.projekt.speicher && <Badge ton="info">{t('baustelle.akte.speicher')}</Badge>}
              {a.projekt.kwp != null && <Badge ton="neutral">{a.projekt.kwp} kWp</Badge>}
              {a.material.fehlt > 0 && (
                <Badge ton="warnung">{t('baustelle.tag.materialFehlt', { count: a.material.fehlt })}</Badge>
              )}
            </div>
            <dl>
              {a.projekt.pl && <Angabe label={t('baustelle.tag.pl')}>{a.projekt.pl}</Angabe>}
              {a.projekt.elektriker && <Angabe label={t('baustelle.tag.elektriker')}>{a.projekt.elektriker}</Angabe>}
              {tel && a.projekt.telefon && (
                <Angabe label={t('baustelle.akte.telefon')}>
                  <a href={tel} className="text-primary inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden="true" />
                    {formatTelefon(a.projekt.telefon)}
                  </a>
                </Angabe>
              )}
            </dl>
            <AkteAbschnitt titel={t('baustelle.schritte.titel')} zusatz={`${String(a.fortschritt)}%`}>
              <Balken wert={a.fortschritt} beschriftung={t('baustelle.schritte.titel')} className="mb-2" />
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {a.schritte.map((s) => (
                  <li key={s.schluessel} className={a.erledigt[s.schluessel] ? '' : 'text-muted-foreground'}>
                    {a.erledigt[s.schluessel] ? '✓' : '○'} {s[sprache]}
                    {a.erledigt[s.schluessel] && (
                      <span className="text-muted-foreground text-xs">
                        {' '}
                        {formatDatum(a.erledigt[s.schluessel] ?? '')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('baustelle.akte.stunden')}>
              <SollStunden projektId={a.projekt.id} s={a.stunden} />
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('baustelle.akte.einsaetze')} zusatz={String(a.einsaetze.length)}>
              <ul className="flex flex-col gap-1 text-sm">
                {a.einsaetze.map((e) => (
                  <li key={e.id}>
                    <span className="zahlen">
                      {formatDatum(e.von)}
                      {e.bis !== e.von ? ` – ${formatDatum(e.bis)}` : ''}
                    </span>{' '}
                    <span className="text-muted-foreground">{e.team.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('baustelle.akte.tagebuch')} zusatz={String(a.rapporte.length)}>
              <Bautagebuch rapporte={a.rapporte} onRapport={onRapport} />
            </AkteAbschnitt>
            <AkteAbschnitt
              titel={t('baustelle.leitung.meldungen')}
              zusatz={String(a.meldungen.length)}
              offen={a.meldungen.some((m) => !m.erledigt_am)}
            >
              {a.meldungen.length === 0 && (
                <p className="text-muted-foreground text-sm">{t('baustelle.leitung.keineMeldungen')}</p>
              )}
              {a.meldungen.map((m) => (
                <MeldungZeileAnzeige key={m.id} m={m} />
              ))}
            </AkteAbschnitt>
            <AkteAbschnitt
              titel={t('baustelle.reiter.nachtraege')}
              zusatz={String(a.nachtraege.length)}
              offen={a.nachtraege.length > 0}
            >
              <ul className="flex flex-col gap-1 text-sm">
                {a.nachtraege.map((n) => (
                  <li key={n.id} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {n.nummer} {n.beschreibung}
                    </span>
                    <span className="zahlen shrink-0">
                      {n.betrag_rappen != null ? formatChf(n.betrag_rappen) : '–'}
                    </span>
                  </li>
                ))}
              </ul>
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('baustelle.foto.titel')} zusatz={String(a.fotos.length)}>
              <ul className="flex flex-wrap gap-1.5">
                {a.fotos_pflicht.map((f) => (
                  <li key={f.schluessel}>
                    <Badge ton={fotoKat.has(f.schluessel) ? 'ok' : 'warnung'}>
                      {fotoKat.has(f.schluessel) ? '✓' : '○'} {f[sprache]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </AkteAbschnitt>
            {a.anlage && (
              <AkteAbschnitt titel={t('baustelle.sn.titel')} zusatz={String(a.anlage.komponenten.length)}>
                <ul className="flex flex-col gap-1 text-sm">
                  {a.anlage.komponenten.map((k, i) => (
                    <li key={`${k.seriennummer ?? ''}-${String(i)}`}>
                      <span className="text-muted-foreground">
                        {t(`baustelle.sn.art.${k.art ?? 'andere'}`, k.art ?? '')}
                      </span>{' '}
                      {k.modell} <span className="zahlen font-mono">{k.seriennummer ?? '–'}</span>
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
