-- No game asks students to write any more, and none calls a model after the attempt.
-- Explain-it games are discarded, not deleted: played sessions and their points stay.
-- Run once after 202610300008_partial_scores.sql.
update public.generated_challenges set status = 'discarded'
  where game = 'explicalo' and status <> 'discarded';

-- Level 3 of quien-soy was typed: it becomes multiple choice with the distractors it already had.
with rebuilt as (
  select g.id, (
    select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'text', option_text) order by random())
    from jsonb_array_elements_text((g.content->'distractors') || jsonb_build_array(g.content->>'answer')) option_text
  ) as options
  from public.generated_challenges g
  where g.game = 'quien-soy' and g.payload->>'mode' = 'text'
)
update public.generated_challenges g
  set payload = (g.payload - 'mode') || jsonb_build_object('options', r.options),
    solution = g.solution || jsonb_build_object('optionId', (
      select option_row->>'id' from jsonb_array_elements(r.options) option_row
      where option_row->>'text' = g.content->>'answer'))
  from rebuilt r where g.id = r.id;
