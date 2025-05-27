import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type BoatSet = {
  id: string;
  team1Color: string;
  team2Color: string;
};

type League = {
  id: string;
  name: string;
  teams: string[];
  boatSets: BoatSet[];
};

type Settings = {
  useLeagues: boolean;
  leagues: League[];
};

type KnockoutMatch = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  league: string;
  boats?: {
    teamA: string;
    teamB: string;
    setId: string;
  };
  isKnockout: true;
  bestOf: 1 | 3 | 5;
  stage: 'quarter' | 'semi' | 'final';
  matchNumber: number;
  status: 'not_started';
};

type MatchupInput = {
  teamA: string;
  teamB: string;
  league: string;
  boatSet?: string;
};

// Add new helper function to get previous knockout results
const getPreviousKnockoutResults = async () => {
  try {
    const scheduleFile = path.join(process.cwd(), 'data', 'schedule.json');
    const schedule = JSON.parse(await fs.readFile(scheduleFile, 'utf8'));
    
    // Get all knockout matches
    const knockoutMatches = schedule.filter((match: any) => match.isKnockout);
    
    // Group by stage and get winners
    const results = knockoutMatches.reduce((acc: any, match: any) => {
      if (!acc[match.stage]) {
        acc[match.stage] = new Map();
      }
      
      if (match.status === 'finished') {
        const matchId = `${match.matchNumber}`;
        const currentWins = acc[match.stage].get(matchId) || { 
          teamA: { team: match.teamA, wins: 0 },
          teamB: { team: match.teamB, wins: 0 }
        };
        
        if (match.winner === match.teamA) {
          currentWins.teamA.wins++;
        } else if (match.winner === match.teamB) {
          currentWins.teamB.wins++;
        }
        
        acc[match.stage].set(matchId, currentWins);
      }
      return acc;
    }, {});
    
    return results;
  } catch (error) {
    console.error('Error getting previous knockout results:', error);
    return null;
  }
};

// Remove the DELETE endpoint and keep only the POST endpoint
export async function POST(req: NextRequest) {
  try {
    const { selectedLeagues, matchups, bestOf, stage } = await req.json();
    
    // Get previous knockout results
    const previousResults = await getPreviousKnockoutResults();
    
    // Load existing schedule
    const scheduleFile = path.join(process.cwd(), 'data', 'schedule.json');
    const existingSchedule = JSON.parse(await fs.readFile(scheduleFile, 'utf8'));
    // Changed this line to only consider finished matches when determining next race number
    const lastRaceNumber = Math.max(...existingSchedule.map((r: any) => r.raceNumber), 0);
    let nextRaceNumber = lastRaceNumber + 1;

    // Load settings
    const settingsFile = path.join(process.cwd(), 'data', 'settings.json');
    const settings: Settings = JSON.parse(await fs.readFile(settingsFile, 'utf8'));

    const knockoutSchedule: KnockoutMatch[] = [];
    let currentRaceNumber = nextRaceNumber;

    // Group matchups into pairs
    const matchPairs: MatchupInput[][] = [];
    for (let i = 0; i < matchups.length; i += 2) {
      matchPairs.push(matchups.slice(i, Math.min(i + 2, matchups.length)));
    }

    // Track active boat sets and their current matches
    const activeBoatSets = new Map<string, number>(); // boatSetId -> remaining races
    const matchesByBoatSet = new Map<string, Array<Array<KnockoutMatch>>>();

    // First, create all matches and assign to boat sets
    matchPairs.forEach((pair, pairIndex) => {
      pair.forEach((matchup, indexInPair) => {
        const leagueSettings = settings.leagues.find((l: League) => l.name === matchup.league);
        if (!leagueSettings) {
          throw new Error(`League settings not found for ${matchup.league}`);
        }

        const leagueBoatSets = leagueSettings.boatSets;
        if (leagueBoatSets.length === 0) {
          throw new Error(`No boat sets available for league ${matchup.league}`);
        }

        // Select boat set (either manually chosen or alternating)
        let selectedBoatSet: BoatSet;
        if (matchup.boatSet) {
          const foundSet = settings.leagues.flatMap(l => l.boatSets).find(set => set.id === matchup.boatSet);
          if (!foundSet) {
            throw new Error(`Selected boat set ${matchup.boatSet} not found`);
          }
          selectedBoatSet = foundSet;
        } else {
          // Try to use a free boat set first
          const busyBoatSetIds = Array.from(activeBoatSets.keys());
          selectedBoatSet = leagueBoatSets.find(set => !busyBoatSetIds.includes(set.id)) 
            || leagueBoatSets[indexInPair % leagueBoatSets.length];
        }

        const matchRaces = Array.from({ length: bestOf }, (): KnockoutMatch => ({
          raceNumber: 0,
          teamA: matchup.teamA,
          teamB: matchup.teamB,
          league: matchup.league,
          boats: {
            teamA: selectedBoatSet.team1Color,
            teamB: selectedBoatSet.team2Color,
            setId: selectedBoatSet.id
          },
          isKnockout: true,
          bestOf,
          stage,
          matchNumber: pairIndex * 2 + indexInPair + 1,
          status: 'not_started'
        }));

        // Group by boat set
        if (!matchesByBoatSet.has(selectedBoatSet.id)) {
          matchesByBoatSet.set(selectedBoatSet.id, []);
        }
        matchesByBoatSet.get(selectedBoatSet.id)!.push(matchRaces);
        activeBoatSets.set(selectedBoatSet.id, bestOf);
      });
    });

    // Process races with boat set cycling
    let remainingMatches = true;
    while (remainingMatches) {
      remainingMatches = false;

      // Try to schedule one race from each available boat set
      for (const [boatSetId, matches] of matchesByBoatSet) {
        if (matches.length > 0) {
          remainingMatches = true;
          const currentMatch = matches[0];
          
          // Get next race from current match
          const nextRaceIndex = currentMatch.findIndex(race => race.raceNumber === 0);
          if (nextRaceIndex >= 0) {
            const race = currentMatch[nextRaceIndex];
            race.raceNumber = currentRaceNumber++;
            knockoutSchedule.push(race);

            // If match is complete, remove it and mark boat set as available
            if (nextRaceIndex === currentMatch.length - 1) {
              matches.shift();
            }
          }
        }
      }
    }

    // Sort final schedule by race number
    knockoutSchedule.sort((a, b) => a.raceNumber - b.raceNumber);

    // Save updated schedule
    const newSchedule = [...existingSchedule, ...knockoutSchedule];
    await fs.writeFile(scheduleFile, JSON.stringify(newSchedule, null, 2));

    return NextResponse.json({ success: true, matches: knockoutSchedule });
  } catch (error: any) {
    console.error('Error generating knockout schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate knockout schedule' },
      { status: 500 }
    );
  }
}