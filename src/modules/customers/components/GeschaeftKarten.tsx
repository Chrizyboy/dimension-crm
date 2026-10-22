import { FileSignature, FileText, HardHat, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useAuswahl } from '@/hooks/useAuswahl'
import { tonVonFarbe } from '@/lib/kontakt'
import { chfOderLeer, datumOderLeer, jsonText, kwpText, terminText } from '../lib/anzeige'
import type { Kundenakte } from '../types'
import { Angabe, Angaben, Notizblock } from './Angaben'

/** Rahmen einer Geschäftskarte: Art und Nummer links, Status rechts. */
function Karte({
  icon: Icon,
  titel,
  status,
  children,
}: {
  icon: typeof Inbox
  titel: string
  status: ReactNode
  children: ReactNode
}) {
  return (
    <article className="bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <header className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="text-muted-foreground size-4" aria-hidden="true" />
          {titel}
        </h4>
        {status}
      </header>
      {children}
    </article>
  )
}

/** Status aus einer Auswahlliste als Marke (Text und Farbe aus den Daten). */
function Status({ liste, wert }: { liste: string; wert: string | null }) {
  const { finde, text } = useAuswahl(liste)
  if (!wert) return null
  return <Badge ton={tonVonFarbe(finde(wert)?.farbe)}>{text(wert)}</Badge>
}

const CHECKLISTE = ['drt', 'ai', 'schema', 'iat', 'rsF', 'pmF', 'rsR', 'pmR', 'certification'] as const

/**
 * Alle Geschäfte eines Kontakts mit ALLEN erfassten Angaben (Chris in V233: «alle Informationen
 * müssen im Kundenstamm enthalten sein»). Technische Referenzen stehen eingeklappt darunter.
 */
export function GeschaeftKarten({ akte }: { akte: Kundenakte }) {
  const { t } = useTranslation()
  const quelle = useAuswahl('quelle')
  const { verkaufschancen, offerten, projekte, werkvertraege } = akte
  if (verkaufschancen.length + offerten.length + projekte.length + werkvertraege.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('akte.keineGeschaefte')}</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {projekte.map((p) => (
        <Karte
          key={p.id}
          icon={HardHat}
          titel={`${t('akte.projekt')} ${p.nummer}`}
          status={<Status liste="projektstatus" wert={p.status} />}
        >
          <Angaben>
            <Angabe label={t('akte.feld.titel')}>{p.titel}</Angabe>
            <Angabe label={t('akte.feld.baustatus')}>
              {p.bau_status && <Status liste="baustatus" wert={p.bau_status} />}
            </Angabe>
            <Angabe label={t('akte.feld.baubeginn')}>{datumOderLeer(p.baubeginn)}</Angabe>
            <Angabe label={t('akte.feld.unterzeichnet')}>{datumOderLeer(p.unterzeichnet_am)}</Angabe>
            <Angabe label={t('akte.feld.vertragswert')}>{chfOderLeer(p.vertragswert_rappen)}</Angabe>
            <Angabe label={t('akte.feld.werktage')}>{p.werktage}</Angabe>
            <Angabe label={t('akte.feld.architekt')}>{p.architekt}</Angabe>
            <Angabe label={t('akte.feld.elektriker')}>{p.elektriker}</Angabe>
            <Angabe label={t('akte.feld.material')}>
              {p.material_status && t(`akte.materialStatus.${p.material_status}`, { defaultValue: p.material_status })}
            </Angabe>
            <Angabe label={t('akte.feld.konditionen')}>{p.zahlungskonditionen}</Angabe>
          </Angaben>
          <a href={`#/projects?projekt=${p.id}`} className="text-accent-ink self-start text-sm underline">
            {t('akte.projektOeffnen')}
          </a>
          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer text-xs">{t('akte.technisch')}</summary>
            <Angaben className="mt-3 sm:grid-cols-3">
              {CHECKLISTE.map((k) => (
                <Angabe key={k} label={t(`akte.check.${k}`)}>
                  {jsonText(p.checkliste, k)}
                </Angabe>
              ))}
            </Angaben>
          </details>
        </Karte>
      ))}

      {werkvertraege.map((w) => (
        <Karte
          key={w.id}
          icon={FileSignature}
          titel={`${t('akte.werkvertrag')} ${w.nummer}`}
          status={<Badge>{t(`akte.wvStatus.${w.status}`, { defaultValue: w.status })}</Badge>}
        >
          <Angaben>
            <Angabe label={t('akte.feld.betrag')}>{chfOderLeer(w.betrag_rappen)}</Angabe>
            <Angabe label={t('akte.feld.unterzeichnet')}>{datumOderLeer(w.unterschrieben_am)}</Angabe>
            <Angabe label={t('akte.feld.konditionen')}>
              {w.konditionen.length ? w.konditionen.join(' / ') + ' %' : ''}
            </Angabe>
            <Angabe label={t('akte.feld.sprache')}>{w.sprache.toUpperCase()}</Angabe>
          </Angaben>
        </Karte>
      ))}

      {offerten.map((o) => (
        <Karte
          key={o.id}
          icon={FileText}
          titel={`${t('akte.offerte')} ${o.nummer}`}
          status={<Status liste="offertstatus" wert={o.status} />}
        >
          <Angaben>
            <Angabe label={t('akte.feld.titel')}>{o.titel}</Angabe>
            <Angabe label={t('akte.feld.angebotAm')}>{datumOderLeer(o.angebot_am)}</Angabe>
            <Angabe label={t('akte.feld.betrag')}>{chfOderLeer(o.betrag_rappen)}</Angabe>
            <Angabe label={t('akte.feld.leistung')}>{kwpText(o.leistung_kwp)}</Angabe>
            <Angabe label={t('akte.feld.module')}>{o.anzahl_module}</Angabe>
            <Angabe label={t('akte.feld.wechselrichter')}>{o.wechselrichter}</Angabe>
            <Angabe label={t('akte.feld.batterie')}>{o.batterie}</Angabe>
            <Angabe label={t('akte.feld.entscheid')}>
              {o.entscheid
                ? `${t(`akte.entscheid.${o.entscheid}`, { defaultValue: o.entscheid })} ${datumOderLeer(o.entscheid_am)}`
                : ''}
            </Angabe>
            <Angabe label={t('akte.feld.nachfassenAm')}>{datumOderLeer(o.nachfassen_am)}</Angabe>
            <Angabe label={t('akte.feld.sprache')}>{o.sprache.toUpperCase()}</Angabe>
          </Angaben>
          <Notizblock label={t('akte.feld.nachfassen')} text={o.nachfassen} />
          <Notizblock label={t('akte.feld.vertagtGrund')} text={o.vertagt_grund} />
        </Karte>
      ))}

      {verkaufschancen.map((v) => (
        <Karte
          key={v.id}
          icon={Inbox}
          titel={`${t('akte.anfrage')} ${v.nummer}`}
          status={<Status liste="verkaufsstufe" wert={v.stufe} />}
        >
          <Angaben>
            <Angabe label={t('akte.feld.eingang')}>{datumOderLeer(v.eingang_am)}</Angabe>
            <Angabe label={t('akte.feld.quelle')}>{quelle.text(v.quelle)}</Angabe>
            <Angabe label={t('akte.feld.termin')}>{terminText(v.termin_am)}</Angabe>
            <Angabe label={t('akte.feld.zustaendig')}>{v.zustaendig}</Angabe>
            <Angabe label={t('akte.feld.interesse')}>{v.interesse.join(', ')}</Angabe>
            <Angabe label={t('akte.feld.finanzierung')}>{v.finanzierung}</Angabe>
            <Angabe label={t('akte.feld.foerderung')}>{v.foerderung}</Angabe>
            <Angabe label={t('akte.feld.zeithorizont')}>{v.zeithorizont}</Angabe>
            <Angabe label={t('akte.feld.erreichbarkeit')}>{v.erreichbarkeit}</Angabe>
            <Angabe label={t('akte.feld.wiedervorlage')}>
              {v.wiedervorlage_am ? `${datumOderLeer(v.wiedervorlage_am)} ${v.wiedervorlage_grund ?? ''}` : ''}
            </Angabe>
            {v.verlustgrund && <Angabe label={t('akte.feld.verlustgrund')}>{v.verlustgrund}</Angabe>}
          </Angaben>
          <Notizblock label={t('akte.feld.kommentarKunde')} text={v.kommentar_kunde} />
          <Notizblock label={t('akte.feld.verlauf')} text={v.verlauf_text} />
          <Notizblock label={t('akte.feld.notizIntern')} text={v.notiz_intern} />
        </Karte>
      ))}
    </div>
  )
}
