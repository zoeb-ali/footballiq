import Link from "next/link";
import { LandingChart } from "@/components/bracket/landing-chart";
import { SourceBadge } from "@/components/domain/source-badge";
import { Footer } from "@/components/shell/footer";
import { Wordmark } from "@/components/shell/wordmark";
import { getAllMatches, getTeams } from "@/lib/api/server-data";
import { fmtDate, fmtNum, fmtVenue } from "@/lib/format";
import { SITE } from "@/lib/site";
import { buildBracket, favouriteRecord, isCompleted, resultNote, winnerId } from "@/lib/tournament";

// The tournament is over; the page only changes when the data is rebuilt.
export const revalidate = 3600;

const INSIDE = [
  {
    href: "/app/valuations",
    title: "Model vs market",
    body:
      "A gradient-boosted model estimates every player's value from tournament data. Each estimate opens into " +
      "the exact contribution of every feature, and the page says plainly how often the model lands near the " +
      "market price.",
  },
  {
    href: "/app/simulator",
    title: "Match simulator",
    body:
      "Seeded Monte Carlo over Elo ratings. Same inputs, same seed, same answer, with 95% ranges and its " +
      "assumptions printed next to the numbers.",
  },
  {
    href: "/app/analyst",
    title: "Ask the analyst",
    body:
      "Answers take their numbers from SQL run against the warehouse and cite where each one came from. If a " +
      "number can't be traced, the answer is flagged rather than guessed.",
  },
  {
    href: "/app/network",
    title: "Club network",
    body: "Which clubs supplied which nations, and how dependent each squad was on a handful of clubs.",
  },
  {
    href: "/app/models",
    title: "Model report",
    body:
      "Cross-validated scores next to two simple baselines. The model is only published if it beats both, " +
      "and the page shows by how little.",
  },
];

export default async function Home() {
  const [matchesRes, teamsRes] = await Promise.all([getAllMatches(), getTeams()]);
  const matches = matchesRes?.data ?? [];
  const teams = teamsRes?.data ?? [];
  const saved = matchesRes?.source === "snapshot" || teamsRes?.source === "snapshot";

  const completed = matches.filter(isCompleted);
  const goals = completed.reduce((n, m) => n + m.score.home + m.score.away, 0);
  const bracket = buildBracket(matches);
  const final = bracket?.final.match ?? null;
  const champion = final ? (winnerId(final) === final.home.team_id ? final.home : final.away) : null;
  const runnerUp = final && champion ? (champion.team_id === final.home.team_id ? final.away : final.home) : null;
  const fav = favouriteRecord(matches, teams);

  return (
    <div className="min-h-dvh">
      <header className="wrap flex items-center justify-between gap-4 py-5">
        <Wordmark />
        <nav aria-label="Site" className="flex items-center gap-2 sm:gap-4">
          <a
            href={SITE.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-11 items-center px-2 text-[15px] font-semibold text-ink-2 hover:text-ink sm:inline-flex"
          >
            Source code
          </a>
          <Link
            href="/app/overview"
            className="inline-flex h-11 items-center rounded-[3px] bg-ink px-4 text-[15px] font-semibold text-paper hover:bg-[#2a2e33]"
          >
            Open the app
          </Link>
        </nav>
      </header>

      <main id="main" className="wrap pb-20">
        <section aria-labelledby="title" className="grid gap-6 border-b-2 border-ink pb-8 pt-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <h1 id="title" className="display text-[clamp(3rem,9vw,6.5rem)]">
            The 2026 World Cup,
            <br />
            filled in.
          </h1>
          <div className="flex flex-col gap-4">
            <p className="max-w-[46ch] text-[17px] leading-relaxed text-ink-2">
              All 104 matches on one chart. Click any tie for the score, the expected goals and what the ratings
              said beforehand, then run the simulator against what really happened.
            </p>
            {final && champion && runnerUp ? (
              <p className="text-[17px] font-semibold leading-snug">
                {champion.name} are world champions.{" "}
                <span className="font-normal text-ink-2">
                  They beat {runnerUp.name} {Math.max(final.score.home, final.score.away)}–
                  {Math.min(final.score.home, final.score.away)}
                  {resultNote(final) ? ` ${resultNote(final)}` : ""} at {fmtVenue(final.venue).split(",")[0]} on{" "}
                  {fmtDate(final.date)}.
                </span>
              </p>
            ) : null}
            {saved ? (
              <p className="flex items-center gap-2 text-[13px] text-ink-3">
                <SourceBadge source="snapshot" /> Served from the last data build while the API sleeps.
              </p>
            ) : null}
          </div>
        </section>

        <section aria-label="Knockout bracket" className="poster pt-10">
          {matches.length ? (
            <LandingChart matches={matches} teams={teams} />
          ) : (
            <p className="text-[17px] text-ink-2">
              The match data couldn&rsquo;t be loaded just now. The <Link href="/app/matches" className="underline">match list</Link> retries on its own.
            </p>
          )}
        </section>

        <section aria-label="The tournament in figures" className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          <Figure value={fmtNum(completed.length)} label="matches played, all in the data" />
          <Figure value={fmtNum(goals)} label="goals, each one tied to a scorer and minute" />
          <Figure
            value={fav.ties ? `${fav.favouriteWent} of ${fav.ties}` : "n/a"}
            label="knockout ties won by the higher-rated team"
          />
          <Figure value="1,248" label="players valued by the model, with a breakdown each" />
        </section>
        {fav.biggestUpset ? (
          <p className="mt-6 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
            Biggest upset by the ratings:{" "}
            <strong className="text-ink">
              {fav.biggestUpset.match.home.name} {fav.biggestUpset.match.score.home}–{fav.biggestUpset.match.score.away}{" "}
              {fav.biggestUpset.match.away.name}
            </strong>{" "}
            in the {fav.biggestUpset.match.stage.toLowerCase()}, where the side that went through had an Elo expectancy
            of {Math.round(fav.biggestUpset.underdogChance * 100)}%.
          </p>
        ) : null}

        <section aria-labelledby="inside" className="mt-16 grid gap-8 border-t-2 border-ink pt-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 id="inside" className="display text-4xl">What&rsquo;s inside</h2>
            <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-ink-2">
              Football is the demonstration. The point is that every number on this site can be traced back to the
              data and the code that produced it.
            </p>
          </div>
          <ul className="divide-y divide-rule border-y border-rule">
            {INSIDE.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="group grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
                  <span className="text-lg font-bold group-hover:text-marker group-hover:underline">{item.title}</span>
                  <span className="text-[15px] leading-relaxed text-ink-2">{item.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-ink pt-2">
      <span className="score text-[clamp(2.2rem,4vw,3rem)] leading-none">{value}</span>
      <span className="text-[13px] leading-snug text-ink-2">{label}</span>
    </div>
  );
}
