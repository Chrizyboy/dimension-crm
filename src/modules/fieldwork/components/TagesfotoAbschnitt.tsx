import { Camera, Check } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { verkleinern } from '@/lib/bild'
import type { TagesfotoOffen } from '../types'

/**
 * Foto des Tages im Stopp-Dialog: je Baustelle von heute ohne Foto ein Knopf, der die Kamera öffnet.
 * Erst wenn jede Baustelle ein Foto hat, geht der Stopp (Chris 4.11.2026: einer im Team genügt).
 */
export function TagesfotoAbschnitt({
  offen,
  fotos,
  onFoto,
}: {
  offen: TagesfotoOffen[]
  fotos: Record<string, Blob>
  onFoto: (projektId: string, foto: Blob) => void
}) {
  const { t } = useTranslation()
  if (offen.length === 0) return null
  return (
    <section className="border-warn bg-warn-soft mt-4 flex flex-col gap-2 rounded-md border p-3">
      <h3 className="text-sm font-semibold">{t('baustelle.tagesfoto.titel')}</h3>
      <p className="text-sm">{t('baustelle.tagesfoto.text')}</p>
      {offen.map((o) => (
        <FotoKnopf
          key={o.projekt_id}
          text={[o.nummer, o.kunde].filter(Boolean).join(' · ')}
          da={Boolean(fotos[o.projekt_id])}
          onFoto={(f) => {
            onFoto(o.projekt_id, f)
          }}
        />
      ))}
    </section>
  )
}

function FotoKnopf({ text, da, onFoto }: { text: string; da: boolean; onFoto: (f: Blob) => void }) {
  const { t } = useTranslation()
  const eingabe = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-sm">{text}</span>
      <Button
        size="lg"
        variant={da ? 'secondary' : 'primary'}
        onClick={() => {
          eingabe.current?.click()
        }}
      >
        {da ? <Check /> : <Camera />}
        {t(da ? 'baustelle.tagesfoto.da' : 'baustelle.tagesfoto.aufnehmen')}
      </Button>
      <input
        ref={eingabe}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label={`${t('baustelle.tagesfoto.aufnehmen')} ${text}`}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void verkleinern(f).then(onFoto)
        }}
      />
    </div>
  )
}
