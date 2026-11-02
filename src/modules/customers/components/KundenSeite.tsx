import { ArrowLeft, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KiKnopf } from '@/components/shared/ki/KiKnopf'
import { KiZusammenfassung } from '@/components/shared/ki/KiZusammenfassung'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatKundennummer } from '@/lib/kontakt'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKundenakte, useNachverkauf } from '../hooks/useKunden'
import { akteZahlen } from '../lib/kennzahlen'
import { naechsterSchritt } from '../lib/naechsterSchritt'
import { AkteAbaninja } from './AkteAbaninja'
import { useAkteAktionen } from '../hooks/useAkteAktionen'
import { AkteDialoge } from './AkteDialoge'
import { AkteDokumente } from './AkteDokumente'
import { AkteKopf } from './AkteKopf'
import { Gebaeude, KontaktAngaben } from './AkteUebersicht'
import { AkteZeitachse } from './AkteZeitachse'
import { Kundenblatt } from './Kundenblatt'
import { NaechsterSchritt } from './NaechsterSchritt'
import { OutlookMailsKnopf } from './OutlookMailsKnopf'
import { AkteZahlenLeiste } from './AkteZahlenLeiste'
import { AnlagenBox } from './AnlagenBox'
import { AufgabenBox } from './AufgabenBox'
import { Box, Leer } from './Box'
import { GeschaefteBox } from './GeschaefteBox'
import { RechnungenBox } from './RechnungenBox'
import { ServiceBox } from './ServiceBox'

/** Heute als ISO-Datum in Zürcher Zeit, für Fälligkeiten und «nächster Termin». */
const heuteIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })

/**
 * Die Kundenakte als ganze Seite, gebaut für jede Rolle: links wer (Kontakt, Gebäude, AbaNinja), in der Mitte
 * was passiert (nächster Schritt, Aufgaben, Verlauf mit Mails, Zusammenfassung), rechts was besteht (Geschäfte,
 * Anlagen, Service und Wartung, Rechnungen, Dokumente). Oben die Zahlen auf einen Blick.
 */
export default function KundenSeite({ id, onZurueck }: { id: string; onZurueck: () => void }) {
  const { t } = useTranslation()
  const { kopf, akte, zeitachse } = useKundenakte(id)
  const nach = useNachverkauf(id, akte.data)
  const aktionen = useAkteAktionen(id, kopf.data, onZurueck)
  const { setOffen, druck, exportieren, verschiebe } = aktionen
  const k = kopf.data
  const a = akte.data
  const heute = heuteIso()
  // Rechnungen liest nur, wer das Recht «finanzen» hat (RLS); sonst sagen wir das, statt «keine» zu zeigen.
  const finanzen = hatRecht(
    useAnmeldung((z) => z.ich),
    'finanzen',
  )

  if (kopf.isError || akte.isError || nach.isError) {
    return (
      <Fehlerzustand
        details={String(kopf.error ?? akte.error ?? nach.error)}
        onNochmal={() => {
          void kopf.refetch()
          void akte.refetch()
          void nach.refetch()
        }}
      />
    )
  }
  if (!k || !a) {
    return kopf.isPending || akte.isPending ? (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skelett className="h-8 w-1/3" />
        <Skelett className="h-16 w-full" />
        <Skelett className="h-[28rem] w-full" />
      </div>
    ) : (
      <Leer>{t('akte.nichtGefunden')}</Leer>
    )
  }
  const n = nach.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 self-start" onClick={onZurueck}>
          <ArrowLeft />
          {t('kundenseite.zurueck')}
        </Button>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{k.name}</h1>
          <span className="text-muted-foreground zahlen text-sm">
            {[formatKundennummer(k.kundennummer), k.ort].filter(Boolean).join(' · ')}
          </span>
        </div>
        <AkteKopf
          kopf={k}
          onBearbeiten={() => {
            setOffen({ art: 'kontakt' })
          }}
          onKontaktErfassen={() => {
            setOffen({ art: 'aktivitaet' })
          }}
          onKundenblatt={druck.drucke}
          onExport={() => void exportieren()}
          onPapierkorb={() => {
            setOffen({ art: 'papierkorb' })
          }}
          onWiederherstellen={() => void verschiebe(false)}
        />
      </div>

      {n ? <AkteZahlenLeiste z={akteZahlen(a, n, heute)} finanzen={finanzen} /> : <Skelett className="h-16 w-full" />}

      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-[22rem_minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Box titel={t('akte.kontaktdaten')}>
            <KontaktAngaben kopf={k} akte={a} />
          </Box>
          <Box
            titel={t('akte.gebaeude', { count: a.objekte.length })}
            rechts={
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => {
                  setOffen({ art: 'objekt', objekt: null })
                }}
              >
                <Plus />
                {t('akte.gebaeudeNeu')}
              </Button>
            }
          >
            {a.objekte.length === 0 && <Leer>{t('akte.keinGebaeude')}</Leer>}
            {a.objekte.map((o) => (
              <Gebaeude
                key={o.id}
                objekt={o}
                onBearbeiten={() => {
                  setOffen({ art: 'objekt', objekt: o })
                }}
              />
            ))}
          </Box>
          <Box titel="AbaNinja">
            <AkteAbaninja kontaktId={k.id} abaninjaId={a.kontakt.abaninja_id} name={k.name} />
          </Box>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:order-last lg:col-span-2 2xl:order-none 2xl:col-span-1">
          <NaechsterSchritt
            schritt={naechsterSchritt(k, a)}
            onAnrufen={() => {
              setOffen({ art: 'aktivitaet' })
            }}
          />
          {n && <AufgabenBox kontaktId={k.id} aufgaben={n.aufgaben} heute={heute} />}
          <Box titel={t('kundenseite.verlauf')} rechts={<OutlookMailsKnopf />}>
            <AkteZeitachse eintraege={zeitachse.data} mails={n?.mails} laedt={zeitachse.isPending} />
          </Box>
          <Box
            titel={t('ki.abschnitt')}
            rechts={<KiKnopf variant="ghost" bezug={{ tabelle: 'kontakte', id: k.id }} mail={{ kontakt_id: k.id }} />}
          >
            <KiZusammenfassung bezug={{ tabelle: 'kontakte', id: k.id }} />
          </Box>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <GeschaefteBox akte={a} />
          {n && <AnlagenBox anlagen={n.anlagen} objekte={a.objekte} heute={heute} />}
          {n && <ServiceBox faelle={n.serviceFaelle} vertraege={n.wartungsvertraege} heute={heute} />}
          {n && <RechnungenBox rechnungen={n.rechnungen} finanzen={finanzen} />}
          <Box titel={t('akte.reiter.dokumente')} rechts={<span className="zahlen">{a.dokumente.length}</span>}>
            <AkteDokumente dokumente={a.dokumente} />
          </Box>
        </div>
      </div>

      {druck.aktiv && <Kundenblatt kopf={k} akte={a} />}
      <AkteDialoge id={id} akte={a} titel={k.name} aktionen={aktionen} />
    </div>
  )
}
