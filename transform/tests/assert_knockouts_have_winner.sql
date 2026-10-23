-- Every completed knockout match must name who went through (goals, then
-- penalties). A row here = a tied knockout with no shoot-out result, which is
-- exactly how the source originally showed Switzerland 0-0 Colombia.
select f.match_id
from {{ ref('fact_match') }} as f
inner join {{ ref('dim_stage') }} as s on f.stage_sk = s.stage_sk
where f.status = 'Completed'
  and s.is_knockout
  and f.winner_side is null
