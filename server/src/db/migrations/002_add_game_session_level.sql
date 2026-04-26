alter table game_sessions
  add column if not exists level integer;

update game_sessions
set level = 1
where level is null;

alter table game_sessions
  alter column level set default 1;

alter table game_sessions
  alter column level set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_level_check'
  ) then
    alter table game_sessions
      add constraint game_sessions_level_check check (level >= 1);
  end if;
end
$$;
