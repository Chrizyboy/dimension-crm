-- SMS über die Datenbank senden (pg_net) statt direkt aus der Edge Function.
-- Grund: ASPSMS (json.aspsms.com) bietet nur TLS 1.2 mit CBC-Verfahren an (ECDHE-RSA-AES256-SHA384). Die Edge
-- Runtime (Deno/rustls) lehnt das ab («Keine Verbindung»), pg_net (libcurl/OpenSSL) nimmt es an. Geprüft am
-- 2.11.2026 von Chris' PC: nur mit modernen Verfahren bricht jede Verbindung ab. Siehe docs/integrationen.md.
-- Nur der Server (service_role) darf das; der Inhalt mit dem Passwort liegt nur Millisekunden in der Warteschlange
-- von pg_net, die Antwort (ohne Passwort) wird beim Abholen gelöscht.

/** Anfrage an ASPSMS einreihen; gibt die Nummer zurück, unter der die Antwort abgeholt wird. */
create or replace function public.sms_anfrage(p_url text, p_inhalt jsonb, p_zeitlimit_ms int default 15000)
returns bigint
language sql security definer set search_path = '' as $$
  select net.http_post(
    url := p_url,
    body := p_inhalt,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := least(greatest(p_zeitlimit_ms, 1000), 30000)
  )
$$;

/** Antwort abholen (leer, solange sie noch nicht da ist) und danach löschen. */
create or replace function public.sms_antwort(p_id bigint)
returns table (status int, inhalt text, zeitlimit boolean, fehler text)
language sql security definer set search_path = '' as $$
  delete from net._http_response r where r.id = p_id
  returning r.status_code, r.content, coalesce(r.timed_out, false), r.error_msg
$$;

revoke execute on function public.sms_anfrage(text, jsonb, int) from public, anon, authenticated;
revoke execute on function public.sms_antwort(bigint) from public, anon, authenticated;
grant execute on function public.sms_anfrage(text, jsonb, int) to service_role;
grant execute on function public.sms_antwort(bigint) to service_role;
