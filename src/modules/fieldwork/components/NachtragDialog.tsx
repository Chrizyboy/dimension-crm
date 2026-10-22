import { Ban, CheckCircle2, ClipboardPen, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatumZeit, parseChf } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { nachtragTon } from '../lib/anzeige'
import { nachtragBetrag, nachtragStatus } from '../services/baustelle'
import type { Nachtrag } from '../types'

/** Ein Nachtrag im Büro: Betrag (Recht «Preise»), bestätigen (z. B. per Mail), ablehnen mit Grund, wieder offen. */
export function NachtragDialog({
  nachtrag: n,
  onRapport,
  onSchliessen,
}: {
  nachtrag: Nachtrag
  onRapport: (id: string) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const darf = hatRecht(ich, 'preise')
  const { laeuft, aus } = useAktion()
  const [betrag, setBetrag] = useState(n.betrag_rappen != null ? formatChf(n.betrag_rappen) : '')
  const [grund, setGrund] = useState('')
  const [ablehnen, setAblehnen] = useState(false)
  const gesperrt = n.status === 'verrechnet'
  const zu = (ok: boolean) => {
    if (ok) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={`${n.nummer} · ${n.kunde ?? ''}`}
        beschreibung={[n.projekt_nummer, n.rapport_nummer, n.person].filter(Boolean).join(' · ')}
        fuss={
          darf && !gesperrt ? (
            <>
              {n.status !== 'offen' && (
                <Button
                  variant="ghost"
                  laedt={laeuft}
                  onClick={() => void aus(() => nachtragStatus(n.id, 'offen')).then(zu)}
                >
                  <Undo2 />
                  {t('baustelle.nachtrag.wiederOffen')}
                </Button>
              )}
              {n.status !== 'abgelehnt' &&
                (ablehnen ? (
                  <Button
                    variant="danger"
                    laedt={laeuft}
                    disabled={!grund.trim()}
                    onClick={() => void aus(() => nachtragStatus(n.id, 'abgelehnt', grund.trim())).then(zu)}
                  >
                    <Ban />
                    {t('baustelle.nachtrag.ablehnen')}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setAblehnen(true)
                    }}
                  >
                    <Ban />
                    {t('baustelle.nachtrag.ablehnen')}
                  </Button>
                ))}
              {n.status === 'offen' && (
                <Button
                  variant="secondary"
                  laedt={laeuft}
                  onClick={() => void aus(() => nachtragStatus(n.id, 'vom_kunden_bestaetigt')).then(zu)}
                >
                  <CheckCircle2 />
                  {t('baustelle.nachtrag.bestaetigen')}
                </Button>
              )}
              <Button
                laedt={laeuft}
                disabled={betrag.trim() !== '' && parseChf(betrag) === null}
                onClick={() =>
                  void aus(() => nachtragBetrag(n, betrag.trim() ? parseChf(betrag) : null), {
                    de: 'Betrag gespeichert',
                    fr: 'Montant enregistré',
                  }).then(zu)
                }
              >
                {t('allgemein.speichern')}
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <Badge ton={nachtragTon(n.status)} punkt className="self-start">
            {t(`baustelle.nachtrag.status.${n.status}`)}
          </Badge>
          <p className="whitespace-pre-line">{n.beschreibung}</p>
          <dl>
            {n.stunden != null && <Angabe label={t('baustelle.nachtrag.stunden')}>{n.stunden}</Angabe>}
            {n.material.length > 0 && (
              <Angabe label={t('baustelle.nachtrag.material')}>{n.material.map((m) => m.text).join(', ')}</Angabe>
            )}
            {n.bestaetigt_am && (
              <Angabe label={t('baustelle.nachtrag.bestaetigtAm')}>{formatDatumZeit(n.bestaetigt_am)}</Angabe>
            )}
            {n.abgelehnt_grund && <Angabe label={t('baustelle.nachtrag.grund')}>{n.abgelehnt_grund}</Angabe>}
          </dl>
          {darf && !gesperrt ? (
            <Feld
              id="n-betrag"
              label={t('baustelle.nachtrag.betragChf')}
              hinweis={t('baustelle.nachtrag.betragHinweis')}
            >
              <Input
                id="n-betrag"
                inputMode="decimal"
                value={betrag}
                onChange={(e) => {
                  setBetrag(e.target.value)
                }}
              />
            </Feld>
          ) : (
            n.betrag_rappen != null && (
              <Angabe label={t('baustelle.nachtrag.betrag')}>
                {formatChf(n.betrag_rappen, { mitWaehrung: true })}
              </Angabe>
            )
          )}
          {ablehnen && (
            <Feld id="n-grund" label={t('baustelle.nachtrag.grund')} pflicht>
              <Input
                id="n-grund"
                value={grund}
                onChange={(e) => {
                  setGrund(e.target.value)
                }}
              />
            </Feld>
          )}
          {n.rapport_id && (
            <Button
              variant="link"
              className="self-start"
              onClick={() => {
                if (n.rapport_id) onRapport(n.rapport_id)
                onSchliessen()
              }}
            >
              <ClipboardPen />
              {t('baustelle.nachtrag.zumRapport', { nummer: n.rapport_nummer ?? '' })}
            </Button>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
