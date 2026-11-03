import { FileDown, FolderInput, Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useAnhaenge } from '../hooks/useArbeit'
import { ablageZiele } from '../lib/schritt'
import { anhangAblegen, anhangOeffnen } from '../services/arbeit'
import type { Anhang, Mail } from '../types'

const groesse = (b: number) =>
  b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${String(Math.max(1, Math.round(b / 1024)))} KB`

/**
 * Anhänge der Mail aus Outlook: öffnen oder mit einem Klick in eine Akte übernehmen, mit der die Mail verknüpft ist
 * (Projekt, Offerte, Service-Fall, Bestellung, Rechnung, Zahlung, Lead, Kunde). Offerten und Projekte legt der
 * Zeitplan danach in den SharePoint-Ordner.
 */
export function AnhaengeBox({ m }: { m: Mail }) {
  const { t } = useTranslation()
  const anhaenge = useAnhaenge(m.id, m.hat_anhang)
  if (!m.hat_anhang) return null
  const ziele = ablageZiele(m)

  async function ablegen(a: Anhang, z: (typeof ziele)[number]) {
    try {
      await anhangAblegen(m.id, a.id, z.tabelle, z.id)
      melde('ok', {
        de: `${a.name} abgelegt (${t(`posteingang.feld.${z.schluessel}`)} ${z.nummer})`,
        fr: `${a.name} classé (${z.nummer})`,
      })
    } catch (e) {
      meldeIntegrationsFehler(e)
    }
  }

  return (
    <AkteAbschnitt titel={t('posteingang.akte.anhaenge')}>
      {anhaenge.isPending ? (
        <p className="text-muted-foreground text-sm">{t('posteingang.akte.laedt')}</p>
      ) : anhaenge.isError ? (
        <p className="text-muted-foreground text-sm">{t('posteingang.akte.anhaengeOutlook')}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {anhaenge.data.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <Paperclip className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 basis-40">
                <span className="block truncate text-sm font-medium">{a.name}</span>
                <span className="text-muted-foreground text-xs">{groesse(a.groesse)}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  anhangOeffnen(m.id, a).catch(meldeIntegrationsFehler)
                }}
              >
                <FileDown />
                {t('posteingang.akte.oeffnenDatei')}
              </Button>
              {ziele.length > 0 ? (
                <Menue>
                  <MenueAusloeser asChild>
                    <Button variant="secondary" size="sm">
                      <FolderInput />
                      {t('posteingang.akte.ablegenIn')}
                    </Button>
                  </MenueAusloeser>
                  <MenueInhalt align="end">
                    {ziele.map((z) => (
                      <MenueEintrag key={z.tabelle} onSelect={() => void ablegen(a, z)}>
                        {t(`posteingang.feld.${z.schluessel}`)} {z.nummer}
                      </MenueEintrag>
                    ))}
                  </MenueInhalt>
                </Menue>
              ) : (
                <span className="text-muted-foreground text-xs">{t('posteingang.akte.erstZuordnen')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </AkteAbschnitt>
  )
}
