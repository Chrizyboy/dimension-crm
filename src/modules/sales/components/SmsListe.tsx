import { Copy, MessageSquareText } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatDatum, formatTelefon } from '@/lib/format'
import { telefonZiffern } from '@/lib/kontakt'
import { melde } from '@/services/meldungen'
import { useAussendienst, useSmsVorlage } from '../hooks/useVerkauf'
import { heuteIso } from '../lib/geschaeft'
import { hm } from '../lib/route'
import { minutenAm, tagVon } from '../lib/stopps'
import type { Geschaeft } from '../types'

/** Handynummer? Schweizer Mobilnummern beginnen mit 07x (V172 schickt nur an Handys). */
function istHandy(telefon: string | null): boolean {
  const z = telefonZiffern(telefon).replace(/^(0041|41)/, '0')
  return /^07[5-9]\d{7}$/.test(z)
}

/**
 * Erinnerungs-SMS für die Termine von morgen (V172): Liste mit fertigem Text in der Sprache des Kunden.
 * Der Versand selbst kommt mit Phase 8 über den Ausgangskorb und braucht eine Freigabe; bis dahin
 * lässt sich jeder Text kopieren.
 */
export default function SmsListe({ geschaefte, onSchliessen }: { geschaefte: Geschaeft[]; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const vorlage = useSmsVorlage()
  const personen = useAussendienst()
  const morgen = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return heuteIso(d)
  }, [])
  const termine = useMemo(
    () =>
      geschaefte
        .filter((g) => g.terminAm && g.stand === 'termin' && tagVon(g.terminAm) === morgen)
        .sort((a, b) => (a.terminAm ?? '').localeCompare(b.terminAm ?? '')),
    [geschaefte, morgen],
  )

  const text = (g: Geschaeft) => {
    const v = vorlage.data
    const roh = (g.sprache === 'fr' ? v?.text_fr : v?.text_de) ?? ''
    const person = personen.data?.find((p) => p.id === (g.terminPersonId ?? g.personId))?.vorname ?? ''
    return roh
      .replace('{name}', g.name)
      .replace('{datum}', formatDatum(morgen))
      .replace('{zeit}', g.terminAm ? hm(minutenAm(g.terminAm)) : '')
      .replace('{person}', person)
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('verkauf.sms.titel', { datum: formatDatum(morgen) })}
        beschreibung={t('verkauf.sms.text')}
        className="max-w-2xl"
      >
        {termine.length === 0 ? (
          <Leerzustand icon={MessageSquareText} titel={t('verkauf.sms.leer')} text={t('verkauf.sms.leerText')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {termine.map((g) => {
              const handy = istHandy(g.telefon)
              return (
                <li key={g.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="zahlen font-mono font-medium">{g.terminAm ? hm(minutenAm(g.terminAm)) : ''}</span>
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground">
                      {g.telefon ? formatTelefon(g.telefon) : t('verkauf.sms.keineNummer')}
                    </span>
                    {!handy && <Badge ton="warnung">{t('verkauf.sms.keinHandy')}</Badge>}
                  </div>
                  <p className="bg-muted/60 rounded-md p-2 text-sm">{text(g)}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => {
                      void navigator.clipboard.writeText(text(g)).then(() => {
                        melde('ok', { de: 'SMS-Text kopiert', fr: 'Texte SMS copié' })
                      })
                    }}
                  >
                    <Copy />
                    {t('verkauf.sms.kopieren')}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
