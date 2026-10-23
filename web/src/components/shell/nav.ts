import {
  TreeStructure,
  ChartLineUp,
  ChatCircleText,
  Coins,
  Flag,
  Graph,
  Heartbeat,
  Scales,
  SoccerBall,
  UsersThree,
  DiceFive,
} from "@phosphor-icons/react";

/** Grouped by what a visitor wants to do, in plain words (not system names). */
export const NAV_GROUPS = [
  {
    label: "Tournament",
    items: [
      { href: "/app/overview", label: "Overview", icon: SoccerBall },
      { href: "/app/matches", label: "Matches", icon: TreeStructure },
      { href: "/app/simulator", label: "Simulator", icon: DiceFive },
    ],
  },
  {
    label: "Players",
    items: [
      { href: "/app/players", label: "All players", icon: UsersThree },
      { href: "/app/valuations", label: "Model vs market", icon: Coins },
    ],
  },
  {
    label: "Nations",
    items: [
      { href: "/app/teams", label: "Teams", icon: Flag },
      { href: "/app/compare", label: "Compare two", icon: Scales },
      { href: "/app/network", label: "Club network", icon: Graph },
    ],
  },
  {
    label: "Check the work",
    items: [
      { href: "/app/analyst", label: "Ask the analyst", icon: ChatCircleText },
      { href: "/app/models", label: "Model report", icon: ChartLineUp },
      { href: "/app/status", label: "System status", icon: Heartbeat },
    ],
  },
] as const;
