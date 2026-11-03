import { ArrowLeft, CheckCircle2, Globe, ListTodo, Phone, RotateCcw, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { InPapierkorbKnopf } from '@/components/shared/papierkorb/InPapierkorbKnopf'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { tonVonFarbe } from '@/lib/kontakt'
import { useAktion } from '../hooks/useAktion'
import { aufgabeZumFall, fallSpeichern } from '../services/service'
import type { Akte, ServiceFall } from '../types'

/** Kopf der Fall-Akte: zurück zum Leitstand, Nummer und Titel, Merkmale, Anrufen, Aufgabe, Erledigt. */
export function FallKopf({ f, akte, onZurueck }: { f: ServiceFall; akte: Akte | undefined; onZurueck: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const stand = useAuswahl('servicestatus')
  const kat = useAuswahl('servicekategorie')
  const wirkung = useAuswahl('serviceauswirkung')
  const telefon = f.vor_ort_telefon ?? akte?.kunde?.telefon ?? f.meldung?.telefon ?? null
  return (
    <header className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onZurueck}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded text-sm outline-none focus-visible:ring-2"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('service.akte.zurueck')}
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-xl font-semibold text-balance">
            <span className="zahlen text-muted-foreground mr-2 font-mono text-base">{f.nummer}</span>
            {f.titel}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge ton={tonVonFarbe(stand.finde(f.status)?.farbe)} punkt>
              {stand.text(f.status)}
            </Badge>
            {f.auswirkung && (
              <Badge ton={tonVonFarbe(wirkung.finde(f.auswirkung)?.farbe)}>{wirkung.text(f.auswirkung)}</Badge>
            )}
            {f.garantie && (
              <Badge ton="ok">
                <ShieldCheck />
                {t('service.garantie')}
              </Badge>
            )}
            {f.kategorie && <Badge>{kat.text(f.kategorie)}</Badge>}
            {f.quelle === 'website' && (
              <Badge ton="info">
                <Globe />
                {t('service.leitstand.website')}
              </Badge>
            )}
            <span className="text-muted-foreground text-sm">
              {[f.kunde, f.adresse, f.person ? t('service.akte.zustaendigName', { name: f.person }) : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <InPapierkorbKnopf
            tabelle="service_faelle"
            id={f.id}
            name={[f.nummer, f.titel].filter(Boolean).join(' ')}
            onFertig={onZurueck}
          />
          {telefon && (
            <a href={`tel:${telefon.replace(/[^\d+]/g, '')}`} className={buttonVariants({ variant: 'secondary' })}>
              <Phone />
              {t('service.akte.anrufen')}
            </a>
          )}
          <Button
            variant="secondary"
            laedt={laeuft}
            onClick={() => {
              const d = (f.termin_am ?? new Date(Date.now() + 86_400_000).toISOString()).slice(0, 10)
              void aus(() => aufgabeZumFall(f, d), { de: 'Aufgabe erstellt', fr: 'Tâche créée' })
            }}
          >
            <ListTodo />
            {t('service.akte.aufgabe')}
          </Button>
          {f.status === 'erledigt' ? (
            <Button
              variant="secondary"
              laedt={laeuft}
              onClick={() => void aus(() => fallSpeichern({ status: 'bearbeitung' }, f.id))}
            >
              <RotateCcw />
              {t('service.akte.wiederOeffnen')}
            </Button>
          ) : (
            <Button
              laedt={laeuft}
              onClick={() =>
                void aus(() => fallSpeichern({ status: 'erledigt' }, f.id), {
                  de: `${f.nummer} erledigt`,
                  fr: `${f.nummer} terminé`,
                })
              }
            >
              <CheckCircle2 />
              {t('service.akte.erledigt')}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
