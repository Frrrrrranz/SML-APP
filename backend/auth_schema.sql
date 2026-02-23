-- =============================================
-- SML 用户认证系统 - 数据库结构
-- =============================================
-- 在 Supabase Dashboard -> SQL Editor 中执行此脚本

-- 1. 创建用户信息表（扩展 Supabase Auth）
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nickname text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 启用 RLS
alter table profiles enable row level security;

-- 3. RLS 策略：用户可以查看所有 profile（为了显示其他用户信息）
create policy "Profiles are viewable by everyone" 
  on profiles for select 
  using (true);

-- 4. RLS 策略：用户只能更新自己的 profile
create policy "Users can update own profile" 
  on profiles for update 
  using (auth.uid() = id);

-- 5. RLS 策略：用户可以插入自己的 profile
create policy "Users can insert own profile" 
  on profiles for insert 
  with check (auth.uid() = id);

-- 6. 创建触发器函数：注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', 'User'),
    null,
    'user'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 7. 创建触发器：新用户注册时触发
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. 创建 updated_at 自动更新触发器
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists on_profiles_updated on profiles;
create trigger on_profiles_updated
  before update on profiles
  for each row execute procedure public.handle_updated_at();
