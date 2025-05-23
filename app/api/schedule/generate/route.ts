// app/api/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface BoatSet {
  id: string;
  team1Color: string;
  team2Color: string;
}

// Update TeamBoatState to track colors per boat set
interface TeamBoatState {
  lastColor: { [boatSetId: string]: string };
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
    let teamsInLastThree = 0;
    for (const race of lastThreeRaces) {
      if (race.includes(teamA)) teamsInLastThree++;
      if (race.includes(teamB)) teamsInLastThree++;
    }
    return teamsInLastThree < 3;
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
  
  console.log('\nInitial all possible pairings:', allRaceCombos);
  
  // Add first race
  finalListOfRaces.push(allRaceCombos[0]);
  console.log(`\nAdding first race: ${allRaceCombos[0].join(' vs ')}`);
  allRaceCombos.splice(0, 1);

  for (let i = 0; i < allRaceCombos.length; i++) {
    console.log(`\n--- Finding race #${i + 2} ---`);
    console.log(`Last race was: ${finalListOfRaces[i].join(' vs ')}`);
    
    // Get possible next races that share a team with current race
    const possibleNextRaces1 = allRaceCombos.filter(race => 
      race.some(team => finalListOfRaces[i].includes(team))
    );
    console.log('Races sharing a team with last race:', 
      possibleNextRaces1.map(r => r.join(' vs ')));
    
    // Apply filters
    const possibleNextRaces = filterPreviousRaces(possibleNextRaces1, finalListOfRaces);
    console.log('After filtering 3-race sequences:', 
      possibleNextRaces.map(r => r.join(' vs ')));
    
    const optimalNextRaces = filterPreviousRacesFurther(possibleNextRaces, finalListOfRaces);
    console.log('After filtering 2-race sequences:', 
      optimalNextRaces.map(r => r.join(' vs ')));
    
    let selectedRace: [string, string];
    
    if (optimalNextRaces.length > 0) {
      selectedRace = optimalNextRaces[Math.floor(Math.random() * optimalNextRaces.length)];
      console.log('Selected from optimal races:', selectedRace.join(' vs '));
    } else if (possibleNextRaces.length > 0) {
      selectedRace = possibleNextRaces[Math.floor(Math.random() * possibleNextRaces.length)];
      console.log('No optimal races, selected from possible races:', selectedRace.join(' vs '));
    } else if (allRaceCombos.length > 0) {
      selectedRace = allRaceCombos[Math.floor(Math.random() * allRaceCombos.length)];
      console.log('No connected races available, selected random race:', selectedRace.join(' vs '));
    } else {
      console.log('No more races available, breaking');
      break;
    }
    
    finalListOfRaces.push(selectedRace);
    const index = allRaceCombos.findIndex(
      race => race[0] === selectedRace[0] && race[1] === selectedRace[1]
    );
    allRaceCombos.splice(index, 1);
    console.log('Remaining unscheduled pairings:', allRaceCombos.length);
  }
  
  console.log('\nFinal schedule:', finalListOfRaces.map(r => r.join(' vs ')));
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
      
      // Check if teams raced in last race using this boat set
      const lastBoatSetIndex = Math.floor((index - 1) / boatSets.length) * boatSets.length + (index - 1) % boatSets.length;
      const isTeamAConsecutiveInSet = teamAState && lastBoatSetIndex >= 0 && teamAState.lastRace === lastBoatSetIndex;
      const isTeamBConsecutiveInSet = teamBState && lastBoatSetIndex >= 0 && teamBState.lastRace === lastBoatSetIndex;

      console.log(`Race ${index + 1} using boat set ${boatSet.id}:`, {
        teamA: `${teamA} (prev color: ${teamAState?.lastColor[boatSet.id]})`,
        teamB: `${teamB} (prev color: ${teamBState?.lastColor[boatSet.id]})`
      });

      // Determine positions based on previous colors in this boat set
      let finalTeamA = teamA;
      let finalTeamB = teamB;

      if (isTeamAConsecutiveInSet && teamAState?.lastColor[boatSet.id] === boatSet.team2Color) {
        // Swap positions if teamA was in team2Color
        finalTeamA = teamB;
        finalTeamB = teamA;
        console.log(`Swapping positions to keep ${teamA} in ${teamAState.lastColor[boatSet.id]}`);
      } else if (isTeamBConsecutiveInSet && teamBState?.lastColor[boatSet.id] === boatSet.team1Color) {
        // Swap positions if teamB was in team1Color
        finalTeamA = teamB;
        finalTeamB = teamA;
        console.log(`Swapping positions to keep ${teamB} in ${teamBState.lastColor[boatSet.id]}`);
      }

      // Update states with color per boat set
      teamBoatStates.set(finalTeamA, {
        lastColor: {
          ...teamAState?.lastColor,
          [boatSet.id]: boatSet.team1Color
        },
        lastRace: index
      });
      
      teamBoatStates.set(finalTeamB, {
        lastColor: {
          ...teamBState?.lastColor,
          [boatSet.id]: boatSet.team2Color
        },
        lastRace: index
      });

      return {
        raceNumber: index + 1,
        teamA: finalTeamA,
        teamB: finalTeamB,
        boats: {
          teamA: boatSet.team1Color,
          teamB: boatSet.team2Color
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
