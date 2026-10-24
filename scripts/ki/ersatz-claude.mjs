// Ersatz-Server für die Claude API (Messages) – nur für Tests und die Vorschau. Antwortet wie die echte API, soweit
// das CRM sie nutzt (Kopfzeilen, strukturierte Ausgabe, Verbrauch, Ablehnung, Überlastung), mit erfundenen, aber
// passenden Inhalten. Er merkt sich jede Anfrage, damit der Test prüfen kann, was gesendet wurde.
// Ersetzt NICHT den Test mit dem echten Schlüssel (siehe docs/ki.md).

import { createServer } from 'node:http'

/** Beispielwert zu einem JSON-Schema (für Felder, die keine eigene Antwort haben). */
export function beispiel(s) {
  if (!s || typeof s !== 'object') return null
  if (s.anyOf) return beispiel(s.anyOf.find((x) => x.type !== 'null') ?? s.anyOf[0])
  if (s.enum) return s.enum[0]
  if (s.type === 'object')
    return Object.fromEntries(Object.entries(s.properties ?? {}).map(([k, v]) => [k, beispiel(v)]))
  if (s.type === 'array') return [beispiel(s.items)]
  if (s.type === 'string') return 'Beispiel'
  if (s.type === 'integer') return 3
  if (s.type === 'number') return 42.5
  if (s.type === 'boolean') return false
  return null
}

/** Inhalt eines <daten name="…">-Blocks (JSON gelesen, sonst Text). */
function datenBlock(text, name) {
  const m = new RegExp(`<daten name="${name}">\\n([\\s\\S]*?)\\n</daten>`).exec(text)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return m[1]
  }
}

const tagPlus = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

/** Passende, erfundene Antworten je Aufgabe; erkannt an den Feldern des Schemas. */
function antwort(schema, eingabe, fr) {
  const f = Object.keys(schema?.properties ?? {})
  const hat = (...k) => k.every((x) => f.includes(x))
  if (hat('betreff', 'text', 'hinweise')) {
    return fr
      ? {
          betreff: 'Votre offre – un point sur la suite',
          text: 'Bonjour Madame,\n\nMerci encore pour votre accueil lors de notre visite. Je reviens vers vous au sujet de l’offre que nous vous avons envoyée il y a deux semaines.\n\nLe dimensionnement\n\nL’installation proposée couvre environ 70 % de votre consommation annuelle. Avec la batterie, vous utilisez aussi le courant du midi le soir.\n\nAvez-vous des questions ou souhaitez-vous une adaptation ? N’hésitez pas à m’appeler si vous préférez en discuter de vive voix.\n\nMeilleures salutations\n[Nom]\nDimension Solaire',
          hinweise: ['Platzhalter [Nom] prüfen'],
        }
      : {
          betreff: 'Ihre Offerte – kurz nachgefragt',
          text: 'Guten Tag Frau Muster\n\nVielen Dank nochmals für das angenehme Gespräch bei Ihnen vor Ort. Vor zwei Wochen haben wir Ihnen die Offerte für Ihre Solaranlage geschickt, und ich möchte kurz nachfragen, wie es Ihnen damit geht.\n\nZur Auslegung\n\nDie vorgeschlagene Anlage deckt rund 70 % Ihres Jahresverbrauchs. Mit dem Speicher nutzen Sie den Strom vom Mittag auch am Abend.\n\nWenn Sie etwas anpassen möchten, zum Beispiel die Grösse des Speichers, mache ich Ihnen gerne eine zweite Variante. Rufen Sie mich gerne an, wenn Sie etwas lieber direkt besprechen möchten.\n\nFreundliche Grüsse\nAdam Admin\nDimension Solaire',
          hinweise: [],
        }
  }
  if (hat('regeln') && f.length === 1) {
    return {
      regeln: [
        'Kurze Sätze, direkt zum Punkt.',
        'Anrede «Guten Tag», nie «Sehr geehrte».',
        'Am Schluss immer einen Rückruf anbieten.',
      ],
    }
  }
  if (hat('texte', 'thema')) {
    const netze = Object.keys(schema.properties.texte.properties)
    const sprachen = Object.keys(schema.properties.texte.properties[netze[0]].properties)
    const t = {
      instagram: {
        de: 'Strom vom eigenen Dach – auch im Winter ☀️ Unsere neue Anlage in Muri liefert dank steiler Montage mehr Winterstrom.\n\n#Solar #Photovoltaik #Muri #Aargau #Winterstrom #Eigenverbrauch #Schweiz #Solaranlage',
        fr: 'Du courant de son propre toit, même en hiver ☀️\n\n#Solaire #Photovoltaïque #Bulle #Gruyère #Suisse #Autoconsommation #Hiver #Énergie',
      },
      facebook: {
        de: 'Strom vom eigenen Dach – auch im Winter. Unsere neue Anlage zeigt, wie viel eine steile Montage bringt. #Solar',
        fr: 'Du courant de son propre toit, même en hiver. #Solaire',
      },
      linkedin: {
        de: 'Winterstrom ist das neue Thema. Mit steiler Montage und Speicher steigt der Eigenverbrauch auch in den kurzen Monaten deutlich.\n\n#Photovoltaik #Energiewende #Muri',
        fr: 'L’électricité d’hiver devient un sujet clé.\n\n#Photovoltaïque #Énergie',
      },
    }
    return {
      texte: Object.fromEntries(netze.map((n) => [n, Object.fromEntries(sprachen.map((s) => [s, t[n][s]]))])),
      thema: 'Winterstrom',
    }
  }
  if (f.every((k) => k === 'de' || k === 'fr') && f.length) {
    const tx = {
      de: {
        betreff: 'Winterstrom vom eigenen Dach',
        text: '{Anrede}\n\nIm Winter liefert eine Solaranlage weniger Strom – aber mit der richtigen Planung mehr, als viele denken. Steil montierte Module und ein Speicher helfen, den Eigenverbrauch auch in den kurzen Monaten hochzuhalten.\n\nGerne prüfen wir bei Ihrer Anlage, was sich verbessern lässt.\n\nFreundliche Grüsse\n\n{Absender}',
      },
      fr: {
        betreff: 'De l’électricité d’hiver sur votre toit',
        text: '{Anrede}\n\nEn hiver, une installation solaire produit moins – mais avec une bonne planification, plus qu’on ne le pense.\n\nNous vérifions volontiers ce qui peut être amélioré sur votre installation.\n\nMeilleures salutations\n\n{Absender}',
      },
    }
    return Object.fromEntries(f.map((s) => [s, tx[s]]))
  }
  if (hat('typ', 'kontakt', 'lead')) {
    const m = datenBlock(eingabe, 'mail') ?? {}
    const text = `${m.betreff ?? ''}\n${m.text ?? ''}`
    const name = /^\s*"?([^"<]+?)"?\s*</.exec(m.von ?? '')?.[1]?.trim() ?? ''
    const [vorname = null, ...rest] = name ? name.split(/\s+/) : []
    const ort = /\b(\d{4})\s+([A-ZÄÖÜ][\wäöüéè-]+)/.exec(text)
    const anliegen = /störung|fehler|frage zu|rechnung|termin verschieben|panne/i.test(text)
    return {
      typ: anliegen ? 'anliegen' : 'lead',
      sprache: /bonjour|merci/i.test(text) ? 'fr' : 'de',
      zusammenfassung: anliegen
        ? 'Kunde meldet eine Störung am Wechselrichter und bittet um Rückruf.'
        : 'Interessent wünscht eine Offerte für eine Solaranlage mit Speicher.',
      kontakt: {
        anrede: null,
        vorname,
        nachname: rest.join(' ') || null,
        firma: null,
        email: /<([^>]+)>/.exec(m.von ?? '')?.[1] ?? null,
        telefon: /(\+41|0)[\d ]{9,13}\d/.exec(text)?.[0] ?? null,
      },
      adresse: {
        strasse: /\b([A-ZÄÖÜ][a-zäöü]+(strasse|weg|gasse) \d+)/.exec(text)?.[1] ?? null,
        plz: ort?.[1] ?? null,
        ort: ort?.[2] ?? null,
      },
      lead: {
        interesse: [
          'pv',
          ...(/batterie|speicher/i.test(text) ? ['batterie'] : []),
          ...(/wallbox|laden/i.test(text) ? ['wallbox'] : []),
        ],
        gebaeudeart: /einfamilienhaus/i.test(text) ? 'einfamilienhaus' : null,
        dachform: /satteldach/i.test(text) ? 'satteldach' : null,
        kommentar: anliegen ? null : 'Möchte Offerte, Dach Richtung Süden.',
      },
      anliegen: { thema: anliegen ? 'Störung Wechselrichter' : null, dringend: anliegen, antwort_noetig: true },
      aufgabe: { titel: anliegen ? 'Rückruf wegen Störung' : 'Erstkontakt: Termin vereinbaren', in_tagen: 1 },
    }
  }
  if (hat('art', 'richtung', 'ergebnis', 'text', 'aufgabe')) {
    const n = String(datenBlock(eingabe, 'notiz') ?? '')
    const anruf = /anruf|telefon|angerufen/i.test(n)
    return {
      art: anruf ? 'anruf' : 'notiz',
      richtung: anruf ? 'aus' : null,
      ergebnis: anruf ? 'erreicht' : null,
      text: n
        ? n.charAt(0).toUpperCase() +
          n
            .slice(1)
            .replace(/\s+äh\s+/gi, ' ')
            .trim()
        : 'Notiz',
      aufgabe: /nächste woche|melden|anrufen/i.test(n) ? { titel: 'Nochmals anrufen', faellig_am: tagPlus(7) } : null,
      felder: {
        zeithorizont: /frühling|sommer|herbst|winter/i.exec(n)?.[0] ?? null,
        finanzierung: null,
        interesse: /speicher|batterie/i.test(n) ? ['batterie'] : [],
        verbrauch_kwh: null,
      },
    }
  }
  if (hat('datum', 'betrag', 'waehrung', 'kategorie')) {
    const kat = schema.properties.kategorie.anyOf?.[0]?.enum ?? []
    return {
      datum: tagPlus(-1),
      betrag: 86.4,
      waehrung: 'CHF',
      kategorie: kat.find((k) => /fahr|auto|km/.test(k)) ?? kat[0] ?? null,
      zweck: 'Tankstelle Coop Pronto Muri',
      bemerkung: '52.3 Liter',
    }
  }
  if (hat('nummer', 'kunde', 'betrag_exkl')) {
    const t = String(datenBlock(eingabe, 'offerte') ?? '')
    return {
      nummer: /Offerte\s*(?:Nr\.?)?\s*(\d{5,7})/i.exec(t)?.[1] ?? '260999',
      datum: tagPlus(-3),
      sprache: 'de',
      kunde: {
        vorname: 'Hans',
        nachname: 'Muster',
        firma: null,
        strasse: 'Musterweg 1',
        plz: '5630',
        ort: 'Muri AG',
        telefon: null,
        email: null,
      },
      betrag_exkl: 24850.5,
      kwp: 11.2,
      module: 26,
      wechselrichter: 'Huawei SUN2000-10KTL',
      batterie: 'Huawei LUNA2000 (10 kWh)',
      batterie_kwh: 10,
    }
  }
  if (hat('dachform', 'flaechen')) {
    return {
      dachform: 'Satteldach',
      first_grad: 80,
      flaechen: [
        { ausrichtung: 'SSO', azimut: 165, eignung: 'sehr gut', anteil: 'ca. 50 %' },
        { ausrichtung: 'NNW', azimut: 345, eignung: 'mässig', anteil: 'ca. 50 %' },
      ],
      hindernisse: ['Kamin', 'Dachfenster'],
      verschattung: 'Baum im Südwesten, nur am späten Nachmittag',
      ausrichtung: 'sued',
      bemerkung: null,
      sicherheit: 'mittel',
    }
  }
  if (hat('kurz', 'punkte', 'offen')) {
    return {
      kurz: 'Interessent für eine Solaranlage mit Speicher; die Offerte ist gesendet und wartet auf Entscheid. Letzter Kontakt vor knapp zwei Wochen, der Kunde vergleicht noch mit einem zweiten Angebot.',
      punkte: [
        "Offerte über rund CHF 25'000 exkl. MWST gesendet",
        'Besichtigung vor Ort erledigt, Dach Richtung Süden',
        'Interesse an Batterie, Wallbox später',
      ],
      offen: ['Vergleichsangebot: gleicher Umfang?', 'Finanzierung noch offen'],
      naechster_schritt: 'Anrufen und den Unterschied zum Vergleichsangebot besprechen.',
    }
  }
  if (hat('wahrscheinlichkeit', 'gruende')) {
    return {
      wahrscheinlichkeit: 62,
      stufe: 'mittel',
      sicherheit: 'mittel',
      gruende: [
        { text: 'Besichtigung vor Ort erledigt', richtung: 'plus' },
        { text: 'Quelle mit guter Abschlussquote', richtung: 'plus' },
        { text: 'Seit zwei Wochen keine Rückmeldung', richtung: 'minus' },
      ],
      naechster_schritt: 'Diese Woche anrufen und einen zweiten Termin anbieten.',
    }
  }
  if (hat('gruss', 'prioritaeten')) {
    const d = datenBlock(eingabe, 'mein_tag') ?? {}
    const p = []
    for (const t of d.termine ?? [])
      p.push({
        titel: `${t.zeit} ${t.art === 'besichtigung' ? 'Besichtigung' : t.art === 'service' ? 'Service-Einsatz' : 'Termin'}`,
        warum: 'Fester Termin heute.',
        ref: t.ref ?? null,
      })
    for (const a of (d.aufgaben ?? []).filter((x) => x.ueberfaellig))
      p.push({ titel: 'Überfällige Aufgabe erledigen', warum: 'Seit mehr als einem Tag fällig.', ref: a.ref })
    for (const o of d.nachfassen ?? [])
      p.push({ titel: `Offerte nachfassen (${o.betrag})`, warum: 'Seit über 14 Tagen ohne Antwort.', ref: o.ref })
    for (const l of d.neue_leads ?? [])
      p.push({ titel: 'Neuen Lead anrufen', warum: 'Erstkontakt innert 24 Stunden.', ref: l.ref })
    return {
      gruss: 'Guten Morgen – ein ruhiger Start, aber zwei Dinge sind heute wichtig.',
      einleitung: `Heute stehen ${(d.termine ?? []).length} Termine an, ${d.aufgaben_anzahl ?? 0} Aufgaben sind fällig.`,
      prioritaeten: p.slice(0, 5),
      hinweis: d.ausgangskorb_wartet
        ? `${d.ausgangskorb_wartet} Entwürfe warten im Ausgangskorb auf deine Freigabe.`
        : null,
    }
  }
  if (hat('text') && f.length === 1) {
    return {
      text: 'Guten Tag\n\nIm September haben wir von Ihnen 12 Leads erhalten, verrechnet wurden 13. Bitte prüfen Sie die Differenz von einem Lead und schreiben Sie ihn uns gut.\n\nFreundliche Grüsse',
    }
  }
  return beispiel(schema)
}

/**
 * Startet den Ersatz-Server.
 * @param {{ port: number, schluessel?: string }} o
 */
export function starteClaudeErsatz({ port, schluessel = 'ersatz-schluessel' }) {
  const z = { anfragen: [], koepfe: [], ueberlastet: 0 }
  const server = createServer(async (req, res) => {
    const teile = []
    for await (const c of req) teile.push(c)
    const json = (status, d) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(d))
    }
    if (req.method !== 'POST' || req.url !== '/v1/messages')
      return json(404, { type: 'error', error: { type: 'not_found_error' } })
    if (req.headers['x-api-key'] !== schluessel)
      return json(401, { type: 'error', error: { type: 'authentication_error' } })
    if (!req.headers['anthropic-version']) return json(400, { type: 'error', error: { type: 'invalid_request_error' } })
    const body = JSON.parse(Buffer.concat(teile).toString('utf8'))
    z.anfragen.push(body)
    z.koepfe.push({ version: req.headers['anthropic-version'], beta: req.headers['anthropic-beta'] ?? null })
    const eingabe = body.messages
      .flatMap((m) => m.content)
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
    const system = body.system.map((b) => b.text).join('\n')
    const nutzung = {
      input_tokens: Math.ceil(JSON.stringify(body).length / 4),
      output_tokens: 180,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    }
    if (eingabe.includes('ERSATZ_UEBERLASTET') && z.ueberlastet++ % 2 === 0) {
      return json(529, { type: 'error', error: { type: 'overloaded_error' } })
    }
    if (eingabe.includes('ERSATZ_ABLEHNEN')) {
      return json(200, {
        id: 'msg_ersatz',
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: [],
        stop_reason: 'refusal',
        usage: { ...nutzung, output_tokens: 0 },
      })
    }
    const schema = body.output_config?.format?.schema
    const fr = /Französisch \(Schweiz\), Anrede/.test(system)
    const text = schema ? JSON.stringify(antwort(schema, eingabe, fr)) : 'Betreff: Beispiel\n\nBeispieltext'
    return json(200, {
      id: 'msg_ersatz',
      type: 'message',
      role: 'assistant',
      model: body.model,
      content: [
        { type: 'thinking', thinking: '', signature: 'x' },
        { type: 'text', text },
      ],
      stop_reason: 'end_turn',
      usage: nutzung,
    })
  })
  return new Promise((ok) => server.listen(port, '0.0.0.0', () => ok({ zustand: z, stopp: () => server.close() })))
}

// Direkt gestartet (für Vorschau und Browser-Tests): node scripts/ki/ersatz-claude.mjs [port]
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] ?? 54397)
  await starteClaudeErsatz({ port })
  console.log(`Claude-Ersatz läuft auf Port ${port}`)
}
