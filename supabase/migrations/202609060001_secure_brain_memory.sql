-- Tighten the first brain snapshot policies. Existing deployments may already
-- have the permissive NULL-user policies from 202609050002.
drop policy if exists "Users can read their own brain snapshots" on public.brain_snapshots;
drop policy if exists "Users can insert their own brain snapshots" on public.brain_snapshots;
drop policy if exists "Users can update their own brain snapshots" on public.brain_snapshots;
drop policy if exists "Users can delete their own brain snapshots" on public.brain_snapshots;

create policy "Users can read their own brain snapshots" on public.brain_snapshots for select using (auth.uid() = user_id);
create policy "Users can insert their own brain snapshots" on public.brain_snapshots for insert with check (auth.uid() = user_id);
create policy "Users can update their own brain snapshots" on public.brain_snapshots for update using (auth.uid() = user_id);
create policy "Users can delete their own brain snapshots" on public.brain_snapshots for delete using (auth.uid() = user_id);
