import { Download, Zap } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatDatum } from '@/lib/format'
import { fehlerText, meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useAdressbuchAenderung, useNetzStand } from '../hooks/useAdressbuch'
import { lieseNetzbetreiberEin } from '../services/netz'

/**
 * Netzbetreiber-Verzeichnis der ElCom (nur Administration): zeigt, wie viele Gemeinden und Gebäude zugeordnet sind,
 * und liest das Verzeichnis neu ein (einmal im Jahr genügt, die ElCom veröffentlicht die Tarife im Herbst).
 */
export function NetzVerzeichnis() {
  const { t } = useTranslation()
  const [offen, setOffen] = useState(false)
  const stand = useNetzStand(offen)
  const [schritt, setSchritt] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const einlesen = useAdressbuchAenderung(() =>
    lieseNetzbetreiberEin((s) => {
      setSchritt(
        s.schritt === 'verzeichnis'
          ? t('adressbuch.netz.schrittVerzeichnis', { count: s.zeilen ?? 0 })
          : s.schritt === 'plz'
            ? t('adressbuch.netz.schrittPlz', { count: s.plz ?? 0 })
            : t('adressbuch.netz.schrittZuordnen'),
      )
    }),
  )

  async function starten() {
    setFehler(null)
    try {
      const r = await einlesen.mutateAsync(undefined)
      melde('ok', {
        de: `Netzbetreiber eingelesen: ${String(r.neu)} neu im Adressbuch, ${String(r.gebaeude)} Gebäude ergänzt`,
        fr: `Gestionnaires importés : ${String(r.neu)} nouveaux, ${String(r.gebaeude)} bâtiments complétés`,
      })
      setSchritt(null)
      void stand.refetch()
    } catch (f) {
      setFehler(fehlerText(f))
      meldeIntegrationsFehler(f)
    }
  }

  const s = stand.data
  return (
    <Dialog open={offen} onOpenChange={setOffen}>
      <Button
        variant="ghost"
        onClick={() => {
          setOffen(true)
        }}
      >
        <Zap />
        {t('adressbuch.netz.knopf')}
      </Button>
      <DialogInhalt
        titel={t('adressbuch.netz.titel')}
        beschreibung={t('adressbuch.netz.text')}
        fuss={
          <Button laedt={einlesen.isPending} onClick={() => void starten()}>
            <Download />
            {t('adressbuch.netz.einlesen')}
          </Button>
        }
      >
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">{t('adressbuch.netz.jahr')}</dt>
          <dd className="zahlen">{s?.jahr ?? '–'}</dd>
          <dt className="text-muted-foreground">{t('adressbuch.netz.eingelesen')}</dt>
          <dd className="zahlen">{s?.eingelesen_am ? formatDatum(s.eingelesen_am) : t('adressbuch.netz.nie')}</dd>
          <dt className="text-muted-foreground">{t('adressbuch.netz.gemeinden')}</dt>
          <dd className="zahlen">{s ? `${String(s.gemeinden)} / ${String(s.netzbetreiber)}` : '–'}</dd>
          <dt className="text-muted-foreground">{t('adressbuch.netz.plz')}</dt>
          <dd className="zahlen">{s ? `${String(s.plz_zugeordnet)} / ${String(s.plz_total)}` : '–'}</dd>
          <dt className="text-muted-foreground">{t('adressbuch.netz.gebaeudeOhne')}</dt>
          <dd className="zahlen">{s ? `${String(s.gebaeude_ohne)} / ${String(s.gebaeude)}` : '–'}</dd>
        </dl>
        {schritt && (
          <p className="text-muted-foreground mt-4 text-sm" aria-live="polite">
            {schritt}
          </p>
        )}
        {fehler && <p className="text-bad mt-4 text-sm">{fehler}</p>}
        <p className="text-muted-foreground mt-4 text-xs">{t('adressbuch.netz.hinweis')}</p>
      </DialogInhalt>
    </Dialog>
  )
}
