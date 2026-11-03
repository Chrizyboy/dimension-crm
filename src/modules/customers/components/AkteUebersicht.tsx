import { Building2, Pencil, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KiKnopf } from '@/components/shared/ki/KiKnopf'
import { KiZusammenfassung } from '@/components/shared/ki/KiZusammenfassung'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatTelefon } from '@/lib/format'
import { adresseEinzeilig, formatKundennummer } from '@/lib/kontakt'
import type { Kontaktzeile } from '@/types/kontakt'
import { datumOderLeer, jsonText } from '../lib/anzeige'
import { erstesDatum } from '../lib/kennzahlen'
import { naechsterSchritt } from '../lib/naechsterSchritt'
import type { Kundenakte, Objekt } from '../types'
import { AkteAbaninja } from './AkteAbaninja'
import { Angabe, Angaben, Notizblock } from './Angaben'
import { GeschaeftKarten } from './GeschaeftKarten'
import { NaechsterSchritt } from './NaechsterSchritt'

interface AkteUebersichtProps {
  kopf: Kontaktzeile
  akte: Kundenakte
  onAnrufen: () => void
  onObjekt: (objekt: Objekt | null) => void
}

function Abschnitt({
  titel,
  aktion,
  children,
}: {
  titel: string
  aktion?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{titel}</h3>
        {aktion}
      </div>
      {children}
    </section>
  )
}

/** Gebäude mit Adresse und den Angaben aus Anfrage und Besichtigung. */
export function Gebaeude({ objekt, onBearbeiten }: { objekt: Objekt; onBearbeiten: () => void }) {
  const { t } = useTranslation()
  const art = useAuswahl('gebaeudeart')
  const dach = useAuswahl('dachform')
  const eigentum = useAuswahl('eigentum')
  return (
    <article className="bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <header className="flex items-start justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="text-muted-foreground size-4" aria-hidden="true" />
          {adresseEinzeilig(objekt) || t('akte.ohneAdresse')}
        </h4>
        <Button size="icon" variant="ghost" onClick={onBearbeiten} aria-label={t('akte.gebaeudeBearbeiten')}>
          <Pencil />
        </Button>
      </header>
      <Angaben>
        <Angabe label={t('akte.feld.gebaeudeart')}>{art.text(objekt.gebaeudeart)}</Angabe>
        <Angabe label={t('akte.feld.dachform')}>{dach.text(objekt.dachform)}</Angabe>
        <Angabe label={t('akte.feld.eigentum')}>{eigentum.text(objekt.eigentum)}</Angabe>
        <Angabe label={t('akte.feld.verbrauch')}>{objekt.verbrauch_kwh ? `${objekt.verbrauch_kwh} kWh` : ''}</Angabe>
        <Angabe label={t('akte.feld.besichtigung')}>{datumOderLeer(jsonText(objekt.dach, 'datum'))}</Angabe>
        <Angabe label={t('akte.feld.gemeinde')}>{objekt.gemeinde}</Angabe>
        <Angabe label={t('akte.feld.heizung')}>{objekt.heizung}</Angabe>
      </Angaben>
      {objekt.vor_ort && (
        <p className="bg-warn-soft rounded-md px-3 py-2 text-sm whitespace-pre-line">
          <span className="font-medium">{t('akte.feld.vorOrt')}: </span>
          {objekt.vor_ort}
        </p>
      )}
    </article>
  )
}

/** Kontaktdaten mit Einwilligung, «erfasst seit» und Notiz; auch in der ganzen Kundenseite. */
export function KontaktAngaben({ kopf, akte }: { kopf: Kontaktzeile; akte: Kundenakte }) {
  const { t } = useTranslation()
  const k = akte.kontakt
  const einwilligung = k.einwilligung && typeof k.einwilligung === 'object' ? k.einwilligung : null
  return (
    <>
      <Angaben>
        <Angabe label={t('akte.feld.nummer')}>{formatKundennummer(k.kundennummer)}</Angabe>
        <Angabe label={t('akte.feld.name')}>{[k.anrede, k.vorname, k.nachname].filter(Boolean).join(' ')}</Angabe>
        {k.firma && <Angabe label={t('akte.feld.firma')}>{k.firma}</Angabe>}
        <Angabe label={t('akte.feld.telefon')}>{k.telefon && formatTelefon(k.telefon)}</Angabe>
        <Angabe label={t('akte.feld.email')}>{k.email}</Angabe>
        <Angabe label={t('akte.feld.adresse')}>{adresseEinzeilig(kopf)}</Angabe>
        <Angabe label={t('akte.feld.einwilligung')}>
          {k.werbesperre
            ? t('akte.werbesperre')
            : einwilligung
              ? t('akte.einwilligungJa', {
                  quelle: jsonText(einwilligung, 'quelle'),
                  datum: datumOderLeer(jsonText(einwilligung, 'datum')),
                })
              : ''}
        </Angabe>
        <Angabe label={t('akte.feld.erfasst')}>{datumOderLeer(erstesDatum(akte))}</Angabe>
      </Angaben>
      <Notizblock label={t('akte.feld.notiz')} text={k.notiz} />
    </>
  )
}

/** Reiter «Übersicht»: was jetzt zu tun ist, Kontaktdaten, Gebäude und alle Geschäfte. */
export function AkteUebersicht({ kopf, akte, onAnrufen, onObjekt }: AkteUebersichtProps) {
  const { t } = useTranslation()
  const k = akte.kontakt
  return (
    <div className="flex flex-col gap-6">
      <NaechsterSchritt schritt={naechsterSchritt(kopf, akte)} onAnrufen={onAnrufen} />

      <Abschnitt
        titel={t('ki.abschnitt')}
        aktion={<KiKnopf variant="ghost" bezug={{ tabelle: 'kontakte', id: k.id }} mail={{ kontakt_id: k.id }} />}
      >
        <KiZusammenfassung bezug={{ tabelle: 'kontakte', id: k.id }} />
      </Abschnitt>

      <Abschnitt titel={t('akte.kontaktdaten')}>
        <KontaktAngaben kopf={kopf} akte={akte} />
      </Abschnitt>

      <Abschnitt
        titel={t('akte.gebaeude', { count: akte.objekte.length })}
        aktion={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onObjekt(null)
            }}
          >
            <Plus />
            {t('akte.gebaeudeNeu')}
          </Button>
        }
      >
        {akte.objekte.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('akte.keinGebaeude')}</p>
        ) : (
          akte.objekte.map((o) => (
            <Gebaeude
              key={o.id}
              objekt={o}
              onBearbeiten={() => {
                onObjekt(o)
              }}
            />
          ))
        )}
      </Abschnitt>

      <Abschnitt titel={t('akte.geschaefte')}>
        <GeschaeftKarten akte={akte} />
      </Abschnitt>

      <Abschnitt titel="AbaNinja">
        <AkteAbaninja kontaktId={k.id} abaninjaId={k.abaninja_id} name={kopf.name} />
      </Abschnitt>
    </div>
  )
}
