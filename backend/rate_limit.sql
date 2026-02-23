-- AI 聊天使用记录表（用于速率限制）
-- NOTE: 在 Supabase SQL Editor 中执行此脚本

create table if not exists ai_chat_usage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 创建索引加速查询
create index if not exists idx_ai_chat_usage_user_time 
  on ai_chat_usage (user_id, created_at desc);

-- 启用 RLS
alter table ai_chat_usage enable row level security;

-- RLS 策略：用户只能插入和查询自己的记录
DROP POLICY IF EXISTS "Users can insert own usage" ON ai_chat_usage;
DROP POLICY IF EXISTS "Users can read own usage" ON ai_chat_usage;

CREATE POLICY "Users can insert own usage" 
  ON ai_chat_usage FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own usage" 
  ON ai_chat_usage FOR SELECT 
  USING (auth.uid() = user_id);

-- NOTE: 定期清理函数 - 删除 7 天前的记录（可在 Supabase CRON 中调用）
create or replace function clean_old_ai_chat_usage()
returns void as $$
begin
  delete from ai_chat_usage 
  where created_at < now() - interval '7 days';
end;
$$ language plpgsql security definer;
