-- Anhänge aus dem alten CRM (V233) richtig beim Kunden zeigen. Nur Daten, keine neuen Tabellen.
--
-- 1. SharePoint-Dateien aus Leads und Offerten (V233 `sp.files`) kamen mit einer Graph-Adresse
--    (`file:///<laufwerk>/<id>`) als `sharepoint_url`. Die öffnet kein Browser, «Öffnen» lief ins Leere.
--    Aus dem gespeicherten Pfad wird die Web-Adresse der Bibliothek «Public» (gleiches Laufwerk).
-- 2. Das Kunden-Backup der Vorlage (`kbfiles`) ist kein eigenes Dokument, sondern die SharePoint-Kopie
--    einer Datei, die schon als `blob:<id>` im Speicher liegt (gleiche id). Der Import legte beides an:
--    jede Datei stand doppelt in der Kundenakte, 54 davon ohne Link (Backup in V233 fehlgeschlagen).
--    Der Link kommt an die Datei, das doppelte Dokument geht in den Papierkorb (nie hart löschen).
-- Wiederholbar: ein zweiter Lauf findet nichts mehr.

-- Web-Adresse eines Pfads in der Bibliothek «Public». `%`, `#`, `?` und Leerzeichen müssen kodiert sein,
-- sonst schneidet der Browser die Adresse ab; Schrägstriche bleiben.
create or replace function intern.public_web_url(p_pfad text)
returns text language sql immutable set search_path = '' as $$
  select 'https://dimensionsolaire.sharepoint.com/sites/Dimension-Solaire/Public/'
         || replace(replace(replace(replace(p_pfad, '%', '%25'), '#', '%23'), '?', '%3F'), ' ', '%20')
$$;
revoke execute on function intern.public_web_url(text) from public, anon, authenticated;

update public.dokumente d
   set sharepoint_url = intern.public_web_url(d.sharepoint_pfad)
 where d.sharepoint_url like 'file:///b!BavGizRLtEmW72UjVnPuLkf9qPvZmCRIuEFMywTPvqXXkULj4q1GTKqdhXYUWtYQ/%'
   and d.sharepoint_pfad is not null;

-- Kunden-Backup an die Datei hängen. Bezug bleibt (Lead/Offerte); fehlt er, gilt der Kunde.
update public.dokumente b
   set sharepoint_url    = coalesce(b.sharepoint_url, kb.sharepoint_url),
       sharepoint_status = coalesce(b.sharepoint_status, kb.sharepoint_status),
       bezug_tabelle     = case when b.bezug_id is null then kb.bezug_tabelle else b.bezug_tabelle end,
       bezug_id          = coalesce(b.bezug_id, kb.bezug_id),
       ordner            = coalesce(b.ordner, kb.ordner)
  from public.dokumente kb
 where kb.alt_id = 'kbfile:' || substr(b.alt_id, 6)
   and b.alt_id like 'blob:%'
   and kb.geloescht_am is null;

update public.dokumente kb
   set geloescht_am = now()
 where kb.alt_id like 'kbfile:%'
   and kb.geloescht_am is null
   and exists (select 1 from public.dokumente b where b.alt_id = 'blob:' || substr(kb.alt_id, 8));
