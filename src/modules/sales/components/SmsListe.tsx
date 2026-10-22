import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, MessageSquareText, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/schalter'
import { formatDatum, formatTelefon } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { ausgangJetztSenden, fehlerText } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useSmsVorlage } from '../hooks/useVerkauf'
import { heuteIso } from '../lib/geschaeft'
import { hm } from '../lib/route'
import { minutenAm } from '../lib/stopps'
import { ladeSmsErinnerungen, smsAutomatikSetzen, smsErinnerungenSenden } from '../services/sms'

const TON: Record<string, 'info' | 'ok' | 'kritisch'> = {
  wartet: 'info',
  freigegeben: 'info',
  wird_gesendet: 'info',
  gesendet: 'ok',
  fehler: 'kritisch',
}

/**
 * Erinnerungs-SMS für die Termine von morgen (V172): Liste mit fertigem Text in der Sprache des Kunden.
 * «Senden» legt die SMS freigegeben in den Ausgangskorb (die Person hat den Text gesehen); jeder Termin
 * bekommt höchstens eine. Automatisch am Vortag nur, wenn die Administration es ausdrücklich einschaltet.
 */
export default function SmsListe({ onSchliessen }: { onSchliessen: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const vorlage = useSmsVorlage()
  const morgen = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return heuteIso(d)
  }, [])
  const liste = useQuery({ queryKey: ['sms', 'erinnerungen', morgen], queryFn: () => ladeSmsErinnerungen(morgen) })
  const [laeuft, setLaeuft] = useState<string | null>(null)
  const offen = (liste.data ?? []).filter((e) => e.handy && !e.ausgang_status)

  async function senden(leads?: string[]) {
    setLaeuft(leads?.[0] ?? 'alle')
    try {
      const n = await smsErinnerungenSenden(morgen, leads)
      const r = await ausgangJetztSenden().catch(() => null)
      melde(r && r.fehler === 0 ? 'ok' : 'info', {
        de: r && r.fehler === 0 ? `${n} SMS gesendet` : `${n} SMS freigegeben, werden in Kürze gesendet`,
        fr: r && r.fehler === 0 ? `${n} SMS envoyé(s)` : `${n} SMS approuvé(s), envoi sous peu`,
      })
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (s) melde('kritisch', zweisprachig(s))
      else {
        meldeFehler(f, 'sms-erinnerung')
        melde('kritisch', { de: 'Nicht gesendet', fr: 'Non envoyé' })
      }
    } finally {
      setLaeuft(null)
      void qc.invalidateQueries({ queryKey: ['sms'] })
      void qc.invalidateQueries({ queryKey: ['ausgang'] })
    }
  }

  async function automatik(an: boolean) {
    if (!vorlage.data) return
    try {
      await smsAutomatikSetzen(vorlage.data, an)
      await qc.invalidateQueries({ queryKey: ['einstellungen', 'sms_erinnerung'] })
    } catch (f) {
      meldeFehler(f, 'sms-automatik')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('verkauf.sms.titel', { datum: formatDatum(morgen) })}
        beschreibung={t('verkauf.sms.text')}
        className="max-w-2xl"
        fuss={
          <>
            {hatRecht(ich, 'admin') && (
              <label className="mr-auto flex items-center gap-2 text-sm">
                <Switch
                  checked={vorlage.data?.automatisch ?? false}
                  onCheckedChange={(an) => void automatik(an)}
                  disabled={!vorlage.data}
                />
                {t('verkauf.sms.automatisch', { uhrzeit: vorlage.data?.uhrzeit ?? '16:00' })}
              </label>
            )}
            <Button disabled={offen.length === 0} laedt={laeuft === 'alle'} onClick={() => void senden()}>
              <Send />
              {t('verkauf.sms.alleSenden', { count: offen.length })}
            </Button>
          </>
        }
      >
        {liste.isPending ? (
          <Skelett className="h-40" />
        ) : (liste.data ?? []).length === 0 ? (
          <Leerzustand icon={MessageSquareText} titel={t('verkauf.sms.leer')} text={t('verkauf.sms.leerText')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {(liste.data ?? []).map((e) => (
              <li key={e.verkaufschance_id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="zahlen font-mono font-medium">{hm(minutenAm(e.termin_am))}</span>
                  <span className="font-medium">{e.name}</span>
                  <span className="text-muted-foreground">
                    {e.telefon ? formatTelefon(e.telefon) : t('verkauf.sms.keineNummer')}
                  </span>
                  {!e.handy && <Badge ton="warnung">{t('verkauf.sms.keinHandy')}</Badge>}
                  {e.ausgang_status && (
                    <Badge ton={TON[e.ausgang_status] ?? 'neutral'} punkt>
                      {t(`ausgang.status.${e.ausgang_status}`)}
                    </Badge>
                  )}
                </div>
                <p className="bg-muted/60 rounded-md p-2 text-sm">{e.text}</p>
                {e.ausgang_fehler && <p className="text-bad text-xs">{fehlerText(new Error(e.ausgang_fehler))}</p>}
                <div className="flex gap-2">
                  {e.handy && !e.ausgang_status && (
                    <Button
                      size="sm"
                      laedt={laeuft === e.verkaufschance_id}
                      disabled={laeuft !== null}
                      onClick={() => void senden([e.verkaufschance_id])}
                    >
                      <Send />
                      {t('verkauf.sms.senden')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void navigator.clipboard.writeText(e.text).then(() => {
                        melde('ok', { de: 'SMS-Text kopiert', fr: 'Texte SMS copié' })
                      })
                    }}
                  >
                    <Copy />
                    {t('verkauf.sms.kopieren')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
