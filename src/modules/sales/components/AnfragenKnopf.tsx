import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { FileUp, Inbox, MailPlus, Sparkles } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KiMailLesen } from '@/components/shared/ki/KiMailLesen'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { meldeIntegrationsFehler, microsoft, type AnfragenErgebnis } from '@/services/integrationen'
import { useAuswahl } from '@/hooks/useAuswahl'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { VERKAUF_SCHLUESSEL } from '../hooks/useVerkauf'
import { leadAusMail } from '../lib/kiLead'
import type { LeadEingabe } from '../schema'

const LeadDialog = lazy(() => import('./LeadDialog'))

/** Kurze Rückmeldung in beiden Sprachen: neu, ergänzt, übersprungen. */
function zusammenfassung(r: AnfragenErgebnis): { de: string; fr: string } {
  const info = r.postfach_anfragen === 'kein_zugriff'
  return {
    de:
      `${r.neu} neue Anfragen, ${r.ergaenzt} ergänzt` +
      (r.geloescht ? `, ${r.geloescht} gelöscht` : '') +
      (r.uebersprungen ? `, ${r.uebersprungen} übersprungen` : '') +
      (info ? ' · kein Zugriff auf das Anfragen-Postfach' : ''),
    fr:
      `${r.neu} nouvelles demandes, ${r.ergaenzt} complétées` +
      (r.geloescht ? `, ${r.geloescht} supprimées` : '') +
      (r.uebersprungen ? `, ${r.uebersprungen} ignorées` : '') +
      (info ? ' · pas d’accès à la boîte des demandes' : ''),
  }
}

/**
 * «Anfragen holen» (V78, V233 sgSearch/lpImport/mxImport): Anfragen von solar-guide.ch, der Landingpage
 * und der Messe-App aus Outlook abholen, oder eine gespeicherte Mail (.eml) einlesen. Der Server
 * erkennt Dubletten; dieselbe Mail legt nie zweimal einen Lead an. Läuft zusätzlich alle 5 Minuten.
 */
export function AnfragenKnopf() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const datei = useRef<HTMLInputElement>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [kiOffen, setKiOffen] = useState(false)
  const [vorlage, setVorlage] = useState<Partial<LeadEingabe> | null>(null)
  const navigate = useNavigate()
  const interesse = useAuswahl('interesse')
  const gebaeudeart = useAuswahl('gebaeudeart')
  const dachform = useAuswahl('dachform')

  async function mache(f: () => Promise<AnfragenErgebnis>) {
    setLaeuft(true)
    try {
      const r = await f()
      melde(r.neu || r.ergaenzt ? 'ok' : 'info', zusammenfassung(r))
      await qc.invalidateQueries({ queryKey: VERKAUF_SCHLUESSEL })
    } catch (e) {
      meldeIntegrationsFehler(e)
    } finally {
      setLaeuft(false)
    }
  }

  async function einlesen(dateien: FileList) {
    const summe: AnfragenErgebnis = { neu: 0, ergaenzt: 0, geloescht: 0, uebersprungen: 0, postfach_anfragen: 'aus' }
    for (const d of Array.from(dateien)) {
      const r = await microsoft.mailEinlesen(await d.text())
      summe.neu += r.neu
      summe.ergaenzt += r.ergaenzt
      summe.geloescht += r.geloescht
      summe.uebersprungen += r.uebersprungen
    }
    return summe
  }

  return (
    <>
      <Menue>
        <MenueAusloeser asChild>
          <Button variant="secondary" laedt={laeuft}>
            <Inbox />
            {t('verkauf.anfragen.knopf')}
          </Button>
        </MenueAusloeser>
        <MenueInhalt align="end">
          <MenueEintrag onSelect={() => void mache(microsoft.anfragenAbholen)}>
            <MailPlus />
            {t('verkauf.anfragen.outlook')}
          </MenueEintrag>
          <MenueEintrag onSelect={() => datei.current?.click()}>
            <FileUp />
            {t('verkauf.anfragen.datei')}
          </MenueEintrag>
          {supabase && (
            <MenueEintrag
              onSelect={() => {
                setKiOffen(true)
              }}
            >
              <Sparkles />
              {t('ki.mail.menue')}
            </MenueEintrag>
          )}
        </MenueInhalt>
      </Menue>
      <input
        ref={datei}
        type="file"
        accept=".eml,message/rfc822"
        multiple
        hidden
        aria-label={t('verkauf.anfragen.datei')}
        onChange={(e) => {
          const d = e.target.files
          if (d?.length) void mache(() => einlesen(d))
          e.target.value = ''
        }}
      />
      {kiOffen && (
        <KiMailLesen
          onSchliessen={() => {
            setKiOffen(false)
          }}
          onLead={(r) => {
            const werte = (a: ReturnType<typeof useAuswahl>) => a.werte.map((x) => x.schluessel)
            setVorlage(
              leadAusMail(r, {
                interesse: werte(interesse),
                gebaeudeart: werte(gebaeudeart),
                dachform: werte(dachform),
              }),
            )
            setKiOffen(false)
          }}
        />
      )}
      {vorlage && (
        <Suspense>
          <LeadDialog
            vorlage={vorlage}
            onSchliessen={(id) => {
              setVorlage(null)
              if (id) void navigate({ to: '/sales', search: { lead: id } })
            }}
          />
        </Suspense>
      )}
    </>
  )
}
