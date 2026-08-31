-- Supabase Cron setup for background word metadata generation.
-- Run this in the Supabase SQL Editor after deploying the Render service.
-- Replace the URL and secret values before running these statements.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store these values in Supabase Vault, not directly in the cron command.
select vault.create_secret(
  'https://YOUR-RENDER-SERVICE.onrender.com/api/internal/generate-content',
  'vocab-background-job-url'
);
select vault.create_secret(
  'REPLACE_WITH_BACKGROUND_JOB_SECRET',
  'vocab-background-job-secret'
);

select cron.schedule(
  'vocab-content-generation-hourly',
  '0 * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'vocab-background-job-url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'vocab-background-job-secret')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Inspect runs:
-- select * from cron.job_run_details order by start_time desc limit 20;
-- Remove the job if needed:
-- select cron.unschedule('vocab-content-generation-hourly');
