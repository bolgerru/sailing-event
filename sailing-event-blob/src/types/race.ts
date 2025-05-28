type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  league?: string;
  result?: number[] | null;
  boats: {
    teamA: string;
    teamB: string;
  };
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
  endTime?: string;
  goToChangeover?: boolean;
  isLaunching?: boolean;
  isKnockout?: boolean;
  bestOf?: number;
  stage?: string;
  matchNumber?: number;
  racingFormat?: '2v2' | '3v3' | '4v4';
};