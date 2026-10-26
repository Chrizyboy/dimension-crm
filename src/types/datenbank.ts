// Automatisch erzeugt aus der lokalen Datenbank mit «npm run db:typen». Nie von Hand ändern.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ablauf_schritte: {
        Row: {
          ablauf_vorlage_id: string
          alt_daten: Json | null
          alt_id: string | null
          auto: string | null
          bewilligung: boolean
          elektriker: boolean
          erstellt_am: string
          erstellt_von: string | null
          frist_nach: string | null
          frist_tage: number | null
          geaendert_am: string
          geloescht_am: string | null
          hinweis_de: string | null
          hinweis_fr: string | null
          id: string
          name_de: string
          name_fr: string
          pflicht: boolean
          phase: string
          reihenfolge: number
          schluessel: string
        }
        ComputedFields: never
        Insert: {
          ablauf_vorlage_id: string
          alt_daten?: Json | null
          alt_id?: string | null
          auto?: string | null
          bewilligung?: boolean
          elektriker?: boolean
          erstellt_am?: string
          erstellt_von?: string | null
          frist_nach?: string | null
          frist_tage?: number | null
          geaendert_am?: string
          geloescht_am?: string | null
          hinweis_de?: string | null
          hinweis_fr?: string | null
          id?: string
          name_de: string
          name_fr: string
          pflicht?: boolean
          phase: string
          reihenfolge: number
          schluessel: string
        }
        Update: {
          ablauf_vorlage_id?: string
          alt_daten?: Json | null
          alt_id?: string | null
          auto?: string | null
          bewilligung?: boolean
          elektriker?: boolean
          erstellt_am?: string
          erstellt_von?: string | null
          frist_nach?: string | null
          frist_tage?: number | null
          geaendert_am?: string
          geloescht_am?: string | null
          hinweis_de?: string | null
          hinweis_fr?: string | null
          id?: string
          name_de?: string
          name_fr?: string
          pflicht?: boolean
          phase?: string
          reihenfolge?: number
          schluessel?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ablauf_schritte_ablauf_vorlage_id_fkey'
            columns: ['ablauf_vorlage_id']
            isOneToOne: false
            referencedRelation: 'ablauf_vorlagen'
            referencedColumns: ['id']
          },
        ]
      }
      ablauf_vorlagen: {
        Row: {
          aktiv: boolean
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          name_de: string
          name_fr: string
          schluessel: string
        }
        ComputedFields: never
        Insert: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name_de: string
          name_fr: string
          schluessel: string
        }
        Update: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name_de?: string
          name_fr?: string
          schluessel?: string
        }
        Relationships: []
      }
      abwesenheiten: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          bis: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          halbtag: boolean
          id: string
          outlook_id: string | null
          person_id: string
          quelle: string
          von: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          bis: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          halbtag?: boolean
          id?: string
          outlook_id?: string | null
          person_id: string
          quelle?: string
          von: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          bis?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          halbtag?: boolean
          id?: string
          outlook_id?: string | null
          person_id?: string
          quelle?: string
          von?: string
        }
        Relationships: [
          {
            foreignKeyName: 'abwesenheiten_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      aenderungsprotokoll: {
        Row: {
          aktion: string
          benutzer: string | null
          datensatz: string | null
          id: number
          nachher: Json | null
          tabelle: string
          vorher: Json | null
          zeitpunkt: string
        }
        ComputedFields: never
        Insert: {
          aktion: string
          benutzer?: string | null
          datensatz?: string | null
          id?: never
          nachher?: Json | null
          tabelle: string
          vorher?: Json | null
          zeitpunkt?: string
        }
        Update: {
          aktion?: string
          benutzer?: string | null
          datensatz?: string | null
          id?: never
          nachher?: Json | null
          tabelle?: string
          vorher?: Json | null
          zeitpunkt?: string
        }
        Relationships: []
      }
      aktivitaeten: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          ausschreibung_id: string | null
          details: NonNullable<Json>
          ergebnis: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kontakt_id: string | null
          mail_kennung: string | null
          offerte_id: string | null
          person_id: string | null
          projekt_id: string | null
          richtung: string | null
          text: string | null
          verkaufschance_id: string | null
          zeitpunkt: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          ausschreibung_id?: string | null
          details?: NonNullable<Json>
          ergebnis?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string | null
          mail_kennung?: string | null
          offerte_id?: string | null
          person_id?: string | null
          projekt_id?: string | null
          richtung?: string | null
          text?: string | null
          verkaufschance_id?: string | null
          zeitpunkt?: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          ausschreibung_id?: string | null
          details?: NonNullable<Json>
          ergebnis?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string | null
          mail_kennung?: string | null
          offerte_id?: string | null
          person_id?: string | null
          projekt_id?: string | null
          richtung?: string | null
          text?: string | null
          verkaufschance_id?: string | null
          zeitpunkt?: string
        }
        Relationships: [
          {
            foreignKeyName: 'aktivitaeten_ausschreibung_id_fkey'
            columns: ['ausschreibung_id']
            isOneToOne: false
            referencedRelation: 'ausschreibungen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'aktivitaeten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'aktivitaeten_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['offerte_id']
          },
          {
            foreignKeyName: 'aktivitaeten_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_projekt_fk'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'aktivitaeten_projekt_fk'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'aktivitaeten_projekt_fk'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'aktivitaeten_projekt_fk'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'verkaufschancen'
            referencedColumns: ['id']
          },
        ]
      }
      altes_protokoll: {
        Row: {
          aenderungen: NonNullable<Json>
          aktion: string | null
          alt_daten: Json | null
          alt_id: string | null
          datensatz: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          person: string | null
          sammlung: string | null
          zeitpunkt: string
        }
        ComputedFields: never
        Insert: {
          aenderungen?: NonNullable<Json>
          aktion?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          datensatz?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          person?: string | null
          sammlung?: string | null
          zeitpunkt: string
        }
        Update: {
          aenderungen?: NonNullable<Json>
          aktion?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          datensatz?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          person?: string | null
          sammlung?: string | null
          zeitpunkt?: string
        }
        Relationships: []
      }
      anlagen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          garantie_bis: string | null
          geaendert_am: string
          geloescht_am: string | null
          ibn_am: string | null
          id: string
          komponenten: NonNullable<Json>
          leistung_kwp: number | null
          monitoring: Json | null
          naechste_kontrolle: string | null
          notiz: string | null
          objekt_id: string
          projekt_id: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          garantie_bis?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          ibn_am?: string | null
          id?: string
          komponenten?: NonNullable<Json>
          leistung_kwp?: number | null
          monitoring?: Json | null
          naechste_kontrolle?: string | null
          notiz?: string | null
          objekt_id: string
          projekt_id?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          garantie_bis?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          ibn_am?: string | null
          id?: string
          komponenten?: NonNullable<Json>
          leistung_kwp?: number | null
          monitoring?: Json | null
          naechste_kontrolle?: string | null
          notiz?: string | null
          objekt_id?: string
          projekt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'anlagen_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'anlagen_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'objekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anlagen_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'anlagen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'anlagen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'anlagen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'anlagen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      anschreiben: {
        Row: {
          abgelehnt_grund: string | null
          alt_daten: Json | null
          alt_id: string | null
          an: string | null
          antwort_am: string | null
          antwort_art: string | null
          art: string
          aufgabe_id: string | null
          ausgang_id: string | null
          ausschreibung_id: string
          betreff: string
          bewilligt_am: string | null
          bewilligt_von: string | null
          dossier_kontakt_id: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kanal: string
          sprache: string
          status: string
          text: string
          verkaufschance_id: string | null
          versendet_am: string | null
          versendet_von: string | null
        }
        ComputedFields: never
        Insert: {
          abgelehnt_grund?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          an?: string | null
          antwort_am?: string | null
          antwort_art?: string | null
          art?: string
          aufgabe_id?: string | null
          ausgang_id?: string | null
          ausschreibung_id: string
          betreff: string
          bewilligt_am?: string | null
          bewilligt_von?: string | null
          dossier_kontakt_id: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kanal: string
          sprache?: string
          status?: string
          text: string
          verkaufschance_id?: string | null
          versendet_am?: string | null
          versendet_von?: string | null
        }
        Update: {
          abgelehnt_grund?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          an?: string | null
          antwort_am?: string | null
          antwort_art?: string | null
          art?: string
          aufgabe_id?: string | null
          ausgang_id?: string | null
          ausschreibung_id?: string
          betreff?: string
          bewilligt_am?: string | null
          bewilligt_von?: string | null
          dossier_kontakt_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kanal?: string
          sprache?: string
          status?: string
          text?: string
          verkaufschance_id?: string | null
          versendet_am?: string | null
          versendet_von?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'anschreiben_aufgabe_id_fkey'
            columns: ['aufgabe_id']
            isOneToOne: false
            referencedRelation: 'aufgaben'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anschreiben_ausgang_id_fkey'
            columns: ['ausgang_id']
            isOneToOne: false
            referencedRelation: 'ausgangskorb'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anschreiben_ausschreibung_id_fkey'
            columns: ['ausschreibung_id']
            isOneToOne: false
            referencedRelation: 'ausschreibungen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anschreiben_bewilligt_von_fkey'
            columns: ['bewilligt_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anschreiben_dossier_kontakt_id_fkey'
            columns: ['dossier_kontakt_id']
            isOneToOne: false
            referencedRelation: 'ausschreibung_kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anschreiben_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anschreiben_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'verkaufschancen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anschreiben_versendet_von_fkey'
            columns: ['versendet_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      app_info: {
        Row: {
          geaendert_am: string
          schluessel: string
          wert: string
        }
        ComputedFields: never
        Insert: {
          geaendert_am?: string
          schluessel: string
          wert: string
        }
        Update: {
          geaendert_am?: string
          schluessel?: string
          wert?: string
        }
        Relationships: []
      }
      artikel: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          archiv_grund: string | null
          archiviert_am: string | null
          archiviert_von: string | null
          artikelnummer: string | null
          bevorzugter_lieferant_id: string | null
          datenblaetter: NonNullable<Json>
          einheit: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gewicht_kg: number | null
          hersteller_gruppe: string | null
          id: string
          kategorie: string
          leistung_w: number | null
          marge: number | null
          masse: string | null
          masse_art: string | null
          masse_quelle: Json | null
          nachfolger_id: string | null
          name: string
          quelle: string | null
          rabatt: number | null
          skonto: number | null
          verkauf_rappen: number | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          archiv_grund?: string | null
          archiviert_am?: string | null
          archiviert_von?: string | null
          artikelnummer?: string | null
          bevorzugter_lieferant_id?: string | null
          datenblaetter?: NonNullable<Json>
          einheit?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gewicht_kg?: number | null
          hersteller_gruppe?: string | null
          id?: string
          kategorie: string
          leistung_w?: number | null
          marge?: number | null
          masse?: string | null
          masse_art?: string | null
          masse_quelle?: Json | null
          nachfolger_id?: string | null
          name: string
          quelle?: string | null
          rabatt?: number | null
          skonto?: number | null
          verkauf_rappen?: number | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          archiv_grund?: string | null
          archiviert_am?: string | null
          archiviert_von?: string | null
          artikelnummer?: string | null
          bevorzugter_lieferant_id?: string | null
          datenblaetter?: NonNullable<Json>
          einheit?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gewicht_kg?: number | null
          hersteller_gruppe?: string | null
          id?: string
          kategorie?: string
          leistung_w?: number | null
          marge?: number | null
          masse?: string | null
          masse_art?: string | null
          masse_quelle?: Json | null
          nachfolger_id?: string | null
          name?: string
          quelle?: string | null
          rabatt?: number | null
          skonto?: number | null
          verkauf_rappen?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'artikel_bevorzugter_lieferant_id_fkey'
            columns: ['bevorzugter_lieferant_id']
            isOneToOne: false
            referencedRelation: 'lieferanten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'artikel_nachfolger_id_fkey'
            columns: ['nachfolger_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'artikel_nachfolger_id_fkey'
            columns: ['nachfolger_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
        ]
      }
      aufgaben: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          bezug_id: string | null
          bezug_tabelle: string | null
          erledigt_am: string | null
          erledigt_von: string | null
          erstellt_am: string
          erstellt_von: string | null
          faellig_am: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          lauf_id: string | null
          person_id: string | null
          text: string | null
          titel: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          bezug_id?: string | null
          bezug_tabelle?: string | null
          erledigt_am?: string | null
          erledigt_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          lauf_id?: string | null
          person_id?: string | null
          text?: string | null
          titel: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          bezug_id?: string | null
          bezug_tabelle?: string | null
          erledigt_am?: string | null
          erledigt_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          lauf_id?: string | null
          person_id?: string | null
          text?: string | null
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: 'aufgaben_erledigt_von_fkey'
            columns: ['erledigt_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aufgaben_lauf_id_fkey'
            columns: ['lauf_id']
            isOneToOne: false
            referencedRelation: 'automation_laeufe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aufgaben_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      ausgangskorb: {
        Row: {
          absender_person_id: string | null
          alt_daten: Json | null
          alt_id: string | null
          an: string
          anhaenge: NonNullable<Json>
          art: string
          automatisch: boolean
          betreff: string | null
          bezug_id: string | null
          bezug_tabelle: string | null
          cc: string | null
          erstellt_am: string
          erstellt_von: string | null
          extern_id: string | null
          fehler: string | null
          freigegeben_am: string | null
          freigegeben_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gesendet_am: string | null
          html: string | null
          id: string
          kanal: string
          ki_auftrag: Json | null
          ki_status: string | null
          kontakt_id: string | null
          offerte_id: string | null
          projekt_id: string | null
          schluessel: string | null
          sende_ab: string | null
          sprache: string
          status: string
          text: string | null
          verkaufschance_id: string | null
          versuche: number
          verworfen_grund: string | null
        }
        ComputedFields: never
        Insert: {
          absender_person_id?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          an: string
          anhaenge?: NonNullable<Json>
          art?: string
          automatisch?: boolean
          betreff?: string | null
          bezug_id?: string | null
          bezug_tabelle?: string | null
          cc?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          fehler?: string | null
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gesendet_am?: string | null
          html?: string | null
          id?: string
          kanal?: string
          ki_auftrag?: Json | null
          ki_status?: string | null
          kontakt_id?: string | null
          offerte_id?: string | null
          projekt_id?: string | null
          schluessel?: string | null
          sende_ab?: string | null
          sprache?: string
          status?: string
          text?: string | null
          verkaufschance_id?: string | null
          versuche?: number
          verworfen_grund?: string | null
        }
        Update: {
          absender_person_id?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          an?: string
          anhaenge?: NonNullable<Json>
          art?: string
          automatisch?: boolean
          betreff?: string | null
          bezug_id?: string | null
          bezug_tabelle?: string | null
          cc?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          fehler?: string | null
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gesendet_am?: string | null
          html?: string | null
          id?: string
          kanal?: string
          ki_auftrag?: Json | null
          ki_status?: string | null
          kontakt_id?: string | null
          offerte_id?: string | null
          projekt_id?: string | null
          schluessel?: string | null
          sende_ab?: string | null
          sprache?: string
          status?: string
          text?: string | null
          verkaufschance_id?: string | null
          versuche?: number
          verworfen_grund?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ausgangskorb_absender_person_id_fkey'
            columns: ['absender_person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausgangskorb_freigegeben_von_fkey'
            columns: ['freigegeben_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausgangskorb_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausgangskorb_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausgangskorb_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausgangskorb_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'ausgangskorb_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'ausgangskorb_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausgangskorb_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['offerte_id']
          },
          {
            foreignKeyName: 'ausgangskorb_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausgangskorb_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'ausgangskorb_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'ausgangskorb_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'ausgangskorb_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausgangskorb_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausgangskorb_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'verkaufschancen'
            referencedColumns: ['id']
          },
        ]
      }
      ausschreibung_kontakte: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          ausschreibung_id: string
          email: string | null
          erstellt_am: string
          erstellt_von: string | null
          firma: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kontakt_id: string | null
          name: string
          notiz: string | null
          ort: string | null
          plz: string | null
          quelle_link: string
          rolle: string
          sprache: string
          strasse: string | null
          telefon: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          ausschreibung_id: string
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string | null
          name: string
          notiz?: string | null
          ort?: string | null
          plz?: string | null
          quelle_link: string
          rolle: string
          sprache?: string
          strasse?: string | null
          telefon?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          ausschreibung_id?: string
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string | null
          name?: string
          notiz?: string | null
          ort?: string | null
          plz?: string | null
          quelle_link?: string
          rolle?: string
          sprache?: string
          strasse?: string | null
          telefon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ausschreibung_kontakte_ausschreibung_id_fkey'
            columns: ['ausschreibung_id']
            isOneToOne: false
            referencedRelation: 'ausschreibungen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibung_kontakte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibung_kontakte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibung_kontakte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibung_kontakte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'ausschreibung_kontakte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
        ]
      }
      ausschreibungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          ausloeser: string | null
          ausloeser_am: string | null
          bauherr: string | null
          bauherr_art: string | null
          begruendung: string | null
          beobachten_seit: string | null
          beschreibung: string | null
          eingereicht_am: string | null
          eingereicht_form: string | null
          entscheid_am: string | null
          entscheid_von: string | null
          erstellt_am: string
          erstellt_von: string | null
          fahrzeit_min: number | null
          frist: string | null
          frist_begehung: string | null
          frist_eingabe: string | null
          frist_fragen: string | null
          geaendert_am: string
          geloescht_am: string | null
          gemeinde: string | null
          grund: string | null
          haupt_id: string | null
          id: string
          kanton: string | null
          kontaktsperre_bis: string | null
          korrigiert_am: string | null
          nummer: string | null
          offerte_id: string | null
          parzelle: string | null
          plz: string | null
          prioritaet: string | null
          publiziert_am: string | null
          punkte: number
          quell_id: string | null
          quell_url: string | null
          quelle: string
          rohdaten: Json | null
          sprache: string
          spur: string
          standort_id: string | null
          status: string
          titel: string
          vergabestelle: string | null
          vergabestelle_kontakt_id: string | null
          verkaufschance_id: string | null
          wiedervorlage_am: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          ausloeser?: string | null
          ausloeser_am?: string | null
          bauherr?: string | null
          bauherr_art?: string | null
          begruendung?: string | null
          beobachten_seit?: string | null
          beschreibung?: string | null
          eingereicht_am?: string | null
          eingereicht_form?: string | null
          entscheid_am?: string | null
          entscheid_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          fahrzeit_min?: number | null
          frist?: string | null
          frist_begehung?: string | null
          frist_eingabe?: string | null
          frist_fragen?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gemeinde?: string | null
          grund?: string | null
          haupt_id?: string | null
          id?: string
          kanton?: string | null
          kontaktsperre_bis?: string | null
          korrigiert_am?: string | null
          nummer?: string | null
          offerte_id?: string | null
          parzelle?: string | null
          plz?: string | null
          prioritaet?: string | null
          publiziert_am?: string | null
          punkte?: number
          quell_id?: string | null
          quell_url?: string | null
          quelle: string
          rohdaten?: Json | null
          sprache?: string
          spur: string
          standort_id?: string | null
          status?: string
          titel: string
          vergabestelle?: string | null
          vergabestelle_kontakt_id?: string | null
          verkaufschance_id?: string | null
          wiedervorlage_am?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          ausloeser?: string | null
          ausloeser_am?: string | null
          bauherr?: string | null
          bauherr_art?: string | null
          begruendung?: string | null
          beobachten_seit?: string | null
          beschreibung?: string | null
          eingereicht_am?: string | null
          eingereicht_form?: string | null
          entscheid_am?: string | null
          entscheid_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          fahrzeit_min?: number | null
          frist?: string | null
          frist_begehung?: string | null
          frist_eingabe?: string | null
          frist_fragen?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gemeinde?: string | null
          grund?: string | null
          haupt_id?: string | null
          id?: string
          kanton?: string | null
          kontaktsperre_bis?: string | null
          korrigiert_am?: string | null
          nummer?: string | null
          offerte_id?: string | null
          parzelle?: string | null
          plz?: string | null
          prioritaet?: string | null
          publiziert_am?: string | null
          punkte?: number
          quell_id?: string | null
          quell_url?: string | null
          quelle?: string
          rohdaten?: Json | null
          sprache?: string
          spur?: string
          standort_id?: string | null
          status?: string
          titel?: string
          vergabestelle?: string | null
          vergabestelle_kontakt_id?: string | null
          verkaufschance_id?: string | null
          wiedervorlage_am?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ausschreibungen_entscheid_von_fkey'
            columns: ['entscheid_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibungen_haupt_id_fkey'
            columns: ['haupt_id']
            isOneToOne: false
            referencedRelation: 'ausschreibungen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibungen_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibungen_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['offerte_id']
          },
          {
            foreignKeyName: 'ausschreibungen_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibungen_standort_id_fkey'
            columns: ['standort_id']
            isOneToOne: false
            referencedRelation: 'standorte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibungen_vergabestelle_kontakt_id_fkey'
            columns: ['vergabestelle_kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibungen_vergabestelle_kontakt_id_fkey'
            columns: ['vergabestelle_kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibungen_vergabestelle_kontakt_id_fkey'
            columns: ['vergabestelle_kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibungen_vergabestelle_kontakt_id_fkey'
            columns: ['vergabestelle_kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'ausschreibungen_vergabestelle_kontakt_id_fkey'
            columns: ['vergabestelle_kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'ausschreibungen_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ausschreibungen_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'verkaufschancen'
            referencedColumns: ['id']
          },
        ]
      }
      auswahlwerte: {
        Row: {
          aktiv: boolean
          alt_daten: Json | null
          alt_id: string | null
          eigenschaften: NonNullable<Json>
          erstellt_am: string
          erstellt_von: string | null
          farbe: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          liste: string
          reihenfolge: number
          schluessel: string
          text_de: string
          text_fr: string
        }
        ComputedFields: never
        Insert: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          eigenschaften?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          farbe?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          liste: string
          reihenfolge?: number
          schluessel: string
          text_de: string
          text_fr: string
        }
        Update: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          eigenschaften?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          farbe?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          liste?: string
          reihenfolge?: number
          schluessel?: string
          text_de?: string
          text_fr?: string
        }
        Relationships: []
      }
      automation_laeufe: {
        Row: {
          automation_id: string
          beendet_am: string | null
          bezug_id: string | null
          ereignis: string
          erstellt_am: string
          fehler: number
          geaendert_am: string
          id: string
          kontakt_id: string | null
          protokoll: NonNullable<Json>
          schritt: number
          signal_id: number
          stand: string
          tabelle: string | null
          titel: string | null
          weiter_am: string
        }
        ComputedFields: never
        Insert: {
          automation_id: string
          beendet_am?: string | null
          bezug_id?: string | null
          ereignis: string
          erstellt_am?: string
          fehler?: number
          geaendert_am?: string
          id?: string
          kontakt_id?: string | null
          protokoll?: NonNullable<Json>
          schritt?: number
          signal_id: number
          stand?: string
          tabelle?: string | null
          titel?: string | null
          weiter_am?: string
        }
        Update: {
          automation_id?: string
          beendet_am?: string | null
          bezug_id?: string | null
          ereignis?: string
          erstellt_am?: string
          fehler?: number
          geaendert_am?: string
          id?: string
          kontakt_id?: string | null
          protokoll?: NonNullable<Json>
          schritt?: number
          signal_id?: number
          stand?: string
          tabelle?: string | null
          titel?: string | null
          weiter_am?: string
        }
        Relationships: [
          {
            foreignKeyName: 'automation_laeufe_automation_id_fkey'
            columns: ['automation_id']
            isOneToOne: false
            referencedRelation: 'automationen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'automation_laeufe_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'automation_laeufe_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'automation_laeufe_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'automation_laeufe_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'automation_laeufe_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
        ]
      }
      automationen: {
        Row: {
          aktionen: NonNullable<Json>
          aktiv: boolean
          aktiv_seit: string | null
          alt_daten: Json | null
          alt_id: string | null
          ausfuehren_als: string | null
          ausloeser: string
          bedingungen: NonNullable<Json>
          beschreibung_de: string | null
          beschreibung_fr: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          modus: string
          name_de: string
          name_fr: string
          reihenfolge: number
          vorlage: string | null
        }
        ComputedFields: never
        Insert: {
          aktionen?: NonNullable<Json>
          aktiv?: boolean
          aktiv_seit?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          ausfuehren_als?: string | null
          ausloeser: string
          bedingungen?: NonNullable<Json>
          beschreibung_de?: string | null
          beschreibung_fr?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          modus?: string
          name_de: string
          name_fr: string
          reihenfolge?: number
          vorlage?: string | null
        }
        Update: {
          aktionen?: NonNullable<Json>
          aktiv?: boolean
          aktiv_seit?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          ausfuehren_als?: string | null
          ausloeser?: string
          bedingungen?: NonNullable<Json>
          beschreibung_de?: string | null
          beschreibung_fr?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          modus?: string
          name_de?: string
          name_fr?: string
          reihenfolge?: number
          vorlage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'automationen_ausfuehren_als_fkey'
            columns: ['ausfuehren_als']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      benachrichtigungen: {
        Row: {
          art: string
          ausgeblendet_am: string | null
          erstellt_am: string
          gelesen_am: string | null
          id: string
          lauf_id: string | null
          person_id: string
          text_de: string | null
          text_fr: string | null
          titel_de: string
          titel_fr: string
          ziel: string | null
        }
        ComputedFields: never
        Insert: {
          art?: string
          ausgeblendet_am?: string | null
          erstellt_am?: string
          gelesen_am?: string | null
          id?: string
          lauf_id?: string | null
          person_id: string
          text_de?: string | null
          text_fr?: string | null
          titel_de: string
          titel_fr: string
          ziel?: string | null
        }
        Update: {
          art?: string
          ausgeblendet_am?: string | null
          erstellt_am?: string
          gelesen_am?: string | null
          id?: string
          lauf_id?: string | null
          person_id?: string
          text_de?: string | null
          text_fr?: string | null
          titel_de?: string
          titel_fr?: string
          ziel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'benachrichtigungen_lauf_id_fkey'
            columns: ['lauf_id']
            isOneToOne: false
            referencedRelation: 'automation_laeufe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'benachrichtigungen_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      bestellpositionen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          artikel_id: string | null
          artikelnummer: string | null
          bestellung_id: string
          bezeichnung: string
          einheit: string
          ek_rappen: number | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geliefert_menge: number
          geloescht_am: string | null
          id: string
          menge: number
          projekt_material_id: string | null
          reihenfolge: number
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id?: string | null
          artikelnummer?: string | null
          bestellung_id: string
          bezeichnung: string
          einheit?: string
          ek_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geliefert_menge?: number
          geloescht_am?: string | null
          id?: string
          menge: number
          projekt_material_id?: string | null
          reihenfolge?: number
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id?: string | null
          artikelnummer?: string | null
          bestellung_id?: string
          bezeichnung?: string
          einheit?: string
          ek_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geliefert_menge?: number
          geloescht_am?: string | null
          id?: string
          menge?: number
          projekt_material_id?: string | null
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: 'bestellpositionen_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellpositionen_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellpositionen_bestellung_id_fkey'
            columns: ['bestellung_id']
            isOneToOne: false
            referencedRelation: 'bestellungen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellpositionen_bestellung_id_fkey'
            columns: ['bestellung_id']
            isOneToOne: false
            referencedRelation: 'bestellungen_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellpositionen_projekt_material_id_fkey'
            columns: ['projekt_material_id']
            isOneToOne: false
            referencedRelation: 'projekt_material'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellpositionen_projekt_material_id_fkey'
            columns: ['projekt_material_id']
            isOneToOne: false
            referencedRelation: 'projekt_material_stand'
            referencedColumns: ['id']
          },
        ]
      }
      bestellungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          bestellt_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          freigegeben_am: string | null
          freigegeben_von: string | null
          geaendert_am: string
          geliefert_am: string | null
          geloescht_am: string | null
          id: string
          lagerort_id: string | null
          lieferant_id: string
          liefertermin: string | null
          notiz: string | null
          nummer: string
          projekt_id: string | null
          status: string
          storniert_grund: string | null
          total_rappen: number | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          bestellt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geliefert_am?: string | null
          geloescht_am?: string | null
          id?: string
          lagerort_id?: string | null
          lieferant_id: string
          liefertermin?: string | null
          notiz?: string | null
          nummer?: string
          projekt_id?: string | null
          status?: string
          storniert_grund?: string | null
          total_rappen?: number | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          bestellt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geliefert_am?: string | null
          geloescht_am?: string | null
          id?: string
          lagerort_id?: string | null
          lieferant_id?: string
          liefertermin?: string | null
          notiz?: string | null
          nummer?: string
          projekt_id?: string | null
          status?: string
          storniert_grund?: string | null
          total_rappen?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'bestellungen_freigegeben_von_fkey'
            columns: ['freigegeben_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellungen_lagerort_id_fkey'
            columns: ['lagerort_id']
            isOneToOne: false
            referencedRelation: 'lagerorte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellungen_lieferant_id_fkey'
            columns: ['lieferant_id']
            isOneToOne: false
            referencedRelation: 'lieferanten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'bestellungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'bestellungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'bestellungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      dokumente: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          bezug_id: string | null
          bezug_tabelle: string | null
          bytes: number | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          hochgeladen_am: string | null
          hochgeladen_von: string | null
          id: string
          mime_typ: string | null
          name: string
          ordner: string | null
          sharepoint_pfad: string | null
          sharepoint_status: Json | null
          sharepoint_url: string | null
          speicher: string
          speicher_pfad: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          bezug_id?: string | null
          bezug_tabelle?: string | null
          bytes?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          hochgeladen_am?: string | null
          hochgeladen_von?: string | null
          id?: string
          mime_typ?: string | null
          name: string
          ordner?: string | null
          sharepoint_pfad?: string | null
          sharepoint_status?: Json | null
          sharepoint_url?: string | null
          speicher: string
          speicher_pfad?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          bezug_id?: string | null
          bezug_tabelle?: string | null
          bytes?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          hochgeladen_am?: string | null
          hochgeladen_von?: string | null
          id?: string
          mime_typ?: string | null
          name?: string
          ordner?: string | null
          sharepoint_pfad?: string | null
          sharepoint_status?: Json | null
          sharepoint_url?: string | null
          speicher?: string
          speicher_pfad?: string | null
        }
        Relationships: []
      }
      einladungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          eingeladen_von: string | null
          email: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gueltig_bis: string | null
          id: string
          name: string | null
          person_id: string | null
          verwendet_am: string | null
          widerrufen_am: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          eingeladen_von?: string | null
          email: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gueltig_bis?: string | null
          id?: string
          name?: string | null
          person_id?: string | null
          verwendet_am?: string | null
          widerrufen_am?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          eingeladen_von?: string | null
          email?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gueltig_bis?: string | null
          id?: string
          name?: string | null
          person_id?: string | null
          verwendet_am?: string | null
          widerrufen_am?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'einladungen_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      einsaetze: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          bis: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          notiz: string | null
          personen: string[]
          projekt_id: string
          subunternehmer_id: string | null
          team: string[]
          von: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          bis: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          notiz?: string | null
          personen?: string[]
          projekt_id: string
          subunternehmer_id?: string | null
          team?: string[]
          von: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          bis?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          notiz?: string | null
          personen?: string[]
          projekt_id?: string
          subunternehmer_id?: string | null
          team?: string[]
          von?: string
        }
        Relationships: [
          {
            foreignKeyName: 'einsaetze_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'einsaetze_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'einsaetze_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'einsaetze_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'einsaetze_subunternehmer_id_fkey'
            columns: ['subunternehmer_id']
            isOneToOne: false
            referencedRelation: 'subunternehmer'
            referencedColumns: ['id']
          },
        ]
      }
      einstellungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          schluessel: string
          wert: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          schluessel: string
          wert?: NonNullable<Json>
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          schluessel?: string
          wert?: NonNullable<Json>
        }
        Relationships: []
      }
      erwartete_eingaenge: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          betrag_rappen: number | null
          eingang_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          erwartet_am: string | null
          geaendert_am: string
          geloescht_am: string | null
          geprueft: boolean
          id: string
          kunde: string
          projekt_id: string | null
          quelle: string | null
          status: string
          text: string | null
          wahrscheinlichkeit: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number | null
          eingang_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          erwartet_am?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geprueft?: boolean
          id?: string
          kunde: string
          projekt_id?: string | null
          quelle?: string | null
          status?: string
          text?: string | null
          wahrscheinlichkeit?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number | null
          eingang_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          erwartet_am?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geprueft?: boolean
          id?: string
          kunde?: string
          projekt_id?: string | null
          quelle?: string | null
          status?: string
          text?: string | null
          wahrscheinlichkeit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'erwartete_eingaenge_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'erwartete_eingaenge_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'erwartete_eingaenge_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'erwartete_eingaenge_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      eturnity_eingang: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          daten: NonNullable<Json>
          empfangen_am: string
          ereignis: string | null
          erledigt_am: string | null
          erledigt_von: string | null
          erstellt_am: string
          erstellt_von: string | null
          eturnity_id: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          offerte_id: string | null
          offertnummer: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          daten?: NonNullable<Json>
          empfangen_am?: string
          ereignis?: string | null
          erledigt_am?: string | null
          erledigt_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          eturnity_id?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          offerte_id?: string | null
          offertnummer?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          daten?: NonNullable<Json>
          empfangen_am?: string
          ereignis?: string | null
          erledigt_am?: string | null
          erledigt_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          eturnity_id?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          offerte_id?: string | null
          offertnummer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'eturnity_eingang_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'eturnity_eingang_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['offerte_id']
          },
          {
            foreignKeyName: 'eturnity_eingang_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['id']
          },
        ]
      }
      finanz_einstellungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          schluessel: string
          wert: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          schluessel: string
          wert: NonNullable<Json>
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          schluessel?: string
          wert?: NonNullable<Json>
        }
        Relationships: []
      }
      firmen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          bank: string | null
          email: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          iban: string | null
          id: string
          kuerzel: string
          mwst_nr: string | null
          name: string
          ort: string | null
          plz: string | null
          sprache: string
          strasse: string | null
          telefon: string | null
          uid_nr: string | null
          zahlungsfrist_tage: number
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          bank?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          iban?: string | null
          id?: string
          kuerzel: string
          mwst_nr?: string | null
          name: string
          ort?: string | null
          plz?: string | null
          sprache: string
          strasse?: string | null
          telefon?: string | null
          uid_nr?: string | null
          zahlungsfrist_tage?: number
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          bank?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          iban?: string | null
          id?: string
          kuerzel?: string
          mwst_nr?: string | null
          name?: string
          ort?: string | null
          plz?: string | null
          sprache?: string
          strasse?: string | null
          telefon?: string | null
          uid_nr?: string | null
          zahlungsfrist_tage?: number
        }
        Relationships: []
      }
      fixkosten: {
        Row: {
          ab: string | null
          aktiv: boolean
          alt_daten: Json | null
          alt_id: string | null
          betrag_rappen: number
          bezeichnung: string
          bis: string | null
          detail: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gruppe: string | null
          id: string
          notiz: string | null
          quelle: string | null
          rhythmus: string
          standort: string | null
          start_monat: string | null
          tag: number | null
        }
        ComputedFields: never
        Insert: {
          ab?: string | null
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen: number
          bezeichnung: string
          bis?: string | null
          detail?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gruppe?: string | null
          id?: string
          notiz?: string | null
          quelle?: string | null
          rhythmus: string
          standort?: string | null
          start_monat?: string | null
          tag?: number | null
        }
        Update: {
          ab?: string | null
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number
          bezeichnung?: string
          bis?: string | null
          detail?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gruppe?: string | null
          id?: string
          notiz?: string | null
          quelle?: string | null
          rhythmus?: string
          standort?: string | null
          start_monat?: string | null
          tag?: number | null
        }
        Relationships: []
      }
      garantiefaelle: {
        Row: {
          abgeschlossen_am: string | null
          alt_daten: Json | null
          alt_id: string | null
          anlage_id: string | null
          eingeschickt_am: string | null
          ersatz_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gemeldet_am: string | null
          gutschrift_rappen: number | null
          hersteller: string
          id: string
          komponente: string
          notiz: string | null
          rma_nummer: string | null
          seriennummer: string | null
          service_fall_id: string | null
          status: string
        }
        ComputedFields: never
        Insert: {
          abgeschlossen_am?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          anlage_id?: string | null
          eingeschickt_am?: string | null
          ersatz_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gemeldet_am?: string | null
          gutschrift_rappen?: number | null
          hersteller: string
          id?: string
          komponente: string
          notiz?: string | null
          rma_nummer?: string | null
          seriennummer?: string | null
          service_fall_id?: string | null
          status?: string
        }
        Update: {
          abgeschlossen_am?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          anlage_id?: string | null
          eingeschickt_am?: string | null
          ersatz_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gemeldet_am?: string | null
          gutschrift_rappen?: number | null
          hersteller?: string
          id?: string
          komponente?: string
          notiz?: string | null
          rma_nummer?: string | null
          seriennummer?: string | null
          service_fall_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'garantiefaelle_anlage_id_fkey'
            columns: ['anlage_id']
            isOneToOne: false
            referencedRelation: 'anlagen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'garantiefaelle_service_fall_id_fkey'
            columns: ['service_fall_id']
            isOneToOne: false
            referencedRelation: 'service_faelle'
            referencedColumns: ['id']
          },
        ]
      }
      gespeicherte_ansichten: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          bereich: string
          einstellungen: NonNullable<Json>
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          geteilt: boolean
          id: string
          name: string
          person_id: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          bereich: string
          einstellungen?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geteilt?: boolean
          id?: string
          name: string
          person_id?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          bereich?: string
          einstellungen?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geteilt?: boolean
          id?: string
          name?: string
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'gespeicherte_ansichten_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      handbuch_eintraege: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          beschreibung_de: string | null
          beschreibung_fr: string | null
          datei_de_id: string | null
          datei_fr_id: string | null
          datum: string | null
          dauer_s: number | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          reihenfolge: number | null
          sprache: string | null
          titel_de: string
          titel_fr: string | null
          version: string | null
          versionen: NonNullable<Json>
          vorschaubild_id: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          beschreibung_de?: string | null
          beschreibung_fr?: string | null
          datei_de_id?: string | null
          datei_fr_id?: string | null
          datum?: string | null
          dauer_s?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          reihenfolge?: number | null
          sprache?: string | null
          titel_de: string
          titel_fr?: string | null
          version?: string | null
          versionen?: NonNullable<Json>
          vorschaubild_id?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          beschreibung_de?: string | null
          beschreibung_fr?: string | null
          datei_de_id?: string | null
          datei_fr_id?: string | null
          datum?: string | null
          dauer_s?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          reihenfolge?: number | null
          sprache?: string | null
          titel_de?: string
          titel_fr?: string | null
          version?: string | null
          versionen?: NonNullable<Json>
          vorschaubild_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'handbuch_eintraege_datei_de_id_fkey'
            columns: ['datei_de_id']
            isOneToOne: false
            referencedRelation: 'dokumente'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'handbuch_eintraege_datei_fr_id_fkey'
            columns: ['datei_fr_id']
            isOneToOne: false
            referencedRelation: 'dokumente'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'handbuch_eintraege_vorschaubild_id_fkey'
            columns: ['vorschaubild_id']
            isOneToOne: false
            referencedRelation: 'dokumente'
            referencedColumns: ['id']
          },
        ]
      }
      import_abgleich: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          alt_schluessel: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          sammlung: string
          ziel_id: string
          ziel_tabelle: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          alt_schluessel: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          sammlung: string
          ziel_id: string
          ziel_tabelle: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          alt_schluessel?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          sammlung?: string
          ziel_id?: string
          ziel_tabelle?: string
        }
        Relationships: []
      }
      import_laeufe: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          beendet_am: string | null
          bericht: NonNullable<Json>
          erstellt_am: string
          erstellt_von: string | null
          export_vom: string | null
          export_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gestartet_am: string
          id: string
          ok: boolean | null
          quelle: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          beendet_am?: string | null
          bericht?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          export_vom?: string | null
          export_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gestartet_am?: string
          id?: string
          ok?: boolean | null
          quelle: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          beendet_am?: string | null
          bericht?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          export_vom?: string | null
          export_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gestartet_am?: string
          id?: string
          ok?: boolean | null
          quelle?: string
        }
        Relationships: []
      }
      integrationen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          dienst: string
          einstellungen: NonNullable<Json>
          geaendert_am: string
          geloescht_am: string | null
          id: string
          meldung: string | null
          zuletzt_geprueft_am: string | null
          zuletzt_ok: boolean | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          dienst: string
          einstellungen?: NonNullable<Json>
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          meldung?: string | null
          zuletzt_geprueft_am?: string | null
          zuletzt_ok?: boolean | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          dienst?: string
          einstellungen?: NonNullable<Json>
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          meldung?: string | null
          zuletzt_geprueft_am?: string | null
          zuletzt_ok?: boolean | null
        }
        Relationships: []
      }
      integrations_protokoll: {
        Row: {
          aktion: string
          dauer_ms: number | null
          dienst: string
          id: number
          meldung: string | null
          ok: boolean
          person_id: string | null
          status: number | null
          zeitpunkt: string
        }
        ComputedFields: never
        Insert: {
          aktion: string
          dauer_ms?: number | null
          dienst: string
          id?: never
          meldung?: string | null
          ok: boolean
          person_id?: string | null
          status?: number | null
          zeitpunkt?: string
        }
        Update: {
          aktion?: string
          dauer_ms?: number | null
          dienst?: string
          id?: never
          meldung?: string | null
          ok?: boolean
          person_id?: string | null
          status?: number | null
          zeitpunkt?: string
        }
        Relationships: [
          {
            foreignKeyName: 'integrations_protokoll_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      kalender_eintraege: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          anzeige_als: string
          beginn: string
          betreff: string | null
          ende: string
          erstellt_am: string
          erstellt_von: string | null
          extern_id: string | null
          ganztags: boolean
          geaendert_am: string
          geloescht_am: string | null
          id: string
          link: string | null
          ort: string | null
          person_id: string
          plz: string | null
          quelle: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          anzeige_als?: string
          beginn: string
          betreff?: string | null
          ende: string
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          ganztags?: boolean
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          link?: string | null
          ort?: string | null
          person_id: string
          plz?: string | null
          quelle?: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          anzeige_als?: string
          beginn?: string
          betreff?: string | null
          ende?: string
          erstellt_am?: string
          erstellt_von?: string | null
          extern_id?: string | null
          ganztags?: boolean
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          link?: string | null
          ort?: string | null
          person_id?: string
          plz?: string | null
          quelle?: string
        }
        Relationships: [
          {
            foreignKeyName: 'kalender_eintraege_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      kalkulationen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          einkauf_rappen: number | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          leistung_kwp: number | null
          netto_rappen: number | null
          notiz: string | null
          offerte_id: string | null
          positionen: NonNullable<Json>
          rabatt: number | null
          titel: string | null
          total_rappen: number | null
          verkauf_rappen: number | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          einkauf_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          leistung_kwp?: number | null
          netto_rappen?: number | null
          notiz?: string | null
          offerte_id?: string | null
          positionen?: NonNullable<Json>
          rabatt?: number | null
          titel?: string | null
          total_rappen?: number | null
          verkauf_rappen?: number | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          einkauf_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          leistung_kwp?: number | null
          netto_rappen?: number | null
          notiz?: string | null
          offerte_id?: string | null
          positionen?: NonNullable<Json>
          rabatt?: number | null
          titel?: string | null
          total_rappen?: number | null
          verkauf_rappen?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'kalkulationen_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'kalkulationen_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['offerte_id']
          },
          {
            foreignKeyName: 'kalkulationen_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['id']
          },
        ]
      }
      kampagnen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          anzahl: number | null
          art: string
          betreff: string | null
          details: NonNullable<Json>
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kontakte: string[]
          newsletter_id: string | null
          versendet_am: string | null
          versendet_von: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          anzahl?: number | null
          art: string
          betreff?: string | null
          details?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakte?: string[]
          newsletter_id?: string | null
          versendet_am?: string | null
          versendet_von?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          anzahl?: number | null
          art?: string
          betreff?: string | null
          details?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakte?: string[]
          newsletter_id?: string | null
          versendet_am?: string | null
          versendet_von?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'kampagnen_newsletter_id_fkey'
            columns: ['newsletter_id']
            isOneToOne: false
            referencedRelation: 'newsletter'
            referencedColumns: ['id']
          },
        ]
      }
      ki_aufrufe: {
        Row: {
          ausgabe_tokens: number
          bezug_id: string | null
          bezug_tabelle: string | null
          cache_tokens: number
          dauer_ms: number | null
          eingabe_tokens: number
          fehler: string | null
          funktion: string
          id: number
          kosten_millirappen: number
          modell: string
          ok: boolean
          person_id: string | null
          zeitpunkt: string
        }
        ComputedFields: never
        Insert: {
          ausgabe_tokens?: number
          bezug_id?: string | null
          bezug_tabelle?: string | null
          cache_tokens?: number
          dauer_ms?: number | null
          eingabe_tokens?: number
          fehler?: string | null
          funktion: string
          id?: never
          kosten_millirappen?: number
          modell: string
          ok: boolean
          person_id?: string | null
          zeitpunkt?: string
        }
        Update: {
          ausgabe_tokens?: number
          bezug_id?: string | null
          bezug_tabelle?: string | null
          cache_tokens?: number
          dauer_ms?: number | null
          eingabe_tokens?: number
          fehler?: string | null
          funktion?: string
          id?: never
          kosten_millirappen?: number
          modell?: string
          ok?: boolean
          person_id?: string | null
          zeitpunkt?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ki_aufrufe_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      ki_ergebnisse: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          bezug_id: string
          bezug_tabelle: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          inhalt: NonNullable<Json>
          modell: string | null
          person_id: string | null
          sprache: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          bezug_id: string
          bezug_tabelle: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          inhalt: NonNullable<Json>
          modell?: string | null
          person_id?: string | null
          sprache?: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          bezug_id?: string
          bezug_tabelle?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          inhalt?: NonNullable<Json>
          modell?: string | null
          person_id?: string | null
          sprache?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ki_ergebnisse_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      kontakte: {
        Row: {
          abaninja_abgeglichen_am: string | null
          abaninja_id: string | null
          abmelde_schluessel: string
          alt_daten: Json | null
          alt_id: string | null
          anrede: string | null
          art: string
          einwilligung: Json | null
          email: string | null
          erstellt_am: string
          erstellt_von: string | null
          firma: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kontaktart: string
          kundennummer: number
          nachname: string | null
          notiz: string | null
          sprache: string
          telefon: string | null
          vorname: string | null
          werbesperre: boolean
        }
        ComputedFields: never
        Insert: {
          abaninja_abgeglichen_am?: string | null
          abaninja_id?: string | null
          abmelde_schluessel?: string
          alt_daten?: Json | null
          alt_id?: string | null
          anrede?: string | null
          art?: string
          einwilligung?: Json | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontaktart?: string
          kundennummer?: number
          nachname?: string | null
          notiz?: string | null
          sprache?: string
          telefon?: string | null
          vorname?: string | null
          werbesperre?: boolean
        }
        Update: {
          abaninja_abgeglichen_am?: string | null
          abaninja_id?: string | null
          abmelde_schluessel?: string
          alt_daten?: Json | null
          alt_id?: string | null
          anrede?: string | null
          art?: string
          einwilligung?: Json | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontaktart?: string
          kundennummer?: number
          nachname?: string | null
          notiz?: string | null
          sprache?: string
          telefon?: string | null
          vorname?: string | null
          werbesperre?: boolean
        }
        Relationships: []
      }
      kontaktsperren: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          aufgehoben_am: string | null
          aufgehoben_von: string | null
          ausschreibung_id: string | null
          bis: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          grund: string
          id: string
          wert: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          aufgehoben_am?: string | null
          aufgehoben_von?: string | null
          ausschreibung_id?: string | null
          bis?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          grund: string
          id?: string
          wert: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          aufgehoben_am?: string | null
          aufgehoben_von?: string | null
          ausschreibung_id?: string | null
          bis?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          grund?: string
          id?: string
          wert?: string
        }
        Relationships: [
          {
            foreignKeyName: 'kontaktsperren_aufgehoben_von_fkey'
            columns: ['aufgehoben_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'kontaktsperren_ausschreibung_id_fkey'
            columns: ['ausschreibung_id']
            isOneToOne: false
            referencedRelation: 'ausschreibungen'
            referencedColumns: ['id']
          },
        ]
      }
      kreditor_zahlungen: {
        Row: {
          abaninja_uuid: string | null
          alt_daten: Json | null
          alt_id: string | null
          betrag_rappen: number | null
          bezahlt_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          faellig_am: string | null
          firma: string
          fixkosten_id: string | null
          geaendert_am: string
          geloescht_am: string | null
          geplant_am: string | null
          geprueft: boolean
          id: string
          kategorie: string | null
          lieferant_id: string | null
          monat: string | null
          notiz: string | null
          offen_rappen: number | null
          prioritaet: string | null
          projekt_id: string | null
          quelle: string | null
          rechnung_am: string | null
          rechnung_nr: string | null
          status: string
          text: string | null
        }
        ComputedFields: never
        Insert: {
          abaninja_uuid?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number | null
          bezahlt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          firma: string
          fixkosten_id?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geplant_am?: string | null
          geprueft?: boolean
          id?: string
          kategorie?: string | null
          lieferant_id?: string | null
          monat?: string | null
          notiz?: string | null
          offen_rappen?: number | null
          prioritaet?: string | null
          projekt_id?: string | null
          quelle?: string | null
          rechnung_am?: string | null
          rechnung_nr?: string | null
          status?: string
          text?: string | null
        }
        Update: {
          abaninja_uuid?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number | null
          bezahlt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          firma?: string
          fixkosten_id?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geplant_am?: string | null
          geprueft?: boolean
          id?: string
          kategorie?: string | null
          lieferant_id?: string | null
          monat?: string | null
          notiz?: string | null
          offen_rappen?: number | null
          prioritaet?: string | null
          projekt_id?: string | null
          quelle?: string | null
          rechnung_am?: string | null
          rechnung_nr?: string | null
          status?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'kreditor_fixkosten_fk'
            columns: ['fixkosten_id']
            isOneToOne: false
            referencedRelation: 'fixkosten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'kreditor_zahlungen_lieferant_id_fkey'
            columns: ['lieferant_id']
            isOneToOne: false
            referencedRelation: 'lieferanten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'kreditor_zahlungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'kreditor_zahlungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'kreditor_zahlungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'kreditor_zahlungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      lagerbestand: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          artikel_id: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          lagerort_id: string
          menge: number
          mindestmenge: number | null
          reserviert: number
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          lagerort_id: string
          menge?: number
          mindestmenge?: number | null
          reserviert?: number
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          lagerort_id?: string
          menge?: number
          mindestmenge?: number | null
          reserviert?: number
        }
        Relationships: [
          {
            foreignKeyName: 'lagerbestand_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbestand_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbestand_lagerort_id_fkey'
            columns: ['lagerort_id']
            isOneToOne: false
            referencedRelation: 'lagerorte'
            referencedColumns: ['id']
          },
        ]
      }
      lagerbewegungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          artikel_id: string
          bestellung_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          lagerort_id: string
          menge: number
          notiz: string | null
          person_id: string | null
          projekt_id: string | null
          zeitpunkt: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          artikel_id: string
          bestellung_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          lagerort_id: string
          menge: number
          notiz?: string | null
          person_id?: string | null
          projekt_id?: string | null
          zeitpunkt?: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          artikel_id?: string
          bestellung_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          lagerort_id?: string
          menge?: number
          notiz?: string | null
          person_id?: string | null
          projekt_id?: string | null
          zeitpunkt?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lagerbewegungen_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbewegungen_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbewegungen_bestellung_id_fkey'
            columns: ['bestellung_id']
            isOneToOne: false
            referencedRelation: 'bestellungen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbewegungen_bestellung_id_fkey'
            columns: ['bestellung_id']
            isOneToOne: false
            referencedRelation: 'bestellungen_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbewegungen_lagerort_id_fkey'
            columns: ['lagerort_id']
            isOneToOne: false
            referencedRelation: 'lagerorte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbewegungen_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbewegungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'lagerbewegungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'lagerbewegungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'lagerbewegungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      lagerorte: {
        Row: {
          adresse: string | null
          aktiv: boolean
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          name: string
          standort_id: string
        }
        ComputedFields: never
        Insert: {
          adresse?: string | null
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name: string
          standort_id: string
        }
        Update: {
          adresse?: string | null
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name?: string
          standort_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lagerorte_standort_id_fkey'
            columns: ['standort_id']
            isOneToOne: false
            referencedRelation: 'standorte'
            referencedColumns: ['id']
          },
        ]
      }
      lead_einkauf: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          bericht_text: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          gekauft: number | null
          geloescht_am: string | null
          gemeldet: Json | null
          id: string
          monat: string
          quelle: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          bericht_text?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gekauft?: number | null
          geloescht_am?: string | null
          gemeldet?: Json | null
          id?: string
          monat: string
          quelle: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          bericht_text?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gekauft?: number | null
          geloescht_am?: string | null
          gemeldet?: Json | null
          id?: string
          monat?: string
          quelle?: string
        }
        Relationships: []
      }
      lieferanten: {
        Row: {
          aktiv: boolean
          alt_daten: Json | null
          alt_id: string | null
          email_bestellung: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kontakt_id: string | null
          kundennummer_bei_lieferant: string | null
          name: string
          notiz: string | null
          sprache: string
          telefon: string | null
        }
        ComputedFields: never
        Insert: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          email_bestellung?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string | null
          kundennummer_bei_lieferant?: string | null
          name: string
          notiz?: string | null
          sprache?: string
          telefon?: string | null
        }
        Update: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          email_bestellung?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string | null
          kundennummer_bei_lieferant?: string | null
          name?: string
          notiz?: string | null
          sprache?: string
          telefon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'lieferanten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lieferanten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lieferanten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lieferanten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'lieferanten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
        ]
      }
      lieferantenpreise: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          artikel_id: string
          artikelnummer: string | null
          ek_rappen: number | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          lieferant_id: string | null
          stand: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id: string
          artikelnummer?: string | null
          ek_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          lieferant_id?: string | null
          stand?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id?: string
          artikelnummer?: string | null
          ek_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          lieferant_id?: string | null
          stand?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'lieferantenpreise_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lieferantenpreise_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lieferantenpreise_lieferant_id_fkey'
            columns: ['lieferant_id']
            isOneToOne: false
            referencedRelation: 'lieferanten'
            referencedColumns: ['id']
          },
        ]
      }
      material_zahlungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          archiviert: boolean
          baustelle: string
          bautermin: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          geplant_am: string | null
          id: string
          notiz: string | null
          positionen: NonNullable<Json>
          projekt_id: string | null
          quelle: string | null
          zahlbar_bis: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          archiviert?: boolean
          baustelle: string
          bautermin?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geplant_am?: string | null
          id?: string
          notiz?: string | null
          positionen?: NonNullable<Json>
          projekt_id?: string | null
          quelle?: string | null
          zahlbar_bis?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          archiviert?: boolean
          baustelle?: string
          bautermin?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geplant_am?: string | null
          id?: string
          notiz?: string | null
          positionen?: NonNullable<Json>
          projekt_id?: string | null
          quelle?: string | null
          zahlbar_bis?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'material_zahlungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'material_zahlungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'material_zahlungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'material_zahlungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      nachtraege: {
        Row: {
          abgelehnt_grund: string | null
          alt_daten: Json | null
          alt_id: string | null
          beschreibung: string
          bestaetigt_am: string | null
          betrag_rappen: number | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          material: NonNullable<Json>
          nummer: string
          person_id: string | null
          projekt_id: string | null
          rapport_id: string | null
          status: string
          stunden: number | null
          unterschrift_kunde: Json | null
        }
        ComputedFields: never
        Insert: {
          abgelehnt_grund?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          beschreibung: string
          bestaetigt_am?: string | null
          betrag_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          material?: NonNullable<Json>
          nummer?: string
          person_id?: string | null
          projekt_id?: string | null
          rapport_id?: string | null
          status?: string
          stunden?: number | null
          unterschrift_kunde?: Json | null
        }
        Update: {
          abgelehnt_grund?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          beschreibung?: string
          bestaetigt_am?: string | null
          betrag_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          material?: NonNullable<Json>
          nummer?: string
          person_id?: string | null
          projekt_id?: string | null
          rapport_id?: string | null
          status?: string
          stunden?: number | null
          unterschrift_kunde?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'nachtraege_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nachtraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'nachtraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'nachtraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'nachtraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nachtraege_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'offene_service_rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nachtraege_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nachtraege_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte_liste'
            referencedColumns: ['id']
          },
        ]
      }
      newsletter: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          anzahl: number | null
          betreff_de: string | null
          betreff_fr: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          segment: Json | null
          status: string
          text_de: string | null
          text_fr: string | null
          thema: string
          versendet_am: string | null
          versendet_von: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          anzahl?: number | null
          betreff_de?: string | null
          betreff_fr?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          segment?: Json | null
          status?: string
          text_de?: string | null
          text_fr?: string | null
          thema: string
          versendet_am?: string | null
          versendet_von?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          anzahl?: number | null
          betreff_de?: string | null
          betreff_fr?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          segment?: Json | null
          status?: string
          text_de?: string | null
          text_fr?: string | null
          thema?: string
          versendet_am?: string | null
          versendet_von?: string | null
        }
        Relationships: []
      }
      newsletter_empfaenger: {
        Row: {
          abmelde_schluessel: string
          alt_daten: Json | null
          alt_id: string | null
          einwilligung: Json | null
          email: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gesperrt: boolean
          id: string
          kontakt_id: string | null
          name: string | null
        }
        ComputedFields: never
        Insert: {
          abmelde_schluessel?: string
          alt_daten?: Json | null
          alt_id?: string | null
          einwilligung?: Json | null
          email: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gesperrt?: boolean
          id?: string
          kontakt_id?: string | null
          name?: string | null
        }
        Update: {
          abmelde_schluessel?: string
          alt_daten?: Json | null
          alt_id?: string | null
          einwilligung?: Json | null
          email?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gesperrt?: boolean
          id?: string
          kontakt_id?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'newsletter_empfaenger_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'newsletter_empfaenger_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'newsletter_empfaenger_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'newsletter_empfaenger_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'newsletter_empfaenger_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
        ]
      }
      objekte: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          breite: number | null
          dach: NonNullable<Json>
          dachform: string | null
          eigentum: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          gebaeudeart: string | null
          geloescht_am: string | null
          gemeinde: string | null
          id: string
          kanton: string | null
          kontakt_id: string
          laenge: number | null
          netzbetreiber: string | null
          ort: string | null
          plz: string | null
          region_id: string | null
          strasse: string | null
          verbrauch_kwh: number | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          breite?: number | null
          dach?: NonNullable<Json>
          dachform?: string | null
          eigentum?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gebaeudeart?: string | null
          geloescht_am?: string | null
          gemeinde?: string | null
          id?: string
          kanton?: string | null
          kontakt_id: string
          laenge?: number | null
          netzbetreiber?: string | null
          ort?: string | null
          plz?: string | null
          region_id?: string | null
          strasse?: string | null
          verbrauch_kwh?: number | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          breite?: number | null
          dach?: NonNullable<Json>
          dachform?: string | null
          eigentum?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gebaeudeart?: string | null
          geloescht_am?: string | null
          gemeinde?: string | null
          id?: string
          kanton?: string | null
          kontakt_id?: string
          laenge?: number | null
          netzbetreiber?: string | null
          ort?: string | null
          plz?: string | null
          region_id?: string | null
          strasse?: string | null
          verbrauch_kwh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'objekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'objekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'objekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'objekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'objekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'objekte_region_id_fkey'
            columns: ['region_id']
            isOneToOne: false
            referencedRelation: 'regionen'
            referencedColumns: ['id']
          },
        ]
      }
      offerten: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          angebot_am: string | null
          angebot_am_frueher: string[] | null
          anzahl_module: number | null
          art: string
          batterie: string | null
          betrag_manuell: boolean
          betrag_rappen: number | null
          entscheid: string | null
          entscheid_am: string | null
          entscheid_von: string | null
          erstellt_am: string
          erstellt_von: string | null
          eturnity_id: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          jahr: number | null
          kontakt_id: string
          leistung_kwp: number | null
          nachfassen: string | null
          nachfassen_am: string | null
          nummer: string
          objekt_id: string | null
          sprache: string
          standort_id: string | null
          status: string
          titel: string | null
          verantwortlich_id: string | null
          verkaufschance_id: string | null
          verlustgrund: string | null
          versionen: NonNullable<Json>
          vertagt_grund: string | null
          wechselrichter: string | null
          wirtschaftlichkeit: Json | null
          zurueckgegeben: Json | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          angebot_am?: string | null
          angebot_am_frueher?: string[] | null
          anzahl_module?: number | null
          art?: string
          batterie?: string | null
          betrag_manuell?: boolean
          betrag_rappen?: number | null
          entscheid?: string | null
          entscheid_am?: string | null
          entscheid_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          eturnity_id?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          jahr?: number | null
          kontakt_id: string
          leistung_kwp?: number | null
          nachfassen?: string | null
          nachfassen_am?: string | null
          nummer: string
          objekt_id?: string | null
          sprache?: string
          standort_id?: string | null
          status?: string
          titel?: string | null
          verantwortlich_id?: string | null
          verkaufschance_id?: string | null
          verlustgrund?: string | null
          versionen?: NonNullable<Json>
          vertagt_grund?: string | null
          wechselrichter?: string | null
          wirtschaftlichkeit?: Json | null
          zurueckgegeben?: Json | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          angebot_am?: string | null
          angebot_am_frueher?: string[] | null
          anzahl_module?: number | null
          art?: string
          batterie?: string | null
          betrag_manuell?: boolean
          betrag_rappen?: number | null
          entscheid?: string | null
          entscheid_am?: string | null
          entscheid_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          eturnity_id?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          jahr?: number | null
          kontakt_id?: string
          leistung_kwp?: number | null
          nachfassen?: string | null
          nachfassen_am?: string | null
          nummer?: string
          objekt_id?: string | null
          sprache?: string
          standort_id?: string | null
          status?: string
          titel?: string | null
          verantwortlich_id?: string | null
          verkaufschance_id?: string | null
          verlustgrund?: string | null
          versionen?: NonNullable<Json>
          vertagt_grund?: string | null
          wechselrichter?: string | null
          wirtschaftlichkeit?: Json | null
          zurueckgegeben?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'offerten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'offerten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'offerten_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'offerten_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'objekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'offerten_standort_id_fkey'
            columns: ['standort_id']
            isOneToOne: false
            referencedRelation: 'standorte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_verantwortlich_id_fkey'
            columns: ['verantwortlich_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'verkaufschancen'
            referencedColumns: ['id']
          },
        ]
      }
      personen: {
        Row: {
          aktiv: boolean
          alt_daten: Json | null
          alt_id: string | null
          aussendienst: boolean
          auth_user_id: string | null
          bereiche: string[]
          darstellung: string | null
          email: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kuerzel: string
          name: string
          profil: NonNullable<Json>
          rechte: string[]
          rolle: string
          sprache: string
          standort_id: string | null
          zuletzt_aktiv: string | null
        }
        ComputedFields: never
        Insert: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          aussendienst?: boolean
          auth_user_id?: string | null
          bereiche?: string[]
          darstellung?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kuerzel: string
          name: string
          profil?: NonNullable<Json>
          rechte?: string[]
          rolle?: string
          sprache?: string
          standort_id?: string | null
          zuletzt_aktiv?: string | null
        }
        Update: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          aussendienst?: boolean
          auth_user_id?: string | null
          bereiche?: string[]
          darstellung?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kuerzel?: string
          name?: string
          profil?: NonNullable<Json>
          rechte?: string[]
          rolle?: string
          sprache?: string
          standort_id?: string | null
          zuletzt_aktiv?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'personen_rolle_fk'
            columns: ['rolle']
            isOneToOne: false
            referencedRelation: 'rollen'
            referencedColumns: ['schluessel']
          },
          {
            foreignKeyName: 'personen_standort_fk'
            columns: ['standort_id']
            isOneToOne: false
            referencedRelation: 'standorte'
            referencedColumns: ['id']
          },
        ]
      }
      plz_ortschaften: {
        Row: {
          ort: string
          ort_name: string | null
          plz: string
        }
        ComputedFields: never
        Insert: {
          ort: string
          ort_name?: never
          plz: string
        }
        Update: {
          ort?: string
          ort_name?: never
          plz?: string
        }
        Relationships: [
          {
            foreignKeyName: 'plz_ortschaften_plz_fkey'
            columns: ['plz']
            isOneToOne: false
            referencedRelation: 'plz_verzeichnis'
            referencedColumns: ['plz']
          },
        ]
      }
      plz_verzeichnis: {
        Row: {
          breite: number
          hoehe: number | null
          kanton: string
          laenge: number
          ort: string
          ort_name: string | null
          plz: string
        }
        ComputedFields: never
        Insert: {
          breite: number
          hoehe?: number | null
          kanton: string
          laenge: number
          ort: string
          ort_name?: never
          plz: string
        }
        Update: {
          breite?: number
          hoehe?: number | null
          kanton?: string
          laenge?: number
          ort?: string
          ort_name?: never
          plz?: string
        }
        Relationships: []
      }
      preisvorlage_positionen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          artikel_id: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          menge: number
          preisvorlage_id: string
          reihenfolge: number
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          menge: number
          preisvorlage_id: string
          reihenfolge?: number
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          menge?: number
          preisvorlage_id?: string
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: 'preisvorlage_positionen_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'preisvorlage_positionen_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'preisvorlage_positionen_preisvorlage_id_fkey'
            columns: ['preisvorlage_id']
            isOneToOne: false
            referencedRelation: 'preisvorlagen'
            referencedColumns: ['id']
          },
        ]
      }
      preisvorlagen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          name: string
          quelle: string | null
          system: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name: string
          quelle?: string | null
          system?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name?: string
          quelle?: string | null
          system?: string | null
        }
        Relationships: []
      }
      projekt_material: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          artikel_id: string | null
          bezeichnung: string
          einheit: string
          entnommen: number
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          menge: number
          notiz: string | null
          projekt_id: string
          quelle: string
          reihenfolge: number
          reserviert: number
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id?: string | null
          bezeichnung: string
          einheit?: string
          entnommen?: number
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          menge: number
          notiz?: string | null
          projekt_id: string
          quelle?: string
          reihenfolge?: number
          reserviert?: number
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id?: string | null
          bezeichnung?: string
          einheit?: string
          entnommen?: number
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          menge?: number
          notiz?: string | null
          projekt_id?: string
          quelle?: string
          reihenfolge?: number
          reserviert?: number
        }
        Relationships: [
          {
            foreignKeyName: 'projekt_material_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekt_material_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekt_material_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'projekt_material_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'projekt_material_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'projekt_material_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      projekt_schritte: {
        Row: {
          ablauf_schritt_id: string | null
          alt_daten: Json | null
          alt_id: string | null
          eingereicht_am: string | null
          erledigt_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          frist: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          notiz: string | null
          projekt_id: string
          schluessel: string
          stand: string
        }
        ComputedFields: never
        Insert: {
          ablauf_schritt_id?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          eingereicht_am?: string | null
          erledigt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          frist?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          notiz?: string | null
          projekt_id: string
          schluessel: string
          stand?: string
        }
        Update: {
          ablauf_schritt_id?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          eingereicht_am?: string | null
          erledigt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          frist?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          notiz?: string | null
          projekt_id?: string
          schluessel?: string
          stand?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projekt_schritte_ablauf_schritt_id_fkey'
            columns: ['ablauf_schritt_id']
            isOneToOne: false
            referencedRelation: 'ablauf_schritte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekt_schritte_ablauf_schritt_id_fkey'
            columns: ['ablauf_schritt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['ablauf_schritt_id']
          },
          {
            foreignKeyName: 'projekt_schritte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'projekt_schritte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'projekt_schritte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'projekt_schritte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      projekte: {
        Row: {
          ablauf_vorlage_id: string | null
          alt_daten: Json | null
          alt_id: string | null
          architekt: string | null
          bau_status: string | null
          bau_vorher: Json | null
          baubeginn: string | null
          bewilligungen: NonNullable<Json>
          checkliste: NonNullable<Json>
          elektriker: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kontakt_id: string
          material_status: string | null
          nummer: string
          objekt_id: string | null
          offerte_id: string | null
          standort_id: string | null
          status: string
          titel: string | null
          unterzeichnet_am: string | null
          verantwortlich_id: string | null
          verkaufschance_id: string | null
          vertrag_sprache: string | null
          vertragswert_rappen: number | null
          werktage: number | null
          werkvertrag: Json | null
          zahlungskonditionen: string | null
        }
        ComputedFields: never
        Insert: {
          ablauf_vorlage_id?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          architekt?: string | null
          bau_status?: string | null
          bau_vorher?: Json | null
          baubeginn?: string | null
          bewilligungen?: NonNullable<Json>
          checkliste?: NonNullable<Json>
          elektriker?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id: string
          material_status?: string | null
          nummer: string
          objekt_id?: string | null
          offerte_id?: string | null
          standort_id?: string | null
          status?: string
          titel?: string | null
          unterzeichnet_am?: string | null
          verantwortlich_id?: string | null
          verkaufschance_id?: string | null
          vertrag_sprache?: string | null
          vertragswert_rappen?: number | null
          werktage?: number | null
          werkvertrag?: Json | null
          zahlungskonditionen?: string | null
        }
        Update: {
          ablauf_vorlage_id?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          architekt?: string | null
          bau_status?: string | null
          bau_vorher?: Json | null
          baubeginn?: string | null
          bewilligungen?: NonNullable<Json>
          checkliste?: NonNullable<Json>
          elektriker?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string
          material_status?: string | null
          nummer?: string
          objekt_id?: string | null
          offerte_id?: string | null
          standort_id?: string | null
          status?: string
          titel?: string | null
          unterzeichnet_am?: string | null
          verantwortlich_id?: string | null
          verkaufschance_id?: string | null
          vertrag_sprache?: string | null
          vertragswert_rappen?: number | null
          werktage?: number | null
          werkvertrag?: Json | null
          zahlungskonditionen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'projekte_ablauf_vorlage_id_fkey'
            columns: ['ablauf_vorlage_id']
            isOneToOne: false
            referencedRelation: 'ablauf_vorlagen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'projekte_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'projekte_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'objekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'projekte_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['offerte_id']
          },
          {
            foreignKeyName: 'projekte_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_standort_id_fkey'
            columns: ['standort_id']
            isOneToOne: false
            referencedRelation: 'standorte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_verantwortlich_id_fkey'
            columns: ['verantwortlich_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'verkaufschancen'
            referencedColumns: ['id']
          },
        ]
      }
      quellen_laeufe: {
        Row: {
          aktualisiert: number
          alt_daten: Json | null
          alt_id: string | null
          beginn: string
          ende: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          gelesen: number
          geloescht_am: string | null
          id: string
          meldung: string | null
          neu: number
          ok: boolean | null
          quelle: string
        }
        ComputedFields: never
        Insert: {
          aktualisiert?: number
          alt_daten?: Json | null
          alt_id?: string | null
          beginn?: string
          ende?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gelesen?: number
          geloescht_am?: string | null
          id?: string
          meldung?: string | null
          neu?: number
          ok?: boolean | null
          quelle: string
        }
        Update: {
          aktualisiert?: number
          alt_daten?: Json | null
          alt_id?: string | null
          beginn?: string
          ende?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          gelesen?: number
          geloescht_am?: string | null
          id?: string
          meldung?: string | null
          neu?: number
          ok?: boolean | null
          quelle?: string
        }
        Relationships: []
      }
      rapporte: {
        Row: {
          abgeschlossen_am: string | null
          alt_daten: Json | null
          alt_id: string | null
          arbeiten: string | null
          art: string
          datum: string
          einsatz_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          fotos: string[]
          geaendert_am: string
          geloescht_am: string | null
          id: string
          material: NonNullable<Json>
          montage_fertig: boolean
          notiz_intern: string | null
          nummer: string
          person_id: string | null
          projekt_id: string | null
          pruefpunkte: NonNullable<Json>
          service_fall_id: string | null
          team: string[]
          unterschrift_kunde: Json | null
          verrechnung: string | null
          wartungsvertrag_id: string | null
        }
        ComputedFields: never
        Insert: {
          abgeschlossen_am?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          arbeiten?: string | null
          art?: string
          datum: string
          einsatz_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          fotos?: string[]
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          material?: NonNullable<Json>
          montage_fertig?: boolean
          notiz_intern?: string | null
          nummer?: string
          person_id?: string | null
          projekt_id?: string | null
          pruefpunkte?: NonNullable<Json>
          service_fall_id?: string | null
          team?: string[]
          unterschrift_kunde?: Json | null
          verrechnung?: string | null
          wartungsvertrag_id?: string | null
        }
        Update: {
          abgeschlossen_am?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          arbeiten?: string | null
          art?: string
          datum?: string
          einsatz_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          fotos?: string[]
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          material?: NonNullable<Json>
          montage_fertig?: boolean
          notiz_intern?: string | null
          nummer?: string
          person_id?: string | null
          projekt_id?: string | null
          pruefpunkte?: NonNullable<Json>
          service_fall_id?: string | null
          team?: string[]
          unterschrift_kunde?: Json | null
          verrechnung?: string | null
          wartungsvertrag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'rapporte_einsatz_id_fkey'
            columns: ['einsatz_id']
            isOneToOne: false
            referencedRelation: 'einsaetze'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rapporte_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rapporte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rapporte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rapporte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rapporte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rapporte_service_fall_id_fkey'
            columns: ['service_fall_id']
            isOneToOne: false
            referencedRelation: 'service_faelle'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rapporte_wartungsvertrag_id_fkey'
            columns: ['wartungsvertrag_id']
            isOneToOne: false
            referencedRelation: 'wartungsvertraege'
            referencedColumns: ['id']
          },
        ]
      }
      rechnung_zahlungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          betrag_rappen: number
          datum: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          notiz: string | null
          quelle: string
          rechnung_id: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen: number
          datum?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          notiz?: string | null
          quelle?: string
          rechnung_id: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number
          datum?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          notiz?: string | null
          quelle?: string
          rechnung_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rechnung_zahlungen_rechnung_id_fkey'
            columns: ['rechnung_id']
            isOneToOne: false
            referencedRelation: 'rechnungen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnung_zahlungen_rechnung_id_fkey'
            columns: ['rechnung_id']
            isOneToOne: false
            referencedRelation: 'rechnungen_liste'
            referencedColumns: ['id']
          },
        ]
      }
      rechnungen: {
        Row: {
          abaninja_abgeglichen_am: string | null
          abaninja_nummer: string | null
          abaninja_offen_rappen: number | null
          abaninja_status: string | null
          abaninja_uuid: string | null
          alt_daten: Json | null
          alt_id: string | null
          art: string
          bezahlt_am: string | null
          bezahlt_rappen: number
          datum: string | null
          dokument_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          faellig_am: string | null
          firma_id: string
          geaendert_am: string
          geloescht_am: string | null
          gemahnt_am: string | null
          id: string
          inkl_mwst: boolean
          kontakt_id: string
          mahnfrist: string | null
          mahnstufe: number
          mwst_rappen: number
          mwst_satz: number
          netto_rappen: number
          notiz: string | null
          nummer: string | null
          positionen: NonNullable<Json>
          projekt_id: string | null
          rapport_id: string | null
          service_fall_id: string | null
          sprache: string
          status: string
          storniert_grund: string | null
          titel: string
          total_rappen: number
          wartungsvertrag_id: string | null
          zahlungsplan_id: string | null
        }
        ComputedFields: never
        Insert: {
          abaninja_abgeglichen_am?: string | null
          abaninja_nummer?: string | null
          abaninja_offen_rappen?: number | null
          abaninja_status?: string | null
          abaninja_uuid?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          bezahlt_am?: string | null
          bezahlt_rappen?: number
          datum?: string | null
          dokument_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          firma_id: string
          geaendert_am?: string
          geloescht_am?: string | null
          gemahnt_am?: string | null
          id?: string
          inkl_mwst?: boolean
          kontakt_id: string
          mahnfrist?: string | null
          mahnstufe?: number
          mwst_rappen?: number
          mwst_satz?: number
          netto_rappen?: number
          notiz?: string | null
          nummer?: string | null
          positionen?: NonNullable<Json>
          projekt_id?: string | null
          rapport_id?: string | null
          service_fall_id?: string | null
          sprache?: string
          status?: string
          storniert_grund?: string | null
          titel: string
          total_rappen?: number
          wartungsvertrag_id?: string | null
          zahlungsplan_id?: string | null
        }
        Update: {
          abaninja_abgeglichen_am?: string | null
          abaninja_nummer?: string | null
          abaninja_offen_rappen?: number | null
          abaninja_status?: string | null
          abaninja_uuid?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          bezahlt_am?: string | null
          bezahlt_rappen?: number
          datum?: string | null
          dokument_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          firma_id?: string
          geaendert_am?: string
          geloescht_am?: string | null
          gemahnt_am?: string | null
          id?: string
          inkl_mwst?: boolean
          kontakt_id?: string
          mahnfrist?: string | null
          mahnstufe?: number
          mwst_rappen?: number
          mwst_satz?: number
          netto_rappen?: number
          notiz?: string | null
          nummer?: string | null
          positionen?: NonNullable<Json>
          projekt_id?: string | null
          rapport_id?: string | null
          service_fall_id?: string | null
          sprache?: string
          status?: string
          storniert_grund?: string | null
          titel?: string
          total_rappen?: number
          wartungsvertrag_id?: string | null
          zahlungsplan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'rechnungen_dokument_id_fkey'
            columns: ['dokument_id']
            isOneToOne: false
            referencedRelation: 'dokumente'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_firma_id_fkey'
            columns: ['firma_id']
            isOneToOne: false
            referencedRelation: 'firmen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'rechnungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rechnungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rechnungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rechnungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'offene_service_rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_service_fall_id_fkey'
            columns: ['service_fall_id']
            isOneToOne: false
            referencedRelation: 'service_faelle'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_wartungsvertrag_id_fkey'
            columns: ['wartungsvertrag_id']
            isOneToOne: false
            referencedRelation: 'wartungsvertraege'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_zahlungsplan_id_fkey'
            columns: ['zahlungsplan_id']
            isOneToOne: false
            referencedRelation: 'offene_tranchen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_zahlungsplan_id_fkey'
            columns: ['zahlungsplan_id']
            isOneToOne: false
            referencedRelation: 'zahlungsplan'
            referencedColumns: ['id']
          },
        ]
      }
      regionen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          name: string
          nummer: number
          plz_regeln: NonNullable<Json>
          standort_id: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name: string
          nummer: number
          plz_regeln?: NonNullable<Json>
          standort_id?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name?: string
          nummer?: number
          plz_regeln?: NonNullable<Json>
          standort_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'regionen_standort_id_fkey'
            columns: ['standort_id']
            isOneToOne: false
            referencedRelation: 'standorte'
            referencedColumns: ['id']
          },
        ]
      }
      rollen: {
        Row: {
          aktiv: boolean
          alt_daten: Json | null
          alt_id: string | null
          bereiche: string[]
          beschreibung_de: string | null
          beschreibung_fr: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          name_de: string
          name_fr: string
          rechte: string[]
          reihenfolge: number
          schluessel: string
        }
        ComputedFields: never
        Insert: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          bereiche?: string[]
          beschreibung_de?: string | null
          beschreibung_fr?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name_de: string
          name_fr: string
          rechte?: string[]
          reihenfolge?: number
          schluessel: string
        }
        Update: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          bereiche?: string[]
          beschreibung_de?: string | null
          beschreibung_fr?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          name_de?: string
          name_fr?: string
          rechte?: string[]
          reihenfolge?: number
          schluessel?: string
        }
        Relationships: []
      }
      rueckmeldungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          antwort: string | null
          antwort_von: string | null
          beantwortet_am: string | null
          bereich: string | null
          erstellt_am: string
          erstellt_von: string | null
          erwartet: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          nummer: number | null
          person_id: string | null
          prio: string
          status: string
          text: string
          titel: string | null
          umgebung: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          antwort?: string | null
          antwort_von?: string | null
          beantwortet_am?: string | null
          bereich?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          erwartet?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          nummer?: number | null
          person_id?: string | null
          prio?: string
          status?: string
          text: string
          titel?: string | null
          umgebung?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          antwort?: string | null
          antwort_von?: string | null
          beantwortet_am?: string | null
          bereich?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          erwartet?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          nummer?: number | null
          person_id?: string | null
          prio?: string
          status?: string
          text?: string
          titel?: string | null
          umgebung?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'rueckmeldungen_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      schreibstile: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          anzahl: number
          beispiele: NonNullable<Json>
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          person_id: string | null
          regeln: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          anzahl?: number
          beispiele?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          person_id?: string | null
          regeln?: NonNullable<Json>
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          anzahl?: number
          beispiele?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          person_id?: string | null
          regeln?: NonNullable<Json>
        }
        Relationships: [
          {
            foreignKeyName: 'schreibstile_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      service_faelle: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          anlage_id: string | null
          beschreibung: string | null
          erledigt_am: string | null
          erstellt_am: string
          erstellt_von: string | null
          garantie: boolean | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kategorie: string | null
          kontakt_id: string | null
          nummer: string
          person_id: string | null
          prioritaet: string | null
          projekt_id: string | null
          status: string
          termin_am: string | null
          titel: string
          verlauf: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          anlage_id?: string | null
          beschreibung?: string | null
          erledigt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          garantie?: boolean | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kategorie?: string | null
          kontakt_id?: string | null
          nummer: string
          person_id?: string | null
          prioritaet?: string | null
          projekt_id?: string | null
          status?: string
          termin_am?: string | null
          titel: string
          verlauf?: NonNullable<Json>
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          anlage_id?: string | null
          beschreibung?: string | null
          erledigt_am?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          garantie?: boolean | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kategorie?: string | null
          kontakt_id?: string | null
          nummer?: string
          person_id?: string | null
          prioritaet?: string | null
          projekt_id?: string | null
          status?: string
          termin_am?: string | null
          titel?: string
          verlauf?: NonNullable<Json>
        }
        Relationships: [
          {
            foreignKeyName: 'service_faelle_anlage_id_fkey'
            columns: ['anlage_id']
            isOneToOne: false
            referencedRelation: 'anlagen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_faelle_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_faelle_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_faelle_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_faelle_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'service_faelle_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'service_faelle_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_faelle_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'service_faelle_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'service_faelle_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'service_faelle_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      sharepoint_ordner: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kontakt_id: string | null
          name: string
          ordner_id: string
          unterordner: NonNullable<Json>
          url: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string | null
          name: string
          ordner_id: string
          unterordner?: NonNullable<Json>
          url?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string | null
          name?: string
          ordner_id?: string
          unterordner?: NonNullable<Json>
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sharepoint_ordner_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sharepoint_ordner_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sharepoint_ordner_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sharepoint_ordner_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'sharepoint_ordner_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
        ]
      }
      sicherungen: {
        Row: {
          anzahl: NonNullable<Json>
          art: string
          begonnen_am: string
          bytes: number | null
          fehler: string | null
          fertig_am: string | null
          id: string
          pfad: string | null
          sharepoint: Json | null
          slot: string
          status: string
          von: string | null
          von_name: string | null
          wiederhergestellt_am: string | null
          wiederhergestellt_anzahl: Json | null
          wiederhergestellt_von: string | null
        }
        ComputedFields: never
        Insert: {
          anzahl?: NonNullable<Json>
          art: string
          begonnen_am?: string
          bytes?: number | null
          fehler?: string | null
          fertig_am?: string | null
          id?: string
          pfad?: string | null
          sharepoint?: Json | null
          slot: string
          status?: string
          von?: string | null
          von_name?: string | null
          wiederhergestellt_am?: string | null
          wiederhergestellt_anzahl?: Json | null
          wiederhergestellt_von?: string | null
        }
        Update: {
          anzahl?: NonNullable<Json>
          art?: string
          begonnen_am?: string
          bytes?: number | null
          fehler?: string | null
          fertig_am?: string | null
          id?: string
          pfad?: string | null
          sharepoint?: Json | null
          slot?: string
          status?: string
          von?: string | null
          von_name?: string | null
          wiederhergestellt_am?: string | null
          wiederhergestellt_anzahl?: Json | null
          wiederhergestellt_von?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sicherungen_von_fkey'
            columns: ['von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      signaturen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          html: string
          id: string
          person_id: string | null
          sprache: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          html: string
          id?: string
          person_id?: string | null
          sprache?: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          html?: string
          id?: string
          person_id?: string | null
          sprache?: string
        }
        Relationships: [
          {
            foreignKeyName: 'signaturen_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      social_posts: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          bilder: NonNullable<Json>
          datum: string | null
          details: NonNullable<Json>
          ergebnis: NonNullable<Json>
          erstellt_am: string
          erstellt_von: string | null
          format: string | null
          freigegeben_am: string | null
          freigegeben_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          geplant_am: string | null
          id: string
          idee: string | null
          netzwerke: string[]
          sprache: string | null
          status: string
          texte: NonNullable<Json>
          thema: string | null
          verfasst_von: string | null
          veroeffentlicht_am: string | null
          zeit: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          bilder?: NonNullable<Json>
          datum?: string | null
          details?: NonNullable<Json>
          ergebnis?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          format?: string | null
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geplant_am?: string | null
          id?: string
          idee?: string | null
          netzwerke?: string[]
          sprache?: string | null
          status?: string
          texte?: NonNullable<Json>
          thema?: string | null
          verfasst_von?: string | null
          veroeffentlicht_am?: string | null
          zeit?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          bilder?: NonNullable<Json>
          datum?: string | null
          details?: NonNullable<Json>
          ergebnis?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          format?: string | null
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          geplant_am?: string | null
          id?: string
          idee?: string | null
          netzwerke?: string[]
          sprache?: string | null
          status?: string
          texte?: NonNullable<Json>
          thema?: string | null
          verfasst_von?: string | null
          veroeffentlicht_am?: string | null
          zeit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'social_posts_freigegeben_von_fkey'
            columns: ['freigegeben_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      spesen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          ausbezahlt_am: string | null
          ausbezahlt_von: string | null
          beleg_id: string | null
          betrag_rappen: number
          datum: string
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kategorie: string
          mail: Json | null
          notiz: string | null
          person_id: string | null
          status: string
          storniert_am: string | null
          storniert_grund: string | null
          storniert_von: string | null
          zweck: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          ausbezahlt_am?: string | null
          ausbezahlt_von?: string | null
          beleg_id?: string | null
          betrag_rappen: number
          datum: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kategorie: string
          mail?: Json | null
          notiz?: string | null
          person_id?: string | null
          status?: string
          storniert_am?: string | null
          storniert_grund?: string | null
          storniert_von?: string | null
          zweck?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          ausbezahlt_am?: string | null
          ausbezahlt_von?: string | null
          beleg_id?: string | null
          betrag_rappen?: number
          datum?: string
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kategorie?: string
          mail?: Json | null
          notiz?: string | null
          person_id?: string | null
          status?: string
          storniert_am?: string | null
          storniert_grund?: string | null
          storniert_von?: string | null
          zweck?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'spesen_beleg_id_fkey'
            columns: ['beleg_id']
            isOneToOne: false
            referencedRelation: 'dokumente'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spesen_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      standorte: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          firma_id: string
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kuerzel: string
          name: string
          ort: string | null
          plz: string | null
          sprache: string
          strasse: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma_id: string
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kuerzel: string
          name: string
          ort?: string | null
          plz?: string | null
          sprache?: string
          strasse?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          firma_id?: string
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kuerzel?: string
          name?: string
          ort?: string | null
          plz?: string | null
          sprache?: string
          strasse?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'standorte_firma_id_fkey'
            columns: ['firma_id']
            isOneToOne: false
            referencedRelation: 'firmen'
            referencedColumns: ['id']
          },
        ]
      }
      subunternehmer: {
        Row: {
          aktiv: boolean
          alt_daten: Json | null
          alt_id: string | null
          email: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gewerk: string | null
          id: string
          kontakt_id: string | null
          name: string
          notiz: string | null
          sprache: string
          telefon: string | null
        }
        ComputedFields: never
        Insert: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gewerk?: string | null
          id?: string
          kontakt_id?: string | null
          name: string
          notiz?: string | null
          sprache?: string
          telefon?: string | null
        }
        Update: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          email?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gewerk?: string | null
          id?: string
          kontakt_id?: string | null
          name?: string
          notiz?: string | null
          sprache?: string
          telefon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'subunternehmer_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subunternehmer_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subunternehmer_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subunternehmer_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'subunternehmer_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
        ]
      }
      subunternehmer_auftraege: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          angefragt_am: string | null
          bestaetigt_am: string | null
          betrag_rappen: number | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          leistung: string
          notiz: string | null
          projekt_id: string
          status: string
          subunternehmer_id: string
          termin_bis: string | null
          termin_von: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          angefragt_am?: string | null
          bestaetigt_am?: string | null
          betrag_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          leistung: string
          notiz?: string | null
          projekt_id: string
          status?: string
          subunternehmer_id: string
          termin_bis?: string | null
          termin_von?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          angefragt_am?: string | null
          bestaetigt_am?: string | null
          betrag_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          leistung?: string
          notiz?: string | null
          projekt_id?: string
          status?: string
          subunternehmer_id?: string
          termin_bis?: string | null
          termin_von?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'subunternehmer_auftraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'subunternehmer_auftraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'subunternehmer_auftraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'subunternehmer_auftraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subunternehmer_auftraege_subunternehmer_id_fkey'
            columns: ['subunternehmer_id']
            isOneToOne: false
            referencedRelation: 'subunternehmer'
            referencedColumns: ['id']
          },
        ]
      }
      verkaufschancen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          besichtigung: Json | null
          eingang_am: string | null
          erledigt: boolean | null
          erreichbarkeit: string | null
          erstellt_am: string
          erstellt_von: string | null
          erstkontakt_standort: string | null
          finanzierung: string | null
          foerderung: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          interesse: string[]
          kommentar_kunde: string | null
          kontakt_id: string
          luftbild: Json | null
          notiz_intern: string | null
          nummer: string
          objekt_id: string | null
          offerte_hinweis: string | null
          offerte_hinweis_von: string | null
          offerte_rueckfrage: string | null
          offerte_seit: string | null
          offerte_status: string | null
          offerte_von: string | null
          outlook: Json | null
          quelle: string | null
          region_id: string | null
          standort_id: string | null
          stufe: string
          termin_am: string | null
          termin_bestaetigt: Json | null
          termin_dauer_min: number | null
          tour_person_id: string | null
          verlauf_text: string | null
          verlustgrund: string | null
          wiedervorlage_am: string | null
          wiedervorlage_grund: string | null
          zeithorizont: string | null
          zugewiesen_von: string | null
          zur_offerte_am: string | null
          zustaendig: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          besichtigung?: Json | null
          eingang_am?: string | null
          erledigt?: boolean | null
          erreichbarkeit?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          erstkontakt_standort?: string | null
          finanzierung?: string | null
          foerderung?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          interesse?: string[]
          kommentar_kunde?: string | null
          kontakt_id: string
          luftbild?: Json | null
          notiz_intern?: string | null
          nummer?: string
          objekt_id?: string | null
          offerte_hinweis?: string | null
          offerte_hinweis_von?: string | null
          offerte_rueckfrage?: string | null
          offerte_seit?: string | null
          offerte_status?: string | null
          offerte_von?: string | null
          outlook?: Json | null
          quelle?: string | null
          region_id?: string | null
          standort_id?: string | null
          stufe?: string
          termin_am?: string | null
          termin_bestaetigt?: Json | null
          termin_dauer_min?: number | null
          tour_person_id?: string | null
          verlauf_text?: string | null
          verlustgrund?: string | null
          wiedervorlage_am?: string | null
          wiedervorlage_grund?: string | null
          zeithorizont?: string | null
          zugewiesen_von?: string | null
          zur_offerte_am?: string | null
          zustaendig?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          besichtigung?: Json | null
          eingang_am?: string | null
          erledigt?: boolean | null
          erreichbarkeit?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          erstkontakt_standort?: string | null
          finanzierung?: string | null
          foerderung?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          interesse?: string[]
          kommentar_kunde?: string | null
          kontakt_id?: string
          luftbild?: Json | null
          notiz_intern?: string | null
          nummer?: string
          objekt_id?: string | null
          offerte_hinweis?: string | null
          offerte_hinweis_von?: string | null
          offerte_rueckfrage?: string | null
          offerte_seit?: string | null
          offerte_status?: string | null
          offerte_von?: string | null
          outlook?: Json | null
          quelle?: string | null
          region_id?: string | null
          standort_id?: string | null
          stufe?: string
          termin_am?: string | null
          termin_bestaetigt?: Json | null
          termin_dauer_min?: number | null
          tour_person_id?: string | null
          verlauf_text?: string | null
          verlustgrund?: string | null
          wiedervorlage_am?: string | null
          wiedervorlage_grund?: string | null
          zeithorizont?: string | null
          zugewiesen_von?: string | null
          zur_offerte_am?: string | null
          zustaendig?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'verkaufschancen_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'verkaufschancen_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'objekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'verkaufschancen_region_id_fkey'
            columns: ['region_id']
            isOneToOne: false
            referencedRelation: 'regionen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_standort_id_fkey'
            columns: ['standort_id']
            isOneToOne: false
            referencedRelation: 'standorte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_tour_person_id_fkey'
            columns: ['tour_person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      wartungsvertraege: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          anlage_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kontakt_id: string
          laufzeit_jahre: number
          leistungen: NonNullable<Json>
          letzte_wartung: string | null
          naechste_wartung: string | null
          notiz: string | null
          nummer: string | null
          offerte_id: string | null
          preis_rappen: number | null
          projekt_id: string | null
          rhythmus_monate: number | null
          sprache: string | null
          start_am: string | null
          status: string
          verlauf: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          anlage_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id: string
          laufzeit_jahre?: number
          leistungen?: NonNullable<Json>
          letzte_wartung?: string | null
          naechste_wartung?: string | null
          notiz?: string | null
          nummer?: string | null
          offerte_id?: string | null
          preis_rappen?: number | null
          projekt_id?: string | null
          rhythmus_monate?: number | null
          sprache?: string | null
          start_am?: string | null
          status?: string
          verlauf?: NonNullable<Json>
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          anlage_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakt_id?: string
          laufzeit_jahre?: number
          leistungen?: NonNullable<Json>
          letzte_wartung?: string | null
          naechste_wartung?: string | null
          notiz?: string | null
          nummer?: string | null
          offerte_id?: string | null
          preis_rappen?: number | null
          projekt_id?: string | null
          rhythmus_monate?: number | null
          sprache?: string | null
          start_am?: string | null
          status?: string
          verlauf?: NonNullable<Json>
        }
        Relationships: [
          {
            foreignKeyName: 'wartungsvertraege_anlage_id_fkey'
            columns: ['anlage_id']
            isOneToOne: false
            referencedRelation: 'anlagen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wartungsvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wartungsvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wartungsvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wartungsvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'wartungsvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'wartungsvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wartungsvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['offerte_id']
          },
          {
            foreignKeyName: 'wartungsvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'wartungsvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'wartungsvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'wartungsvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'wartungsvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      werkvertraege: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          betrag_rappen: number | null
          dokument_id: string | null
          erstellt_am: string
          erstellt_datum: string | null
          erstellt_von: string | null
          firma_id: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          konditionen: number[]
          kontakt_id: string
          notiz: string | null
          nummer: string
          offerte_id: string | null
          projekt_id: string | null
          sprache: string
          status: string
          unterschrieben_am: string | null
          unterschrift: Json | null
          versendet_am: string | null
          version: number
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number | null
          dokument_id?: string | null
          erstellt_am?: string
          erstellt_datum?: string | null
          erstellt_von?: string | null
          firma_id?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          konditionen?: number[]
          kontakt_id: string
          notiz?: string | null
          nummer: string
          offerte_id?: string | null
          projekt_id?: string | null
          sprache?: string
          status?: string
          unterschrieben_am?: string | null
          unterschrift?: Json | null
          versendet_am?: string | null
          version?: number
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number | null
          dokument_id?: string | null
          erstellt_am?: string
          erstellt_datum?: string | null
          erstellt_von?: string | null
          firma_id?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          konditionen?: number[]
          kontakt_id?: string
          notiz?: string | null
          nummer?: string
          offerte_id?: string | null
          projekt_id?: string | null
          sprache?: string
          status?: string
          unterschrieben_am?: string | null
          unterschrift?: Json | null
          versendet_am?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'werkvertraege_dokument_id_fkey'
            columns: ['dokument_id']
            isOneToOne: false
            referencedRelation: 'dokumente'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_firma_id_fkey'
            columns: ['firma_id']
            isOneToOne: false
            referencedRelation: 'firmen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'werkvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['offerte_id']
          },
          {
            foreignKeyName: 'werkvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'werkvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'werkvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'werkvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      zahlungsplan: {
        Row: {
          abaninja_id: string | null
          alt_daten: Json | null
          alt_id: string | null
          betrag_rappen: number
          bezahlt_am: string | null
          bezeichnung: string
          erstellt_am: string
          erstellt_von: string | null
          faellig_am: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          mahnfrist: string | null
          mahnstufe: number
          projekt_id: string
          rechnung_am: string | null
          rechnung_nr: string | null
        }
        ComputedFields: never
        Insert: {
          abaninja_id?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen: number
          bezahlt_am?: string | null
          bezeichnung: string
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          mahnfrist?: string | null
          mahnstufe?: number
          projekt_id: string
          rechnung_am?: string | null
          rechnung_nr?: string | null
        }
        Update: {
          abaninja_id?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number
          bezahlt_am?: string | null
          bezeichnung?: string
          erstellt_am?: string
          erstellt_von?: string | null
          faellig_am?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          mahnfrist?: string | null
          mahnstufe?: number
          projekt_id?: string
          rechnung_am?: string | null
          rechnung_nr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'zahlungsplan_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zahlungsplan_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zahlungsplan_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zahlungsplan_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      zeiten: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          erstellt_am: string
          erstellt_von: string | null
          exportiert_am: string | null
          freigegeben_am: string | null
          freigegeben_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          notiz: string | null
          pause_min: number
          person_id: string
          projekt_id: string | null
          rapport_id: string | null
          start: string
          stopp: string | null
          taetigkeit: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          erstellt_am?: string
          erstellt_von?: string | null
          exportiert_am?: string | null
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          notiz?: string | null
          pause_min?: number
          person_id: string
          projekt_id?: string | null
          rapport_id?: string | null
          start: string
          stopp?: string | null
          taetigkeit?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          erstellt_am?: string
          erstellt_von?: string | null
          exportiert_am?: string | null
          freigegeben_am?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          notiz?: string | null
          pause_min?: number
          person_id?: string
          projekt_id?: string | null
          rapport_id?: string | null
          start?: string
          stopp?: string | null
          taetigkeit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'zeiten_freigegeben_von_fkey'
            columns: ['freigegeben_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zeiten_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zeiten_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zeiten_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'offene_service_rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte_liste'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      abwesenheiten_alle: {
        Row: {
          art: string | null
          bis: string | null
          halbtag: boolean | null
          id: string | null
          person_id: string | null
          quelle: string | null
          von: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      bestellungen_liste: {
        Row: {
          bestellt_am: string | null
          email_bestellung: string | null
          erstellt_am: string | null
          firma: string | null
          firma_ort: string | null
          firma_plz: string | null
          firma_strasse: string | null
          freigegeben_am: string | null
          freigegeben_von: string | null
          geliefert_am: string | null
          id: string | null
          kunde: string | null
          kundennummer_bei_lieferant: string | null
          lagerort: string | null
          lagerort_adresse: string | null
          lagerort_id: string | null
          lieferant: string | null
          lieferant_id: string | null
          lieferant_sprache: string | null
          liefertermin: string | null
          mail_status: string | null
          menge_geliefert: number | null
          menge_total: number | null
          notiz: string | null
          nummer: string | null
          objekt_ort: string | null
          objekt_plz: string | null
          objekt_strasse: string | null
          positionen: number | null
          projekt_id: string | null
          projekt_nummer: string | null
          projekt_titel: string | null
          status: string | null
          storniert_grund: string | null
          total_rappen: number | null
          ueberfaellig: boolean | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'bestellungen_lagerort_id_fkey'
            columns: ['lagerort_id']
            isOneToOne: false
            referencedRelation: 'lagerorte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellungen_lieferant_id_fkey'
            columns: ['lieferant_id']
            isOneToOne: false
            referencedRelation: 'lieferanten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bestellungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'bestellungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'bestellungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'bestellungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      kunden_uebersicht: {
        Row: {
          anrede: string | null
          anzahl_objekte: number | null
          anzahl_offerten: number | null
          anzahl_projekte: number | null
          art: string | null
          einwilligung: Json | null
          email: string | null
          erstellt_am: string | null
          firma: string | null
          geaendert_am: string | null
          geloescht_am: string | null
          id: string | null
          kontaktart: string | null
          kundennummer: number | null
          letzter_kontakt: string | null
          moegliche_dublette: boolean | null
          nachname: string | null
          name: string | null
          notiz: string | null
          objekt_id: string | null
          ort: string | null
          plz: string | null
          sprache: string | null
          stand: string | null
          stand_bezug: string | null
          stand_datum: string | null
          stand_gruppe: string | null
          stand_rang: number | null
          stand_tabelle: string | null
          strasse: string | null
          suchtext: string | null
          telefon: string | null
          telefon_ziffern: string | null
          vorname: string | null
          werbesperre: boolean | null
        }
        ComputedFields: never
        Relationships: []
      }
      lager_uebersicht: {
        Row: {
          artikel: string | null
          artikel_id: string | null
          artikelnummer: string | null
          einheit: string | null
          frei: number | null
          geaendert_am: string | null
          id: string | null
          kategorie: string | null
          lagerort: string | null
          lagerort_id: string | null
          menge: number | null
          mindestmenge: number | null
          reserviert: number | null
          unter_mindest: boolean | null
          unterwegs: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'lagerbestand_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbestand_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lagerbestand_lagerort_id_fkey'
            columns: ['lagerort_id']
            isOneToOne: false
            referencedRelation: 'lagerorte'
            referencedColumns: ['id']
          },
        ]
      }
      marketing_zielgruppe: {
        Row: {
          abmelde_schluessel: string | null
          anlage_seit: string | null
          anrede: string | null
          batterie: boolean | null
          einwilligung: Json | null
          email: string | null
          firma: string | null
          gruppe: string | null
          id: string | null
          kanton: string | null
          kundennummer: number | null
          nachname: string | null
          name: string | null
          ort: string | null
          plz: string | null
          sprache: string | null
          stand: string | null
          standort: string | null
          strasse: string | null
          telefon: string | null
          versandgrund: string | null
          vorname: string | null
          waermepumpe: boolean | null
          wallbox: boolean | null
          werbesperre: boolean | null
          zuletzt_angeschrieben: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      nachtraege_liste: {
        Row: {
          abgelehnt_grund: string | null
          alt_daten: Json | null
          alt_id: string | null
          beschreibung: string | null
          bestaetigt_am: string | null
          betrag_rappen: number | null
          erstellt_am: string | null
          erstellt_von: string | null
          geaendert_am: string | null
          geloescht_am: string | null
          id: string | null
          kunde: string | null
          material: Json | null
          nummer: string | null
          person: string | null
          person_id: string | null
          projekt_id: string | null
          projekt_nummer: string | null
          rapport_id: string | null
          rapport_nummer: string | null
          status: string | null
          stunden: number | null
          unterschrift_kunde: Json | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'nachtraege_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nachtraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'nachtraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'nachtraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'nachtraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nachtraege_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'offene_service_rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nachtraege_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nachtraege_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte_liste'
            referencedColumns: ['id']
          },
        ]
      }
      offene_service_rapporte: {
        Row: {
          abgeschlossen_am: string | null
          art: string | null
          datum: string | null
          id: string | null
          kontakt_id: string | null
          kunde: string | null
          nummer: string | null
          projekt_nummer: string | null
          service_nummer: string | null
          service_titel: string | null
          verrechnung: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      offene_tranchen: {
        Row: {
          bau_status: string | null
          betrag_rappen: number | null
          bezeichnung: string | null
          faellig_am: string | null
          id: string | null
          kontakt_id: string | null
          kunde: string | null
          projekt_id: string | null
          projekt_nummer: string | null
          projekt_titel: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'projekte_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'zahlungsplan_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zahlungsplan_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zahlungsplan_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zahlungsplan_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      offerten_eingang: {
        Row: {
          betrag_rappen: number | null
          id: string | null
          interesse: string[] | null
          kommentar_kunde: string | null
          kontakt_id: string | null
          kundennummer: number | null
          lead_nummer: string | null
          leistung_kwp: number | null
          name: string | null
          notiz_intern: string | null
          offerte_hinweis: string | null
          offerte_hinweis_von: string | null
          offerte_id: string | null
          offerte_nummer: string | null
          offerte_rueckfrage: string | null
          offerte_seit: string | null
          offerte_status: string | null
          offerte_von: string | null
          ort: string | null
          plz: string | null
          richtofferte: boolean | null
          sprache: string | null
          standort: string | null
          strasse: string | null
          suchtext: string | null
          telefon: string | null
          termin_am: string | null
          termin_person_name: string | null
          tour_person_id: string | null
          zur_offerte_am: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'verkaufschancen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'verkaufschancen_tour_person_id_fkey'
            columns: ['tour_person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      offerten_liste: {
        Row: {
          angebot_am: string | null
          angebot_am_frueher: string[] | null
          anzahl_module: number | null
          anzahl_versionen: number | null
          batterie: string | null
          betrag_rappen: number | null
          email: string | null
          entscheid: string | null
          entscheid_am: string | null
          erstellt_am: string | null
          eturnity_id: string | null
          faellig_am: string | null
          geaendert_am: string | null
          id: string | null
          im_eingang: boolean | null
          kontakt_id: string | null
          kundennummer: number | null
          leistung_kwp: number | null
          nachfassen_am: string | null
          name: string | null
          nummer: string | null
          objekt_id: string | null
          ort: string | null
          plz: string | null
          projekt_id: string | null
          projekt_nummer: string | null
          sprache: string | null
          stand: string | null
          standort: string | null
          standort_id: string | null
          status: string | null
          strasse: string | null
          suchtext: string | null
          telefon: string | null
          titel: string | null
          verantwortlich_id: string | null
          verantwortlich_name: string | null
          verkaufschance_id: string | null
          verlustgrund: string | null
          versionen: Json | null
          vertagt_grund: string | null
          wechselrichter: string | null
          werkvertrag_id: string | null
          werkvertrag_status: string | null
          wirtschaftlichkeit: Json | null
          zurueckgegeben: Json | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'offerten_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'offerten_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'objekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['objekt_id']
          },
          {
            foreignKeyName: 'offerten_standort_id_fkey'
            columns: ['standort_id']
            isOneToOne: false
            referencedRelation: 'standorte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_verantwortlich_id_fkey'
            columns: ['verantwortlich_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offerten_verkaufschance_id_fkey'
            columns: ['verkaufschance_id']
            isOneToOne: false
            referencedRelation: 'verkaufschancen'
            referencedColumns: ['id']
          },
        ]
      }
      preisliste: {
        Row: {
          archiv_grund: string | null
          archiviert_am: string | null
          archiviert_von: string | null
          artikelnummer: string | null
          datenblaetter: Json | null
          einheit: string | null
          ek_rappen: number | null
          ek_stand: string | null
          geaendert_am: string | null
          gewicht_kg: number | null
          hersteller_gruppe: string | null
          id: string | null
          kategorie: string | null
          leistung_w: number | null
          lieferant: string | null
          marge: number | null
          masse: string | null
          masse_art: string | null
          nachfolger_id: string | null
          name: string | null
          rabatt: number | null
          skonto: number | null
          suchtext: string | null
          vk_rappen: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'artikel_nachfolger_id_fkey'
            columns: ['nachfolger_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'artikel_nachfolger_id_fkey'
            columns: ['nachfolger_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
        ]
      }
      projekt_fahrplan: {
        Row: {
          ablauf_schritt_id: string | null
          auto: string | null
          automatisch: boolean | null
          bald: boolean | null
          bewilligung: boolean | null
          eigene_frist: string | null
          eingereicht_am: string | null
          elektriker: boolean | null
          erledigt_am: string | null
          frist: string | null
          gespeichert: string | null
          hinweis_de: string | null
          hinweis_fr: string | null
          name_de: string | null
          name_fr: string | null
          notiz: string | null
          pflicht: boolean | null
          phase: string | null
          projekt_id: string | null
          reihenfolge: number | null
          schluessel: string | null
          stand: string | null
          ueberfaellig: boolean | null
        }
        ComputedFields: never
        Relationships: []
      }
      projekt_material_stand: {
        Row: {
          artikel_id: string | null
          artikelnummer: string | null
          bezeichnung: string | null
          direkt_geliefert: number | null
          einheit: string | null
          entnommen: number | null
          fehlt: number | null
          frei_im_lager: number | null
          id: string | null
          kategorie: string | null
          menge: number | null
          notiz: string | null
          projekt_id: string | null
          quelle: string | null
          reihenfolge: number | null
          reserviert: number | null
          unterwegs: number | null
          vorhanden: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'projekt_material_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'artikel'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekt_material_artikel_id_fkey'
            columns: ['artikel_id']
            isOneToOne: false
            referencedRelation: 'preisliste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekt_material_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'projekt_material_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'projekt_material_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'projekt_material_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      projekt_stand: {
        Row: {
          bewilligungen_offen: number | null
          bewilligungen_spaet: number | null
          checkliste_erledigt: number | null
          checkliste_gesamt: number | null
          erledigt: number | null
          gesamt: number | null
          naechster: Json | null
          phasen: Json | null
          projekt_id: string | null
          spaet: boolean | null
        }
        ComputedFields: never
        Relationships: []
      }
      rapporte_liste: {
        Row: {
          abgeschlossen_am: string | null
          alt_daten: Json | null
          alt_id: string | null
          arbeiten: string | null
          art: string | null
          datum: string | null
          einsatz_id: string | null
          erstellt_am: string | null
          erstellt_von: string | null
          fotos: string[] | null
          fotos_anzahl: number | null
          geaendert_am: string | null
          geloescht_am: string | null
          id: string | null
          kunde: string | null
          material: Json | null
          montage_fertig: boolean | null
          nachtraege_anzahl: number | null
          notiz_intern: string | null
          nummer: string | null
          objekt_ort: string | null
          objekt_plz: string | null
          objekt_strasse: string | null
          person: string | null
          person_id: string | null
          projekt_id: string | null
          projekt_nummer: string | null
          pruefpunkte: Json | null
          service_fall_id: string | null
          service_nummer: string | null
          stunden: number | null
          team: string[] | null
          unterschrift_kunde: Json | null
          verrechnung: string | null
          wartungsvertrag_id: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'rapporte_einsatz_id_fkey'
            columns: ['einsatz_id']
            isOneToOne: false
            referencedRelation: 'einsaetze'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rapporte_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rapporte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rapporte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rapporte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rapporte_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rapporte_service_fall_id_fkey'
            columns: ['service_fall_id']
            isOneToOne: false
            referencedRelation: 'service_faelle'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rapporte_wartungsvertrag_id_fkey'
            columns: ['wartungsvertrag_id']
            isOneToOne: false
            referencedRelation: 'wartungsvertraege'
            referencedColumns: ['id']
          },
        ]
      }
      rechnungen_liste: {
        Row: {
          abaninja_abgeglichen_am: string | null
          abaninja_status: string | null
          abaninja_uuid: string | null
          art: string | null
          bezahlt_am: string | null
          bezahlt_rappen: number | null
          datum: string | null
          erstellt_am: string | null
          faellig_am: string | null
          firma: string | null
          firma_id: string | null
          gemahnt_am: string | null
          id: string | null
          inkl_mwst: boolean | null
          kontakt_id: string | null
          kunde: string | null
          kundennummer: number | null
          mahnfrist: string | null
          mahnstufe: number | null
          mwst_rappen: number | null
          netto_rappen: number | null
          nummer: string | null
          offen_rappen: number | null
          projekt_id: string | null
          projekt_nummer: string | null
          rapport_id: string | null
          sprache: string | null
          status: string | null
          titel: string | null
          total_rappen: number | null
          ueberfaellig: boolean | null
          wartungsvertrag_id: string | null
          zahlungsplan_id: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'rechnungen_firma_id_fkey'
            columns: ['firma_id']
            isOneToOne: false
            referencedRelation: 'firmen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'rechnungen_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'rechnungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rechnungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rechnungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'rechnungen_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'offene_service_rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_wartungsvertrag_id_fkey'
            columns: ['wartungsvertrag_id']
            isOneToOne: false
            referencedRelation: 'wartungsvertraege'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_zahlungsplan_id_fkey'
            columns: ['zahlungsplan_id']
            isOneToOne: false
            referencedRelation: 'offene_tranchen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rechnungen_zahlungsplan_id_fkey'
            columns: ['zahlungsplan_id']
            isOneToOne: false
            referencedRelation: 'zahlungsplan'
            referencedColumns: ['id']
          },
        ]
      }
      spesen_liste: {
        Row: {
          ausbezahlt_am: string | null
          ausbezahlt_von: string | null
          beleg_id: string | null
          beleg_name: string | null
          betrag_rappen: number | null
          datum: string | null
          erstellt_am: string | null
          id: string | null
          kategorie: string | null
          kuerzel: string | null
          notiz: string | null
          person: string | null
          person_id: string | null
          status: string | null
          storniert_am: string | null
          storniert_grund: string | null
          storniert_von: string | null
          zweck: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'spesen_beleg_id_fkey'
            columns: ['beleg_id']
            isOneToOne: false
            referencedRelation: 'dokumente'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spesen_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      verkauf_geschaefte: {
        Row: {
          angebot_am: string | null
          art: string | null
          baubeginn: string | null
          breite: number | null
          eingang_am: string | null
          email: string | null
          entscheid: string | null
          erreichbarkeit: string | null
          geaendert_am: string | null
          gruppe: string | null
          hoehe: number | null
          id: string | null
          interesse: string[] | null
          kanton: string | null
          kommentar_kunde: string | null
          kontakt_id: string | null
          kundennummer: number | null
          kwp: number | null
          laenge: number | null
          lage_genau: boolean | null
          lead_nummer: string | null
          letzter_kontakt: string | null
          nachfassen_am: string | null
          name: string | null
          objekt_id: string | null
          offerte_id: string | null
          offerte_nummer: string | null
          offerte_stand: string | null
          offerte_status: string | null
          ort: string | null
          person_id: string | null
          plz: string | null
          projekt_id: string | null
          projekt_nummer: string | null
          projekt_status: string | null
          quelle: string | null
          region_id: string | null
          sprache: string | null
          stand: string | null
          stand_datum: string | null
          stand_rang: number | null
          standort: string | null
          strasse: string | null
          stufe: string | null
          suchtext: string | null
          telefon: string | null
          telefon_ziffern: string | null
          termin_am: string | null
          termin_dauer_min: number | null
          termin_person_id: string | null
          verkaufschance_id: string | null
          verlustgrund: string | null
          vertagt_grund: string | null
          werbesperre: boolean | null
          wert_rappen: number | null
          wiedervorlage_am: string | null
          wiedervorlage_grund: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'verkaufschancen_tour_person_id_fkey'
            columns: ['termin_person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      werkvertraege_liste: {
        Row: {
          angebot_am: string | null
          anrede: string | null
          anzahl_module: number | null
          batterie: string | null
          baubeginn: string | null
          betrag_rappen: number | null
          email: string | null
          erstellt_datum: string | null
          firma_id: string | null
          firma_mwst_nr: string | null
          firma_name: string | null
          firma_ort: string | null
          firma_plz: string | null
          firma_strasse: string | null
          geaendert_am: string | null
          id: string | null
          kontakt_firma: string | null
          kontakt_id: string | null
          kontakt_ort: string | null
          kontakt_plz: string | null
          kontakt_strasse: string | null
          kundennummer: number | null
          leistung_kwp: number | null
          nachname: string | null
          name: string | null
          notiz: string | null
          nummer: string | null
          objekt_ort: string | null
          objekt_plz: string | null
          objekt_strasse: string | null
          offerte_id: string | null
          offerte_nummer: string | null
          offerte_rappen: number | null
          projekt_id: string | null
          projekt_nummer: string | null
          sprache: string | null
          standort: string | null
          status: string | null
          suchtext: string | null
          telefon: string | null
          titel: string | null
          unterschrieben_am: string | null
          versendet_am: string | null
          version: number | null
          vorname: string | null
          wechselrichter: string | null
          zahlungskonditionen: string | null
          zahlungsplan: Json | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'werkvertraege_firma_id_fkey'
            columns: ['firma_id']
            isOneToOne: false
            referencedRelation: 'firmen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kunden_uebersicht'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'marketing_zielgruppe'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'werkvertraege_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'verkauf_geschaefte'
            referencedColumns: ['kontakt_id']
          },
          {
            foreignKeyName: 'werkvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_eingang'
            referencedColumns: ['offerte_id']
          },
          {
            foreignKeyName: 'werkvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'werkvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'werkvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'werkvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'werkvertraege_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      zeiten_liste: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string | null
          erstellt_am: string | null
          erstellt_von: string | null
          exportiert_am: string | null
          freigegeben_am: string | null
          freigegeben_von: string | null
          geaendert_am: string | null
          geloescht_am: string | null
          id: string | null
          notiz: string | null
          pause_min: number | null
          person: string | null
          person_id: string | null
          person_kuerzel: string | null
          projekt_id: string | null
          projekt_nummer: string | null
          rapport_id: string | null
          rapport_nummer: string | null
          start: string | null
          stopp: string | null
          stunden: number | null
          taetigkeit: string | null
          tag: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'zeiten_freigegeben_von_fkey'
            columns: ['freigegeben_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_person_id_fkey'
            columns: ['person_id']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'offerten_liste'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zeiten_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_fahrplan'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zeiten_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekt_stand'
            referencedColumns: ['projekt_id']
          },
          {
            foreignKeyName: 'zeiten_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'offene_service_rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte_liste'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      abaninja_abgleich_anwenden: { Args: { p: Json }; Returns: Json }
      aendere_mein_konto: {
        Args: { p_darstellung?: string; p_profil: Json; p_sprache?: string; p_standort_id?: string }
        Returns: undefined
      }
      anfrage_uebernehmen: { Args: { p: Json }; Returns: Json }
      anfrage_uebersprungen: { Args: { p_kennung: string; p_quelle: string }; Returns: undefined }
      anschreiben_ablehnen: { Args: { p_grund: string; p_id: string }; Returns: undefined }
      anschreiben_aendern: { Args: { p_betreff: string; p_id: string; p_text: string }; Returns: undefined }
      anschreiben_antwort: { Args: { p_art: string; p_id: string }; Returns: undefined }
      anschreiben_bewilligen: { Args: { p_ids: string[] }; Returns: number }
      anschreiben_entwerfen: { Args: { p_art?: string; p_kontakt: string }; Returns: string }
      anschreiben_senden: { Args: { p_ids: string[] }; Returns: number }
      anschreiben_volltext: { Args: { p_id: string }; Returns: string }
      artikel_archivieren: { Args: { p_artikel: string; p_grund: string; p_nachfolger?: string }; Returns: undefined }
      artikel_preis_setzen: { Args: { p: Json; p_artikel: string }; Returns: undefined }
      auftrag_erstellen: { Args: { p: Json; p_offerte: string }; Returns: string }
      ausgang_aendern: { Args: { p: Json; p_id: string }; Returns: undefined }
      ausgang_anlegen: { Args: { p: Json }; Returns: string }
      ausgang_ergebnis: {
        Args: { p_extern_id: string; p_id: string; p_meldung: string; p_ok: boolean }
        Returns: undefined
      }
      ausgang_freigeben: { Args: { p_ids: string[] }; Returns: number }
      ausgang_holen: {
        Args: { p_limit?: number }
        Returns: {
          absender_person_id: string | null
          alt_daten: Json | null
          alt_id: string | null
          an: string
          anhaenge: NonNullable<Json>
          art: string
          automatisch: boolean
          betreff: string | null
          bezug_id: string | null
          bezug_tabelle: string | null
          cc: string | null
          erstellt_am: string
          erstellt_von: string | null
          extern_id: string | null
          fehler: string | null
          freigegeben_am: string | null
          freigegeben_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gesendet_am: string | null
          html: string | null
          id: string
          kanal: string
          ki_auftrag: Json | null
          ki_status: string | null
          kontakt_id: string | null
          offerte_id: string | null
          projekt_id: string | null
          schluessel: string | null
          sende_ab: string | null
          sprache: string
          status: string
          text: string | null
          verkaufschance_id: string | null
          versuche: number
          verworfen_grund: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'ausgangskorb'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ausgang_verwerfen: { Args: { p_grund: string; p_id: string }; Returns: undefined }
      ausschreibung_einlesen: { Args: { p: Json }; Returns: Json }
      ausschreibung_entscheiden: { Args: { p_angaben?: Json; p_entscheid: string; p_id: string }; Returns: string }
      ausschreibung_erfassen: { Args: { p: Json }; Returns: string }
      ausschreibungen_entscheiden: { Args: { p_angaben?: Json; p_entscheid: string; p_ids: string[] }; Returns: number }
      ausschreibungen_pruefen: { Args: Record<PropertyKey, never>; Returns: Json }
      ausschreibungen_tagesbericht: { Args: Record<PropertyKey, never>; Returns: Json }
      ausschreibungen_trichter: {
        Args: { p_bis: string; p_von: string }
        Returns: {
          antwort: number
          bearbeitet: number
          erfolg: number
          gefunden: number
          kanton: string
          quelle: string
          relevant: number
        }[]
      }
      automation_katalog: { Args: Record<PropertyKey, never>; Returns: Json }
      automation_lauf_abbrechen: { Args: { p_lauf: string }; Returns: boolean }
      automation_server_ergebnis: {
        Args: {
          p_ergebnis: string
          p_lauf: string
          p_meldung: string
          p_schritt: number
          p_werte?: Json
          p_ziel?: string
        }
        Returns: undefined
      }
      automation_server_offen: { Args: { p_limit?: number }; Returns: Json }
      automationen_abarbeiten: { Args: { p_limit?: number }; Returns: Json }
      benachrichtigung_ausblenden: { Args: { p_id: string }; Returns: undefined }
      benachrichtigungen_gelesen: { Args: { p_ids?: string[] }; Returns: number }
      bestellung_bestellt: { Args: { p_datum?: string; p_id: string }; Returns: undefined }
      bestellung_freigeben: { Args: { p_id: string }; Returns: undefined }
      bestellung_stornieren: { Args: { p_grund: string; p_id: string }; Returns: undefined }
      bestellung_zuruecknehmen: { Args: { p_id: string }; Returns: undefined }
      bestellvorschlag: { Args: { p_projekt: string }; Returns: Json }
      betrieb_stand: { Args: Record<PropertyKey, never>; Returns: Json }
      dossier_kontakt_speichern: { Args: { p: Json }; Returns: string }
      eturnity_zuordnen: { Args: { p_eingang: string; p_offerte: string }; Returns: undefined }
      gesundheit: { Args: Record<PropertyKey, never>; Returns: Json }
      handbuch_entfernen: { Args: { p_id: string }; Returns: undefined }
      handbuch_speichern: {
        Args: {
          p_art: string
          p_beschreibung_de: string
          p_beschreibung_fr: string
          p_datei_de_id: string
          p_datei_fr_id: string
          p_datum: string
          p_dauer_s?: number
          p_id: string
          p_reihenfolge?: number
          p_sprache?: string
          p_titel_de: string
          p_titel_fr: string
          p_version: string
          p_vorschaubild_id?: string
        }
        Returns: string
      }
      heute_fuer_mich: { Args: Record<PropertyKey, never>; Returns: Json }
      integration_geprueft: { Args: { p_dienst: string; p_meldung: string; p_ok: boolean }; Returns: undefined }
      kalender_abgleichen: {
        Args: { p_bis: string; p_eintraege: Json; p_person: string; p_von: string }
        Returns: number
      }
      kalender_ersetzen: { Args: { p_eintraege: Json; p_person: string; p_quelle: string }; Returns: number }
      kennzahlen_betrieb: { Args: { p_bis: string; p_von: string }; Returns: Json }
      kennzahlen_fakten: {
        Args: { p_bis: string; p_von: string }
        Returns: {
          art: string
          betrag_rappen: number
          datum: string
          id: string
          name: string
          nummer: string
          ort: string
          person_id: string
          quelle: string
          schluessel: string
          stand: string
          standort: string
        }[]
      }
      kennzahlen_quellen_kosten: { Args: { p_quelle: string; p_rappen: number }; Returns: undefined }
      ki_briefing_daten: { Args: Record<PropertyKey, never>; Returns: Json }
      ki_budget: { Args: { p_person: string }; Returns: Json }
      ki_entwuerfe_offen: { Args: { p_limit?: number }; Returns: Json }
      ki_entwurf_einsetzen: {
        Args: { p_betreff: string; p_id: string; p_meldung?: string; p_ok: boolean; p_text: string; p_vorher: string }
        Returns: string
      }
      ki_kontext: { Args: { p_id: string; p_tabelle: string }; Returns: Json }
      ki_kosten: { Args: { p_bis: string; p_von: string }; Returns: Json }
      ki_lead_statistik: { Args: { p_lead: string }; Returns: Json }
      ki_mein_budget: { Args: Record<PropertyKey, never>; Returns: Json }
      ki_zuordnung: {
        Args: { p_email: string; p_nachname: string; p_plz: string; p_telefon: string; p_vorname: string }
        Returns: Json
      }
      kontakt_export: { Args: { p_kontakt: string }; Returns: Json }
      kontaktsperre_anlegen: {
        Args: { p_art: string; p_bis?: string; p_grund: string; p_wert: string }
        Returns: string
      }
      kontaktsperre_aufheben: { Args: { p_id: string }; Returns: undefined }
      kunden_zeitachse: {
        Args: { p_kontakt: string }
        Returns: {
          art: string
          bezug_id: string
          bezug_tabelle: string
          daten: Json
          text: string
          wer: string
          zeitpunkt: string
        }[]
      }
      kundenstand: {
        Args: { p_kontakt: string }
        Returns: {
          bezug_id: string
          bezug_tabelle: string
          stand: string
          stand_datum: string
        }[]
      }
      lager_buchen: { Args: { p: Json }; Returns: undefined }
      lager_nachbestellen: { Args: { p_lagerort: string }; Returns: Json }
      lead_anlegen: { Args: { p: Json }; Returns: string }
      lead_kontakt_erfassen: {
        Args: {
          p_angaben?: Json
          p_art: string
          p_ergebnis?: string
          p_richtung?: string
          p_text?: string
          p_verkaufschance: string
        }
        Returns: string
      }
      lead_monatsbericht: {
        Args: { p_monat: string }
        Returns: {
          erhalten: number
          gruende: Json
          in_bearbeitung: number
          kein_interesse: number
          leads: Json
          offeriert: number
          quelle: string
          termin: number
        }[]
      }
      mails_vermerken: { Args: { p_mails: Json; p_person: string }; Returns: number }
      marketing_abmelden: { Args: { p_schluessel: string }; Returns: string }
      marketing_einwilligung: { Args: { p_datum: string; p_kontakt: string; p_quelle: string }; Returns: undefined }
      marketing_senden: { Args: { p: Json }; Returns: Json }
      marketing_sperre: { Args: { p_grund?: string; p_kontakt: string; p_sperre: boolean }; Returns: undefined }
      marketing_vermerken: {
        Args: { p_art: string; p_betreff: string; p_details?: Json; p_kontakte: string[] }
        Returns: string
      }
      mein_tag: { Args: { p_bis: string; p_person?: string; p_von: string }; Returns: Json }
      meine_anmeldung: { Args: Record<PropertyKey, never>; Returns: Json }
      meine_microsoft_verbindung: { Args: Record<PropertyKey, never>; Returns: Json }
      messe_geloescht: { Args: { p_kennung: string; p_sids: string[] }; Returns: number }
      microsoft_verbindungen: {
        Args: Record<PropertyKey, never>
        Returns: {
          fehler: string
          genutzt_am: string
          konto: string
          name: string
          person_id: string
          verbunden: boolean
          verbunden_am: string
        }[]
      }
      moegliche_dubletten: {
        Args: { p_email: string; p_name: string; p_ohne?: string; p_telefon: string }
        Returns: {
          grund: string
          id: string
          kundennummer: number
          name: string
          ort: string
        }[]
      }
      ms_verbindung_genutzt: { Args: { p_fehler: string; p_person: string; p_token: string }; Returns: undefined }
      ms_verbindung_lesen: {
        Args: { p_person: string }
        Returns: {
          konto: string
          token: string
        }[]
      }
      ms_verbindung_speichern: {
        Args: { p_bereiche: string; p_konto: string; p_person: string; p_token: string }
        Returns: undefined
      }
      ms_verbundene: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          konto: string
          person_id: string
        }[]
      }
      ms_zustand_anlegen: {
        Args: { p_person: string; p_pruefwert: string; p_sprache: string; p_zustand: string }
        Returns: undefined
      }
      ms_zustand_einloesen: {
        Args: { p_zustand: string }
        Returns: {
          email: string
          person_id: string
          pruefwert: string
          sprache: string
        }[]
      }
      mwst_satz: { Args: Record<PropertyKey, never>; Returns: number }
      nachkalkulation: { Args: { p_projekt: string }; Returns: Json }
      nachtrag_speichern: { Args: { p: Json }; Returns: string }
      nachtrag_status: { Args: { p_grund?: string; p_id: string; p_status: string }; Returns: undefined }
      newsletter_empfaenger_fuer: {
        Args: { p_newsletter: string }
        Returns: {
          abmelde_schluessel: string
          anrede: string
          email: string
          empfaenger_id: string
          erhalten: boolean
          firma: string
          kontakt_id: string
          nachname: string
          name: string
          sprache: string
          versandgrund: string
          vorname: string
        }[]
      }
      offerte_anlegen: { Args: { p: Json }; Returns: string }
      offerte_entscheiden: { Args: { p_angaben?: Json; p_offerte: string; p_ziel: string }; Returns: string }
      offerte_status_setzen: { Args: { p_angaben?: Json; p_status: string; p_verkaufschance: string }; Returns: string }
      offerte_version_entfernen: { Args: { p_offerte: string }; Returns: number }
      offerte_version_erfassen: { Args: { p: Json; p_offerte: string }; Returns: number }
      offerte_werte_setzen: {
        Args: { p: Json; p_nur_leere?: boolean; p_offerte: string; p_quelle: string }
        Returns: undefined
      }
      offerte_zurueck: { Args: { p_grund: string; p_offerte: string; p_ziel: string }; Returns: undefined }
      plz_auskunft: {
        Args: { p_plz: string }
        Returns: {
          breite: number
          hoehe: number
          kanton: string
          laenge: number
          ort: string
          plz: string
          sprache: string
          standort: string
        }[]
      }
      preise_importieren: { Args: { p_pruefen?: boolean; p_zeilen: Json }; Returns: Json }
      projekt_bau_planen: { Args: { p?: Json; p_id: string }; Returns: string }
      projekt_bau_rueckgaengig: { Args: { p_id: string }; Returns: undefined }
      projekt_bau_zuruecknehmen: { Args: { p_id: string }; Returns: undefined }
      projekt_material_vorschlagen: { Args: { p_projekt: string }; Returns: number }
      projekt_schritt_setzen: { Args: { p: Json; p_projekt: string; p_schluessel: string }; Returns: undefined }
      projekt_zeitplan_speichern: { Args: { p: Json; p_id: string }; Returns: undefined }
      quellen_lauf: {
        Args: {
          p_aktualisiert: number
          p_beginn?: string
          p_gelesen: number
          p_meldung: string
          p_neu: number
          p_ok: boolean
          p_quelle: string
        }
        Returns: undefined
      }
      rapport_abschliessen: { Args: { p?: Json; p_id: string }; Returns: undefined }
      rapport_oeffnen: { Args: { p_id: string }; Returns: undefined }
      rapport_speichern: { Args: { p: Json }; Returns: string }
      rechnung_entwurf: { Args: { p: Json }; Returns: string }
      rechnung_mahnen: { Args: { p_id: string }; Returns: number }
      rechnung_speichern: { Args: { p: Json; p_id: string }; Returns: undefined }
      rechnung_stellen: { Args: { p_datum?: string; p_id: string }; Returns: string }
      rechnung_stornieren: { Args: { p_grund: string; p_id: string }; Returns: undefined }
      rueckmeldung_beantworten: { Args: { p_antwort: string; p_id: string; p_status: string }; Returns: undefined }
      rueckmeldung_melden: {
        Args: {
          p_bereich: string
          p_erwartet: string
          p_prio: string
          p_text: string
          p_titel: string
          p_umgebung: string
        }
        Returns: Json
      }
      runde_5_rappen: { Args: { p_rappen: number }; Returns: number }
      service_notiz: { Args: { p_id: string; p_text: string }; Returns: undefined }
      setze_naechste_kundennummer: { Args: { p_naechste: number }; Returns: undefined }
      setze_stand: { Args: { p_angaben?: Json; p_geschaeft: string; p_ziel: string }; Returns: string }
      show_limit: { Args: Record<PropertyKey, never>; Returns: number }
      show_trgm: { Args: { '': string }; Returns: string[] }
      sicherung_abschliessen: {
        Args: { p_anzahl?: Json; p_bytes?: number; p_fehler?: string; p_id: string; p_ok: boolean; p_pfad?: string }
        Returns: undefined
      }
      sicherung_aufraeumen: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          pfad: string
        }[]
      }
      sicherung_beginnen: { Args: { p_art: string; p_person?: string; p_slot: string }; Returns: string }
      sicherung_einspielen: { Args: { p_lauf: string }; Returns: Json }
      sicherung_faellig: { Args: { p_jetzt?: string }; Returns: string }
      sicherung_offen: {
        Args: { p_ids?: string[]; p_limit?: number }
        Returns: {
          id: string
          kontakt_id: string
          kunde: string
          kundennummer: number
          name: string
          ordner: string
          speicher_pfad: string
        }[]
      }
      sicherung_puffern: {
        Args: { p_lauf: string; p_tabelle: string; p_teil: number; p_zeilen: Json }
        Returns: undefined
      }
      sicherung_sharepoint: { Args: { p_id: string; p_stand: Json }; Returns: undefined }
      sicherung_tabelle: { Args: { p_tabelle: string }; Returns: Json }
      sicherung_tabellen: {
        Args: Record<PropertyKey, never>
        Returns: {
          stufe: number
          tabelle: string
        }[]
      }
      sicherung_wiederhergestellt: { Args: { p_anzahl: Json; p_id: string; p_person: string }; Returns: undefined }
      sms_erinnerungen: {
        Args: { p_datum: string }
        Returns: {
          ausgang_fehler: string
          ausgang_id: string
          ausgang_status: string
          handy: boolean
          kontakt_id: string
          name: string
          schluessel: string
          sprache: string
          telefon: string
          termin_am: string
          text: string
          verkaufschance_id: string
        }[]
      }
      sms_erinnerungen_senden: {
        Args: { p_automatisch?: boolean; p_datum: string; p_leads?: string[] }
        Returns: number
      }
      social_beanspruchen: {
        Args: { p_id?: string; p_limit?: number }
        Returns: {
          alt_daten: Json | null
          alt_id: string | null
          bilder: NonNullable<Json>
          datum: string | null
          details: NonNullable<Json>
          ergebnis: NonNullable<Json>
          erstellt_am: string
          erstellt_von: string | null
          format: string | null
          freigegeben_am: string | null
          freigegeben_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          geplant_am: string | null
          id: string
          idee: string | null
          netzwerke: string[]
          sprache: string | null
          status: string
          texte: NonNullable<Json>
          thema: string | null
          verfasst_von: string | null
          veroeffentlicht_am: string | null
          zeit: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'social_posts'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      social_ergebnis: { Args: { p_ergebnis: Json; p_id: string }; Returns: undefined }
      social_erledigt: { Args: { p_id: string }; Returns: undefined }
      social_freigeben: { Args: { p_id: string; p_zeitpunkt?: string }; Returns: undefined }
      social_konto_genutzt: {
        Args: { p_ablauf: string; p_dienst: string; p_fehler: string; p_refresh: string; p_token: string }
        Returns: undefined
      }
      social_konto_lesen: {
        Args: { p_dienst: string }
        Returns: {
          ablauf: string
          konto: Json
          name: string
          refresh: string
          token: string
        }[]
      }
      social_konto_speichern: {
        Args: {
          p_ablauf: string
          p_dienst: string
          p_konto: Json
          p_name: string
          p_person: string
          p_refresh: string
          p_token: string
        }
        Returns: undefined
      }
      social_verbindungen: {
        Args: Record<PropertyKey, never>
        Returns: {
          ablauf: string
          dienst: string
          fehler: string
          name: string
          verbunden: boolean
          verbunden_am: string
          von: string
        }[]
      }
      social_zurueckziehen: { Args: { p_id: string }; Returns: undefined }
      social_zustand_anlegen: {
        Args: { p_dienst: string; p_person: string; p_pruefwert: string; p_sprache: string; p_zustand: string }
        Returns: undefined
      }
      social_zustand_einloesen: {
        Args: { p_zustand: string }
        Returns: {
          dienst: string
          person_id: string
          pruefwert: string
          sprache: string
        }[]
      }
      spesen_auszahlen: { Args: { p_datum?: string; p_ids: string[] }; Returns: number }
      spesen_stornieren: { Args: { p_grund: string; p_id: string }; Returns: undefined }
      standort_fuer_plz: { Args: { p_plz: string }; Returns: string }
      termin_vermerken: { Args: { p_person: string; p_text: string; p_verkaufschance: string }; Returns: undefined }
      vk_aus_ek: { Args: { p_ek: number; p_marge: number; p_skonto: number }; Returns: number }
      wareneingang_buchen: { Args: { p: Json; p_id: string }; Returns: string }
      wartung_erledigt: { Args: { p_am?: string; p_id: string; p_notiz?: string }; Returns: string }
      werkvertrag_status: { Args: { p?: Json; p_id: string; p_ziel: string }; Returns: undefined }
      zahlungsplan_berechnen: {
        Args: { p_baubeginn?: string; p_kondition: string; p_sprache: string; p_unterzeichnet: string; p_wert: number }
        Returns: {
          betrag_rappen: number
          bezeichnung: string
          faellig_am: string
          nr: number
        }[]
      }
      zeit_speichern: { Args: { p: Json }; Returns: string }
      zeit_starten: { Args: { p: Json }; Returns: string }
      zeit_stoppen: { Args: { p: Json }; Returns: undefined }
      zeiten_exportieren: { Args: { p_ids: string[] }; Returns: string }
      zeiten_pruefen: { Args: { p_ids: string[] }; Returns: number }
      zeitplan_ergebnis: { Args: { p_job: string; p_meldung: string; p_ok: boolean }; Returns: undefined }
      zeitplan_faellig: { Args: { p_job: string; p_minuten: number }; Returns: boolean }
      zeitplan_laeufe: {
        Args: Record<PropertyKey, never>
        Returns: {
          job: string
          meldung: string
          ok: boolean
          zuletzt_am: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
