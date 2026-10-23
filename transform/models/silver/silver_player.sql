-- Player registry. market_value_eur fully populated (profile batch 2);
-- club_team trimmed as the normalization baseline for the talent-flow graph.
-- player_name is the name the player is known by (seed player_display_names,
-- built by scripts/build_display_names.py: mononyms, nicknames, repaired
-- source concatenations); full_name keeps the source registry value verbatim.
select
    r.player_id::int             as player_id,
    r.team_id::int               as team_id,
    coalesce(d.display_name, r.player_name) as player_name,
    r.player_name                as full_name,
    r.position                   as position,
    trim(r.club_team)            as club_team,
    r.market_value_eur::bigint   as market_value_eur,
    r.caps::int                  as caps,
    r.date_of_birth::date        as date_of_birth,
    r.height_cm::int             as height_cm,
    r.goals::int                 as international_goals
from {{ source('bronze', 'raw_squads_and_players') }} as r
left join {{ ref('player_display_names') }} as d
    on d.player_id = r.player_id::int
where {{ latest_load('squads_and_players.csv') }}
