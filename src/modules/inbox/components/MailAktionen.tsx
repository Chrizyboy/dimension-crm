import {
  Archive,
  Check,
  Clock,
  Forward,
  ListTodo,
  MoreHorizontal,
  Reply,
  RotateCcw,
  Undo2,
  UserCheck,
  Wand2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/diverses'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTitel, MenueTrenner } from '@/components/ui/menue'
import { formatDatumZeit } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { istZurueck } from '../lib/anzeige'
import { zurueckZeiten } from '../lib/zeiten'
import {
  ablegen,
  aufKundeWarten,
  erledigen,
  oeffnen,
  wartenBeenden,
  zurueckHolen,
  zurueckstellen,
} from '../services/posteingang'
import type { Mail } from '../types'
import type { Fenster } from './MailBereich'

/**
 * Aktionen unter der Mail. Offen: Antworten (R), Weitergeben (W), Zurückstellen (Z), Mehr (Aufgabe, Regel für den
 * Absender, Ablegen), Erledigt (E) und «Erledigt, auf Kunde warten». Erledigt: wieder öffnen, warten beenden.
 */
export function MailAktionen({
  m,
  onFenster,
  onWeiter,
}: {
  m: Mail
  onFenster: (f: Fenster) => void
  onWeiter: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const weiter = (ok: boolean) => {
    if (ok) onWeiter()
  }

  if (m.stand === 'erledigt' || m.stand === 'abgelegt')
    return (
      <>
        {m.warten_bis ? (
          <Button variant="ghost" laedt={laeuft} onClick={() => void aus(() => wartenBeenden(m.id))}>
            <UserCheck />
            {t('posteingang.akte.wartenEnde')}
          </Button>
        ) : (
          m.stand === 'erledigt' &&
          m.von_email && (
            <Button
              variant="ghost"
              laedt={laeuft}
              onClick={() =>
                void aus(() => aufKundeWarten(m.id), { de: 'Wir warten auf den Kunden', fr: 'En attente du client' })
              }
            >
              <Clock />
              {t('posteingang.akte.aufKundeWarten')}
            </Button>
          )
        )}
        <Button variant="secondary" laedt={laeuft} onClick={() => void aus(() => oeffnen(m.id))}>
          <RotateCcw />
          {t('posteingang.akte.oeffnen')}
        </Button>
      </>
    )

  const zurueck = istZurueck(m)
  return (
    <>
      {m.von_email && (
        <Button
          onClick={() => {
            onFenster('antworten')
          }}
        >
          <Reply />
          {t('posteingang.akte.antworten')}
          <Kbd className="hidden lg:inline">R</Kbd>
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={() => {
          onFenster('weitergeben')
        }}
      >
        <Forward />
        {t('posteingang.akte.weitergeben')}
      </Button>
      {zurueck ? (
        <Button variant="secondary" laedt={laeuft} onClick={() => void aus(() => zurueckHolen(m.id))}>
          <Undo2 />
          {t('posteingang.akte.zurueckHolen')}
        </Button>
      ) : (
        <Menue>
          <MenueAusloeser asChild>
            <Button variant="secondary">
              <Clock />
              {t('posteingang.akte.zurueckstellen')}
            </Button>
          </MenueAusloeser>
          <MenueInhalt align="start">
            <MenueTitel>{t('posteingang.akte.zurueckWann')}</MenueTitel>
            {zurueckZeiten().map((z) => (
              <MenueEintrag
                key={z.wahl}
                onSelect={() =>
                  void aus(() => zurueckstellen(m.id, z.bis), {
                    de: `Zurückgestellt bis ${formatDatumZeit(z.bis.toISOString())}`,
                    fr: `Mis de côté jusqu’au ${formatDatumZeit(z.bis.toISOString())}`,
                  }).then(weiter)
                }
              >
                <span className="flex-1">{t(`posteingang.zurueck.${z.wahl}`)}</span>
                <span className="text-muted-foreground zahlen text-xs">{formatDatumZeit(z.bis.toISOString())}</span>
              </MenueEintrag>
            ))}
          </MenueInhalt>
        </Menue>
      )}
      <Menue>
        <MenueAusloeser asChild>
          <Button variant="ghost" aria-label={t('posteingang.akte.mehr')}>
            <MoreHorizontal />
          </Button>
        </MenueAusloeser>
        <MenueInhalt align="end">
          <MenueEintrag
            onSelect={() => {
              onFenster('aufgabe')
            }}
          >
            <ListTodo />
            {t('posteingang.akte.aufgabe')}
          </MenueEintrag>
          {m.von_email && (
            <MenueEintrag
              onSelect={() => {
                onFenster('regel')
              }}
            >
              <Wand2 />
              {t('posteingang.akte.regel')}
            </MenueEintrag>
          )}
          <MenueTrenner />
          <MenueEintrag onSelect={() => void aus(() => ablegen(m.id), { de: 'Abgelegt', fr: 'Classé' }).then(weiter)}>
            <Archive />
            {t('posteingang.akte.ablegen')}
          </MenueEintrag>
        </MenueInhalt>
      </Menue>
      <div className="ml-auto flex gap-2">
        {m.von_email && (
          <Button
            variant="ghost"
            laedt={laeuft}
            onClick={() =>
              void aus(() => aufKundeWarten(m.id), {
                de: 'Erledigt, wir warten auf den Kunden',
                fr: 'Terminé, en attente du client',
              }).then(weiter)
            }
          >
            <Clock />
            {t('posteingang.akte.erledigtWarten')}
          </Button>
        )}
        <Button
          variant="secondary"
          laedt={laeuft}
          onClick={() => void aus(() => erledigen(m.id), { de: 'Erledigt', fr: 'Terminé' }).then(weiter)}
        >
          <Check />
          {t('posteingang.akte.erledigt')}
          <Kbd className="hidden lg:inline">E</Kbd>
        </Button>
      </div>
    </>
  )
}
