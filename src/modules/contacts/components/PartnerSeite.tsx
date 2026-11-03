import { ArchiveRestore, ArrowLeft, Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatKundennummer, tonVonFarbe } from '@/lib/kontakt'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAdressbuchAenderung, useAdressbuchEinstellungen, usePartnerAkte } from '../hooks/useAdressbuch'
import { verschiebePartner } from '../services/adressbuch'
import type { PartnerRolle } from '../types'
import { AuftraegeBox } from './AuftraegeBox'
import { Leer } from './Box'
import { NachweiseBox } from './NachweiseBox'
import { BestellungenBox, DokumenteBox, EmpfehlungenBox, GemeindenBox, GesucheBox } from './PartnerBoxen'
import { FirmenBox, PersonenBox } from './PersonenBox'
import { StammdatenBox } from './StammdatenBox'
import { StammdatenDialog } from './StammdatenDialog'
import { RolleDialog, Steckbrief } from './Steckbrief'
import { VerlaufBox } from './VerlaufBox'

const heuteIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
const MIT_NACHWEIS = ['subunternehmer', 'elektriker']

/**
 * Akte eines Geschäftspartners als ganze Seite, gebaut nach Rolle: links wer (Stammdaten, Ansprechpersonen,
 * Nachweise), in der Mitte was wir über ihn wissen (Steckbrief je Rolle, Verlauf), rechts was läuft (Gesuche beim
 * Netzbetreiber, Bestellungen beim Lieferanten, Aufträge beim Subunternehmer, Provision beim Vermittler, Dokumente).
 */
export default function PartnerSeite({ id, onZurueck }: { id: string; onZurueck: () => void }) {
  const { t } = useTranslation()
  const { kopf, akte, verlauf } = usePartnerAkte(id)
  const einst = useAdressbuchEinstellungen()
  const rollen = useAuswahl('partnerrolle')
  const [dialog, setDialog] = useState<{ art: 'stamm' } | { art: 'rolle'; rolle: PartnerRolle | null } | null>(null)
  const verschieben = useAdressbuchAenderung((weg: boolean) => verschiebePartner(id, weg))
  const k = kopf.data
  const a = akte.data
  const heute = heuteIso()

  if (kopf.isError || akte.isError) {
    return (
      <Fehlerzustand
        details={String(kopf.error ?? akte.error)}
        onNochmal={() => {
          void kopf.refetch()
          void akte.refetch()
        }}
      />
    )
  }
  if (!k || !a) {
    return kopf.isPending || akte.isPending ? (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skelett className="h-8 w-1/3" />
        <Skelett className="h-[28rem] w-full" />
      </div>
    ) : (
      <Leer>{t('akte.nichtGefunden')}</Leer>
    )
  }

  const hat = (r: string) => a.rollen.some((x) => x.rolle === r)
  async function papierkorb(weg: boolean) {
    try {
      await verschieben.mutateAsync(weg)
      melde(
        'ok',
        weg
          ? { de: 'In den Papierkorb gelegt', fr: 'Mis à la corbeille' }
          : { de: 'Wiederhergestellt', fr: 'Restauré' },
      )
      if (weg) onZurueck()
    } catch (f) {
      meldeFehler(f, 'adressbuch.papierkorb')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 self-start" onClick={onZurueck}>
          <ArrowLeft />
          {t('adressbuch.zurueckListe')}
        </Button>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{k.name}</h1>
          <span className="text-muted-foreground zahlen text-sm">
            {[formatKundennummer(k.kundennummer), k.ort].filter(Boolean).join(' · ')}
          </span>
          {k.geloeschtAm && <Badge ton="kritisch">{t('akte.imPapierkorb')}</Badge>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {a.rollen.map((r) => (
              <Badge key={r.id} ton={tonVonFarbe(rollen.finde(r.rolle)?.farbe)}>
                {rollen.text(r.rolle)}
              </Badge>
            ))}
          </div>
          <Knopfleiste haupt="erste">
            {k.telefon && (
              <a href={`tel:${k.telefon}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                <Phone />
                {t('adressbuch.akte.anrufen')}
              </a>
            )}
            {k.email && (
              <a href={`mailto:${k.email}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                <Mail />
                {t('akte.mail')}
              </a>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDialog({ art: 'stamm' })
              }}
            >
              <Pencil />
              {t('allgemein.bearbeiten')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDialog({ art: 'rolle', rolle: null })
              }}
            >
              <Plus />
              {t('adressbuch.akte.rolleNeu')}
            </Button>
            {k.geloeschtAm ? (
              <Button
                variant="secondary"
                size="sm"
                laedt={verschieben.isPending}
                onClick={() => void papierkorb(false)}
              >
                <ArchiveRestore />
                {t('akte.wiederherstellen')}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" laedt={verschieben.isPending} onClick={() => void papierkorb(true)}>
                <Trash2 />
                {t('akte.inPapierkorb')}
              </Button>
            )}
          </Knopfleiste>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-[22rem_minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <StammdatenBox kopf={k} />
          {k.art === 'firma' ? <PersonenBox firmaId={k.id} sprache={k.sprache} /> : <FirmenBox personId={k.id} />}
          {(MIT_NACHWEIS.some(hat) || a.nachweise.length > 0) && (
            <NachweiseBox kontaktId={k.id} nachweise={a.nachweise} heute={heute} />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:order-last lg:col-span-2 2xl:order-none 2xl:col-span-1">
          {a.rollen.length === 0 && <Leer>{t('adressbuch.akte.ohneRolle')}</Leer>}
          {a.rollen.map((r) => (
            <Steckbrief
              key={r.id}
              rolle={r}
              onBearbeiten={() => {
                setDialog({ art: 'rolle', rolle: r })
              }}
            />
          ))}
          <VerlaufBox kontaktId={k.id} eintraege={verlauf.data} laedt={verlauf.isPending} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {hat('netzbetreiber') && <GesucheBox gesuche={a.gesuche} warnungTage={einst.data?.gesuchWarnung ?? 15} />}
          {hat('netzbetreiber') && <GemeindenBox gemeinden={a.gemeinden} />}
          {hat('lieferant') && <BestellungenBox bestellungen={a.bestellungen} einkauf={a.einkaufJahr} />}
          {hat('subunternehmer') && <AuftraegeBox auftraege={a.auftraege} bewertung={mittel(a.auftraege)} />}
          {(hat('vermittler') || a.empfehlungen.length > 0) && <EmpfehlungenBox empfehlungen={a.empfehlungen} />}
          <DokumenteBox kontaktId={k.id} dokumente={a.dokumente} />
        </div>
      </div>

      {dialog?.art === 'stamm' && (
        <StammdatenDialog
          kopf={k}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
      {dialog?.art === 'rolle' && (
        <RolleDialog
          kontaktId={k.id}
          rolle={dialog.rolle}
          vorhanden={a.rollen.map((r) => r.rolle)}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}

/** Mittelwert aller vergebenen Sterne (wie in der Liste). */
function mittel(auftraege: { qualitaet: number | null; termin: number | null; preis: number | null }[]): number | null {
  const werte = auftraege.flatMap((x) => [x.qualitaet, x.termin, x.preis]).filter((w): w is number => w !== null)
  return werte.length ? Math.round((werte.reduce((s, w) => s + w, 0) / werte.length) * 10) / 10 : null
}
