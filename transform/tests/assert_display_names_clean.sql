-- Every displayed player name is clean: no token repeated (accent- and
-- case-insensitive), no source glitches like "Lamine Yamal Yamal" or
-- "RAMOSGoncalo Goncalo". Any returned row = a name the seed did not repair;
-- re-run scripts/build_display_names.py and add an override.
with tokens as (
    select
        player_sk,
        player_name,
        lower(translate(tok, 'áàâãäåéèêëíìîïóòôõöúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn')) as tok
    from {{ ref('dim_player') }},
         regexp_split_to_table(player_name, '\s+') as tok
    where player_sk <> -1
)

select player_sk, player_name
from tokens
group by player_sk, player_name
having count(*) <> count(distinct tok)
   or player_name ~ '^[A-Z]{3,}[A-Z][a-z]'
