alter table game_events
  add column if not exists hint_text text;

alter table game_events
  drop constraint if exists game_events_event_type_check;

alter table game_events
  add constraint game_events_event_type_check
  check (event_type in ('question', 'guess', 'hint'));
