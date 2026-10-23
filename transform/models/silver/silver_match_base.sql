-- Typed match rows from the latest load, BEFORE contract filtering.
-- Ephemeral: exists only as the shared input of silver_match / quarantine_match.
{{ config(materialized='ephemeral') }}

select
    r.match_id::int                              as match_id,
    r."date"::date                               as match_date,
    r.kickoff_time_utc::time                     as kickoff_utc,
    r.stage_id::int                              as stage_id,
    r.venue_id::int                              as venue_id,
    r.home_team_id::int                          as home_team_id,
    nullif(r.away_team_id, '')::int              as away_team_id,
    nullif(r.home_score, '')::int                as home_score,
    nullif(r.away_score, '')::int                as away_score,
    -- Knockout ties decided on penalties (source v81+): shoot-out scores and
    -- how the result was reached (regular | aet | penalties), with cited
    -- corrections from seed match_result_corrections taking precedence.
    coalesce(c.home_penalty_score, nullif(r.home_penalty_score, '')::int)
                                               as home_penalty_score,
    coalesce(c.away_penalty_score, nullif(r.away_penalty_score, '')::int)
                                               as away_penalty_score,
    lower(coalesce(c.result_type, nullif(r.result_type, '')))
                                               as result_type,
    r.status                                     as status,
    nullif(r.home_xg, '')::numeric(5, 2)         as home_xg,
    nullif(r.away_xg, '')::numeric(5, 2)         as away_xg,
    nullif(r.referee_id, '')::int                as referee_id,
    nullif(r.player_of_the_match_id, '')::int    as player_of_the_match_id
from {{ source('bronze', 'raw_matches') }} as r
left join {{ ref('match_result_corrections') }} as c
    on c.match_id = r.match_id::int
where {{ latest_load('matches.csv') }}
