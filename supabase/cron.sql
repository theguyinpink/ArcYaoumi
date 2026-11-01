-- Run ONLY after the Vercel /api/send-reminders deployment works.
-- In Supabase SQL Editor, replace two placeholders with your actual values.
-- This stores a bearer token in a SQL scheduled task. Limit access to this SQL
-- definition and use Supabase Vault if you need stricter secret storage.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
 'winter-arc-little-reminders', '* * * * *',
 $$select net.http_post(
   url:='https://YOUR-VERCEL-DOMAIN.vercel.app/api/send-reminders',
   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer YOUR_CRON_SECRET'),
   body:='{}'::jsonb
 );$$
);
-- To remove the scheduled job:
-- select cron.unschedule('winter-arc-little-reminders');
