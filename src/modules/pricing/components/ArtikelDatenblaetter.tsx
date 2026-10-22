import { FileText, Upload } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { usePreisAenderung } from '../hooks/usePreise'
import { DATENBLATT_SPRACHEN } from '../lib/datenblatt'
import { legeDatenblattAb, setzeArtikel } from '../services/preise'
import type { Artikel, Datenblaetter } from '../types'
import { DatenblattLink } from './DatenblattLink'

type Sprache = (typeof DATENBLATT_SPRACHEN)[number]

/**
 * Datenblätter des Herstellers je Sprache (V87): Link einfügen oder PDF hochladen. Leeres Feld entfernt das
 * Datenblatt dieser Sprache. Familie, Hinweis und Stand aus der Recherche bleiben erhalten.
 */
export function ArtikelDatenblaetter({ a }: { a: Artikel }) {
  const { t } = useTranslation()
  const [entwurf, setEntwurf] = useState<Partial<Record<Sprache, string>>>({})
  const speichern = usePreisAenderung((d: Datenblaetter) => setzeArtikel(a.id, { datenblaetter: d }))

  async function setze(sprache: Sprache, wert: string | undefined) {
    const d = { ...a.datenblaetter, [sprache]: wert?.trim() || undefined }
    try {
      await speichern.mutateAsync(d)
      melde('ok', { de: 'Datenblatt gespeichert', fr: 'Fiche technique enregistrée' })
    } catch (f) {
      meldeFehler(f, 'preise.datenblatt')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setEntwurf((e) => ({ ...e, [sprache]: undefined }))
    }
  }

  async function lade(sprache: Sprache, datei: File | undefined) {
    if (!datei) return
    try {
      await setze(sprache, await legeDatenblattAb(a.id, sprache, datei))
    } catch (f) {
      meldeFehler(f, 'preise.datenblatt')
      melde('kritisch', { de: 'Datei nicht hochgeladen', fr: 'Fichier non téléversé' })
    }
  }

  const d = a.datenblaetter
  return (
    <AkteAbschnitt
      titel={t('preise.akte.datenblaetter')}
      zusatz={DATENBLATT_SPRACHEN.filter((s) => d[s]).length || undefined}
    >
      <div className="flex flex-col gap-2">
        {DATENBLATT_SPRACHEN.map((s) => {
          const wert = entwurf[s] ?? (d[s]?.startsWith('dokumente:') ? '' : (d[s] ?? ''))
          return (
            <div key={s} className="flex items-center gap-2">
              <span className="w-7 shrink-0 text-xs font-semibold uppercase">{s}</span>
              {d[s] ? (
                <DatenblattLink wert={d[s]} sprache={s} />
              ) : (
                <FileText className="text-muted-foreground/40 size-4" aria-hidden="true" />
              )}
              <Input
                aria-label={t('preise.akte.datenblattLink', { sprache: s.toUpperCase() })}
                placeholder={d[s]?.startsWith('dokumente:') ? t('preise.akte.datei') : 'https://…'}
                value={wert}
                className="h-7 text-xs"
                onChange={(e) => {
                  setEntwurf((x) => ({ ...x, [s]: e.target.value }))
                }}
                onBlur={() => {
                  if (entwurf[s] !== undefined && entwurf[s] !== (d[s] ?? '')) void setze(s, entwurf[s])
                }}
              />
              <label className="hover:bg-muted focus-within:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded focus-within:ring-2">
                <Upload className="text-muted-foreground size-4" aria-hidden="true" />
                <span className="sr-only">{t('preise.akte.hochladen', { sprache: s.toUpperCase() })}</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => void lade(s, e.target.files?.[0])}
                />
              </label>
            </div>
          )
        })}
        {(d.fam ?? d.hint ?? d.stand) && (
          <p className="text-muted-foreground pt-1 text-xs">
            {[d.fam, d.hint, d.stand ? t('preise.akte.stand', { datum: formatDatum(d.stand) }) : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
    </AkteAbschnitt>
  )
}
