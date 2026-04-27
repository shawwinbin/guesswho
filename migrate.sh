#!/bin/bash
# 数据库迁移脚本

docker compose exec -T postgres psql -U postgres -d history_figure_guess << 'SQLEOF'
create table if not exists game_sessions (
  id uuid primary key,
  status text not null check (status in ('playing', 'ended')),
  question_limit integer not null,
  question_count integer not null default 0,
  secret_figure_name text not null,
  secret_figure_aliases jsonb not null default '[]'::jsonb,
  secret_figure_era text not null default '',
  revealed_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists game_events (
  id uuid primary key,
  session_id uuid not null references game_sessions(id) on delete cascade,
  event_type text not null check (event_type in ('question', 'guess')),
  question_text text,
  answer_text text check (answer_text in ('是', '不是')),
  guess_text text,
  is_correct boolean,
  created_at timestamptz not null default now()
);

create index if not exists game_events_session_id_created_at_idx on game_events (session_id, created_at);
SQLEOF

echo "迁移完成"

# 检查表
docker compose exec postgres psql -U postgres -d history_figure_guess -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"

# 测试 API
curl -s -X POST http://localhost:18080/v1/sessions -H 'Content-Type: application/json' -d '{"questionLimit":20}'