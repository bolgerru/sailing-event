export interface BoatSet {
  id: string;
  team1Color: string;
  team2Color: string;
}

export interface League {
  id: string;
  name: string;
  teams: string[];
  boatSets: BoatSet[];
}