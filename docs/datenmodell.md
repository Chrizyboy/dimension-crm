# Datenmodell

Stand Phase 3. 61 Fachtabellen in `public`, eingerichtet mit `intern.richte_fachtabelle_ein` (siehe Entscheid 0010). Jede hat `id`, `erstellt_am`, `erstellt_von`, `geaendert_am`, `geloescht_am` (Papierkorb), `alt_id` und `alt_daten` (Herkunft aus V233). Beträge stehen immer in Rappen (`…_rappen`, Ganzzahl).

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
| Konfiguration     | `auswahlwerte`, `einstellungen`, `ablauf_vorlagen`, `ablauf_schritte`                                  | basis    |
| Kunden            | `kontakte`, `objekte`, `sharepoint_ordner`                                                             | basis    |
| Verkauf           | `verkaufschancen`, `aktivitaeten`, `aufgaben`, `ausschreibungen`                                       | basis    |
| Offerten & Preise | `offerten`, `kalkulationen`, `artikel`, `lieferanten`, `preisvorlagen`, `preisvorlage_positionen`      | basis    |
| Einkaufspreise    | `lieferantenpreise`                                                                                    | preise   |
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
