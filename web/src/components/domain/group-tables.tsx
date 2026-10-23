import Link from "next/link";
import { Flag } from "@/components/domain/monogram";
import type { Match, Team } from "@/lib/api/types";
import { groupTables } from "@/lib/tournament";
import { cn } from "@/lib/utils";

/**
 * The 12 group tables, computed from group-stage results (3 points a win,
 * 1 a draw; ties by goal difference then goals scored). The top two of each
 * group, plus the eight best third-placed teams, reached the Round of 32;
 * qualification is read off the knockout data, not re-derived here.
 */
export function GroupTables({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const tables = groupTables(matches, teams);
  const qualified = new Set<number>();
  for (const m of matches) {
    if (m.stage === "Round of 32") {
      qualified.add(m.home.team_id);
      if (m.away.kind === "team") qualified.add(m.away.team_id);
    }
  }
  return (
    <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
      {[...tables.entries()].map(([letter, rows]) => (
        <section key={letter} aria-labelledby={`group-${letter}`}>
          <h3 id={`group-${letter}`} className="display mb-2 text-2xl">
            Group {letter}
          </h3>
          <table className="w-full border-collapse text-[14px] tabular-nums">
            <thead className="border-b-2 border-ink text-[13px] text-ink-2">
              <tr>
                <th scope="col" className="py-1.5 text-left font-semibold">Team</th>
                {["P", "W", "D", "L", "GD", "Pts"].map((h) => (
                  <th key={h} scope="col" className="w-8 py-1.5 text-right font-semibold">
                    {h === "P" ? <abbr title="Played">P</abbr> : h === "GD" ? <abbr title="Goal difference">GD</abbr> : h === "Pts" ? <abbr title="Points">Pts</abbr> : <abbr title={{ W: "Won", D: "Drawn", L: "Lost" }[h]}>{h}</abbr>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((r) => {
                const through = qualified.has(r.team.team_id);
                return (
                  <tr key={r.team.team_id} className={cn(!through && "text-ink-3")}>
                    <td className="py-2">
                      <Link href={`/app/teams/${r.team.team_id}`} className="flex items-center gap-2 hover:underline">
                        <Flag code={r.team.fifa_code} size="xs" />
                        <span className={cn("truncate", through && "font-semibold text-ink")}>{r.team.name}</span>
                        {through ? <span className="sr-only">(qualified)</span> : null}
                      </Link>
                    </td>
                    <td className="text-right">{r.p}</td>
                    <td className="text-right">{r.w}</td>
                    <td className="text-right">{r.d}</td>
                    <td className="text-right">{r.l}</td>
                    <td className="text-right">{r.gf - r.ga > 0 ? `+${r.gf - r.ga}` : r.gf - r.ga}</td>
                    <td className={cn("score text-right text-[16px]", through && "text-marker")}>{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
      <p className="text-[13px] leading-snug text-ink-3 md:col-span-2 xl:col-span-3">
        Teams in bold, with points in red, reached the Round of 32: the top two in every group and the eight best
        third-placed sides.
      </p>
    </div>
  );
}
