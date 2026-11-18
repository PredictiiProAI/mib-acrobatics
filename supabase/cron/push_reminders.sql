-- MIB Acrobatics — runs the 1-hour training reminder every 5 minutes (Supabase pg_cron + pg_net).
-- Before running: replace REPLACE_WITH_CRON_SECRET with the same value as CRON_SECRET in Vercel,
-- and the URL if the site is not https://mib-acrobatics.vercel.app. Safe to run again (re-creates the job).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'mib-push-reminders';

select cron.schedule(
  'mib-push-reminders',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://mib-acrobatics.vercel.app/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'),
    timeout_milliseconds := 20000
  );
  $$
);
