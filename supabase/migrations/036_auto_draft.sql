-- Auto-draft: households can opt in to having next week's plan generated
-- automatically on the day before their week starts (scheduled-tasks fn).
alter table households add column auto_draft_enabled boolean not null default false;
