import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatChf, formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useNachkalkulation } from '../hooks/useProjekte'
import type { Akte, Projekt } from '../types'
import { Box, Zeile } from './AkteBox'

const chf = (r: number) => formatChf(r, { mitWaehrung: true })

/** Termine: Einsätze mit Team oder Subunternehmer, «Zeitplan» öffnet die Planung. */
export function Termine({ akte, onPlanen }: { akte: Akte; onPlanen: () => void }) {
  const { t } = useTranslation()
  return (
    <Box
      titel={t('projekte.seite.termine')}
      rechts={
        <button type="button" className="underline" onClick={onPlanen}>
          {t('projekte.akteReiter.zeitplan')}
        </button>
      }
    >
      {akte.einsaetze.length === 0 ? (
        <p className="text-muted-foreground">{t('projekte.seite.keineTermine')}</p>
      ) : (
        akte.einsaetze.map((e) => (
          <Zeile
            key={e.id}
            gedaempft={e.art === 'geplant'}
            links={
              <>
                {e.subunternehmer ?? (e.personen.length ? e.personen.join(', ') : t(`projekte.einsatz.${e.art}`))}
                {e.notiz ? <span className="text-muted-foreground block text-xs">{e.notiz}</span> : null}
              </>
            }
            rechts={e.von === e.bis ? formatDatum(e.von) : `${formatDatum(e.von)}–${formatDatum(e.bis)}`}
          />
        ))
      )}
    </Box>
  )
}

/** Material je Position: vorhanden, unterwegs mit Liefertermin, fehlt rot. */
export function Material({ akte, projektId }: { akte: Akte; projektId: string }) {
  const { t } = useTranslation()
  const fehlt = akte.material.filter((m) => m.fehlt > 0).length
  const lieferung = akte.bestellungen
    .map((b) => b.liefertermin)
    .filter(Boolean)
    .sort()
    .at(-1)
  return (
    <Box
      titel={t('projekte.seite.material')}
      rechts={
        akte.material.length > 0 ? (
          <Badge ton={fehlt ? 'kritisch' : 'ok'}>
            {fehlt ? t('projekte.hinweis.material_fehlt', { anzahl: fehlt }) : t('projekte.hinweis.material_ok')}
          </Badge>
        ) : undefined
      }
    >
      {akte.material.length === 0 ? (
        <p className="text-muted-foreground">{t('projekte.seite.keinMaterial')}</p>
      ) : (
        akte.material
          .slice(0, 8)
          .map((m) => (
            <Zeile
              key={m.id}
              links={`${m.menge} ${m.einheit ?? ''} ${m.bezeichnung}`}
              rechts={
                m.fehlt > 0 ? (
                  <Badge ton="kritisch">{t('projekte.seite.fehlt', { menge: m.fehlt })}</Badge>
                ) : m.unterwegs > 0 ? (
                  <Badge ton="info">{t('projekte.seite.unterwegs')}</Badge>
                ) : (
                  <Badge ton="ok">{t('projekte.seite.da')}</Badge>
                )
              }
            />
          ))
      )}
      {lieferung && <Zeile gedaempft links={t('projekte.seite.lieferung')} rechts={formatDatum(lieferung)} />}
      <a className="text-accent-ink text-xs underline" href={`#/purchasing?reiter=material&projekt=${projektId}`}>
        {t('projekte.seite.zumEinkauf')}
      </a>
    </Box>
  )
}

/** Geld: Vertrag, Nachträge, Tranchen mit Rechnung und bezahlt. */
export function Geld({ p, akte }: { p: Projekt; akte: Akte }) {
  const { t } = useTranslation()
  const nachtraege = akte.nachtraege.filter((n) => n.status !== 'abgelehnt')
  return (
    <Box titel={t('projekte.seite.geld')}>
      <Zeile
        links={t('projekte.seite.vertragInkl')}
        rechts={p.vertragswert_rappen ? chf(p.vertragswert_rappen) : '–'}
      />
      {nachtraege.map((n) => (
        <Zeile
          key={n.id}
          gedaempft={n.status === 'offen'}
          links={`${n.nummer} ${n.beschreibung}${n.status === 'offen' ? ` (${t('projekte.seite.offen')})` : ''}`}
          rechts={n.betrag_rappen != null ? chf(n.betrag_rappen) : '–'}
        />
      ))}
      {akte.tranchen.length > 0 && <hr />}
      {akte.tranchen.map((z) => {
        const r = akte.rechnungen.find((x) => x.id === z.rechnung?.id)
        const stand =
          z.bezahlt_am || r?.status === 'bezahlt'
            ? { ton: 'ok' as const, text: t('projekte.seite.bezahlt') }
            : r && r.status !== 'entwurf'
              ? { ton: 'info' as const, text: t('projekte.seite.gestellt', { nummer: r.nummer ?? '' }) }
              : r
                ? { ton: 'neutral' as const, text: t('projekte.seite.entwurf') }
                : z.faellig_am && z.faellig_am <= new Date().toISOString().slice(0, 10)
                  ? { ton: 'warnung' as const, text: t('projekte.seite.stellen') }
                  : {
                      ton: 'neutral' as const,
                      text: z.faellig_am ? formatDatum(z.faellig_am) : t('projekte.seite.spaeter'),
                    }
        return (
          <Zeile
            key={z.id}
            links={
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge ton={stand.ton}>{stand.text}</Badge>
                {z.bezeichnung}
              </span>
            }
            rechts={chf(z.betrag_rappen)}
          />
        )
      })}
      <a className="text-accent-ink text-xs underline" href="#/invoices?reiter=verrechnen">
        {t('projekte.seite.zuRechnungen')}
      </a>
    </Box>
  )
}

/** Nachkalkulation, nur mit Recht Preise oder Finanzen: Marge, Stunden, Material Soll und Ist (exkl. MWST). */
export function Kalkulation({ p, akte }: { p: Projekt; akte: Akte }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const darf = hatRecht(ich, 'preise') || hatRecht(ich, 'finanzen')
  const k = useNachkalkulation(p.id, darf)
  if (!darf || !k.data) return null
  const { soll, ist } = k.data
  const prozent = (z: number, n: number | null) => (n ? `${((z / n) * 100).toFixed(1)} %` : '–')
  const geplant =
    soll.verkauf_rappen != null && soll.einkauf_rappen != null ? soll.verkauf_rappen - soll.einkauf_rappen : null
  return (
    <Box titel={t('projekte.seite.kalkulation')} rechts={t('projekte.seite.exkl')}>
      <Zeile
        links={t('projekte.seite.margeSoll')}
        rechts={geplant != null ? prozent(geplant, soll.verkauf_rappen) : '–'}
      />
      <Zeile
        links={t('projekte.seite.margeIst')}
        rechts={`${chf(ist.marge_rappen)} · ${prozent(ist.marge_rappen, ist.umsatz_rappen)}`}
      />
      <Zeile links={t('projekte.seite.stundenSollIst')} rechts={`${soll.stunden ?? '–'} / ${akte.stunden}`} />
      <Zeile
        links={t('projekte.seite.materialSollIst')}
        rechts={`${soll.einkauf_rappen != null ? formatChf(soll.einkauf_rappen) : '–'} / ${formatChf(ist.material_rappen)}`}
      />
      <Zeile links={t('projekte.seite.verrechnet')} rechts={chf(ist.verrechnet_rappen)} />
    </Box>
  )
}
