import { FileText, Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAdressbuchAenderung } from '../hooks/useAdressbuch'
import { nachweisStand } from '../lib/rollen'
import { dateiLink, entferneNachweis, speichereNachweis } from '../services/partnerTeile'
import type { Nachweis } from '../types'
import { Box, Leer } from './Box'

const TON = { abgelaufen: 'kritisch', bald: 'warnung', ok: 'ok', ohne: 'neutral' } as const

/** Datei eines Nachweises öffnen (kurzer Link aus dem privaten Speicher oder SharePoint). */
async function oeffne(n: Nachweis) {
  try {
    const url = n.sharepoint_url ?? (n.speicher_pfad ? await dateiLink(n.speicher_pfad) : null)
    if (url) window.open(url, '_blank', 'noopener')
  } catch (f) {
    meldeFehler(f, 'adressbuch.nachweis')
  }
}

/**
 * Nachweise mit Ablaufdatum (Haftpflicht, SUVA, GAV, Installationsbewilligung). Läuft einer innert 30 Tagen ab,
 * meldet der Zeitplan es einmal mit Aufgabe und Glocke (`partner_fristen_melden`).
 */
export function NachweiseBox({
  kontaktId,
  nachweise,
  heute,
}: {
  kontaktId: string
  nachweise: Nachweis[]
  heute: string
}) {
  const { t } = useTranslation()
  const arten = useAuswahl('partnernachweis')
  const [offen, setOffen] = useState<Nachweis | 'neu' | null>(null)
  return (
    <Box
      titel={t('adressbuch.akte.nachweise')}
      rechts={
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={() => {
            setOffen('neu')
          }}
        >
          <Plus />
          {t('adressbuch.akte.nachweisNeu')}
        </Button>
      }
    >
      {nachweise.length === 0 && <Leer>{t('adressbuch.akte.keineNachweise')}</Leer>}
      {nachweise.map((n) => {
        const stand = nachweisStand(n.gueltig_bis, heute)
        return (
          <div
            key={n.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 border-b pb-2 last:border-b-0 last:pb-0"
          >
            <button
              type="button"
              className="truncate text-left font-medium hover:underline"
              onClick={() => {
                setOffen(n)
              }}
            >
              {arten.text(n.art)}
            </button>
            <Badge ton={TON[stand]}>
              {n.gueltig_bis
                ? t('adressbuch.akte.bis', { datum: formatDatum(n.gueltig_bis) })
                : t('adressbuch.nachweis.ohne')}
            </Badge>
            <div className="text-muted-foreground col-span-2 flex flex-wrap items-center gap-2 text-xs">
              {n.notiz && <span>{n.notiz}</span>}
              {(n.speicher_pfad ?? n.sharepoint_url) && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => void oeffne(n)}
                >
                  <FileText className="size-3" aria-hidden="true" />
                  {n.datei ?? t('adressbuch.akte.datei')}
                </button>
              )}
            </div>
          </div>
        )
      })}
      {offen && (
        <NachweisDialog
          kontaktId={kontaktId}
          nachweis={offen === 'neu' ? null : offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </Box>
  )
}

function NachweisDialog({
  kontaktId,
  nachweis,
  onSchliessen,
}: {
  kontaktId: string
  nachweis: Nachweis | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const arten = useAuswahl('partnernachweis')
  const [art, setArt] = useState(nachweis?.art ?? 'haftpflicht')
  const [bis, setBis] = useState(nachweis?.gueltig_bis ?? '')
  const [notiz, setNotiz] = useState(nachweis?.notiz ?? '')
  const [datei, setDatei] = useState<File | undefined>()
  const speichern = useAdressbuchAenderung(() =>
    speichereNachweis(
      kontaktId,
      { ...(nachweis ? { id: nachweis.id } : {}), art, gueltig_bis: bis || null, notiz },
      datei,
    ),
  )
  const entfernen = useAdressbuchAenderung((id: string) => entferneNachweis(id))

  async function absenden() {
    try {
      await speichern.mutateAsync(undefined)
      melde('ok', { de: 'Nachweis gespeichert', fr: 'Attestation enregistrée' })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'adressbuch.nachweis')
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
        titel={nachweis ? arten.text(nachweis.art) : t('adressbuch.akte.nachweisNeu')}
        fuss={
          <>
            {nachweis && (
              <Button
                variant="ghost"
                className="mr-auto"
                laedt={entfernen.isPending}
                onClick={() => {
                  void entfernen.mutateAsync(nachweis.id).then(onSchliessen, (f: unknown) => {
                    meldeFehler(f, 'adressbuch.nachweis')
                  })
                }}
              >
                <Trash2 />
                {t('adressbuch.akte.entfernen')}
              </Button>
            )}
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Feld id="nachweis-art" label={t('adressbuch.akte.nachweisArt')}>
            <Auswahl
              id="nachweis-art"
              value={art}
              onValueChange={setArt}
              optionen={arten.werte.map((a) => ({ wert: a.schluessel, text: arten.text(a.schluessel) }))}
            />
          </Feld>
          <Feld id="nachweis-bis" label={t('adressbuch.akte.gueltigBis')}>
            <Input
              id="nachweis-bis"
              type="date"
              value={bis}
              onChange={(e) => {
                setBis(e.target.value)
              }}
            />
          </Feld>
          <Feld id="nachweis-notiz" label={t('adressbuch.akte.notiz')}>
            <Input
              id="nachweis-notiz"
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
          <Feld
            id="nachweis-datei"
            label={t('adressbuch.akte.datei')}
            {...(nachweis?.datei ? { hinweis: nachweis.datei } : {})}
          >
            <Input
              id="nachweis-datei"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => {
                setDatei(e.target.files?.[0])
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
