-- Cast collector_id to integer
ALTER TABLE reports 
  ALTER COLUMN collector_id TYPE integer USING collector_id::integer;
