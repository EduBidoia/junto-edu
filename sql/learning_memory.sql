create table learning_memory (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references children(id),
  subject text not null,
  topic text not null,
  last_position text,
  depth_level integer default 1,
  concepts_mastered text[],
  concepts_struggling text[],
  total_sessions integer default 0,
  total_minutes integer default 0,
  last_session_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(child_id, subject, topic)
);

create table session_history (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references children(id),
  subject text not null,
  topic text not null,
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone,
  duration_minutes integer,
  was_interrupted boolean default false,
  interrupted_at_phase text,
  depth_reached integer default 1,
  concepts_covered text[],
  performance_score integer,
  conversation_summary text,
  raw_messages jsonb
);

create table engagement_metrics (
  id uuid default gen_random_uuid() primary key,
  child_id uuid references children(id),
  session_id uuid references session_history(id),
  metric_type text not null,
  subject text,
  topic text,
  value jsonb,
  occurred_at timestamp with time zone default now()
);

alter table learning_memory enable row level security;
alter table session_history enable row level security;
alter table engagement_metrics enable row level security;

create policy "learning_memory_all" on learning_memory for all using (true);
create policy "session_history_all" on session_history for all using (true);
create policy "engagement_metrics_all" on engagement_metrics for all using (true);
