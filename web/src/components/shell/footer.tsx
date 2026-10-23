// Site footer: same structure as ImmoDash (brand + status, link columns, author, legal bar) so the
// portfolio projects read as one body of work, drawn in FootballIQ's wall-chart tokens.
import Link from "next/link";
import { ArrowUpRight, GithubLogo, Globe, LinkedinLogo } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/shell/wordmark";
import { SITE } from "@/lib/site";

const LINKEDIN = "https://linkedin.com/in/zoeb-ali-khan";
const GITHUB = "https://github.com/zoeb-ali";
const DATASET = "https://www.kaggle.com/datasets/mominullptr/fifa-world-cup-2026-dataset";

type FooterLink = { href: string; label: string; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "The wall chart" },
      { href: "/app/matches", label: "Matches and groups" },
      { href: "/app/simulator", label: "Match simulator" },
      { href: "/app/players", label: "All players" },
      { href: "/app/valuations", label: "Model vs market" },
      { href: "/app/teams", label: "Teams" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/app/models", label: "How the model is tested" },
      { href: "/app/analyst", label: "Ask the analyst" },
      { href: "/app/status", label: "System status" },
      { href: DATASET, label: "Data source", external: true },
      { href: SITE.repo, label: "Source code", external: true },
      { href: `${SITE.repo}/issues`, label: "Report an issue", external: true },
    ],
  },
  {
    title: "Author",
    links: [
      { href: SITE.authorUrl, label: "Portfolio", external: true },
      { href: LINKEDIN, label: "LinkedIn", external: true },
      { href: GITHUB, label: "GitHub", external: true },
    ],
  },
];

const ICON_BTN =
  "grid h-9 w-9 place-items-center rounded-full border border-rule bg-sheet text-ink-2 transition-colors " +
  "hover:text-ink active:scale-95 pointer-coarse:h-11 pointer-coarse:w-11";

export function Footer() {
  return (
    <footer className="border-t border-rule bg-sheet text-[14px] leading-relaxed text-ink-3">
      <div className="wrap">
        <div className="grid gap-10 pb-9 pt-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-[clamp(48px,6vw,120px)]">
          <div className="grid max-w-[44ch] content-start gap-4">
            <Wordmark className="justify-self-start" />
            <p className="text-ink-2">
              The 2026 World Cup, explained by models you can check. An independent data project by Zoeb Ali Khan,
              M.Sc. Data Science student at Universität Bielefeld.
            </p>
            <p className="flex items-baseline gap-2.5 text-[13px]">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full bg-pitch ring-[3px] ring-pitch-wash" />
              <span>Tournament complete: all 104 matches, final played 19 July 2026.</span>
            </p>
            <div className="flex gap-2">
              <a className={ICON_BTN} href={SITE.repo} aria-label="FootballIQ source code on GitHub">
                <GithubLogo size={18} weight="bold" aria-hidden />
              </a>
              <a className={ICON_BTN} href={LINKEDIN} aria-label="Zoeb Ali Khan on LinkedIn">
                <LinkedinLogo size={18} weight="bold" aria-hidden />
              </a>
              <a className={ICON_BTN} href={SITE.authorUrl} aria-label="Zoeb Ali Khan portfolio">
                <Globe size={18} weight="bold" aria-hidden />
              </a>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3" aria-label="Footer">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <h2 className="mb-3.5 text-[13px] font-semibold text-ink">{c.title}</h2>
                <ul className="grid gap-2.5 pointer-coarse:gap-0">
                  {c.links.map((l) => {
                    const cls =
                      "inline-flex items-center gap-1 text-ink-2 transition-colors hover:text-marker " +
                      "pointer-coarse:min-h-11";
                    return (
                      <li key={l.href + l.label}>
                        {l.external ? (
                          <a className={cls} href={l.href} target="_blank" rel="noopener noreferrer">
                            {l.label}
                            <ArrowUpRight size={12} weight="bold" aria-hidden className="opacity-55" />
                          </a>
                        ) : (
                          <Link className={cls} href={l.href}>
                            {l.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="grid gap-2 border-t border-rule pb-7 pt-5 text-[12.5px] leading-[1.55] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-x-[clamp(48px,6vw,120px)]">
          <p>
            &copy; 2026 Zoeb Ali Khan. A student portfolio project, not affiliated with or endorsed by FIFA. Model
            estimates, not betting or transfer advice.
          </p>
          <p>
            Match, squad and event data: FIFA World Cup 2026 Dataset by Md Mominul Islam (Kaggle, CC0), with one
            cited correction. Flags from flag-icons (MIT). Icons from Phosphor (MIT).
          </p>
        </div>
      </div>
    </footer>
  );
}
