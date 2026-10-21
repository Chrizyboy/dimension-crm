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
          erstellt_am: string
          erstellt_von: string | null
          frist_tage: number | null
          geaendert_am: string
          geloescht_am: string | null
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
          erstellt_am?: string
          erstellt_von?: string | null
          frist_tage?: number | null
          geaendert_am?: string
          geloescht_am?: string | null
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
          erstellt_am?: string
          erstellt_von?: string | null
          frist_tage?: number | null
          geaendert_am?: string
          geloescht_am?: string | null
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
            foreignKeyName: 'aktivitaeten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'aktivitaeten_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
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
            referencedRelation: 'projekte'
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
          objekt_id?: string
          projekt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'anlagen_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'objekte'
            referencedColumns: ['id']
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
          person_id: string | null
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
          person_id?: string | null
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
          person_id?: string | null
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
          alt_daten: Json | null
          alt_id: string | null
          an: string
          betreff: string | null
          bezug_id: string | null
          bezug_tabelle: string | null
          erstellt_am: string
          erstellt_von: string | null
          freigegeben_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gesendet_am: string | null
          html: string | null
          id: string
          kanal: string
          status: string
          text: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          an: string
          betreff?: string | null
          bezug_id?: string | null
          bezug_tabelle?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gesendet_am?: string | null
          html?: string | null
          id?: string
          kanal?: string
          status?: string
          text?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          an?: string
          betreff?: string | null
          bezug_id?: string | null
          bezug_tabelle?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          freigegeben_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gesendet_am?: string | null
          html?: string | null
          id?: string
          kanal?: string
          status?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ausgangskorb_freigegeben_von_fkey'
            columns: ['freigegeben_von']
            isOneToOne: false
            referencedRelation: 'personen'
            referencedColumns: ['id']
          },
        ]
      }
      ausschreibungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          art: string
          beschreibung: string | null
          entscheid_am: string | null
          entscheid_von: string | null
          erstellt_am: string
          erstellt_von: string | null
          fahrzeit_min: number | null
          frist: string | null
          geaendert_am: string
          geloescht_am: string | null
          gemeinde: string | null
          id: string
          kanton: string | null
          kontaktsperre_bis: string | null
          offerte_id: string | null
          prioritaet: string | null
          publiziert_am: string | null
          quell_id: string | null
          quell_url: string | null
          quelle: string
          rohdaten: Json | null
          spur: string
          status: string
          titel: string
          vergabestelle: string | null
          verkaufschance_id: string | null
          wiedervorlage_am: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          art: string
          beschreibung?: string | null
          entscheid_am?: string | null
          entscheid_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          fahrzeit_min?: number | null
          frist?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gemeinde?: string | null
          id?: string
          kanton?: string | null
          kontaktsperre_bis?: string | null
          offerte_id?: string | null
          prioritaet?: string | null
          publiziert_am?: string | null
          quell_id?: string | null
          quell_url?: string | null
          quelle: string
          rohdaten?: Json | null
          spur: string
          status?: string
          titel: string
          vergabestelle?: string | null
          verkaufschance_id?: string | null
          wiedervorlage_am?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          art?: string
          beschreibung?: string | null
          entscheid_am?: string | null
          entscheid_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          fahrzeit_min?: number | null
          frist?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gemeinde?: string | null
          id?: string
          kanton?: string | null
          kontaktsperre_bis?: string | null
          offerte_id?: string | null
          prioritaet?: string | null
          publiziert_am?: string | null
          quell_id?: string | null
          quell_url?: string | null
          quelle?: string
          rohdaten?: Json | null
          spur?: string
          status?: string
          titel?: string
          vergabestelle?: string | null
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
            foreignKeyName: 'ausschreibungen_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
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
      bestellpositionen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          artikel_id: string | null
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
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id?: string | null
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
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          artikel_id?: string | null
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
            foreignKeyName: 'bestellpositionen_bestellung_id_fkey'
            columns: ['bestellung_id']
            isOneToOne: false
            referencedRelation: 'bestellungen'
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
          geloescht_am: string | null
          id: string
          lagerort_id: string | null
          lieferant_id: string
          liefertermin: string | null
          notiz: string | null
          nummer: string
          projekt_id: string | null
          status: string
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
          geloescht_am?: string | null
          id?: string
          lagerort_id?: string | null
          lieferant_id: string
          liefertermin?: string | null
          notiz?: string | null
          nummer: string
          projekt_id?: string | null
          status?: string
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
          geloescht_am?: string | null
          id?: string
          lagerort_id?: string | null
          lieferant_id?: string
          liefertermin?: string | null
          notiz?: string | null
          nummer?: string
          projekt_id?: string | null
          status?: string
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
          projekt_id: string
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
          projekt_id: string
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
          projekt_id?: string
          team?: string[]
          von?: string
        }
        Relationships: [
          {
            foreignKeyName: 'einsaetze_projekt_id_fkey'
            columns: ['projekt_id']
            isOneToOne: false
            referencedRelation: 'projekte'
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
            referencedRelation: 'projekte'
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
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kuerzel: string
          mwst_nr: string | null
          name: string
          ort: string | null
          plz: string | null
          sprache: string
          strasse: string | null
          uid_nr: string | null
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
          kuerzel: string
          mwst_nr?: string | null
          name: string
          ort?: string | null
          plz?: string | null
          sprache: string
          strasse?: string | null
          uid_nr?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kuerzel?: string
          mwst_nr?: string | null
          name?: string
          ort?: string | null
          plz?: string | null
          sprache?: string
          strasse?: string | null
          uid_nr?: string | null
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
      kalkulationen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
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
          leistung_kwp?: number | null
          netto_rappen?: number | null
          notiz?: string | null
          offerte_id?: string | null
          positionen?: NonNullable<Json>
          rabatt?: number | null
          titel?: string | null
          total_rappen?: number | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: 'kalkulationen_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
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
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          kontakte: string[]
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
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakte?: string[]
          versendet_am?: string | null
          versendet_von?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          anzahl?: number | null
          art?: string
          betreff?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          kontakte?: string[]
          versendet_am?: string | null
          versendet_von?: string | null
        }
        Relationships: []
      }
      kontakte: {
        Row: {
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
      kreditor_zahlungen: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          betrag_rappen: number | null
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
          monat: string | null
          notiz: string | null
          prioritaet: string | null
          quelle: string | null
          rechnung_am: string | null
          rechnung_nr: string | null
          status: string
          text: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number | null
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
          monat?: string | null
          notiz?: string | null
          prioritaet?: string | null
          quelle?: string | null
          rechnung_am?: string | null
          rechnung_nr?: string | null
          status?: string
          text?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number | null
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
          monat?: string | null
          notiz?: string | null
          prioritaet?: string | null
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
            foreignKeyName: 'lagerbewegungen_bestellung_id_fkey'
            columns: ['bestellung_id']
            isOneToOne: false
            referencedRelation: 'bestellungen'
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
        }
        Relationships: [
          {
            foreignKeyName: 'lieferanten_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
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
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      nachtraege: {
        Row: {
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
          projekt_id: string
          rapport_id: string | null
          status: string
        }
        ComputedFields: never
        Insert: {
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
          projekt_id: string
          rapport_id?: string | null
          status?: string
        }
        Update: {
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
          projekt_id?: string
          rapport_id?: string | null
          status?: string
        }
        Relationships: [
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
            referencedRelation: 'rapporte'
            referencedColumns: ['id']
          },
        ]
      }
      newsletter: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
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
          segment?: Json | null
          status?: string
          text_de?: string | null
          text_fr?: string | null
          thema: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
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
        }
        Relationships: []
      }
      newsletter_empfaenger: {
        Row: {
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
          status: string
          titel: string | null
          verantwortlich_id: string | null
          verkaufschance_id: string | null
          versionen: NonNullable<Json>
          vertagt_grund: string | null
          wechselrichter: string | null
          zurueckgegeben: Json | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          angebot_am?: string | null
          angebot_am_frueher?: string[] | null
          anzahl_module?: number | null
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
          status?: string
          titel?: string | null
          verantwortlich_id?: string | null
          verkaufschance_id?: string | null
          versionen?: NonNullable<Json>
          vertagt_grund?: string | null
          wechselrichter?: string | null
          zurueckgegeben?: Json | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          angebot_am?: string | null
          angebot_am_frueher?: string[] | null
          anzahl_module?: number | null
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
          status?: string
          titel?: string | null
          verantwortlich_id?: string | null
          verkaufschance_id?: string | null
          versionen?: NonNullable<Json>
          vertagt_grund?: string | null
          wechselrichter?: string | null
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
            foreignKeyName: 'offerten_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'objekte'
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
      projekt_schritte: {
        Row: {
          ablauf_schritt_id: string | null
          alt_daten: Json | null
          alt_id: string | null
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
            foreignKeyName: 'projekte_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'objekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projekte_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
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
            referencedRelation: 'verkaufschancen'
            referencedColumns: ['id']
          },
        ]
      }
      rapporte: {
        Row: {
          abgeschlossen_am: string | null
          alt_daten: Json | null
          alt_id: string | null
          arbeiten: string | null
          art: string
          datum: string
          erstellt_am: string
          erstellt_von: string | null
          fotos: string[]
          geaendert_am: string
          geloescht_am: string | null
          id: string
          material: NonNullable<Json>
          person_id: string | null
          projekt_id: string | null
          service_fall_id: string | null
          team: string[]
          unterschrift_kunde: Json | null
        }
        ComputedFields: never
        Insert: {
          abgeschlossen_am?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          arbeiten?: string | null
          art?: string
          datum: string
          erstellt_am?: string
          erstellt_von?: string | null
          fotos?: string[]
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          material?: NonNullable<Json>
          person_id?: string | null
          projekt_id?: string | null
          service_fall_id?: string | null
          team?: string[]
          unterschrift_kunde?: Json | null
        }
        Update: {
          abgeschlossen_am?: string | null
          alt_daten?: Json | null
          alt_id?: string | null
          arbeiten?: string | null
          art?: string
          datum?: string
          erstellt_am?: string
          erstellt_von?: string | null
          fotos?: string[]
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          material?: NonNullable<Json>
          person_id?: string | null
          projekt_id?: string | null
          service_fall_id?: string | null
          team?: string[]
          unterschrift_kunde?: Json | null
        }
        Relationships: [
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
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          status: string
          text: string
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          antwort?: string | null
          antwort_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          status?: string
          text: string
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          antwort?: string | null
          antwort_von?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          status?: string
          text?: string
        }
        Relationships: []
      }
      schreibstile: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
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
          erstellt_am: string
          erstellt_von: string | null
          format: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          idee: string | null
          netzwerke: string[]
          sprache: string | null
          status: string
          texte: NonNullable<Json>
          thema: string | null
          verfasst_von: string | null
          zeit: string | null
        }
        ComputedFields: never
        Insert: {
          alt_daten?: Json | null
          alt_id?: string | null
          bilder?: NonNullable<Json>
          datum?: string | null
          details?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          format?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          idee?: string | null
          netzwerke?: string[]
          sprache?: string | null
          status?: string
          texte?: NonNullable<Json>
          thema?: string | null
          verfasst_von?: string | null
          zeit?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          bilder?: NonNullable<Json>
          datum?: string | null
          details?: NonNullable<Json>
          erstellt_am?: string
          erstellt_von?: string | null
          format?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          idee?: string | null
          netzwerke?: string[]
          sprache?: string | null
          status?: string
          texte?: NonNullable<Json>
          thema?: string | null
          verfasst_von?: string | null
          zeit?: string | null
        }
        Relationships: []
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
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          gewerk: string | null
          id: string
          kontakt_id: string | null
          name: string
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
          gewerk?: string | null
          id?: string
          kontakt_id?: string | null
          name: string
        }
        Update: {
          aktiv?: boolean
          alt_daten?: Json | null
          alt_id?: string | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          gewerk?: string | null
          id?: string
          kontakt_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subunternehmer_kontakt_id_fkey'
            columns: ['kontakt_id']
            isOneToOne: false
            referencedRelation: 'kontakte'
            referencedColumns: ['id']
          },
        ]
      }
      subunternehmer_auftraege: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          betrag_rappen: number | null
          erstellt_am: string
          erstellt_von: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
          leistung: string
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
          betrag_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          leistung: string
          projekt_id: string
          status?: string
          subunternehmer_id: string
          termin_bis?: string | null
          termin_von?: string | null
        }
        Update: {
          alt_daten?: Json | null
          alt_id?: string | null
          betrag_rappen?: number | null
          erstellt_am?: string
          erstellt_von?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
          leistung?: string
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
          nummer: string
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
            foreignKeyName: 'verkaufschancen_objekt_id_fkey'
            columns: ['objekt_id']
            isOneToOne: false
            referencedRelation: 'objekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verkaufschancen_region_id_fkey'
            columns: ['region_id']
            isOneToOne: false
            referencedRelation: 'regionen'
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
          leistungen: NonNullable<Json>
          letzte_wartung: string | null
          naechste_wartung: string | null
          offerte_id: string | null
          preis_rappen: number | null
          rhythmus_monate: number | null
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
          leistungen?: NonNullable<Json>
          letzte_wartung?: string | null
          naechste_wartung?: string | null
          offerte_id?: string | null
          preis_rappen?: number | null
          rhythmus_monate?: number | null
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
          leistungen?: NonNullable<Json>
          letzte_wartung?: string | null
          naechste_wartung?: string | null
          offerte_id?: string | null
          preis_rappen?: number | null
          rhythmus_monate?: number | null
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
            foreignKeyName: 'wartungsvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
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
            foreignKeyName: 'werkvertraege_offerte_id_fkey'
            columns: ['offerte_id']
            isOneToOne: false
            referencedRelation: 'offerten'
            referencedColumns: ['id']
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
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
        ]
      }
      zeiten: {
        Row: {
          alt_daten: Json | null
          alt_id: string | null
          erstellt_am: string
          erstellt_von: string | null
          exportiert_am: string | null
          geaendert_am: string
          geloescht_am: string | null
          id: string
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
          erstellt_am?: string
          erstellt_von?: string | null
          exportiert_am?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
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
          erstellt_am?: string
          erstellt_von?: string | null
          exportiert_am?: string | null
          geaendert_am?: string
          geloescht_am?: string | null
          id?: string
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
            referencedRelation: 'projekte'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'zeiten_rapport_id_fkey'
            columns: ['rapport_id']
            isOneToOne: false
            referencedRelation: 'rapporte'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aendere_mein_konto: {
        Args: { p_darstellung?: string; p_profil: Json; p_sprache?: string; p_standort_id?: string }
        Returns: undefined
      }
      gesundheit: { Args: Record<PropertyKey, never>; Returns: Json }
      meine_anmeldung: { Args: Record<PropertyKey, never>; Returns: Json }
      setze_naechste_kundennummer: { Args: { p_naechste: number }; Returns: undefined }
      show_limit: { Args: Record<PropertyKey, never>; Returns: number }
      show_trgm: { Args: { '': string }; Returns: string[] }
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
