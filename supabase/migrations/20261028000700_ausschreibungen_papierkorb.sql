-- Phase 8b: Kommt ein Dossier in den Papierkorb, gehen seine offenen Anschreiben (Entwurf, bewilligt) mit, damit
-- nichts mehr aus einem gelöschten Dossier bewilligt oder gesendet wird. Wird es wiederhergestellt, kommen genau
-- diese Anschreiben zurück (gleicher Zeitpunkt im Papierkorb). Versendete bleiben unverändert im Verlauf.

create or replace function intern.ausschreibung_papierkorb() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.geloescht_am is null and new.geloescht_am is not null then
    update public.anschreiben set geloescht_am = new.geloescht_am
     where ausschreibung_id = new.id and geloescht_am is null and status in ('entwurf', 'bewilligt');
  elsif old.geloescht_am is not null and new.geloescht_am is null then
    update public.anschreiben set geloescht_am = null
     where ausschreibung_id = new.id and geloescht_am = old.geloescht_am;
  end if;
  return new;
end
$$;

create trigger ausschreibung_papierkorb after update of geloescht_am on public.ausschreibungen
  for each row execute function intern.ausschreibung_papierkorb();

-- Schon gelöschte Dossiers (aus Tests) nachziehen.
update public.anschreiben s set geloescht_am = d.geloescht_am
  from public.ausschreibungen d
 where d.id = s.ausschreibung_id and d.geloescht_am is not null and s.geloescht_am is null
   and s.status in ('entwurf', 'bewilligt');
