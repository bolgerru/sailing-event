import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type RacingFormat = '2v2' | '3v3' | '4v4';

interface BoatSet {
  id: string;
  team1Color: string;
  team2Color: string;
}

interface Race {
  raceNumber: number;
  teamA: string;
  teamB: string;
  league?: string;
  boats: {
    teamA: string;
    teamB: string;
  };
  result?: number[];
  isLaunching?: boolean;
  goToChangeover?: boolean;
  startTime?: string;
  endTime?: string;
  status?: string;
  racingFormat?: RacingFormat;
}

interface League {
  name: string;
  teams: string[];
  boatSets: BoatSet[];
}

interface LeagueQueue {
  name: string;
  teams: string[];
  boatSets: BoatSet[];
  remainingPairings: [string, string][];
  races: Race[];
}

// Helper functions (same as in generate route)
function countTeamInLastNRacesOfSet(
  team: string, 
  boatSet: BoatSet, 
  n: number, 
  races: Race[]
): number {
  const recentRaces = races.slice(-n);
  return recentRaces.filter(
    (r) =>
      (r.teamA === team || r.teamB === team) &&
      r.boats.teamA === boatSet.team1Color &&
      r.boats.teamB === boatSet.team2Color
  ).length;
}

function appearedInBothLast2RacesOfSet(
  team: string, 
  boatSet: BoatSet, 
  races: Race[]
): boolean {
  const racesOfSameSet = races.filter(
    (r) =>
      (r.boats.teamA === boatSet.team1Color && r.boats.teamB === boatSet.team2Color) ||
      (r.boats.teamA === boatSet.team2Color && r.boats.teamB === boatSet.team1Color)
  );

  const lastTwoSameSet = racesOfSameSet.slice(-2);

  if (lastTwoSameSet.length < 2) {
    return false;
  }

  return lastTwoSameSet.every(r => 
    (r.teamA === team || r.teamB === team) && 
    ((r.boats.teamA === boatSet.team1Color && r.boats.teamB === boatSet.team2Color) ||
     (r.boats.teamA === boatSet.team2Color && r.boats.teamB === boatSet.team1Color))
  );
}

function totalRacesPlayed(team: string, races: Race[]): number {
  return races.filter(r => r.teamA === team || r.teamB === team).length;
}

function generatePairings(teams: string[]): [string, string][] {
  const pairings: [string, string][] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      if (teams[i] !== teams[j]) {
        pairings.push([teams[i], teams[j]]);
      }
    }
  }
  return pairings;
}

function selectNextPairing(
  remainingPairings: [string, string][],
  races: Race[],
  currentBoatSet: BoatSet
): { teamA: string; teamB: string } {
  // Same logic as in the main generation route
  const lastTwoRaces = races.slice(-2);
  const recentOtherBoatSetRaces = lastTwoRaces.filter(
    (r) =>
      r.boats.teamA !== currentBoatSet.team1Color ||
      r.boats.teamB !== currentBoatSet.team2Color
  );

  const recentlyRacedTeams = new Set<string>();
  recentOtherBoatSetRaces.forEach((r) => {
    recentlyRacedTeams.add(r.teamA);
    recentlyRacedTeams.add(r.teamB);
  });

  const candidates = remainingPairings.filter(
    ([teamA, teamB]) =>
      !recentlyRacedTeams.has(teamA) && !recentlyRacedTeams.has(teamB)
  );

  let filter1Candidates = candidates;
  if (filter1Candidates.length === 0) {
    filter1Candidates = [...remainingPairings];
  }

  const lastRaceOfBoatSet = [...races].reverse().find(
    (r) => r.boats.teamA === currentBoatSet.team1Color && r.boats.teamB === currentBoatSet.team2Color
  );

  const candidatesWithLastRaceTeam = filter1Candidates.filter(
    ([teamA, teamB]) => {
      if (!lastRaceOfBoatSet) return false;
      return (
        lastRaceOfBoatSet.teamA === teamA ||
        lastRaceOfBoatSet.teamB === teamA ||
        lastRaceOfBoatSet.teamA === teamB ||
        lastRaceOfBoatSet.teamB === teamB
      );
    }
  );

  const filter3Candidates = candidatesWithLastRaceTeam.length > 0 ? candidatesWithLastRaceTeam : filter1Candidates;

  const notInBothLast2 = filter3Candidates.filter(
    ([teamA, teamB]) =>
      !appearedInBothLast2RacesOfSet(teamA, currentBoatSet, races) &&
      !appearedInBothLast2RacesOfSet(teamB, currentBoatSet, races)
  );

  const finalCandidates = notInBothLast2.length > 0 ? notInBothLast2 : filter3Candidates;

  let bestCount = Infinity;
  let bestCandidates: [string, string][] = [];

  for (const pairing of finalCandidates) {
    const [teamA, teamB] = pairing;
    const teamACount = countTeamInLastNRacesOfSet(teamA, currentBoatSet, 2, races);
    const teamBCount = countTeamInLastNRacesOfSet(teamB, currentBoatSet, 2, races);
    const totalCount = teamACount + teamBCount;

    if (totalCount < bestCount) {
      bestCount = totalCount;
      bestCandidates = [pairing];
    } else if (totalCount === bestCount) {
      bestCandidates.push(pairing);
    }
  }

  let selectedPairing = bestCandidates[0];
  if (bestCandidates.length > 1) {
    let lowestSum = Infinity;
    for (const pairing of bestCandidates) {
      const sumRaces =
        totalRacesPlayed(pairing[0], races) + totalRacesPlayed(pairing[1], races);
      if (sumRaces < lowestSum) {
        lowestSum = sumRaces;
        selectedPairing = pairing;
      }
    }
  }

  let teamA = selectedPairing[0];
  let teamB = selectedPairing[1];

  const lastRace = [...races].reverse().find(
    (r) =>
      r.boats.teamA === currentBoatSet.team1Color &&
      r.boats.teamB === currentBoatSet.team2Color
  );

  if (lastRace) {
    const { teamA: lastTeamA, teamB: lastTeamB } = lastRace;
    const teamAPosition = lastTeamA === teamA ? 'A' : lastTeamB === teamA ? 'B' : null;
    const teamBPosition = lastTeamA === teamB ? 'A' : lastTeamB === teamB ? 'B' : null;

    if (teamAPosition && teamBPosition) {
      if (teamAPosition === 'A' && teamBPosition === 'B') {
        // positions correct, no change
      } else if (teamAPosition === 'B' && teamBPosition === 'A') {
        [teamA, teamB] = [teamB, teamA];
      }
    } else if (teamAPosition) {
      if (teamAPosition === 'B') {
        [teamA, teamB] = [teamB, teamA];
      }
    } else if (teamBPosition) {
      if (teamBPosition === 'A') {
        [teamA, teamB] = [teamB, teamA];
      }
    }
  }

  return { teamA, teamB };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Load existing schedule
    const dataFile = path.join(process.cwd(), 'data', 'schedule.json');
    let existingRaces: Race[] = [];
    
    try {
      const data = await fs.readFile(dataFile, 'utf8');
      existingRaces = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, start with empty array
      existingRaces = [];
    }

    // Find the highest race number to continue numbering
    let globalRaceNumber = existingRaces.length > 0 
      ? Math.max(...existingRaces.map(r => r.raceNumber)) + 1 
      : 1;

    const newRaces: Race[] = [];

    if (body.leagues) {
      // League mode - use same logic as main generation
      const leagueQueues = body.leagues.map((league: League) => ({
        name: league.name,
        teams: league.teams,
        boatSets: league.boatSets,
        remainingPairings: generatePairings(league.teams),
        races: [] as Race[]
      }));

      // Find max number of boat sets across all leagues
      const maxBoatSets = Math.max(...leagueQueues.map((q: LeagueQueue) => q.boatSets.length));

      // Continue while any league has remaining pairings
      while (leagueQueues.some((q: LeagueQueue) => q.remainingPairings.length > 0)) {
        // For each boat set position in the cycle
        for (let boatSetPosition = 0; boatSetPosition < maxBoatSets; boatSetPosition++) {
          // Try to schedule a race for each league that has this boat set position
          for (const queue of leagueQueues) {
            // Skip if league has no more pairings or doesn't have this boat set position
            if (queue.remainingPairings.length === 0 || boatSetPosition >= queue.boatSets.length) {
              continue;
            }

            const currentBoatSet = queue.boatSets[boatSetPosition];

            // Use existing logic to select next pairing for this boat set
            // Include existing races in the analysis for continuity
            const allRacesForAnalysis = [...existingRaces.filter(r => r.league === queue.name), ...queue.races];
            
            const selectedTeams = selectNextPairing(
              queue.remainingPairings,
              allRacesForAnalysis,
              currentBoatSet
            );

            // Add race
            const race: Race = {
              raceNumber: globalRaceNumber++,
              teamA: selectedTeams.teamA,
              teamB: selectedTeams.teamB,
              league: queue.name,
              boats: {
                teamA: currentBoatSet.team1Color,
                teamB: currentBoatSet.team2Color,
              },
              racingFormat: body.racingFormat || '3v3'
            };

            queue.races.push(race);
            newRaces.push(race);

            // Remove used pairing
            queue.remainingPairings = queue.remainingPairings.filter(
              ([a, b]: [string, string]) => !(
                (a === selectedTeams.teamA && b === selectedTeams.teamB) ||
                (a === selectedTeams.teamB && b === selectedTeams.teamA)
              )
            );
          }
        }
      }
    } else {
      // Non-league mode
      const { teams, boatSets } = body;
      
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

      // Use the same league queue logic for consistency
      const leagueQueue = {
        name: 'Main',
        teams,
        boatSets: boatSets.map(set => ({
          id: set.id,
          team1Color: set.team1Color,
          team2Color: set.team2Color
        })),
        remainingPairings: generatePairings(teams),
        races: [] as Race[]
      };

      while (leagueQueue.remainingPairings.length > 0) {
        const currentBoatSet = leagueQueue.boatSets[newRaces.length % leagueQueue.boatSets.length];
        
        // Include existing races in the analysis for continuity
        const allRacesForAnalysis = [...existingRaces, ...leagueQueue.races];
        
        const selectedTeams = selectNextPairing(
          leagueQueue.remainingPairings,
          allRacesForAnalysis,
          currentBoatSet
        );

        const race: Race = {
          raceNumber: globalRaceNumber++,
          teamA: selectedTeams.teamA,
          teamB: selectedTeams.teamB,
          boats: {
            teamA: currentBoatSet.team1Color,
            teamB: currentBoatSet.team2Color,
          },
          racingFormat: body.racingFormat || '3v3'
        };

        leagueQueue.races.push(race);
        newRaces.push(race);

        leagueQueue.remainingPairings = leagueQueue.remainingPairings.filter(
          ([a, b]: [string, string]) => !(
            (a === selectedTeams.teamA && b === selectedTeams.teamB) ||
            (a === selectedTeams.teamB && b === selectedTeams.teamA)
          )
        );
      }
    }

    if (newRaces.length === 0) {
      return NextResponse.json({ error: 'No races generated. Check team and boat set configuration.' }, { status: 400 });
    }

    // Add launching/changeover tags to new races
    const processedNewRaces = newRaces.map((race, index, array) => {
      // Get all races (existing + new) that use this boat set
      const allRaces = [...existingRaces, ...array];
      const boatSetRaces = allRaces.filter(r => 
        r.boats.teamA === race.boats.teamA && 
        r.boats.teamB === race.boats.teamB
      );
      
      // Find position of current race within its boat set
      const positionInSet = boatSetRaces.findIndex(r => r.raceNumber === race.raceNumber);

      return {
        ...race,
        isLaunching: positionInSet === 0,     // First race of the set (could be from existing schedule)
        goToChangeover: positionInSet === 1    // Second race of the set
      };
    });

    // Combine existing and new races
    const allRaces = [...existingRaces, ...processedNewRaces];

    // Write updated schedule to file
    await fs.writeFile(dataFile, JSON.stringify(allRaces, null, 2));

    return NextResponse.json({ 
      message: `Added ${newRaces.length} races to the schedule`,
      newRaces: newRaces.length,
      totalRaces: allRaces.length
    });

  } catch (error) {
    console.error('Error adding round robin:', error);
    return NextResponse.json({ error: 'Failed to add round robin' }, { status: 500 });
  }
}