// Edge Function «social»: Social Media und Canva für die Seite «Marketing».
// status: welche Dienste eingerichtet und verbunden sind · verbinden/trennen (nur Admins) · veroeffentlichen:
// einen freigegebenen Post sofort posten · canva_neu / canva_holen: Bild in Canva gestalten und ins CRM holen.

import { canvaHolen, canvaNeu } from '../_shared/canva.ts'
import { dienst, gemessen } from '../_shared/datenbank.ts'
import { starte, textFeld } from '../_shared/funktion.ts'
import { DienstFehler } from '../_shared/http.ts'
import { postsAbarbeiten } from '../_shared/posten.ts'
import {
  SOCIAL_DIENSTE,
  socialAnmeldeAdresse,
  socialEingerichtet,
  socialRueckruf,
  socialTrennen,
  type SocialDienst,
} from '../_shared/social_konten.ts'

function dienstFeld(e: Record<string, unknown>): SocialDienst {
  const d = textFeld(e, 'dienst') as SocialDienst
  if (!SOCIAL_DIENSTE.includes(d)) throw new DienstFehler('eingabe', 400, 'dienst')
  return d
}

starte({
  status: {
    recht: 'basis',
    f: () => {
      let rueckruf = ''
      try {
        rueckruf = socialRueckruf()
      } catch {
        rueckruf = ''
      }
      return Promise.resolve({ eingerichtet: socialEingerichtet(), rueckruf })
    },
  },
  verbinden: {
    recht: 'admin',
    f: async (e, ich) => {
      const d = dienstFeld(e)
      if (!socialEingerichtet()[d]) throw new DienstFehler('nicht_eingerichtet', 409, d)
      return { adresse: await socialAnmeldeAdresse(d, ich.id, e.sprache === 'fr' ? 'fr' : 'de') }
    },
  },
  trennen: {
    recht: 'admin',
    f: async (e) => {
      await socialTrennen(dienstFeld(e))
      return {}
    },
  },
  veroeffentlichen: {
    recht: 'basis',
    f: async (e, ich) => {
      const id = textFeld(e, 'id')
      const r = await gemessen('social', 'veroeffentlichen', ich.id, () => postsAbarbeiten(id))
      if (!r.posts) throw new DienstFehler('social.nicht_geplant', 409, 'Nicht freigegeben')
      const [p] = await dienst.lies<{ status: string; ergebnis: unknown }[]>(
        `social_posts?id=eq.${id}&select=status,ergebnis`,
      )
      return { status: p?.status, ergebnis: p?.ergebnis }
    },
  },
  canva_neu: {
    recht: 'basis',
    f: (e, ich) =>
      gemessen('canva', 'neu', ich.id, () => canvaNeu(String(e.format ?? 'quadrat'), String(e.titel ?? ''))),
  },
  canva_holen: {
    recht: 'basis',
    f: async (e, ich) => {
      const post = textFeld(e, 'post_id')
      const design = textFeld(e, 'design_id')
      if (!/^[0-9a-f-]{36}$/i.test(post)) throw new DienstFehler('eingabe', 400, 'post_id')
      return { dokument_id: await gemessen('canva', 'holen', ich.id, () => canvaHolen(post, design, ich.kuerzel)) }
    },
  },
})
