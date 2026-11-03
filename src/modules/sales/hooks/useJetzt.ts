import { useEffect, useState } from 'react'

/** Die aktuelle Zeit, jede halbe Minute neu: die 15-Minuten-Uhr läuft weiter, ohne dass Daten neu laden. */
export function useJetzt(): Date {
  const [jetzt, setJetzt] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => {
      setJetzt(new Date())
    }, 30_000)
    return () => {
      window.clearInterval(id)
    }
  }, [])
  return jetzt
}
