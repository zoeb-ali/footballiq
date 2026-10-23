"""Derive the name each player is known by -> transform/seeds/player_display_names.csv.

The source registry stores full legal names ("Lionel Andres Messi") and,
for some squads, a malformed concatenation of a known-as field with the full
name ("Lamine Yamal Yamal", "RAMOSGoncalo Goncalo"). Broadcast-style UIs show
the known name, so silver keeps both: ``full_name`` verbatim from the source,
``player_name`` from this seed.

Rules, applied in order (each row records which one fired):
  override   curated: mononyms, nicknames, accents, source typos
  unglue     "SURNAMEGiven ..."         -> "Given Surname"
  wrap       "X ... X" (same first/last)-> drop the leading copy
  dedupe     consecutive repeated token -> keep the first (accented) copy
  short      first given name + surname, keeping particles (van, de, El ...)
  verbatim   already two tokens or fewer

Run: python scripts/build_display_names.py <squads_and_players.csv>
Re-run whenever the source registry changes; the dbt test
``assert_display_names_clean`` fails if any name still repeats a token.
"""

from __future__ import annotations

import csv
import re
import sys
import unicodedata
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "transform" / "seeds" / "player_display_names.csv"

# Curated, by player_id: known-as names a rule cannot derive. Each is the name
# used by the player's federation / club for the 2026 tournament.
OVERRIDES: dict[int, str] = {
    # Brazil
    209: "Alisson", 210: "Ederson", 211: "Gabriel Magalhães", 212: "Marquinhos",
    213: "Casemiro", 214: "Alex Sandro", 215: "Vinícius Júnior", 216: "Bruno Guimarães",
    217: "Matheus Cunha", 218: "Neymar Jr", 219: "Raphinha", 220: "Weverton",
    221: "Danilo", 222: "Bremer", 223: "Léo Pereira", 224: "Douglas Santos",
    225: "Fabinho", 226: "Danilo Santos", 227: "Endrick", 228: "Lucas Paquetá",
    229: "André", 230: "Gabriel Martinelli", 231: "Ederson Moraes", 232: "Roger Ibañez",
    233: "Igor Thiago", 234: "Rayan",
    # Portugal
    1041: "Diogo Costa", 1042: "Nélson Semedo", 1043: "Rúben Dias", 1044: "Tomás Araújo",
    1045: "Diogo Dalot", 1046: "Matheus Nunes", 1047: "Cristiano Ronaldo",
    1048: "Bruno Fernandes", 1049: "Gonçalo Ramos", 1050: "Bernardo Silva",
    1051: "João Félix", 1052: "José Sá", 1053: "Renato Veiga", 1054: "Gonçalo Inácio",
    1055: "João Neves", 1056: "Francisco Trincão", 1057: "Rafael Leão", 1058: "Pedro Neto",
    1059: "Gonçalo Guedes", 1060: "João Cancelo", 1061: "Rúben Neves", 1062: "Rui Silva",
    1063: "Vitinha", 1064: "Samu Costa", 1065: "Nuno Mendes", 1066: "Francisco Conceição",
    # Spain
    737: "Gavi", 738: "Dani Olmo", 744: "Rodri", 745: "Nico Williams", 747: "Lamine Yamal",
    748: "Pedri", 750: "Pau Cubarsí", 751: "Unai Simón",
    # France
    836: "Dayot Upamecano", 839: "Ousmane Dembélé", 842: "Kylian Mbappé",
    840: "Aurélien Tchouaméni", 845: "N'Golo Kanté", 847: "Ibrahima Konaté",
    851: "Theo Hernández", 853: "Lucas Hernández", 852: "Désiré Doué",
    # England
    1147: "Nico O'Reilly", 1150: "Marc Guéhi", 1163: "Ollie Watkins",
    1164: "Noni Madueke", 1169: "Djed Spence",
    # Argentina / Uruguay
    959: "Emiliano Martínez", 957: "José Manuel López", 945: "Julián Álvarez",
    832: "Rodrigo Zalazar",
    # Source truncated these surnames to "Mc"; identified by club + date of birth
    290: "Scott McTominay", 293: "John McGinn", 309: "Kenny McLean", 312: "Scott McKenna",
    320: "Weston McKennie", 334: "Mark McKenzie", 722: "Callum McCowatt",
    # Germany / Netherlands / Norway
    429: "Pascal Groß", 418: "Antonio Rüdiger", 435: "Leroy Sané", 437: "Alexander Nübel",
    526: "Jan Paul van Hecke", 524: "Virgil van Dijk", 535: "Micky van de Ven",
    541: "Frenkie de Jong", 523: "Marten de Roon",
    920: "Martin Ødegaard", 921: "Jørgen Strand Larsen", 926: "Marcus Holmgren Pedersen",
    914: "Leo Østigård", 917: "Alexander Sørloth",
}

PARTICLES = {
    "van", "von", "de", "der", "den", "del", "della", "di", "da", "das", "do", "dos",
    "du", "la", "le", "el", "al", "ben", "bin", "mac", "mc", "st", "ter", "ten",
}
_MIN_WRAPPED_TOKENS = 3  # "Yamal Lamine Yamal"
_MAX_SHORT_TOKENS = 2  # names this short are kept as given
_GLUED = re.compile(r"^([A-ZÀ-ÝÆØÅß]{2,})([A-ZÀ-Ý][a-zà-ÿ'\-]+)(.*)$")


def _norm(token: str) -> str:
    folded = unicodedata.normalize("NFD", token.casefold())
    return "".join(c for c in folded if unicodedata.category(c) != "Mn")


def _surname(tokens: list[str]) -> list[str]:
    """Last token plus any particles directly before it ("Van De Ven")."""
    i = len(tokens) - 1
    while i - 1 >= 1 and _norm(tokens[i - 1]) in PARTICLES:
        i -= 1
    return tokens[i:]


def derive(player_id: int, raw: str) -> tuple[str, str]:
    if player_id in OVERRIDES:
        return OVERRIDES[player_id], "override"
    name = " ".join(raw.split())
    rule = "verbatim"

    m = _GLUED.match(name)
    if m:
        surname, given, rest = m.group(1).title(), m.group(2), m.group(3).split()
        tokens = [given, *[t for t in rest if _norm(t) != _norm(given)], surname]
        return f"{tokens[0]} {tokens[-1]}", "unglue"

    tokens = name.split()
    if len(tokens) >= _MIN_WRAPPED_TOKENS and _norm(tokens[0]) == _norm(tokens[-1]):
        tokens, rule = tokens[1:], "wrap"

    deduped: list[str] = []
    for t in tokens:
        if deduped and _norm(deduped[-1]) == _norm(t):
            rule = "dedupe"
            continue
        deduped.append(t)
    tokens = deduped

    if len(tokens) > _MAX_SHORT_TOKENS:
        sur = _surname(tokens)
        if len(sur) < len(tokens):
            tokens = [tokens[0], *sur]
            rule = "short" if rule == "verbatim" else rule
    return " ".join(tokens), rule


def main(src: str) -> int:
    with Path(src).open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["player_id", "display_name", "rule"])
        for r in rows:
            pid = int(r["player_id"])
            name, rule = derive(pid, r["player_name"])
            w.writerow([pid, name, rule])
    print(f"wrote {len(rows)} names -> {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "data/raw/squads_and_players.csv"))
