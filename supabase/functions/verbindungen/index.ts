// Edge Function «verbindungen»: für die Seite «Verbindungen» in den Einstellungen.
// status: welche Dienste eingerichtet sind (nur ja/nein, nie Werte) und die Rückruf-Adresse für Microsoft.
// testen: einen Dienst mit echtem Aufruf prüfen und das Ergebnis speichern (nur Admins).

import { guthaben } from '../_shared/aspsms.ts'
import { testen as abaTesten } from '../_shared/abaninja.ts'
import { dienst, gemessen } from '../_shared/datenbank.ts'
import { starte, textFeld } from '../_shared/funktion.ts'
import { DienstFehler } from '../_shared/http.ts'
import { graph, rueckrufAdresse } from '../_shared/microsoft.ts'
import { eingerichtet, env } from '../_shared/umgebung.ts'

const pruefe: Record<string, (personId: string) => Promise<string>> = {
  microsoft: async (personId) => {
    const me = await graph<{ mail?: string; userPrincipalName?: string }>(
      personId,
      '/me?$select=mail,userPrincipalName',
    )
    return me.mail ?? me.userPrincipalName ?? 'ok'
  },
  abaninja: async () => {
    await abaTesten()
    return 'ok'
  },
  sms: async () => `credits:${await guthaben()}`,
}

starte({
  status: {
    recht: 'basis',
    f: () =>
      Promise.resolve({
        eingerichtet: { ...eingerichtet(), zeitplan: Boolean(env('ZEITPLAN_SCHLUESSEL')) },
        rueckruf: env('MS_CLIENT_ID') || env('SUPABASE_URL') ? safe(rueckrufAdresse) : '',
      }),
  },
  testen: {
    recht: 'admin',
    f: async (e, ich) => {
      const d = textFeld(e, 'dienst')
      const p = pruefe[d]
      if (!p) throw new DienstFehler('eingabe', 400, 'dienst')
      try {
        const meldung = await gemessen(d, 'testen', ich.id, () => p(ich.id))
        await dienst.rpc('integration_geprueft', { p_dienst: d, p_ok: true, p_meldung: meldung })
        return { meldung }
      } catch (f) {
        const code =
          f instanceof DienstFehler
            ? f.code
            : f instanceof Error && f.message.startsWith('konfiguration:')
              ? 'nicht_eingerichtet'
              : 'intern'
        await dienst.rpc('integration_geprueft', { p_dienst: d, p_ok: false, p_meldung: code })
        throw f
      }
    },
  },
})

function safe(f: () => string): string {
  try {
    return f()
  } catch {
    return ''
  }
}
