import { createPortal } from 'react-dom'
import { formatDatum } from '@/lib/format'
import { nurText, type Block, type Kapitel } from '../lib/kapitel'

/** Druckfassung eines Kapitels (A4, zum Verteilen oder als PDF). Papier ist weiss, darum feste Farben. */
export function KapitelDruck({ kapitel: k, sprache }: { kapitel: Kapitel; sprache: 'de' | 'fr' }) {
  return createPortal(
    <div className="druckbereich" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#10263f' }}>
      <img src={`./logo/logo-hell-${sprache}.png`} alt="Dimension Solaire" style={{ height: 36 }} />
      <hr style={{ border: 0, borderTop: '2px solid #f7931e', margin: '8px 0 14px' }} />
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{k.titel}</h1>
      <Druckbloecke bloecke={k.einleitung} />
      {k.abschnitte.map((a) => (
        <section key={a.schluessel} style={{ marginTop: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{a.titel}</h2>
          <Druckbloecke bloecke={a.bloecke} />
          {a.unter.map((u) => (
            <div key={u.anker} style={{ breakInside: 'avoid', marginTop: 6 }}>
              <h3 style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 2 }}>{u.titel}</h3>
              <Druckbloecke bloecke={u.bloecke} />
            </div>
          ))}
        </section>
      ))}
      {k.stand && <p style={{ marginTop: 16, color: '#465163' }}>Stand {formatDatum(k.stand)}</p>}
    </div>,
    document.body,
  )
}

function Druckbloecke({ bloecke }: { bloecke: Block[] }) {
  return (
    <>
      {bloecke.map((b, i) => {
        if (b.art === 'absatz')
          return (
            <p key={i} style={{ lineHeight: 1.5, margin: '2px 0' }}>
              {nurText(b.text)}
            </p>
          )
        const Liste = b.geordnet ? 'ol' : 'ul'
        return (
          <Liste key={i} style={{ paddingLeft: 18, lineHeight: 1.5, listStyle: b.geordnet ? 'decimal' : 'disc' }}>
            {b.punkte.map((p, j) => (
              <li key={j}>{nurText(p)}</li>
            ))}
          </Liste>
        )
      })}
    </>
  )
}
