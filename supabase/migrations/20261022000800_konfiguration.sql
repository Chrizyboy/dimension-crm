-- Phase 3, Teil 8: Konfiguration als Daten (CLAUDE.md Regel 8). Kein Kunden- oder Testdatensatz.
-- eigenschaften.vorlage listet die Texte aus V233, damit der Import alte Werte eindeutig zuordnet.

insert into public.firmen (kuerzel, name, strasse, plz, ort, sprache) values
  ('gmbh', 'Dimension Solaire GmbH', 'Luzernerstrasse 35', '5630', 'Muri AG', 'de'),
  ('sarl', 'Dimension Solaire Sàrl', 'Chemin des Crêts 4', '1630', 'Bulle', 'fr');

insert into public.standorte (kuerzel, name, firma_id, strasse, plz, ort)
select 'muri', 'Muri', id, 'Luzernerstrasse 35', '5630', 'Muri AG' from public.firmen where kuerzel = 'gmbh'
union all
select 'bulle', 'Bulle', id, 'Chemin des Crêts 4', '1630', 'Bulle' from public.firmen where kuerzel = 'sarl';

-- Eigenes Lager nur in Bulle (Chris, 21.10.2026). Dépôt gemäss Signatur.
insert into public.lagerorte (standort_id, name, adresse)
select id, 'Lager Bulle', 'Rue de la Léchère 5a, 1630 Bulle' from public.standorte where kuerzel = 'bulle';

-- Touren aus der Vorlage. Standort-Zuordnung und PLZ-Regeln pflegt Chris in Phase 6.
insert into public.regionen (nummer, name) values
  (1, 'Kanton Zug'),
  (2, 'Emmental / Bern-Ost'),
  (3, 'Thunersee / Berner Oberland Nord'),
  (4, 'Simmental'),
  (5, 'Saanenland / Oberes Simmental'),
  (6, 'Luzern / Entlebuch'),
  (7, 'Fribourg / Broye / Vaud / Solothurn / Bielersee'),
  (8, 'Zürichsee / Kanton Zürich'),
  (9, 'Basel');

insert into public.auswahlwerte (liste, schluessel, text_de, text_fr, reihenfolge, farbe, eigenschaften) values
  ('verkaufsstufe', 'neu', 'Neu', 'Nouveau', 10, 'info', '{"vorlage": ["Neu"]}'),
  ('verkaufsstufe', 'offen', 'Offen', 'Ouvert', 20, 'info', '{"vorlage": ["Offen"]}'),
  ('verkaufsstufe', 'termin_vereinbart', 'Termin vereinbart', 'Rendez-vous fixé', 30, 'info', '{"vorlage": ["Termin vereinbart"]}'),
  ('verkaufsstufe', 'warten', 'Warten', 'En attente', 40, 'warn', '{"vorlage": ["Warten"]}'),
  ('verkaufsstufe', 'zur_offerte', 'Zur Offerte', 'Pour offre', 50, 'marke', '{"vorlage": ["zur Offerte"]}'),
  ('verkaufsstufe', 'abgeschlossen', 'Abgeschlossen', 'Conclu', 60, 'ok', '{"vorlage": ["Abgeschlossen"], "abschluss": "gewonnen"}'),
  ('verkaufsstufe', 'kein_interesse', 'Kein Interesse', 'Pas intéressé', 70, 'kritisch', '{"vorlage": ["Kunde kein Interesse"], "abschluss": "verloren"}'),
  ('quelle', 'solar_guide', 'solar-guide.ch', 'solar-guide.ch', 10, null, '{"vorlage": ["solar-guide.ch"]}'),
  ('quelle', 'nachfassen', 'Nachfassen', 'Relance', 20, null, '{"vorlage": ["Nachfassen"]}'),
  ('quelle', 'direktkontakt', 'Direktkontakt', 'Contact direct', 30, null, '{"vorlage": ["Direktkontakt"]}'),
  ('quelle', 'empfehlung', 'Empfehlung', 'Recommandation', 40, null, '{"vorlage": ["Empfehlung"]}'),
  ('quelle', 'webseite', 'Webseite', 'Site web', 50, null, '{}'),
  ('quelle', 'ausschreibung', 'Ausschreibung', 'Appel d’offres', 60, null, '{}'),
  ('gebaeudeart', 'einfamilienhaus', 'Einfamilienhaus', 'Maison individuelle', 10, null, '{"vorlage": ["Einfamilienhaus"]}'),
  ('gebaeudeart', 'mehrfamilienhaus', 'Mehrfamilienhaus', 'Immeuble locatif', 20, null, '{"vorlage": ["Mehrfamilienhaus"]}'),
  ('gebaeudeart', 'gewerbe', 'Gewerbe', 'Commercial', 30, null, '{"vorlage": ["Gewerbe"]}'),
  ('gebaeudeart', 'landwirtschaft', 'Landwirtschaft', 'Agriculture', 40, null, '{"vorlage": ["Landwirtschaft"]}'),
  ('dachform', 'satteldach', 'Satteldach', 'Toit à deux pans', 10, null, '{"vorlage": ["Satteldach"]}'),
  ('dachform', 'flachdach', 'Flachdach', 'Toit plat', 20, null, '{"vorlage": ["Flachdach"]}'),
  ('dachform', 'pultdach', 'Pultdach', 'Toit à un pan', 30, null, '{}'),
  ('dachform', 'walmdach', 'Walmdach', 'Toit en croupe', 40, null, '{}'),
  ('eigentum', 'eigentuemer', 'Eigentümer:in', 'Propriétaire', 10, null, '{"vorlage": ["Eigentümer"]}'),
  ('eigentum', 'miteigentum', 'Miteigentum', 'Copropriété', 20, null, '{"vorlage": ["Miteigentum"]}'),
  ('eigentum', 'mieter', 'Mieter:in', 'Locataire', 30, null, '{}'),
  ('offertstatus', 'in_arbeit', 'In Arbeit', 'En cours', 10, 'info', '{"vorlage": ["todo", ""]}'),
  ('offertstatus', 'offeriert', 'Offeriert', 'Offert', 20, 'marke', '{"vorlage": ["sent"]}'),
  ('offertstatus', 'angenommen', 'Angenommen', 'Accepté', 30, 'ok', '{"vorlage": ["closed", "construction", "done"]}'),
  ('offertstatus', 'verloren', 'Verloren', 'Perdu', 40, 'kritisch', '{"vorlage": ["lost"]}'),
  ('offertstatus', 'archiviert', 'Archiviert', 'Archivé', 50, 'neutral', '{"vorlage": ["archived"]}'),
  ('projektstatus', 'auftrag', 'Auftrag', 'Commande', 10, 'info', '{"vorlage": ["closed"]}'),
  ('projektstatus', 'im_bau', 'Im Bau', 'En construction', 20, 'marke', '{"vorlage": ["construction"]}'),
  ('projektstatus', 'abgeschlossen', 'Abgeschlossen', 'Terminé', 30, 'ok', '{"vorlage": ["done"]}'),
  ('baustatus', 'ausstehend', 'Ausstehend', 'En attente', 10, null, '{"vorlage": ["ausstehend"]}'),
  ('baustatus', 'terminiert', 'Terminiert', 'Planifié', 20, null, '{"vorlage": ["terminiert"]}'),
  ('baustatus', 'ibn', 'Inbetriebnahme', 'Mise en service', 30, null, '{"vorlage": ["ibn"]}'),
  ('baustatus', 'fertig', 'Fertig', 'Terminé', 40, null, '{"vorlage": ["fertig"]}'),
  ('aktivitaet', 'anruf', 'Anruf', 'Appel', 10, null, '{"vorlage": ["anruf"]}'),
  ('aktivitaet', 'mail', 'E-Mail', 'E-mail', 20, null, '{"vorlage": ["mail"]}'),
  ('aktivitaet', 'besuch', 'Besuch', 'Visite', 30, null, '{"vorlage": ["besuch"]}'),
  ('aktivitaet', 'brief', 'Brief', 'Lettre', 40, null, '{"vorlage": ["brief"]}'),
  ('aktivitaet', 'notiz', 'Notiz', 'Note', 50, null, '{"vorlage": ["notiz"]}'),
  ('aktivitaet', 'sms', 'SMS', 'SMS', 60, null, '{"vorlage": ["sms"]}'),
  ('aktivitaet', 'aenderung', 'Änderung', 'Modification', 70, null, '{"vorlage": ["aenderung"]}'),
  ('kontaktart', 'privat', 'Privat', 'Privé', 10, null, '{}'),
  ('kontaktart', 'firma', 'Firma', 'Entreprise', 20, null, '{}'),
  ('kontaktart', 'partner', 'Partner', 'Partenaire', 30, null, '{}'),
  ('kontaktart', 'architekt', 'Architekt:in', 'Architecte', 40, null, '{}'),
  ('kontaktart', 'elektriker', 'Elektriker:in', 'Électricien·ne', 50, null, '{}'),
  ('kontaktart', 'lieferant', 'Lieferant', 'Fournisseur', 60, null, '{}'),
  ('kontaktart', 'behoerde', 'Behörde', 'Autorité', 70, null, '{}'),
  ('artikelkategorie', 'module', 'Module', 'Modules', 10, null, '{"vorlage": ["Module"]}'),
  ('artikelkategorie', 'wechselrichter', 'Wechselrichter', 'Onduleurs', 20, null, '{"vorlage": ["Wechselrichter"]}'),
  ('artikelkategorie', 'batteriespeicher', 'Batteriespeicher', 'Batteries', 30, null, '{"vorlage": ["Batteriespeicher"]}'),
  ('artikelkategorie', 'optimierer', 'Optimierer', 'Optimiseurs', 40, null, '{"vorlage": ["Optimierer"]}'),
  ('artikelkategorie', 'unterkonstruktion', 'Unterkonstruktion', 'Sous-construction', 50, null, '{"vorlage": ["Unterkonstruktion"]}'),
  ('artikelkategorie', 'indach_systeme', 'Indach-Systeme', 'Systèmes intégrés', 60, null, '{"vorlage": ["Indach-Systeme"]}'),
  ('artikelkategorie', 'energiemanagement_zaehler', 'Energiemanagement & Zähler', 'Gestion d’énergie & compteurs', 70, null, '{"vorlage": ["Energiemanagement & Zähler"]}'),
  ('artikelkategorie', 'ladestationen', 'Ladestationen', 'Bornes de recharge', 80, null, '{"vorlage": ["Ladestationen"]}'),
  ('artikelkategorie', 'kabel_montagezubehör', 'Kabel & Montagezubehör', 'Câbles & accessoires', 90, null, '{"vorlage": ["Kabel & Montagezubehör"]}'),
  ('artikelkategorie', 'schutz_verteilung', 'Schutz & Verteilung', 'Protection & distribution', 100, null, '{"vorlage": ["Schutz & Verteilung"]}'),
  ('artikelkategorie', 'waermepumpen', 'Wärmepumpen', 'Pompes à chaleur', 110, null, '{"vorlage": ["Wärmepumpen"]}'),
  ('artikelkategorie', 'dienstleistungen', 'Dienstleistungen', 'Prestations', 120, null, '{"vorlage": ["Dienstleistungen"]}');

-- Ablauf je Produkt. PV entspricht 1:1 dem Projekt-Fahrplan der Vorlage V233.
-- Speicher, Wallbox und Wärmepumpe sind Entwürfe aus denselben Schritten und werden in Phase 9 mit Chris bereinigt.
insert into public.ablauf_vorlagen (schluessel, name_de, name_fr) values
  ('pv', 'Photovoltaik', 'Photovoltaïque'),
  ('speicher', 'Speicher-Nachrüstung', 'Ajout de batterie'),
  ('wallbox', 'Wallbox', 'Borne de recharge'),
  ('waermepumpe', 'Wärmepumpe', 'Pompe à chaleur');

insert into public.ablauf_schritte (ablauf_vorlage_id, phase, schluessel, name_de, name_fr, reihenfolge)
select v.id, s.phase, s.schluessel, s.name_de, s.name_fr, s.reihenfolge
from public.ablauf_vorlagen v, (values
  ('auftrag', 'vertrag', 'Werkvertrag unterschrieben', 'Contrat signé', 10),
  ('auftrag', 'anzahlung', 'Anzahlung eingegangen', 'Acompte reçu', 20),
  ('bew', 'gemeinde', 'Meldung / Baugesuch Gemeinde', 'Annonce / permis communal', 30),
  ('bew', 'netz', 'Technisches Anschlussgesuch (TAG / DRT)', 'Demande de raccordement technique (DRT)', 40),
  ('bew', 'foerd', 'Förderung Kanton / Gemeinde beantragt', 'Subvention canton / commune demandée', 50),
  ('vorb', 'ia', 'Installationsanzeige (IA / AI)', 'Avis d’installation (AI)', 60),
  ('vorb', 'schema', 'Elektroschema / Anlagenplanung', 'Schéma électrique', 70),
  ('vorb', 'material', 'Material bestellt / an Lager', 'Matériel commandé / en stock', 80),
  ('vorb', 'termin', 'Bautermin fixiert', 'Date de chantier fixée', 90),
  ('vorb', 'geruest', 'Gerüst / Absturzsicherung organisiert', 'Échafaudage / protection organisés', 100),
  ('montage', 'montage', 'Montage Unterkonstruktion & Module', 'Montage structure & modules', 110),
  ('montage', 'elektro', 'Elektroinstallation (WR, Batterie, Anschluss)', 'Installation électrique (onduleur, batterie)', 120),
  ('ibn', 'iat', 'IAT', 'IAT', 130),
  ('ibn', 'sina', 'Sicherheitsnachweis & Messprotokoll (RS/PM F.)', 'Rapport de sécurité & PV de mesure (RS/PM F.)', 140),
  ('ibn', 'kontrolle', 'Abnahmekontrolle Kontrollorgan (RS/PM R.)', 'Contrôle de réception (RS/PM R.)', 150),
  ('ibn', 'abnahme', 'Abnahme Netzbetreiber & Zählermontage', 'Réception GRD & pose du compteur', 160),
  ('abschluss', 'cert', 'Pronovo: Beglaubigung / HKN', 'Pronovo : certification / GO', 170),
  ('abschluss', 'pronovo', 'Pronovo: Gesuch Einmalvergütung (EIV)', 'Pronovo : demande de rétribution unique', 180),
  ('abschluss', 'uebergabe', 'Monitoring eingerichtet & Dokumentation übergeben', 'Monitoring installé & documentation remise', 190),
  ('abschluss', 'schluss', 'Schlussrechnung bezahlt', 'Facture finale payée', 200)
) as s (phase, schluessel, name_de, name_fr, reihenfolge)
where v.schluessel = 'pv';

insert into public.ablauf_schritte (ablauf_vorlage_id, phase, schluessel, name_de, name_fr, reihenfolge)
select v.id, s.phase, s.schluessel, s.name_de, s.name_fr, s.reihenfolge
from public.ablauf_vorlagen v, (values
  ('auftrag', 'vertrag', 'Werkvertrag unterschrieben', 'Contrat signé', 10),
  ('auftrag', 'anzahlung', 'Anzahlung eingegangen', 'Acompte reçu', 20),
  ('bew', 'netz', 'Technisches Anschlussgesuch (TAG / DRT)', 'Demande de raccordement technique (DRT)', 30),
  ('vorb', 'ia', 'Installationsanzeige (IA / AI)', 'Avis d’installation (AI)', 40),
  ('vorb', 'schema', 'Elektroschema / Anlagenplanung', 'Schéma électrique', 50),
  ('vorb', 'material', 'Material bestellt / an Lager', 'Matériel commandé / en stock', 60),
  ('vorb', 'termin', 'Bautermin fixiert', 'Date de chantier fixée', 70),
  ('montage', 'elektro', 'Elektroinstallation (WR, Batterie, Anschluss)', 'Installation électrique (onduleur, batterie)', 80),
  ('ibn', 'sina', 'Sicherheitsnachweis & Messprotokoll (RS/PM F.)', 'Rapport de sécurité & PV de mesure (RS/PM F.)', 90),
  ('ibn', 'kontrolle', 'Abnahmekontrolle Kontrollorgan (RS/PM R.)', 'Contrôle de réception (RS/PM R.)', 100),
  ('ibn', 'abnahme', 'Abnahme Netzbetreiber & Zählermontage', 'Réception GRD & pose du compteur', 110),
  ('abschluss', 'uebergabe', 'Monitoring eingerichtet & Dokumentation übergeben', 'Monitoring installé & documentation remise', 120),
  ('abschluss', 'schluss', 'Schlussrechnung bezahlt', 'Facture finale payée', 130)
) as s (phase, schluessel, name_de, name_fr, reihenfolge)
where v.schluessel = 'speicher';

insert into public.ablauf_schritte (ablauf_vorlage_id, phase, schluessel, name_de, name_fr, reihenfolge)
select v.id, s.phase, s.schluessel, s.name_de, s.name_fr, s.reihenfolge
from public.ablauf_vorlagen v, (values
  ('auftrag', 'vertrag', 'Werkvertrag unterschrieben', 'Contrat signé', 10),
  ('vorb', 'ia', 'Installationsanzeige (IA / AI)', 'Avis d’installation (AI)', 20),
  ('vorb', 'material', 'Material bestellt / an Lager', 'Matériel commandé / en stock', 30),
  ('vorb', 'termin', 'Bautermin fixiert', 'Date de chantier fixée', 40),
  ('montage', 'elektro', 'Elektroinstallation (WR, Batterie, Anschluss)', 'Installation électrique (onduleur, batterie)', 50),
  ('ibn', 'sina', 'Sicherheitsnachweis & Messprotokoll (RS/PM F.)', 'Rapport de sécurité & PV de mesure (RS/PM F.)', 60),
  ('abschluss', 'uebergabe', 'Monitoring eingerichtet & Dokumentation übergeben', 'Monitoring installé & documentation remise', 70),
  ('abschluss', 'schluss', 'Schlussrechnung bezahlt', 'Facture finale payée', 80)
) as s (phase, schluessel, name_de, name_fr, reihenfolge)
where v.schluessel = 'wallbox';

insert into public.ablauf_schritte (ablauf_vorlage_id, phase, schluessel, name_de, name_fr, reihenfolge)
select v.id, s.phase, s.schluessel, s.name_de, s.name_fr, s.reihenfolge
from public.ablauf_vorlagen v, (values
  ('auftrag', 'vertrag', 'Werkvertrag unterschrieben', 'Contrat signé', 10),
  ('auftrag', 'anzahlung', 'Anzahlung eingegangen', 'Acompte reçu', 20),
  ('bew', 'gemeinde', 'Meldung / Baugesuch Gemeinde', 'Annonce / permis communal', 30),
  ('bew', 'foerd', 'Förderung Kanton / Gemeinde beantragt', 'Subvention canton / commune demandée', 40),
  ('vorb', 'ia', 'Installationsanzeige (IA / AI)', 'Avis d’installation (AI)', 50),
  ('vorb', 'schema', 'Elektroschema / Anlagenplanung', 'Schéma électrique', 60),
  ('vorb', 'material', 'Material bestellt / an Lager', 'Matériel commandé / en stock', 70),
  ('vorb', 'termin', 'Bautermin fixiert', 'Date de chantier fixée', 80),
  ('montage', 'montage', 'Montage Wärmepumpe & Hydraulik', 'Montage pompe à chaleur & hydraulique', 90),
  ('montage', 'elektro', 'Elektroinstallation (WR, Batterie, Anschluss)', 'Installation électrique (onduleur, batterie)', 100),
  ('ibn', 'sina', 'Sicherheitsnachweis & Messprotokoll (RS/PM F.)', 'Rapport de sécurité & PV de mesure (RS/PM F.)', 110),
  ('ibn', 'kontrolle', 'Abnahmekontrolle Kontrollorgan (RS/PM R.)', 'Contrôle de réception (RS/PM R.)', 120),
  ('abschluss', 'uebergabe', 'Monitoring eingerichtet & Dokumentation übergeben', 'Monitoring installé & documentation remise', 130),
  ('abschluss', 'schluss', 'Schlussrechnung bezahlt', 'Facture finale payée', 140)
) as s (phase, schluessel, name_de, name_fr, reihenfolge)
where v.schluessel = 'waermepumpe';

-- Lieferanten (Chris, 21.10.2026). Weitere kommen aus der Preisliste beim Import dazu.
insert into public.lieferanten (name) values ('Krannich'), ('Solarmarkt'), ('Tritec'), ('PM Green');
