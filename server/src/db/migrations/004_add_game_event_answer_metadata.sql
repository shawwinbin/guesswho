alter table game_events
  add column if not exists answer_source text,
  add column if not exists answer_confidence numeric,
  add column if not exists answer_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_events_answer_source_check'
      and conrelid = 'game_events'::regclass
  ) then
    alter table game_events
      add constraint game_events_answer_source_check
      check (answer_source is null or answer_source in ('local', 'llm', 'fallback'));
  end if;
end $$;
