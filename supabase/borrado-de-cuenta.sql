-- Borrado de cuenta desde la app (requisito de Google Play).
-- Ejecutar en el SQL Editor de Supabase, en el proyecto de GHOVO.
--
-- La app no puede borrar su propio usuario de autenticación: necesita esta función
-- SECURITY DEFINER, que se ejecuta con los permisos del dueño de la función y solo
-- elimina la cuenta de quien la llama (auth.uid()).

create or replace function public.ghovo_delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'SIGN_IN_REQUIRED' using errcode = '28000';
  end if;

  -- Si las tablas de monetización no tienen ON DELETE CASCADE hacia auth.users,
  -- descomenta y ajusta estos borrados ANTES de borrar el usuario:
  -- delete from monetization.ledger  where user_id = uid;
  -- delete from monetization.session where user_id = uid;
  -- delete from monetization.wallet  where user_id = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.ghovo_delete_account() from public;
grant execute on function public.ghovo_delete_account() to authenticated;

-- Comprobación rápida (no borra nada): confirma que la función existe y sus permisos.
-- select proname, prosecdef from pg_proc where proname = 'ghovo_delete_account';
