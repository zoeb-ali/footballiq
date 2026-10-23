/**
 * Plain-language names for the valuation model's features, so explanations
 * read as football, not as column names. The raw name stays in a tooltip.
 */
export const FEATURE_LABELS: Record<string, string> = {
  age_years: "Age at the tournament",
  height_cm: "Height",
  caps: "International caps",
  international_goals: "International goals (career)",
  minutes_played: "Minutes played at the tournament",
  appearances: "Appearances",
  starts: "Starts",
  goals_p90: "Goals per 90 minutes",
  assists_p90: "Assists per 90 minutes",
  cards_p90: "Cards per 90 minutes",
  low_minutes_flag: "Played under 90 minutes",
  team_elo: "National team strength (Elo)",
  team_fifa_ranking: "National team FIFA ranking",
  club_count: "World Cup squad-mates at his club",
  club_avg_team_elo: "Strength of nations his club supplies",
  club_nations: "Nations his club supplies",
  pos_GK: "Goalkeeper",
  pos_DEF: "Defender",
  pos_MID: "Midfielder",
  pos_FWD: "Forward",
};

export function featureLabel(name: string): string {
  return FEATURE_LABELS[name] ?? name.replace(/_/g, " ");
}

/** Feature value as a person would say it. */
export function featureValue(name: string, value: number): string {
  if (name.startsWith("pos_") || name === "low_minutes_flag") return value >= 0.5 ? "yes" : "no";
  if (name === "height_cm") return `${Math.round(value)} cm`;
  if (name.endsWith("_p90")) return value.toFixed(2);
  if (name === "club_avg_team_elo") return String(Math.round(value));
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
