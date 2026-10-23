-- Phase 12, Teil 5: Die mitgelieferten Automationen (Bau-Auftrag 3.3, zehn Vorlagen) und die Statusmeldung an
-- Kunden bei Meilensteinen (ERP-Analyse, Entscheid 0009). Alle sind eingeschaltet und stehen auf «mit Freigabe»:
-- Mails und SMS warten im Ausgangskorb, bis ein Mensch sie freigibt. Sie lösen nur für Neues aus (ab jetzt).
-- Texte, Tage und Empfänger sind Daten und in der App änderbar.

insert into public.automationen (vorlage, reihenfolge, name_de, name_fr, beschreibung_de, beschreibung_fr, aktiv, ausloeser,
                                 bedingungen, aktionen) values
('lead_neu', 10,
 'Neuer Lead: prüfen, zuteilen, Erstkontakt',
 'Nouveau lead : vérifier, attribuer, premier contact',
 'Prüft auf Dubletten, teilt den Lead nach PLZ Muri oder Bulle zu, gibt dem Verkauf die Aufgabe «Erstkontakt innert 24 h» und meldet den Lead.',
 'Vérifie les doublons, attribue le lead à Muri ou Bulle selon le NPA, crée la tâche « Premier contact sous 24 h » et signale le lead.',
 true, 'lead.neu', '[]', $j$[
  {"art": "dubletten", "an": ["standort:verkauf", "rolle:verkauf", "rolle:admin"]},
  {"art": "zuteilen"},
  {"art": "aufgabe", "an": ["zustaendig", "standort:verkauf", "rolle:verkauf", "rolle:admin"], "faellig_tage": 1,
   "titel": {"de": "Erstkontakt innert 24 h: {Name}", "fr": "Premier contact sous 24 h : {Name}"},
   "text": {"de": "Neuer Lead aus {Ort}. Bitte anrufen und den nächsten Schritt festhalten.",
            "fr": "Nouveau lead de {Ort}. Merci d’appeler et de noter la suite."}},
  {"art": "benachrichtigung", "an": ["zustaendig", "standort:verkauf", "rolle:verkauf", "rolle:admin"],
   "titel": {"de": "Neuer Lead: {Name}", "fr": "Nouveau lead : {Name}"},
   "text": {"de": "{Ort} · Standort {Standort}", "fr": "{Ort} · site {Standort}"}}
 ]$j$),

('termin_vereinbart', 20,
 'Termin vereinbart: Outlook, Bestätigung, SMS',
 'Rendez-vous fixé : Outlook, confirmation, SMS',
 'Trägt den Termin im Outlook der zuständigen Person ein (ohne Einladung an den Kunden), bereitet die Bestätigungs-Mail vor und plant die SMS-Erinnerung für den Vortag.',
 'Inscrit le rendez-vous dans l’Outlook de la personne responsable (sans invitation au client), prépare l’e-mail de confirmation et planifie le SMS de rappel la veille.',
 true, 'lead.termin_vereinbart', '[]', $j$[
  {"art": "outlook_termin"},
  {"art": "mail", "absender": ["zustaendig", "rolle:admin"],
   "betreff": {"de": "Bestätigung Ihres Termins am {Termin}", "fr": "Confirmation de votre rendez-vous du {Termin}"},
   "text": {"de": "{Anrede}\n\nVielen Dank für Ihr Interesse. Gerne bestätigen wir Ihnen den Termin am {Termin}. {Absender} kommt bei Ihnen vorbei und nimmt sich Zeit für Ihre Fragen.\n\nFalls etwas dazwischenkommt, geben Sie uns bitte kurz Bescheid.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nMerci de votre intérêt. Nous vous confirmons volontiers le rendez-vous du {Termin}. {Absender} passera chez vous et prendra le temps de répondre à vos questions.\n\nEn cas d’empêchement, merci de nous en informer.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}},
  {"art": "sms", "sende": "vortag_termin",
   "text": {"de": "Dimension Solaire: Wir freuen uns auf den Termin morgen, {Termin}. Bei Verhinderung bitte kurz melden. Danke!",
            "fr": "Dimension Solaire : nous nous réjouissons du rendez-vous de demain, {Termin}. En cas d’empêchement, merci de nous prévenir."}}
 ]$j$),

('termin_gehabt', 30,
 'Termin gehabt ohne nächsten Schritt: erinnern',
 'Visite faite sans suite : rappeler',
 'Zwei Tage nach dem Termin: Steht der Lead immer noch auf «Termin gehabt – wie weiter?», bekommt die zuständige Person eine Aufgabe und eine Erinnerung.',
 'Deux jours après la visite : si le lead est toujours sur « Visite faite – suite ? », la personne responsable reçoit une tâche et un rappel.',
 true, 'lead.termin_gehabt', '[]', $j$[
  {"art": "warten", "tage": 2},
  {"art": "pruefen", "bedingungen": [{"feld": "lead.stand", "op": "=", "wert": "nach_termin"}]},
  {"art": "aufgabe", "an": ["zustaendig", "standort:verkauf", "rolle:verkauf", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Nächster Schritt nach dem Termin: {Name}", "fr": "Suite après la visite : {Name}"},
   "text": {"de": "Offerte, Wiedervorlage oder kein Interesse? Bitte im Lead festhalten.",
            "fr": "Offre, relance ou pas d’intérêt ? Merci de le noter dans le lead."}},
  {"art": "benachrichtigung", "stufe": "warnung", "an": ["zustaendig", "standort:verkauf", "rolle:verkauf", "rolle:admin"],
   "titel": {"de": "Termin ohne nächsten Schritt: {Name}", "fr": "Visite sans suite : {Name}"},
   "text": {"de": "Seit zwei Tagen offen.", "fr": "Ouvert depuis deux jours."}}
 ]$j$),

('offerte_nachfassen', 40,
 'Offerte gesendet: nachfassen',
 'Offre envoyée : relancer',
 'Ist die Offerte nach 14 Tagen noch offen (Stand «Nachfassen fällig»), liegt eine Nachfass-Mail in der Sprache des Kunden bereit, und die zuständige Person bekommt eine Aufgabe. Ab Phase 13 schreibt die KI den Entwurf im Ton der Firma.',
 'Si l’offre est encore ouverte après 14 jours (« À relancer »), un e-mail de relance dans la langue du client est prêt et la personne responsable reçoit une tâche. Dès la phase 13, l’IA rédigera le brouillon dans le ton de l’entreprise.',
 true, 'offerte.gesendet', '[]', $j$[
  {"art": "warten", "tage": 14},
  {"art": "pruefen", "bedingungen": [{"feld": "offerte.stand", "op": "=", "wert": "nachfassen"}]},
  {"art": "mail", "absender": ["zustaendig", "rolle:admin"],
   "betreff": {"de": "Ihre Offerte {Offerte}", "fr": "Votre offre {Offerte}"},
   "text": {"de": "{Anrede}\n\nVor zwei Wochen haben wir Ihnen unsere Offerte {Offerte} geschickt. Haben Sie Fragen dazu, oder dürfen wir etwas anpassen? Gerne besprechen wir die nächsten Schritte mit Ihnen.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nIl y a deux semaines, nous vous avons envoyé notre offre {Offerte}. Avez-vous des questions ou souhaitez-vous une adaptation ? Nous discutons volontiers de la suite avec vous.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:verkauf", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Nachfassen: Offerte {Offerte} ({Name})", "fr": "Relancer : offre {Offerte} ({Name})"},
   "text": {"de": "Die Mail liegt im Ausgangskorb. Anrufen wirkt oft besser.",
            "fr": "L’e-mail est dans la boîte d’envoi. Un appel est souvent plus efficace."}}
 ]$j$),

('auftrag', 50,
 'Offerte angenommen: Auftrag vorbereiten',
 'Offre acceptée : préparer la commande',
 'Sobald der Auftrag erstellt ist (Projekt mit Fahrplan): SharePoint-Ordner anlegen, Kunde in AbaNinja verknüpfen oder anlegen, Anzahlungsrechnung als Entwurf, Buchhaltung und Bauplanung informieren.',
 'Dès que la commande est créée (projet avec feuille de route) : créer le dossier SharePoint, lier ou créer le client dans AbaNinja, préparer la facture d’acompte en brouillon, informer la comptabilité et la planification.',
 true, 'auftrag.erstellt', '[]', $j$[
  {"art": "sharepoint_ordner"},
  {"art": "abaninja_kunde"},
  {"art": "rechnung_entwurf", "tranche": "erste"},
  {"art": "aufgabe", "an": ["rolle:buchhaltung", "rolle:admin"], "faellig_tage": 1,
   "titel": {"de": "Anzahlungsrechnung prüfen und stellen: {Projekt}", "fr": "Vérifier et émettre la facture d’acompte : {Projekt}"},
   "text": {"de": "Der Entwurf ist bereit ({Name}).", "fr": "Le brouillon est prêt ({Name})."}},
  {"art": "benachrichtigung", "an": ["rolle:projektleitung", "rolle:admin"],
   "titel": {"de": "Neuer Auftrag {Projekt}: Bau planen", "fr": "Nouvelle commande {Projekt} : planifier"},
   "text": {"de": "{Name}, {Ort}", "fr": "{Name}, {Ort}"}}
 ]$j$),

('gesuch_frist', 60,
 'Gesuch eingereicht: Frist überwachen',
 'Demande déposée : surveiller le délai',
 'Bewilligung oder Netzanschluss eingereicht: Ist nach 30 Tagen keine Antwort da, bekommt die Projektleitung eine Aufgabe zum Nachfragen. Nach weiteren 14 Tagen geht eine Eskalation an die Administration.',
 'Autorisation ou raccordement déposé : sans réponse après 30 jours, la direction de projet reçoit une tâche pour relancer. Après 14 jours de plus, une escalade va à l’administration.',
 true, 'projekt.gesuch_eingereicht', '[{"feld": "ereignis.bewilligung", "op": "=", "wert": true}]', $j$[
  {"art": "warten", "tage": 30},
  {"art": "pruefen", "bedingungen": [{"feld": "projekt.schritt_stand", "op": "in", "wert": ["offen", "teilweise"]}]},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:projektleitung", "rolle:admin"], "faellig_tage": 0,
   "titel": {"de": "Nachfragen: {Meilenstein} ({Projekt})", "fr": "Relancer : {Meilenstein} ({Projekt})"},
   "text": {"de": "Seit 30 Tagen eingereicht, noch keine Antwort.", "fr": "Déposé depuis 30 jours, toujours sans réponse."}},
  {"art": "benachrichtigung", "stufe": "warnung", "an": ["zustaendig", "rolle:projektleitung", "rolle:admin"],
   "titel": {"de": "Keine Antwort seit 30 Tagen: {Meilenstein}", "fr": "Sans réponse depuis 30 jours : {Meilenstein}"},
   "text": {"de": "{Projekt} · {Name}", "fr": "{Projekt} · {Name}"}},
  {"art": "warten", "tage": 14},
  {"art": "pruefen", "bedingungen": [{"feld": "projekt.schritt_stand", "op": "in", "wert": ["offen", "teilweise"]}]},
  {"art": "benachrichtigung", "stufe": "kritisch", "an": ["rolle:admin"],
   "titel": {"de": "Eskalation: {Meilenstein} seit 44 Tagen offen", "fr": "Escalade : {Meilenstein} ouvert depuis 44 jours"},
   "text": {"de": "{Projekt} · {Name}", "fr": "{Projekt} · {Name}"}}
 ]$j$),

('ibn', 70,
 'Inbetriebnahme erledigt: Abschluss',
 'Mise en service faite : clôture',
 'Nach der IBN: Schlussrechnung als Entwurf, Aufgabe Pronovo-Anmeldung, nach 14 Tagen eine Bitte um Bewertung (nicht bei Werbesperre) und, wenn noch kein Wartungsvertrag besteht, die Aufgabe «Wartungsvertrag anbieten».',
 'Après la MES : facture finale en brouillon, tâche inscription Pronovo, après 14 jours une demande d’avis (sauf blocage publicitaire) et, sans contrat de maintenance, la tâche « Proposer un contrat de maintenance ».',
 true, 'projekt.schritt_erledigt', '[{"feld": "ereignis.schritt", "op": "=", "wert": "ibn"}]', $j$[
  {"art": "rechnung_entwurf", "tranche": "letzte"},
  {"art": "aufgabe", "an": ["rolle:buchhaltung", "rolle:admin"], "faellig_tage": 2,
   "titel": {"de": "Schlussrechnung prüfen und stellen: {Projekt}", "fr": "Vérifier et émettre la facture finale : {Projekt}"}},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:projektleitung", "rolle:admin"], "faellig_tage": 7,
   "titel": {"de": "Pronovo-Anmeldung: {Projekt}", "fr": "Inscription Pronovo : {Projekt}"},
   "text": {"de": "Beglaubigung und Gesuch Einmalvergütung (EIV).", "fr": "Certification et demande de rétribution unique (RU)."}},
  {"art": "warten", "tage": 14},
  {"art": "mail", "werbung": true, "absender": ["zustaendig", "rolle:admin"],
   "betreff": {"de": "Wie zufrieden sind Sie mit Ihrer Anlage?", "fr": "Êtes-vous satisfait de votre installation ?"},
   "text": {"de": "{Anrede}\n\nIhre Anlage läuft seit zwei Wochen. Wir hoffen, Sie sind zufrieden! Über eine kurze Bewertung freuen wir uns sehr: {Bewertungslink}\n\nHerzlichen Dank und freundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nVotre installation fonctionne depuis deux semaines. Nous espérons que vous êtes satisfait ! Un court avis nous ferait très plaisir : {Bewertungslink}\n\nUn grand merci et meilleures salutations\n{Absender}\nDimension Solaire"}},
  {"art": "pruefen", "bedingungen": [{"feld": "kontakt.hat_wartungsvertrag", "op": "=", "wert": false}]},
  {"art": "aufgabe", "an": ["zustaendig", "rolle:verkauf", "rolle:admin"], "faellig_tage": 3,
   "titel": {"de": "Wartungsvertrag anbieten: {Name}", "fr": "Proposer un contrat de maintenance : {Name}"}}
 ]$j$),

('wartung_faellig', 80,
 'Wartung fällig: Termin vorschlagen',
 'Maintenance due : proposer une date',
 '30 Tage vor der fälligen Wartung: Aufgabe «Wartungstermin vereinbaren» und eine Mail an den Kunden, dass wir uns für einen Termin melden.',
 '30 jours avant la maintenance : tâche « Fixer la date de maintenance » et un e-mail au client annonçant notre prise de contact.',
 true, 'wartung.faellig', '[]', $j$[
  {"art": "aufgabe", "an": ["rolle:projektleitung", "rolle:admin"], "faellig_tage": 3,
   "titel": {"de": "Wartungstermin vereinbaren: {Name} (fällig {Wartung})", "fr": "Fixer la maintenance : {Name} (due le {Wartung})"}},
  {"art": "mail", "absender": ["rolle:projektleitung", "rolle:admin"],
   "betreff": {"de": "Ihre Wartung ist bald fällig", "fr": "Votre maintenance arrive bientôt"},
   "text": {"de": "{Anrede}\n\nIhre Anlage ist am {Wartung} zur Wartung fällig. Wir melden uns in den nächsten Tagen für einen Termin. Gerne können Sie uns auch einen Wunschtermin nennen.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nLa maintenance de votre installation est prévue le {Wartung}. Nous vous contacterons ces prochains jours pour fixer une date. Vous pouvez aussi nous proposer une date qui vous convient.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}}
 ]$j$),

('rechnung_ueberfaellig', 90,
 'Rechnung überfällig: Zahlungserinnerung',
 'Facture échue : rappel de paiement',
 'Ist eine Rechnung 5 Tage über der Fälligkeit, liegt eine Zahlungserinnerung bereit. Nach dem Senden steigt die Mahnstufe; nach Ablauf der Mahnfrist folgt die 2. und 3. Stufe.',
 'Si une facture a 5 jours de retard, un rappel de paiement est prêt. Après l’envoi, le niveau de rappel augmente ; à l’échéance du délai suivent le 2e et le 3e niveau.',
 true, 'rechnung.ueberfaellig', '[]', $j$[
  {"art": "zahlungserinnerung", "absender": ["rolle:buchhaltung", "rolle:admin"],
   "betreff": {"de": "{Mahnung}: Rechnung {Rechnung}", "fr": "{Mahnung} : facture {Rechnung}"},
   "text": {"de": "{Anrede}\n\nIn unserer Buchhaltung ist die Rechnung {Rechnung} über {Betrag}, fällig am {Fällig}, noch offen. Bitte überweisen Sie den Betrag innert 10 Tagen. Falls Sie bereits bezahlt haben, betrachten Sie dieses Schreiben als gegenstandslos.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nSelon notre comptabilité, la facture {Rechnung} de {Betrag}, échue le {Fällig}, est encore ouverte. Merci de verser le montant dans les 10 jours. Si vous avez déjà payé, veuillez ne pas tenir compte de ce courrier.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}},
  {"art": "benachrichtigung", "stufe": "warnung", "an": ["rolle:buchhaltung", "rolle:admin"],
   "titel": {"de": "Rechnung {Rechnung} überfällig ({Mahnung})", "fr": "Facture {Rechnung} échue ({Mahnung})"},
   "text": {"de": "{Name} · {Betrag} offen", "fr": "{Name} · {Betrag} ouvert"}}
 ]$j$),

('nachruestung', 100,
 'Nachrüstung: Bestandskunden vorschlagen',
 'Équipement complémentaire : proposer des clients',
 'Am Monatsanfang zählt das CRM Kunden mit Anlage ohne Batterie, ohne Ladestation und ohne Wärmepumpe (ohne Werbesperre) und schlägt sie dem Verkauf als Zielgruppe vor.',
 'En début de mois, le CRM compte les clients avec installation sans batterie, sans borne et sans pompe à chaleur (sans blocage) et les propose à la vente comme groupe cible.',
 true, 'zeit.monatlich', '[]', $j$[
  {"art": "zielgruppe", "merkmal": "ohne_batterie", "an": ["rolle:verkauf", "rolle:admin"],
   "titel": {"de": "Nachrüstung: Kunden ohne Batterie", "fr": "Équipement : clients sans batterie"}},
  {"art": "zielgruppe", "merkmal": "ohne_wallbox", "an": ["rolle:verkauf", "rolle:admin"],
   "titel": {"de": "Nachrüstung: Kunden ohne Ladestation", "fr": "Équipement : clients sans borne"}},
  {"art": "zielgruppe", "merkmal": "ohne_waermepumpe", "an": ["rolle:verkauf", "rolle:admin"],
   "titel": {"de": "Nachrüstung: Kunden ohne Wärmepumpe", "fr": "Équipement : clients sans pompe à chaleur"}}
 ]$j$),

('meilenstein_kunde', 110,
 'Meilenstein erreicht: Kunde informieren',
 'Étape atteinte : informer le client',
 'Ist ein wichtiger Schritt im Fahrplan erledigt (Vertrag, Bautermin, Montage, IBN, Abnahme Netzbetreiber), liegt eine kurze Statusmeldung an den Kunden bereit.',
 'Quand une étape importante est faite (contrat, date des travaux, montage, MES, réception du gestionnaire de réseau), un court message d’état au client est prêt.',
 true, 'projekt.schritt_erledigt',
 '[{"feld": "ereignis.schritt", "op": "in", "wert": ["vertrag", "termin", "montage", "ibn", "abnahme"]}]', $j$[
  {"art": "mail", "absender": ["zustaendig", "rolle:projektleitung", "rolle:admin"],
   "betreff": {"de": "Ihr Projekt {Projekt}: {Meilenstein}", "fr": "Votre projet {Projekt} : {Meilenstein}"},
   "text": {"de": "{Anrede}\n\nGerne informieren wir Sie über den Stand Ihres Projekts: «{Meilenstein}» ist erledigt. Wir halten Sie weiter auf dem Laufenden.\n\nBei Fragen sind wir gerne für Sie da.\n\nFreundliche Grüsse\n{Absender}\nDimension Solaire",
            "fr": "{Anrede}\n\nNous avons le plaisir de vous informer de l’avancement de votre projet : « {Meilenstein} » est terminé. Nous vous tiendrons informé de la suite.\n\nNous restons volontiers à votre disposition.\n\nMeilleures salutations\n{Absender}\nDimension Solaire"}}
 ]$j$)
on conflict (vorlage) do nothing;
