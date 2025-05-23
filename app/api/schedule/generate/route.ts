// app/api/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface BoatSet {
  id: string;
  team1Color: string;
  team2Color: string;
}

// Add type for tracking team colors
interface TeamBoatState {
  lastColor?: string;
  lastRace: number;
}

// Helper functions
function createTeamPairings(teams: string[]): [string, string][] {
  const pairings: [string, string][] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      pairings.push([teams[i], teams[j]]);
    }
  }
  return pairings;
}

function filterPreviousRaces(
  pairings: [string, string][], 
  previousRaces: [string, string][]
): [string, string][] {
  if (previousRaces.length < 3) return pairings;
  
  const lastThreeRaces = previousRaces.slice(-3);
  
  return pairings.filter(([teamA, teamB]) => {
    // Check each team's race pattern in last 3 races
    const teamAPattern = lastThreeRaces.map(race => race.includes(teamA));
    const teamBPattern = lastThreeRaces.map(race => race.includes(teamB));
    
    // Count consecutive races and rest periods
    const needsMoreRest = (pattern: boolean[]) => {
      // If team raced in 2 of last 3 races with only 1 race rest, filter out
      if (pattern[0] && pattern[2]) return true;
      // If team raced in all 3 races
      if (pattern.filter(x => x).length === 3) return true;
      return false;
    };

    console.log(`Checking rest for possible race ${teamA} vs ${teamB}:`, {
      [`${teamA} pattern`]: teamAPattern,
      [`${teamB} pattern`]: teamBPattern
    });

    return !needsMoreRest(teamAPattern) && !needsMoreRest(teamBPattern);
  });
}

function filterPreviousRacesFurther(
  pairings: [string, string][], 
  previousRaces: [string, string][]
): [string, string][] {
  if (previousRaces.length < 2) return pairings;
  
  const lastTwoRaces = previousRaces.slice(-2);
  return pairings.filter(([teamA, teamB]) => {
    let teamsInLastTwo = 0;
    for (const race of lastTwoRaces) {
      if (race.includes(teamA)) teamsInLastTwo++;
      if (race.includes(teamB)) teamsInLastTwo++;
    }
    return teamsInLastTwo < 2;
  });
}

function generateGoodOrder(teams: string[]): [string, string][] {
  const allRaceCombos = createTeamPairings(teams);
  const finalListOfRaces: [string, string][] = [];
  
  console.log('\n=== Initial Setup ===');
  console.log('All possible pairings:', allRaceCombos.map(r => r.join(' vs ')));
  
  // Add first race
  finalListOfRaces.push(allRaceCombos[0]);
  console.log('\n=== First Race ===');
  console.log(`Selected: ${allRaceCombos[0].join(' vs ')}`);
  allRaceCombos.splice(0, 1);

  for (let i = 0; i < allRaceCombos.length; i++) {
    console.log('\n================================================');
    console.log(`=== Finding Race #${i + 2} ===`);
    console.log('================================================');
    console.log(`Previous race: ${finalListOfRaces[i].join(' vs ')}`);
    
    // Get possible next races that share a team with current race
    const possibleNextRaces1 = allRaceCombos.filter(race => 
      race.some(team => finalListOfRaces[i].includes(team))
    );
    console.log('\n1. Initial Filter - Races sharing a team with last race:');
    console.log(possibleNextRaces1.map(r => r.join(' vs ')));
    
    // Apply 3-race sequence filter
    const possibleNextRaces = filterPreviousRaces(possibleNextRaces1, finalListOfRaces);
    console.log('\n2. Three-Race Filter - Remove teams racing 3 times in a row:');
    console.log('Races remaining:', possibleNextRaces.map(r => r.join(' vs ')));
    
    // Apply 2-race sequence filter
    const optimalNextRaces = filterPreviousRacesFurther(possibleNextRaces, finalListOfRaces);
    console.log('\n3. Two-Race Filter - Remove teams racing twice in a row:');
    console.log('Optimal races:', optimalNextRaces.map(r => r.join(' vs ')));
    
    let selectedRace: [string, string];
    
    // Race selection logic with detailed logging
    console.log('\n4. Race Selection:');
    if (optimalNextRaces.length > 0) {
      selectedRace = optimalNextRaces[Math.floor(Math.random() * optimalNextRaces.length)];
      console.log('✓ Selected from optimal races (no consecutive races)');
    } else if (possibleNextRaces.length > 0) {
      selectedRace = possibleNextRaces[Math.floor(Math.random() * possibleNextRaces.length)];
      console.log('⚠ No optimal races available, selected from races without 3 consecutive');
    } else if (allRaceCombos.length > 0) {
      selectedRace = allRaceCombos[Math.floor(Math.random() * allRaceCombos.length)];
      console.log('⚠ No connected races available, selected random remaining race');
    } else {
      console.log('❌ No more races available, breaking');
      break;
    }
    
    console.log(`Selected: ${selectedRace.join(' vs ')}`);
    
    // Update race lists
    finalListOfRaces.push(selectedRace);
    const index = allRaceCombos.findIndex(
      race => race[0] === selectedRace[0] && race[1] === selectedRace[1]
    );
    allRaceCombos.splice(index, 1);
    console.log('\n5. Schedule Update:');
    console.log('Remaining unscheduled pairings:', allRaceCombos.length);
    console.log('Current schedule:', finalListOfRaces.map((r, idx) => 
      `Race ${idx + 1}: ${r.join(' vs ')}`
    ));
  }
  
  console.log('\n=== Final Schedule ===');
  console.log(finalListOfRaces.map((r, idx) => 
    `Race ${idx + 1}: ${r.join(' vs ')}`
  ));
  
  return finalListOfRaces;
}

// Update POST handler
export async function POST(req: NextRequest) {
  try {
    const { teams, boatSets } = await req.json();

    if (!Array.isArray(teams) || teams.length < 2) {
      return NextResponse.json(
        { error: 'Please provide at least 2 teams' },
        { status: 400 }
      );
    }

    if (!Array.isArray(boatSets) || boatSets.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one boat set' },
        { status: 400 }
      );
    }

    const orderedPairings = generateGoodOrder(teams);
    const teamBoatStates = new Map<string, TeamBoatState>();
    
    const races = orderedPairings.map((pairing, index) => {
      const boatSet = boatSets[index % boatSets.length];
      const [teamA, teamB] = pairing;
      
      // Get previous states
      const teamAState = teamBoatStates.get(teamA);
      const teamBState = teamBoatStates.get(teamB);
      
      // Check if teams raced in last race
      const isTeamAConsecutive = teamAState && (index - teamAState.lastRace === 1);
      const isTeamBConsecutive = teamBState && (index - teamBState.lastRace === 1);

      // Always assign consistent colors based on position
      const teamAColor = boatSet.team1Color;  // TeamA always gets team1Color
      const teamBColor = boatSet.team2Color;  // TeamB always gets team2Color

      // If teams are racing consecutively, swap their positions if needed
      if (isTeamAConsecutive && teamAState?.lastColor === boatSet.team2Color) {
        // Swap positions to maintain color
        return {
          raceNumber: index + 1,
          teamA: teamB,
          teamB: teamA,
          boats: {
            teamA: teamAColor,
            teamB: teamBColor
          },
          result: Array(6).fill(0)
        };
      }

      // Update states
      teamBoatStates.set(teamA, { lastColor: teamAColor, lastRace: index });
      teamBoatStates.set(teamB, { lastColor: teamBColor, lastRace: index });

      return {
        raceNumber: index + 1,
        teamA,
        teamB,
        boats: {
          teamA: teamAColor,
          teamB: teamBColor
        },
        result: Array(6).fill(0)
      };
    });

    const filePath = path.join(process.cwd(), 'data/schedule.json');
    fs.writeFileSync(filePath, JSON.stringify(races, null, 2));

    return NextResponse.json({ success: true, count: races.length });
  } catch (error) {
    console.error('Schedule generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}
