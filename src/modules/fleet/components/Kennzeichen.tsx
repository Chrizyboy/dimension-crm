/**
 * Kennzeichen wie das Schild: weiss mit dunklem Rand, Kanton vorne klein. So erkennt man ein Fahrzeug in Listen
 * und im Plan auf einen Blick.
 */
export function Kennzeichen({ nummer, gross = false }: { nummer: string; gross?: boolean }) {
  const [kanton, ...rest] = nummer.trim().split(/\s+/)
  const ohneKanton = rest.length > 0 && /^[A-Za-z]{2}$/.test(kanton ?? '')
  return (
    <span
      className={`border-foreground bg-surface text-foreground zahlen inline-flex items-center gap-1 rounded border-[1.5px] px-1.5 font-semibold tracking-wide whitespace-nowrap ${gross ? 'text-sm' : 'text-xs'}`}
    >
      {ohneKanton && <span className="bg-bad rounded-sm px-0.5 text-[10px] leading-tight text-white">{kanton}</span>}
      {ohneKanton ? rest.join(' ') : nummer}
    </span>
  )
}
