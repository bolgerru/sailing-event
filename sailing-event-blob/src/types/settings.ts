export type RacingFormat = '2v2' | '3v3' | '4v4';

export interface Settings {
  useLeagues: boolean;
  leagues: Array<{
    id: string;
    name: string;
    teams: string[];
    boatSets: Array<{
      id: string;
      team1Color: string;
      team2Color: string;
    }>;
  }>;
  teamInput: string;
  boatSets: Array<{
    id: string;
    team1Color: string;
    team2Color: string;
  }>;
  racingFormat: RacingFormat;
  eventName: string;
}