import { Mail, Phone, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { formatTelefon } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { akteSetzen } from '../services/grossprojekte'
import { KONTAKT_ROLLEN, type Grossprojekt, type Kontakt, type KontaktRolle } from '../types'
import { Box } from './Box'

const TON: Record<KontaktRolle, 'marke' | 'info' | 'neutral'> = {
  entscheider: 'marke',
  technik: 'info',
  einfluss: 'neutral',
  andere: 'neutral',
}

const LEER: Kontakt = { name: '', funktion: '', rolle: 'entscheider', telefon: '', email: '' }

/**
 * Wer beim Kunden entscheidet: Entscheider, Technik (vor Ort), Einfluss (Treuhand, Verwaltung). Bei Contracting
 * reden mehrere mit; ohne Entscheider kommt kein Vertrag zustande. Die Ansprechperson aus der Recherche steht oben
 * als Vorschlag.
 */
export function KontakteBox({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [neu, setNeu] = useState<Kontakt | null>(null)
  const speichere = (kontakte: Kontakt[]) =>
    aus(() => akteSetzen(g.id, { kontakte }), { de: 'Gespeichert', fr: 'Enregistré' })
  const vorschlag =
    g.ansprechperson && !g.kontakte.some((k) => k.name === g.ansprechperson?.name) ? g.ansprechperson : null

  return (
    <Box
      titel={t('grossprojekte.projekt.kontakte')}
      rechts={
        !neu && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNeu(LEER)
            }}
          >
            <Plus />
            {t('grossprojekte.projekt.person')}
          </Button>
        )
      }
    >
      {g.kontakte.length === 0 && !neu && (
        <p className="text-muted-foreground text-sm">{t('grossprojekte.projekt.keineKontakte')}</p>
      )}
      <ul className="flex flex-col divide-y">
        {g.kontakte.map((k, i) => (
          <li key={`${k.name}-${String(i)}`} className="flex items-start gap-2 py-1.5">
            <Avatar name={k.name} className="size-7 text-xs" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-1.5">
                <b>{k.name}</b>
                <Badge ton={TON[k.rolle]}>{t(`grossprojekte.rolle.${k.rolle}`)}</Badge>
              </span>
              {k.funktion && <span className="text-muted-foreground text-xs">{k.funktion}</span>}
              <span className="flex flex-wrap gap-x-3 text-xs">
                {k.telefon && (
                  <a href={`tel:${k.telefon}`} className="text-accent-ink inline-flex items-center gap-1 underline">
                    <Phone className="size-3" aria-hidden="true" />
                    {formatTelefon(k.telefon)}
                  </a>
                )}
                {k.email && (
                  <a href={`mailto:${k.email}`} className="text-accent-ink inline-flex items-center gap-1 underline">
                    <Mail className="size-3" aria-hidden="true" />
                    {k.email}
                  </a>
                )}
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t('grossprojekte.projekt.entfernen', { name: k.name })}
              disabled={laeuft}
              onClick={() => void speichere(g.kontakte.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      {vorschlag && !neu && (
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => {
            setNeu({ ...LEER, ...vorschlag, rolle: 'entscheider' })
          }}
        >
          {t('grossprojekte.projekt.ausRecherche', { name: vorschlag.name })}
        </Button>
      )}
      {neu && (
        <div className="bg-muted/40 grid gap-2 rounded-lg border p-2 sm:grid-cols-2">
          {(['name', 'funktion', 'telefon', 'email'] as const).map((f) => (
            <Input
              key={f}
              className="h-8"
              aria-label={t(`grossprojekte.projekt.feld.${f}`)}
              placeholder={t(`grossprojekte.projekt.feld.${f}`)}
              value={neu[f] ?? ''}
              onChange={(e) => {
                setNeu({ ...neu, [f]: e.target.value })
              }}
            />
          ))}
          <Auswahl
            aria-label={t('grossprojekte.projekt.feld.rolle')}
            value={neu.rolle}
            onValueChange={(r) => {
              setNeu({ ...neu, rolle: r as KontaktRolle })
            }}
            optionen={KONTAKT_ROLLEN.map((r) => ({ wert: r, text: t(`grossprojekte.rolle.${r}`) }))}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNeu(null)
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              size="sm"
              disabled={!neu.name.trim()}
              laedt={laeuft}
              onClick={() =>
                void speichere([...g.kontakte, { ...neu, name: neu.name.trim() }]).then((ok) => {
                  if (ok) setNeu(null)
                })
              }
            >
              {t('allgemein.speichern')}
            </Button>
          </div>
        </div>
      )}
    </Box>
  )
}
