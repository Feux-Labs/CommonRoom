-- Runs the request-log trim every night at 02:30 UTC (03:30 in Nigeria), inside the database: no secret, no outside scheduler.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('prune-request-log', '30 2 * * *', 'select public.prune_request_log()');
