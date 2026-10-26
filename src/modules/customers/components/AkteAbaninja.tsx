import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, RefreshCw, Search, Unlink, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KONTAKT_SCHLUESSEL } from '@/hooks/useKontakte'
import { formatChf, formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { abaninja, meldeIntegrationsFehler, type AbaKunde } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'

/**
 * Kunde in AbaNinja (V139–V145): verknüpfen (suchen oder neu anlegen), Angaben aus dem CRM nachführen,
 * offene Rechnungen sehen (nur mit Recht «Finanzen»). Rechnungen schreibt weiterhin AbaNinja.
 */
export function AkteAbaninja({
  kontaktId,
  abaninjaId,
  name,
}: {
  kontaktId: string
  abaninjaId: string | null
  name: string
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const [suche, setSuche] = useState<string | null>(null)
  const [treffer, setTreffer] = useState<AbaKunde[] | null>(null)
  const [laeuft, setLaeuft] = useState<string | null>(null)
  const finanzen = hatRecht(ich, 'finanzen')
  const rechnungen = useQuery({
    queryKey: ['abaninja', 'rechnungen', kontaktId],
    queryFn: () => abaninja.rechnungen(kontaktId),
    enabled: Boolean(abaninjaId) && finanzen,
    retry: false,
  })

  async function mache(was: string, f: () => Promise<unknown>, ok: { de: string; fr: string }) {
    setLaeuft(was)
    try {
      await f()
      melde('ok', ok)
      setSuche(null)
      setTreffer(null)
      await qc.invalidateQueries({ queryKey: KONTAKT_SCHLUESSEL })
      await qc.invalidateQueries({ queryKey: ['abaninja'] })
    } catch (e) {
      meldeIntegrationsFehler(e)
    } finally {
      setLaeuft(null)
    }
  }

  async function suchen(begriff: string) {
    setLaeuft('suchen')
    try {
      setTreffer((await abaninja.suchen(begriff)).kunden)
    } catch (e) {
      meldeIntegrationsFehler(e)
    } finally {
      setLaeuft(null)
    }
  }

  if (!abaninjaId) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">{t('akte.abaninja.nicht')}</p>
        {suche === null ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSuche(name)
              }}
            >
              <Search />
              {t('akte.abaninja.suchen')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              laedt={laeuft === 'anlegen'}
              onClick={() =>
                void mache('anlegen', () => abaninja.anlegen(kontaktId), {
                  de: 'In AbaNinja angelegt',
                  fr: 'Créé dans AbaNinja',
                })
              }
            >
              <UserPlus />
              {t('akte.abaninja.anlegen')}
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void suchen(suche)
            }}
          >
            <div className="flex gap-2">
              <Input
                aria-label={t('akte.abaninja.suchen')}
                value={suche}
                onChange={(e) => {
                  setSuche(e.target.value)
                }}
                autoFocus
              />
              <Button type="submit" size="md" variant="secondary" laedt={laeuft === 'suchen'}>
                <Search />
              </Button>
            </div>
            {treffer?.length === 0 && <p className="text-muted-foreground">{t('akte.abaninja.keinTreffer')}</p>}
            {treffer && treffer.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {treffer.map((k) => (
                  <li key={k.uuid} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="line-clamp-2 font-medium">{k.name}</span>
                      <span className="text-muted-foreground line-clamp-2 text-xs">
                        {[k.kundennummer, k.email, k.ort].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      laedt={laeuft === k.uuid}
                      onClick={() =>
                        void mache(k.uuid, () => abaninja.verknuepfen(kontaktId, k.uuid), {
                          de: 'Mit AbaNinja verknüpft',
                          fr: 'Lié à AbaNinja',
                        })
                      }
                    >
                      <Link2 />
                      {t('akte.abaninja.verknuepfen')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge ton="ok" punkt>
          {t('akte.abaninja.verknuepft')}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          laedt={laeuft === 'aktualisieren'}
          onClick={() =>
            void mache('aktualisieren', () => abaninja.aktualisieren(kontaktId), {
              de: 'AbaNinja nachgeführt',
              fr: 'AbaNinja mis à jour',
            })
          }
        >
          <RefreshCw />
          {t('akte.abaninja.aktualisieren')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          laedt={laeuft === 'trennen'}
          onClick={() =>
            void mache('trennen', () => abaninja.trennen(kontaktId), { de: 'Verknüpfung gelöst', fr: 'Lien supprimé' })
          }
        >
          <Unlink />
          {t('akte.abaninja.trennen')}
        </Button>
      </div>
      {finanzen &&
        (rechnungen.isPending ? null : rechnungen.isError ? (
          <p className="text-muted-foreground">{t('akte.abaninja.rechnungenFehler')}</p>
        ) : rechnungen.data.rechnungen.length === 0 ? (
          <p className="text-muted-foreground">{t('akte.abaninja.keineRechnungen')}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {rechnungen.data.rechnungen.map((r) => (
              <li key={r.uuid} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="flex flex-col">
                  <span className="font-medium">{r.nummer}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.datum && formatDatum(r.datum)}
                    {r.faellig && ` · ${t('akte.abaninja.faellig', { datum: formatDatum(r.faellig) })}`}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="zahlen font-mono">{formatChf(r.total_rappen)}</span>
                  <Badge ton={r.offen_rappen > 0 ? 'warnung' : 'ok'}>
                    {r.offen_rappen > 0
                      ? t('akte.abaninja.offen', { betrag: formatChf(r.offen_rappen) })
                      : t('akte.abaninja.bezahlt')}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}
