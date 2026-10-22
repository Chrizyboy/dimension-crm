# Datenmodell

Stand Phase 5. 62 Fachtabellen in `public`, eingerichtet mit `intern.richte_fachtabelle_ein` (siehe Entscheid 0010). Jede hat `id`, `erstellt_am`, `erstellt_von`, `geaendert_am`, `geloescht_am` (Papierkorb), `alt_id` und `alt_daten` (Herkunft aus V233). Beträge stehen immer in Rappen (`…_rappen`, Ganzzahl).

```
Kontakt ─┬─ Objekt ─── Anlage ─── Service-Fall, Wartungsvertrag
         └─ Verkaufschance ─── Offerte ─── Werkvertrag ─── Projekt ─┬─ Ablauf-Schritte, Einsätze
                                                                     ├─ Zahlungsplan, Nachträge
                                                                     ├─ Bestellungen, Lagerbewegungen
                                                                     └─ Rapporte, Zeiten, Subunternehmer-Aufträge
```

| Bereich           | Tabellen                                                                                               | Recht    |
| ----------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| Organisation      | `personen`, `firmen`, `standorte`, `lagerorte`, `regionen`                                             | basis    |
| Rollen            | `rollen` (Rechte und sichtbare Bereiche; ändern nur mit admin)                                         | basis    |
| Konfiguration     | `auswahlwerte`, `einstellungen`, `ablauf_vorlagen`, `ablauf_schritte`                                  | basis    |
| Kunden            | `kontakte`, `objekte`, `sharepoint_ordner`                                                             | basis    |
| Verkauf           | `verkaufschancen`, `aktivitaeten`, `aufgaben`, `ausschreibungen`                                       | basis    |
| Offerten & Preise | `offerten`, `lieferanten`, `preisvorlagen`, `preisvorlage_positionen`, `eturnity_eingang`              | basis    |
| Einkaufspreise    | `lieferantenpreise`, `artikel`, `kalkulationen` (alle anderen lesen die Sicht `preisliste`)            | preise   |
| Werkverträge      | `werkvertraege`                                                                                        | basis    |
| Projekte          | `projekte`, `projekt_schritte`, `einsaetze`, `anlagen`, `zahlungsplan`                                 | basis    |
| Service           | `service_faelle`, `wartungsvertraege`, `rueckmeldungen`                                                | basis    |
| Einkauf & Lager   | `bestellungen`, `bestellpositionen`, `lagerbestand`, `lagerbewegungen`                                 | basis    |
| Baustelle         | `rapporte`, `zeiten`, `abwesenheiten`, `nachtraege`, `subunternehmer`, `subunternehmer_auftraege`      | basis    |
| Dokumente         | `dokumente` (Speicher «dokumente» oder SharePoint-Verweis)                                             | basis    |
| Spesen            | `spesen`                                                                                               | basis    |
| Finanzen          | `kreditor_zahlungen`, `material_zahlungen`, `fixkosten`, `erwartete_eingaenge`, `finanz_einstellungen` | finanzen |
| Marketing         | `kampagnen`, `newsletter`, `newsletter_empfaenger`, `social_posts`, `schreibstile`, `signaturen`       | basis    |
| Handbuch          | `handbuch_eintraege`                                                                                   | basis    |
| System            | `ausgangskorb` (basis); `einladungen`, `altes_protokoll`, `import_laeufe`, `import_abgleich` (admin)   |          |

Dazu aus Phase 1: `aenderungsprotokoll` (wer, was, wann, vorher/nachher) und `app_info`.

## Herkunft aus V233

| Sammlung V233                                                      | Ziel                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| leads (+ Papierkorb)                                               | `verkaufschancen`; Kontakt und Objekt über Kundennummer und Adresse                                         |
| projects                                                           | `offerten` (alle), `projekte` (angenommen/unterschrieben), `werkvertraege`, `projekt_schritte`, `einsaetze` |
| activities                                                         | `aktivitaeten`                                                                                              |
| preisartikel, preisvorlagen                                        | `artikel`, `lieferantenpreise`, `preisvorlagen`, `preisvorlage_positionen`                                  |
| users, invites                                                     | `personen` (ohne Passwort), `einladungen`                                                                   |
| blobs, kbfiles, kbfolders, files/sp an Leads und Offerten          | `dokumente`, `sharepoint_ordner`                                                                            |
| expenses                                                           | `spesen`                                                                                                    |
| finpay, finmat, finfix, finin, finset                              | `kreditor_zahlungen`, `material_zahlungen`, `fixkosten`, `erwartete_eingaenge`, `finanz_einstellungen`      |
| prozesse, videos                                                   | `handbuch_eintraege`                                                                                        |
| socialposts, campaigns, newsletter, nlkontakte, aistil, signatures | Marketing-Tabellen                                                                                          |
| tasks, cases, wartung, tickets, kalkulationen, outbox              | `aufgaben`, `service_faelle`, `wartungsvertraege`, `rueckmeldungen`, `kalkulationen`, `ausgangskorb`        |
| meta                                                               | `einstellungen` (Schlüssel `vorlage.*`)                                                                     |
| audit                                                              | `altes_protokoll` (ein Eintrag pro Änderung)                                                                |

## Neue Tabelle anlegen

```sql
create table public.beispiel (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
select intern.richte_fachtabelle_ein('beispiel');          -- oder ('beispiel', 'finanzen')
```

Danach `npm run db:typen`, damit die App die neuen Spalten kennt.

## Rechte (Phase 4)

Wirksame Rechte einer Person = Rechte ihrer Rolle ∪ eigene Zusatzrechte (`personen.rechte`). `admin` schliesst alle anderen ein. Die Datenbank prüft das mit `intern.hat_recht()`. Sichtbare Bereiche: `personen.bereiche`, sonst `rollen.bereiche`, sonst alle; sie steuern nur die Menüs. Das `aenderungsprotokoll` zeigt einen Eintrag nur, wer die betroffene Tabelle lesen darf (`intern.tabellen_leserecht`). Siehe Entscheid 0012.

## Kunden und Kontakte (Phase 5)

- **`kunden_uebersicht`** (Ansicht, `security_invoker`, also mit den Rechten der lesenden Person): ein Kontakt pro Zeile mit erstem Gebäude, Stand, letztem Kontakt, Anzahl Offerten und Projekte, `moegliche_dublette` und `suchtext`/`telefon_ziffern` für die Suche. Kunden, Adressbuch und Ctrl K lesen sie.
- **`kundenstand(kontakt)`**: Stand (`auswahlwerte` Liste `kundenstand`, Gruppe in `eigenschaften.gruppe`) aus dem jüngsten Geschäft. Regeln in `intern.stand_projekt`, `intern.stand_offerte`, `intern.stand_verkaufschance`; Nachfass-Frist in `einstellungen.nachfassen_tage`.
- **`kunden_zeitachse(kontakt)`**: alle Ereignisse eines Kontakts, neueste zuerst (höchstens 500): `aktivitaet:<art>`, `anfrage`, `termin`, `offerte`, `entscheid`, `werkvertrag`, `baubeginn`, `service`, `dokument`, `aenderung:<aktion>`.
- **`moegliche_dubletten(name, email, telefon, ohne)`**: bis 5 Treffer mit Grund `email`, `telefon` oder `name`.
- **`kontakt_export(kontakt)`**: alle Daten zur Person als JSON (Auskunft nach revDSG), ohne die Rohdaten aus V233.
- Ergebnisse von Kontaktversuchen: `auswahlwerte` Liste `kontaktergebnis` (nicht erreicht, Combox, Rückruf, meldet sich, Termin, kein Interesse).

Zugriffsregeln rufen das Recht als `(select intern.hat_recht('…'))` auf, damit Postgres es einmal pro Abfrage prüft. Neue Tabellen bekommen das über `intern.richte_fachtabelle_ein` automatisch. Siehe Entscheid 0013.

## Anfragen & Leads (Phase 6)

- **`plz_verzeichnis`** (nur lesen): PLZ, Ort, Kanton, Mittelpunkt, Höhe. `plz_auskunft(plz)` liefert dazu Standort und Sprache, `standort_fuer_plz(plz)` nur den Standort nach `einstellungen.standort_regeln`.
- **`verkauf_geschaefte`** (Ansicht, `security_invoker`): ein Geschäft pro Lead mit jüngster Offerte und Projekt, Stand und Gruppe wie `kundenstand()`, Lage, Termin, Werte.
- **`setze_stand(geschaeft, ziel, angaben)`**, **`lead_kontakt_erfassen(…)`**, **`lead_anlegen(jsonb)`**: die Abläufe; Fehler als Schlüssel `stand.*` und `lead.*`.
- **`verkaufschancen`** neu: `standort_id`, Nummer aus `lead_nummer_seq` (über `intern.naechste_lead_nummer`), `personen.aussendienst`, `standorte.sprache`, `offerten.verlustgrund`.
- **`gespeicherte_ansichten`**: Filter einer Liste, persönlich oder geteilt.
- **`kalender_eintraege`**: Termine einer Person aus Datei, Einfügen oder (ab Phase 8) Outlook. `kalender_ersetzen(person, quelle, eintraege)` legt alte Einträge im Zeitraum in den Papierkorb.
- **`lead_einkauf`**: pro Monat und Quelle gekaufte Leads, Bericht-Text und Meldung (`gemeldet` = am, von, an, anzahl). `lead_monatsbericht(monat)` zählt die erhaltenen Leads pro Quelle.
- Einstellungen: `tourplanung` (Tempo, Umweg, Besuchsdauer, Elektroauto), `sms_erinnerung` (Vorlage DE/FR). Auswahllisten: `erreichbarkeit`, `finanzierung`, `foerderung`, `zeithorizont`, `interesse`; bei `quelle` markiert `eigenschaften.anbieter` gekaufte Leads.

Siehe Entscheid 0014.

## Offerten, Preise, Werkverträge (Phase 7)

- **`offerten`** neu: `standort_id` (Nummernkreis, Firma, Sprache), `wirtschaftlichkeit` (Werte aus Eturnity). `betrag_rappen` ist **exkl.** MWST.
- **Abläufe:** `offerte_anlegen`, `offerte_status_setzen`, `offerte_version_erfassen`/`_entfernen`, `offerte_zurueck`, `offerte_entscheiden`, `offerte_werte_setzen(offerte, werte, quelle, nur_leere)`; Fehler als Schlüssel `offerte.*`. `mwst_satz()` aus `einstellungen`.
- **Sichten:** `offerten_liste` (Muri, Bulle, Nachfassen mit Stand und Fälligkeit), `offerten_eingang` (Neue Offerten).
- **Preise:** `artikel` und `kalkulationen` nur mit Recht `preise`; Sicht `preisliste` für alle (Verkaufspreis, Datenblätter, ohne Einkauf). `vk_aus_ek`, `artikel_preis_setzen`, `artikel_archivieren(artikel, grund, nachfolger)`, `preise_importieren(zeilen, pruefen)`.
- **Auftrag und Werkvertrag:** `auftrag_erstellen(offerte, angaben)` legt Projekt, Zahlungsplan und Werkvertrag an; `zahlungsplan_berechnen`, `runde_5_rappen`, `werkvertrag_status`. Auswahlliste `zahlungskondition` mit `eigenschaften.tranchen`. `werkvertraege.betrag_rappen` und `projekte.vertragswert_rappen` sind **inkl.** MWST. Sicht `werkvertraege_liste`.
- **Eturnity:** `eturnity_eingang` (Meldungen aus dem Webhook, unverändert), `eturnity_zuordnen(eingang, offerte)`.

Siehe Entscheid 0015.

## Integrationen und Ausgangskorb (Phase 8)

- **`integrationen`**: ein Eintrag pro Dienst (`microsoft`, `abaninja`, `sms`) mit letztem Test und Meldung; Schlüssel stehen nie hier, nur in den Supabase-Secrets. **`integrations_protokoll`**: jeder Aufruf mit Dienst, Aktion, Person, Dauer und Fehlercode (ohne Inhalte).
- **`intern.microsoft_verbindungen`**: Verbindung pro Person, Token verschlüsselt (AES-GCM, `VERBINDUNG_SCHLUESSEL`), nur für den Server. Die App sieht `meine_microsoft_verbindung()` und (Admin) `microsoft_verbindungen()`. `intern.oauth_zustaende`: einmaliger Zustand für die Anmeldung.
- **`ausgangskorb`**: Mail oder SMS mit Empfänger, Text, Anhängen und Bezug (Kontakt, Lead, Offerte, Werkvertrag). Stand `wartet` → `freigegeben` → `wird_gesendet` → `gesendet`/`fehler`, sonst `verworfen` mit Grund. `ausgang_anlegen`, `ausgang_aendern`, `ausgang_freigeben`, `ausgang_verwerfen`; der Server holt mit `ausgang_holen` und meldet mit `ausgang_ergebnis`. Fehler als Schlüssel `ausgang.*`.
- **SMS-Erinnerung:** `sms_erinnerungen(tag)` (Termine von morgen mit Handynummer und Text), `sms_erinnerungen_senden(ids)`; Einstellung `sms_erinnerung.automatisch` und `uhrzeit`.
- **Mails aus Outlook:** `intern.mail_eingang` (jede Mail einmal, Message-ID), `anfrage_uebernehmen` (Anfrage zu Lead, ohne Dubletten), `mails_vermerken` (Zeitachse), `kalender_abgleichen`, `termin_vermerken` (`verkaufschancen.outlook`), `sicherung_offen` (Dokumente ohne `sharepoint_url`).
- **Zeitplan:** pg_cron ruft `intern.zeitplan_anstossen` (Vault `crm_funktionen_url`, `crm_zeitplan_schluessel`); `zeitplan_faellig`, `zeitplan_ergebnis`, Übersicht `zeitplan_laeufe()`.

Siehe Entscheid 0016 und `docs/integrationen.md`.
