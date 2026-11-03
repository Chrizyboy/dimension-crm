import { useBenutzerDaten } from '../hooks/useBenutzer'
import { Zustaendigkeiten } from './Zustaendigkeiten'

/** Zuständigkeiten als Bereich der Einstellungen: lädt Personen und Standorte selbst. */
export default function ZustaendigkeitenBereich() {
  const { personen, standorte } = useBenutzerDaten()
  return <Zustaendigkeiten personen={personen.data ?? []} standorte={standorte.data ?? []} />
}
