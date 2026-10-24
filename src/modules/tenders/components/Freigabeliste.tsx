import { Check, Inbox, Send, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kbd, Skelett } from '@/components/ui/diverses'
import { Checkbox } from '@/components/ui/schalter'
import { useDrucken } from '@/hooks/useDrucken'
import { useTaste } from '@/hooks/useTaste'
import { ausgangJetztSenden } from '@/services/integrationen'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { useAnschreiben } from '../hooks/useAusschreibungen'
import { ablehnen, bewilligen, senden, volltext } from '../services/ausschreibungen'
import { AnschreibenVorschau } from './AnschreibenVorschau'
import { BriefDruck, type Brief } from './BriefDruck'
import { EntscheidDialog } from './EntscheidDialog'

/**
 * Freigabe in Serie: links die Liste, rechts die Vorschau. «Bewilligen» (Andy, Vertretung Chris) und
 * «Senden» (Chris, Vertretung Loris) gehen für mehrere auf einmal und mit der Tastatur:
 * ↑/↓ wechseln, X auswählen, B bewilligen, A ablehnen, S senden.
 */
export function Freigabeliste({
  modus,
  darf,
  onDossier,
}: {
  modus: 'bewilligen' | 'senden'
  darf: boolean
  onDossier: (id: string) => void
}) {
  const { t } = useTranslation()
  const liste = useAnschreiben(modus === 'bewilligen' ? 'entwurf' : 'bewilligt')
  const eintraege = liste.data ?? []
  const [aktivId, setAktivId] = useState<string | null>(null)
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set())
  const [ablehnenId, setAblehnenId] = useState<string | null>(null)
  const [briefe, setBriefe] = useState<Brief[]>([])
  const { aktiv: druckt, drucke } = useDrucken()
  const { laeuft, aus } = useAktion()
  const index = Math.max(
    0,
    eintraege.findIndex((e) => e.id === aktivId),
  )
  const aktiv = eintraege[index]
  const ziel = gewaehlt.size ? eintraege.filter((e) => gewaehlt.has(e.id)) : aktiv ? [aktiv] : []

  const wechsle = (schritt: number) => {
    const n = eintraege[Math.min(eintraege.length - 1, Math.max(0, index + schritt))]
    if (n) setAktivId(n.id)
  }
  const umschalten = (id: string) => {
    const s = new Set(gewaehlt)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setGewaehlt(s)
  }

  async function bewilligeAuswahl() {
    if (!ziel.length || !darf) return
    const ids = ziel.map((e) => e.id)
    const n = ids.length
    if (await aus(() => bewilligen(ids), { de: `${n} bewilligt`, fr: `${n} approuvé(s)` })) setGewaehlt(new Set())
  }

  async function sendeAuswahl() {
    if (!ziel.length || !darf) return
    const ids = ziel.map((e) => e.id)
    // Briefe zuerst drucken (mit Signatur und PS), dann als gesendet festhalten.
    const zuDrucken = ziel.filter((e) => e.kanal === 'brief')
    if (zuDrucken.length) {
      const voll = await Promise.all(zuDrucken.map((e) => volltext(e.id)))
      setBriefe(
        zuDrucken.map((e, i) => ({
          id: e.id,
          sprache: e.sprache,
          adresse: e.an ?? e.empfaenger,
          betreff: e.betreff,
          text: voll[i] ?? e.text,
        })),
      )
      drucke()
    }
    const n = ids.length
    if (await aus(() => senden(ids), { de: `${n} gesendet oder vorbereitet`, fr: `${n} envoyé(s) ou préparé(s)` })) {
      setGewaehlt(new Set())
      if (ziel.some((e) => e.kanal === 'mail')) void ausgangJetztSenden().catch(() => null)
    }
  }

  useTaste(
    'arrowdown',
    () => {
      wechsle(1)
    },
    true,
    t('kuerzel.naechster'),
  )
  useTaste(
    'arrowup',
    () => {
      wechsle(-1)
    },
    true,
    t('kuerzel.vorheriger'),
  )
  useTaste(
    'x',
    () => {
      if (aktiv) umschalten(aktiv.id)
    },
    true,
    t('kuerzel.auswahl'),
  )
  useTaste('b', () => void bewilligeAuswahl(), modus === 'bewilligen', t('kuerzel.bewilligen'))
  useTaste(
    'a',
    () => {
      if (aktiv && darf) setAblehnenId(aktiv.id)
    },
    modus === 'bewilligen',
    t('kuerzel.ablehnen'),
  )
  useTaste('s', () => void sendeAuswahl(), modus === 'senden', t('kuerzel.senden'))

  if (liste.error) return <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
  if (liste.isPending) return <Skelett className="h-96" />
  if (!eintraege.length) {
    return (
      <Leerzustand
        icon={Inbox}
        titel={t(`ausschreibungen.freigabe.leer_${modus}`)}
        text={t('ausschreibungen.freigabe.leerText')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {!darf && (
        <p className="bg-info-soft text-info rounded-md p-3 text-sm">
          {t(`ausschreibungen.freigabe.nurLesen_${modus}`)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          aria-label={t('ausschreibungen.freigabe.alle')}
          checked={gewaehlt.size === eintraege.length ? true : gewaehlt.size ? 'indeterminate' : false}
          onCheckedChange={(c) => {
            setGewaehlt(c === true ? new Set(eintraege.map((e) => e.id)) : new Set())
          }}
        />
        <span className="text-muted-foreground text-sm">
          {gewaehlt.size
            ? t('ausschreibungen.freigabe.gewaehlt', { count: gewaehlt.size })
            : t('ausschreibungen.freigabe.anzahl', { count: eintraege.length })}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {modus === 'bewilligen' ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={!darf || !aktiv}
                onClick={() => {
                  if (aktiv) setAblehnenId(aktiv.id)
                }}
              >
                <X />
                {t('ausschreibungen.freigabe.ablehnen')} <Kbd>A</Kbd>
              </Button>
              <Button size="sm" disabled={!darf} laedt={laeuft} onClick={() => void bewilligeAuswahl()}>
                <Check />
                {t('ausschreibungen.freigabe.bewilligen', { count: ziel.length })} <Kbd>B</Kbd>
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={!darf} laedt={laeuft} onClick={() => void sendeAuswahl()}>
              <Send />
              {t('ausschreibungen.freigabe.senden', { count: ziel.length })} <Kbd>S</Kbd>
            </Button>
          )}
        </span>
      </div>
      <p className="text-muted-foreground hidden text-xs md:block">
        <Kbd>↑</Kbd> <Kbd>↓</Kbd> {t('ausschreibungen.freigabe.tastenWechseln')} · <Kbd>X</Kbd>{' '}
        {t('ausschreibungen.freigabe.tastenWaehlen')}
      </p>
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <ul className="bg-surface divide-y rounded-lg border" aria-label={t(`ausschreibungen.reiter.${modus}`)}>
          {eintraege.map((e) => (
            <li
              key={e.id}
              className={cn('flex items-start gap-3 px-3 py-2.5', e.id === aktiv?.id && 'bg-accent-soft/50')}
            >
              <Checkbox
                className="mt-1"
                aria-label={t('ausschreibungen.freigabe.waehlen', { betreff: e.betreff })}
                checked={gewaehlt.has(e.id)}
                onCheckedChange={() => {
                  umschalten(e.id)
                }}
              />
              <button
                type="button"
                aria-current={e.id === aktiv?.id ? 'true' : undefined}
                className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col rounded text-left outline-none focus-visible:ring-2"
                onClick={() => {
                  setAktivId(e.id)
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{e.empfaenger}</span>
                  <Badge className="ml-auto">{t(`ausschreibungen.kanal.${e.kanal}`)}</Badge>
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {e.dossier.nummer} · {e.dossier.titel}
                  {e.dossier.gemeinde ? `, ${e.dossier.gemeinde}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {aktiv && (
          <AnschreibenVorschau
            key={aktiv.id + aktiv.text}
            a={aktiv}
            aenderbar={modus === 'bewilligen' && darf}
            onDossier={onDossier}
          />
        )}
      </div>
      {ablehnenId && (
        <EntscheidDialog
          entscheid="ablehnen"
          titel={t('ausschreibungen.freigabe.ablehnenTitel')}
          laeuft={laeuft}
          onAbbrechen={() => {
            setAblehnenId(null)
          }}
          onOk={(a) =>
            void aus(() => ablehnen(ablehnenId, a.grund ?? ''), { de: 'Abgelehnt', fr: 'Refusé' }).then((ok) => {
              if (ok) setAblehnenId(null)
            })
          }
        />
      )}
      {druckt && <BriefDruck briefe={briefe} />}
    </div>
  )
}
