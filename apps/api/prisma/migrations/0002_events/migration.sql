CREATE TABLE "events" (
  "id"      BIGSERIAL PRIMARY KEY,
  "name"    VARCHAR(40) NOT NULL,
  "at"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "anon_id" VARCHAR(40) NOT NULL,
  "user_id" UUID,
  "props"   JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX "events_name_at_idx" ON "events" ("name", "at");
CREATE INDEX "events_anon_id_at_idx" ON "events" ("anon_id", "at");
