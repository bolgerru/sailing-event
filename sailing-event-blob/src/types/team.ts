export type Team = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  league: string;
};

export type TeamStats = {
  team: Team;
  totalRaces: number;
  winPercentage: number;
  tiebreakNote?: string;
};