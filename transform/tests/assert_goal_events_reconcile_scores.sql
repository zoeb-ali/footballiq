-- Flagship reconciliation (verified 0 mismatches at profiling, now a
-- permanent contract): goal events per completed match must equal the
-- recorded total score. Any returned row = base facts disagree internally.
-- Own goals count toward the score (source v81 types them separately);
-- penalty shoot-out kicks never do.
with goals as (
    select match_id, count(*) as goal_events
    from {{ ref('fact_match_event') }}
    where event_type in ('Goal', 'Own Goal')
    group by match_id
)

select
    f.match_id,
    f.home_score + f.away_score as recorded_goals,
    coalesce(g.goal_events, 0)  as event_goals
from {{ ref('fact_match') }} as f
left join goals as g on f.match_id = g.match_id
where
    f.status = 'Completed'
    and f.home_score + f.away_score != coalesce(g.goal_events, 0)
