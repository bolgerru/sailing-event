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
  boatSets: BoatSet[];
  racingFormat?: '2v2' | '3v3' | '4v4'; // Add this line
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
  racingFormat?: '2v2' | '3v3' | '4v4'; // Add this line
};

type MatchupInput = {
  teamA: string;
  teamB: string;
  league: string;
  boatSet?: string;
  matchNumber?: number;
};

export async function POST(req: NextRequest) {
  try {
    const { selectedLeagues, matchups, bestOf, stage, racingFormat } = await req.json(); // Add racingFormat
    
    console.log('Received knockout request:', { selectedLeagues, matchups, bestOf, stage, racingFormat });
    
    // Load existing schedule
    const scheduleFile = path.join(process.cwd(), 'data', 'schedule.json');
    const existingSchedule = JSON.parse(await fs.readFile(scheduleFile, 'utf8'));
    const lastRaceNumber = Math.max(...existingSchedule.map((r: any) => r.raceNumber), 0);
    let nextRaceNumber = lastRaceNumber + 1;

    // Load settings to get the current racing format if not provided
    const settingsFile = path.join(process.cwd(), 'data', 'settings.json');
    const settings: Settings = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
    
    // Use provided racing format or fall back to settings
    const finalRacingFormat = racingFormat || settings.racingFormat || '3v3';
    
    console.log('Using racing format:', finalRacingFormat);
    console.log('Loaded settings:', settings);

    const knockoutSchedule: KnockoutMatch[] = [];

    // Group matchups by their assigned boat set
    const matchupsByBoatSet: { [boatSetId: string]: MatchupInput[] } = {};
    
    matchups.forEach((matchup: MatchupInput) => {
      const boatSetId = matchup.boatSet || 'default-boats';
      if (!matchupsByBoatSet[boatSetId]) {
        matchupsByBoatSet[boatSetId] = [];
      }
      matchupsByBoatSet[boatSetId].push(matchup);
    });

    console.log('Matchups grouped by boat set:', matchupsByBoatSet);

    // FIXED: Schedule matches sequentially within each boat set
    // Track the next available race number for each boat set
    const boatSetNextRaceNumber: { [boatSetId: string]: number } = {};
    
    // Initialize all boat sets to start at the current race number
    Object.keys(matchupsByBoatSet).forEach(boatSetId => {
      boatSetNextRaceNumber[boatSetId] = nextRaceNumber;
    });

    // FIXED: Process matches by boat set, ensuring sequential completion
    for (const [boatSetId, boatSetMatchups] of Object.entries(matchupsByBoatSet)) {
      console.log(`\nProcessing boat set: ${boatSetId}`);
      
      // Find the boat set details
      let selectedBoatSet: BoatSet | null = null;
      
      if (settings.useLeagues) {
        // Look in league settings
        for (const league of settings.leagues) {
          const foundSet = league.boatSets?.find(set => set.id === boatSetId);
          if (foundSet) {
            selectedBoatSet = foundSet;
            break;
          }
        }
      } else {
        // Look in global settings
        selectedBoatSet = settings.boatSets?.find(set => set.id === boatSetId) || null;
      }

      // Create default if not found
      if (!selectedBoatSet) {
        console.warn(`Boat set ${boatSetId} not found, creating default`);
        selectedBoatSet = {
          id: boatSetId,
          team1Color: 'Red Boats',
          team2Color: 'Blue Boats'
        };
      }

      // FIXED: Process matches in this boat set sequentially
      boatSetMatchups.forEach((matchup, matchIndex) => {
        console.log(`  Processing Match ${matchup.matchNumber || matchIndex + 1} in boat set ${boatSetId}`);
        
        // Create all races for this match before moving to the next match
        for (let raceIndex = 0; raceIndex < bestOf; raceIndex++) {
          const raceNumber = boatSetNextRaceNumber[boatSetId];
          
          const race: KnockoutMatch = {
            raceNumber: raceNumber,
            teamA: matchup.teamA,
            teamB: matchup.teamB,
            league: matchup.league,
            boats: {
              teamA: selectedBoatSet!.team1Color,
              teamB: selectedBoatSet!.team2Color,
              setId: selectedBoatSet!.id
            },
            isKnockout: true,
            bestOf,
            stage,
            matchNumber: matchup.matchNumber || matchIndex + 1,
            status: 'not_started',
            racingFormat: finalRacingFormat // Add racing format to each race
          };

          knockoutSchedule.push(race);
          console.log(`    Created race ${race.raceNumber}: ${race.teamA} vs ${race.teamB} (Match ${race.matchNumber}, Race ${raceIndex + 1}/${bestOf}) - ${finalRacingFormat} format`);
          
          // Increment race number for this boat set
          boatSetNextRaceNumber[boatSetId]++;
        }
        
        console.log(`  Match ${matchup.matchNumber || matchIndex + 1} complete. Next available race in ${boatSetId}: ${boatSetNextRaceNumber[boatSetId]}`);
      });
    }

    // IMPROVED: Now interleave races across different boat sets
    // Create a timeline of all races, then assign race numbers to minimize gaps
    const racesByBoatSet: { [boatSetId: string]: KnockoutMatch[] } = {};
    knockoutSchedule.forEach(race => {
      const boatSetId = race.boats?.setId || 'unknown';
      if (!racesByBoatSet[boatSetId]) {
        racesByBoatSet[boatSetId] = [];
      }
      racesByBoatSet[boatSetId].push(race);
    });

    // FIXED: Reassign race numbers to optimize parallel execution with unique sequential numbers
    let currentGlobalRaceNumber = nextRaceNumber;
    
    // Create an ordered list of races that maintains the proper interleaving
    const orderedRaces: KnockoutMatch[] = [];
    
    // Process all races in chronological order within their boat sets
    const maxRacesInAnyBoatSet = Math.max(...Object.values(racesByBoatSet).map(races => races.length));
    
    for (let raceIndex = 0; raceIndex < maxRacesInAnyBoatSet; raceIndex++) {
      // For each boat set, add the next race if it exists
      Object.keys(racesByBoatSet).forEach(boatSetId => {
        const boatSetRaces = racesByBoatSet[boatSetId];
        
        if (raceIndex < boatSetRaces.length) {
          const race = boatSetRaces[raceIndex];
          orderedRaces.push(race);
        }
      });
    }

    // FIXED: Assign sequential race numbers to the ordered races
    orderedRaces.forEach((race, index) => {
      const newRaceNumber = nextRaceNumber + index;
      console.log(`Reassigning race: ${race.teamA} vs ${race.teamB} (${race.boats?.setId}) from ${race.raceNumber} → ${newRaceNumber}`);
      race.raceNumber = newRaceNumber;
    });

    // Update the knockout schedule to use the reordered races
    knockoutSchedule.length = 0;
    knockoutSchedule.push(...orderedRaces);

    // VERIFICATION: Check for duplicate race numbers
    const raceNumbers = knockoutSchedule.map(race => race.raceNumber);
    const uniqueRaceNumbers = new Set(raceNumbers);
    
    if (raceNumbers.length !== uniqueRaceNumbers.size) {
      console.error('DUPLICATE RACE NUMBERS DETECTED!');
      console.error('Race numbers:', raceNumbers.sort((a, b) => a - b));
      throw new Error('Internal error: Duplicate race numbers generated');
    }

    console.log('Race number verification passed - all numbers are unique');
    console.log('Final race numbers:', raceNumbers.sort((a, b) => a - b));

    // Sort the knockout schedule by race number to ensure proper order
    knockoutSchedule.sort((a, b) => a.raceNumber - b.raceNumber);

    // Save updated schedule
    const newSchedule = [...existingSchedule, ...knockoutSchedule];
    await fs.writeFile(scheduleFile, JSON.stringify(newSchedule, null, 2));

    console.log(`\nSuccessfully created ${knockoutSchedule.length} knockout races`);
    console.log('Final race scheduling summary:');
    
    // Group by match for better logging
    const matchGroups: { [key: string]: KnockoutMatch[] } = {};
    knockoutSchedule.forEach(race => {
      const key = `${race.boats?.setId}-Match${race.matchNumber}`;
      if (!matchGroups[key]) {
        matchGroups[key] = [];
      }
      matchGroups[key].push(race);
    });

    Object.entries(matchGroups).forEach(([key, races]) => {
      const boatSetId = races[0].boats?.setId;
      const matchNumber = races[0].matchNumber;
      const raceNumbers = races.map(r => r.raceNumber).sort((a, b) => a - b).join(', ');
      console.log(`  Match ${matchNumber}: Races ${raceNumbers} using ${boatSetId} (${races[0].teamA} vs ${races[0].teamB})`);
    });

    return NextResponse.json({ 
      success: true, 
      matches: knockoutSchedule,
      racesCreated: knockoutSchedule.length
    });
    
  } catch (error: any) {
    console.error('Error generating knockout schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate knockout schedule' },
      { status: 500 }
    );
  }
}