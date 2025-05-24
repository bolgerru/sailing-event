import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  league?: string;  // Add this field
  result?: number[] | null;
  boats: {
    teamA: string;
    teamB: string;
  };
};

// First add tiebreak info to TeamStats type
type TeamStats = {
  team: string;
  wins: number;
  totalRaces: number;
  points: number;
  winPercentage: number;
  place: number;
  tiebreakNote?: string;  // Add this field
};

// Add types for the stats objects
type H2HStats = {
  team: string;
  wins: number;
  totalGames: number;
  totalPoints: number;
  winPercentage: number;
  avgPoints: number;
  tiebreakNote?: string;
};

type CommonOpponentStats = {
  team: string;
  points: number;
  tiebreakNote?: string;
};

// Load schedule JSON from disk
async function loadSchedule(): Promise<Race[]> {
  const filePath = path.join(process.cwd(), 'data', 'schedule.json');
  try {
    const json = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(json);
  } catch (error) {
    console.error('Error loading schedule:', error);
    return [];
  }
}

// Save schedule JSON to disk
async function saveSchedule(races: Race[]) {
  const filePath = path.join(process.cwd(), 'data', 'schedule.json');
  await fs.writeFile(filePath, JSON.stringify(races, null, 2));
}

function isCompletedRace(race: Race): boolean {
  return (
    race.result !== null &&
    race.result !== undefined &&
    race.result.length === 6 &&
    !race.result.every(score => score === 0)
  );
}

function getHeadToHeadRecord(
  teamA: string,
  teamB: string,
  races: Race[]
): { wins: number; avgPoints: number } {
  const matches = races
    .filter(
      race =>
        (race.teamA === teamA && race.teamB === teamB) ||
        (race.teamA === teamB && race.teamB === teamA)
    )
    .filter(isCompletedRace);

  let wins = 0;
  let totalPoints = 0;
  let matchCount = 0;

  matches.forEach(race => {
    if (!race.result) return;
    matchCount++;
    const isTeamA = race.teamA === teamA;
    const teamPoints = isTeamA
      ? race.result.slice(0, 3).reduce((a, b) => a + b, 0)
      : race.result.slice(3).reduce((a, b) => a + b, 0);
    const otherTeamPoints = isTeamA
      ? race.result.slice(3).reduce((a, b) => a + b, 0)
      : race.result.slice(0, 3).reduce((a, b) => a + b, 0);

    if (teamPoints < otherTeamPoints) wins++;
    else if (teamPoints === otherTeamPoints) {
      const pos1Index = race.result.indexOf(1);
      if ((isTeamA && pos1Index >= 3) || (!isTeamA && pos1Index < 3)) wins++;
    }
    totalPoints += teamPoints;
  });

  return {
    wins,
    avgPoints: matchCount > 0 ? totalPoints / matchCount : Infinity,
  };
}

function getLastMatchResult(teamA: string, teamB: string, races: Race[]): number {
  const match = races
    .filter(
      race =>
        (race.teamA === teamA && race.teamB === teamB) ||
        (race.teamA === teamB && race.teamB === teamA)
    )
    .filter(isCompletedRace)
    .pop();

  if (!match || !match.result) return 0;

  const isTeamA = match.teamA === teamA;
  const teamPoints = isTeamA
    ? match.result.slice(0, 3).reduce((a, b) => a + b, 0)
    : match.result.slice(3).reduce((a, b) => a + b, 0);
  const otherTeamPoints = isTeamA
    ? match.result.slice(3).reduce((a, b) => a + b, 0)
    : match.result.slice(0, 3).reduce((a, b) => a + b, 0);

  return teamPoints < otherTeamPoints ? 1 : teamPoints > otherTeamPoints ? -1 : 0;
}

function findCommonOpponents(teams: string[], races: Race[]): string[] {
  const teamOpponents = teams.map(team => {
    const completedRaces = races.filter(
      race => isCompletedRace(race) && (race.teamA === team || race.teamB === team)
    );
    return new Set(
      completedRaces.map(race => (race.teamA === team ? race.teamB : race.teamA))
    );
  });

  if (teamOpponents.length === 0) return [];

  return Array.from(teamOpponents[0]).filter(
    opponent => !teams.includes(opponent) && teamOpponents.every(s => s.has(opponent))
  );
}

function getPointsAgainstOpponents(team: string, opponents: string[], races: Race[]): number {
  let totalPoints = 0;
  races.forEach(race => {
    if (!isCompletedRace(race) || !race.result) return;
    if (
      (race.teamA === team && opponents.includes(race.teamB)) ||
      (race.teamB === team && opponents.includes(race.teamA))
    ) {
      const isTeamA = race.teamA === team;
      const teamPoints = isTeamA
        ? race.result.slice(0, 3).reduce((a, b) => a + b, 0)
        : race.result.slice(3).reduce((a, b) => a + b, 0);
      totalPoints += teamPoints;
    }
  });
  return totalPoints;
}

function resolveTeamGroup(group: TeamStats[], races: Race[]): TeamStats[] {
  if (group.length <= 1) return group;

  console.log('\n=================================================================');
  console.log(`=== Resolving Tie Group with ${group.length} Teams ===`);
  console.log('=================================================================');
  console.log(`Teams tied: [${group.map(t => t.team).join(', ')}]`);
  console.log(`Win percentage: ${group[0].winPercentage.toFixed(2)}%`);

  // Step 1: Check if all teams have raced each other
  console.log('\n=== Step 1: Checking Complete Round Robin ===');
  const requiredGamesPerTeam = group.length - 1;
  const h2hMatrix: { [key: string]: Set<string> } = {};
  
  // Initialize matrix
  group.forEach(team => {
    h2hMatrix[team.team] = new Set<string>();
  });

  // Fill matrix with completed head-to-head matches
  races.filter(isCompletedRace).forEach(race => {
    if (h2hMatrix[race.teamA] && h2hMatrix[race.teamB]) {
      h2hMatrix[race.teamA].add(race.teamB);
      h2hMatrix[race.teamB].add(race.teamA);
    }
  });

  // Check if round robin is complete for this group
  const isCompleteRoundRobin = Object.entries(h2hMatrix).every(([_, opponents]) => 
    opponents.size === requiredGamesPerTeam
  );

  console.log('Head-to-head matrix for current group:');
  Object.entries(h2hMatrix).forEach(([team, opponents]) => {
    console.log(`${team} has played against: [${Array.from(opponents).join(', ')}] (${opponents.size}/${requiredGamesPerTeam} required)`);
  });
  console.log(`Complete round robin? ${isCompleteRoundRobin ? 'Yes' : 'No'}`);

  if (isCompleteRoundRobin) {
    console.log('\n✓ Complete round robin found - calculating head-to-head records');
    
    // Calculate head-to-head stats only against teams in this group
    const h2hStats: H2HStats[] = group.map(team => {
      const stats = {
        team: team.team,
        wins: 0,
        totalGames: 0,
        totalPoints: 0
      };

      group.forEach(opponent => {
        if (opponent.team === team.team) return;
        
        const record = getHeadToHeadRecord(team.team, opponent.team, races);
        stats.wins += record.wins;
        stats.totalGames++;
        stats.totalPoints += record.avgPoints;
      });

      const winPercentage = (stats.wins / stats.totalGames) * 100;
      const avgPoints = stats.totalPoints / stats.totalGames;

      console.log(`\n${team.team} head-to-head performance in this group:`, {
        wins: stats.wins,
        games: stats.totalGames,
        'win %': winPercentage.toFixed(2) + '%',
        'avg points': avgPoints.toFixed(2)
      });

      return {
        ...stats,
        team: team.team,
        winPercentage,
        avgPoints,
        tiebreakNote: undefined // initialize optional property
      };
    });

    // First try to break by win percentage
    const h2hWinPercentages = new Set(h2hStats.map(s => s.winPercentage));
    
    if (h2hWinPercentages.size > 1) {
      // Teams have different head-to-head win percentages
      console.log('\n✓ Tie broken by head-to-head win percentage');
      
      // Sort by win percentage
      const sortedByWinPct = h2hStats.sort((a, b) => b.winPercentage - a.winPercentage);
      console.log('Final order:', sortedByWinPct.map(s => 
        `${s.team} (${s.winPercentage.toFixed(2)}%)`
      ).join(' → '));

      let currentPlace = Math.min(...group.map(t => t.place || 1));
      let lastWinPct = -1;
      let lastPlace = currentPlace;

      // Assign places based on win percentage
      const placesMap = new Map<string, number>();
      sortedByWinPct.forEach(stat => {
        if (stat.winPercentage !== lastWinPct) {
          lastPlace = currentPlace;
          currentPlace++;
        }
        placesMap.set(stat.team, lastPlace);
        lastWinPct = stat.winPercentage;
      });

      // Add tiebreak notes
      sortedByWinPct.forEach((stat, i) => {
        const team = group.find(t => t.team === stat.team)!;
        if (i === 0) {
          const defeatedTeams = sortedByWinPct.slice(i + 1);
          team.tiebreakNote = `Won head-to-head vs ${defeatedTeams.map(t => t.team).join(', ')}`;
        } else {
          const winningTeams = sortedByWinPct.slice(0, i);
          team.tiebreakNote = `Lost head-to-head vs ${winningTeams.map(t => t.team).join(', ')}`;
        }
      });

      console.log('\nAssigning places based on head-to-head records:');
      Array.from(placesMap.entries()).forEach(([team, place]) => {
        console.log(`${team}: place ${place}`);
      });

      return group.sort((a, b) => {
        const aStats = sortedByWinPct.find(s => s.team === a.team)!;
        const bStats = sortedByWinPct.find(s => s.team === b.team)!;
        
        // Assign places from our map
        a.place = placesMap.get(a.team)!;
        b.place = placesMap.get(b.team)!;
        
        return bStats.winPercentage - aStats.winPercentage;
      });
    }

    // If we get here, all teams have same win percentage, try average points
    console.log('\nTied on head-to-head win percentage, checking average points');
    
    // Sort by average points
    const sortedByPoints = h2hStats.sort((a, b) => a.avgPoints - b.avgPoints);
    const distinctAvgPoints = new Set(sortedByPoints.map(s => s.avgPoints));

    if (distinctAvgPoints.size > 1) {
      console.log('\n✓ Tie broken by head-to-head average points');
      console.log('Final order:', sortedByPoints.map(s => 
        `${s.team} (${s.avgPoints.toFixed(2)} avg pts)`
      ).join(' → '));

      // Assign sequential places based on average points order
      const startingPlace = Math.min(...group.map(t => t.place || 1));
      let currentPlace = startingPlace;
      
      // Create a mapping of teams to their places
      const placesMap = new Map<string, number>();
      
      // First pass - assign places and handle ties
      let lastPoints = -1;
      let lastPlace = currentPlace;
      
      sortedByPoints.forEach(stat => {
        if (stat.avgPoints !== lastPoints) {
          // New points value - assign new place
          lastPlace = currentPlace;
          currentPlace++;
        }
        placesMap.set(stat.team, lastPlace);
        lastPoints = stat.avgPoints;
      });

      // Add tiebreak notes
      sortedByPoints.forEach((stat, i) => {
        const team = group.find(t => t.team === stat.team)!;
        if (i === 0) {
          const defeatedTeams = sortedByPoints.slice(i + 1);
          team.tiebreakNote = `Better head-to-head average points vs ${defeatedTeams.map(t => t.team).join(', ')}`;
        } else {
          const betterTeams = sortedByPoints.slice(0, i);
          team.tiebreakNote = `Lower head-to-head average points vs ${betterTeams.map(t => t.team).join(', ')}`;
        }
      });

      console.log('\nAssigning places based on average points:');
      Array.from(placesMap.entries()).forEach(([team, place]) => {
        console.log(`${team}: place ${place}`);
      });
      
      // Sort and assign places
      return group.sort((a, b) => {
        const aStats = sortedByPoints.find(s => s.team === a.team)!;
        const bStats = sortedByPoints.find(s => s.team === b.team)!;
        
        // Assign places from our map
        a.place = placesMap.get(a.team)!;
        b.place = placesMap.get(b.team)!;
        
        return aStats.avgPoints - bStats.avgPoints;
      });
    }

    console.log('\n× Teams also tied on head-to-head average points');
  }

  // If we reach here, try common opponents for the whole group
  console.log('\n=== Step 2: Common Opponents Analysis ===');
  const commonOpponents = findCommonOpponents(group.map(t => t.team), races);
  
  if (commonOpponents.length > 0) {
    console.log('Common opponents found:', commonOpponents.join(', '));
    
    const commonOpponentStats: CommonOpponentStats[] = group.map(team => {
      const points = getPointsAgainstOpponents(team.team, commonOpponents, races);
      console.log(`${team.team} vs common opponents:`, {
        'total points': points,
        'opponents': commonOpponents.join(', ')
      });
      return { 
        team: team.team, 
        points,
        tiebreakNote: undefined // initialize optional property
      };
    });

    // Sort by points against common opponents
    const sorted = commonOpponentStats.sort((a, b) => a.points - b.points);
    const distinctPoints = new Set(sorted.map(s => s.points));

    if (distinctPoints.size > 1) {
      console.log('\n✓ Tie broken by performance against common opponents');
      console.log('Initial order:', sorted.map(s => 
        `${s.team} (${s.points} pts)`
      ).join(' → '));

      // Add tiebreak notes
      sorted.forEach((stat, i) => {
        const team = group.find(t => t.team === stat.team)!;
        if (i === 0) {
          const defeatedTeams = sorted.slice(i + 1);
          team.tiebreakNote = `Better vs common opponents than ${defeatedTeams.map(t => t.team).join(', ')}`;
        } else {
          const betterTeams = sorted.slice(0, i);
          team.tiebreakNote = `Worse vs common opponents than ${betterTeams.map(t => t.team).join(', ')}`;
        }
      });

      // Group teams by points to handle sub-ties
      const pointGroups = new Map<number, TeamStats[]>();
      sorted.forEach(stat => {
        if (!pointGroups.has(stat.points)) {
          pointGroups.set(stat.points, []);
        }
        pointGroups.get(stat.points)!.push(
          group.find(t => t.team === stat.team)!
        );
      });

      const finalOrder: TeamStats[] = [];
      let currentPlace = Math.min(...group.map(t => t.place || 2));

      // Process each points group, recursively resolving any ties
      for (const [points, teams] of Array.from(pointGroups.entries()).sort((a, b) => a[0] - b[0])) {
        console.log(`\n=== Processing teams with ${points} points ===`);
        console.log('Teams:', teams.map(t => t.team).join(', '));

        if (teams.length === 1) {
          // Single team - assign place directly
          teams[0].place = currentPlace;
          finalOrder.push(teams[0]);
          console.log(`Assigned place ${currentPlace} to ${teams[0].team} (no sub-tie)`);
          currentPlace++;
        } else {
          // Multiple teams tied - recursively resolve
          console.log(`Found sub-tie between: ${teams.map(t => t.team).join(', ')}`);
          console.log('Starting recursive tiebreak resolution...');
          
          // Set initial places for the subgroup
          teams.forEach(team => {
            team.place = currentPlace;
          });

          // Recursively resolve the tie
          const resolvedSubGroup = resolveTeamGroup(teams, races);
          finalOrder.push(...resolvedSubGroup);
          
          // Update current place based on resolved subgroup
          const maxPlace = Math.max(...resolvedSubGroup.map(t => t.place));
          currentPlace = maxPlace + 1;
          
          console.log('Sub-tie resolution complete:', resolvedSubGroup.map(t => 
            `${t.team}: place ${t.place}`
          ).join(', '));
        }
      }

      console.log('\nFinal place assignments:', finalOrder.map(t => 
        `${t.team}: place ${t.place}`
      ).join(', '));

      return finalOrder;
    }
    
    console.log('\n× Common opponent analysis did not break tie');
  } else {
    console.log('No common opponents found for tied teams');
  }

  console.log('\n=== Final Result ===');
  console.log('Unable to break tie - teams will share same place');

  // Start from place 1 if no place is set
  const sharedPlace = Math.min(...group.map(t => t.place || 1));
  group.forEach(team => {
    team.place = sharedPlace;
    const tiedTeams = group.filter(t => t.team !== team.team);
    team.tiebreakNote = tiedTeams.length > 0 
      ? `Tied with ${tiedTeams.map(t => t.team).join(', ')}`
      : undefined;
  });
  console.log('\nShared place assigned:', sharedPlace);

  // Next place should skip over all tied teams
  const nextPlace = sharedPlace + group.length;
  console.log(`Next available place will be: ${nextPlace} (skipping ${group.length} tied teams)`);

  return group;
}

// Update the ComputeLeaderboard function
function computeLeaderboard(races: Race[]): { [key: string]: TeamStats[] } {
  // If no leagues are defined, create a default league with all races
  if (!races.some(race => race.league)) {
    console.log('\n=== Computing Single Leaderboard (No Leagues) ===');
    
    // Get all teams
    const teams = new Set<string>();
    races.forEach(race => {
      teams.add(race.teamA);
      teams.add(race.teamB);
    });

    const stats: TeamStats[] = Array.from(teams).map(team => ({
      team,
      wins: 0,
      totalRaces: 0,
      points: 0,
      winPercentage: 0,
      place: 0,
      league: 'main'
    }));

    // Calculate stats
    races.forEach(race => {
      if (!isCompletedRace(race) || !race.result) return;

      const teamAStats = stats.find(s => s.team === race.teamA)!;
      const teamBStats = stats.find(s => s.team === race.teamB)!;

      teamAStats.totalRaces++;
      teamBStats.totalRaces++;

      const teamAPoints = race.result.slice(0, 3).reduce((a, b) => a + b, 0);
      const teamBPoints = race.result.slice(3).reduce((a, b) => a + b, 0);

      if (teamAPoints < teamBPoints) {
        teamAStats.wins++;
      } else if (teamBPoints < teamAPoints) {
        teamBStats.wins++;
      } else {
        if (race.result.indexOf(1) < 3) {
          teamBStats.wins++;
        } else {
          teamAStats.wins++;
        }
      }
    });

    stats.forEach(team => {
      team.winPercentage = team.totalRaces > 0 ? (team.wins / team.totalRaces) * 100 : 0;
    });

    // Process win percentage groups
    const winPercentageGroups = new Map<number, TeamStats[]>();
    stats.forEach(team => {
      if (!winPercentageGroups.has(team.winPercentage)) {
        winPercentageGroups.set(team.winPercentage, []);
      }
      winPercentageGroups.get(team.winPercentage)!.push(team);
    });

    const sortedTeams: TeamStats[] = [];
    let globalPlace = 1;

    for (const [winPct, group] of Array.from(winPercentageGroups.entries()).sort((a, b) => b[0] - a[0])) {
      if (group.length === 1) {
        group[0].place = globalPlace;
        sortedTeams.push(group[0]);
        globalPlace++;
      } else {
        group.forEach(team => team.place = globalPlace);
        const resolved = resolveTeamGroup(group, races);
        sortedTeams.push(...resolved);
        globalPlace += group.length;
      }
    }

    return { main: sortedTeams };
  }

  // Existing league-based logic
  const leagueRaces = new Map<string, Race[]>();
  races.forEach(race => {
    if (!race.league) return;
    if (!leagueRaces.has(race.league)) {
      leagueRaces.set(race.league, []);
    }
    leagueRaces.get(race.league)!.push(race);
  });

  // Create leaderboard for each league
  const leagueLeaderboards: { [key: string]: TeamStats[] } = {};

  leagueRaces.forEach((leagueRaces, leagueName) => {
    console.log(`\n=== Computing Leaderboard for ${leagueName} League ===`);
    
    // Get teams in this league
    const teams = new Set<string>();
    leagueRaces.forEach(race => {
      teams.add(race.teamA);
      teams.add(race.teamB);
    });

    const stats: TeamStats[] = Array.from(teams).map(team => ({
      team,
      wins: 0,
      totalRaces: 0,
      points: 0,
      winPercentage: 0,
      place: 0,
      league: leagueName, // Add league to stats
    }));

    // Calculate stats for this league
    leagueRaces.forEach(race => {
      if (!isCompletedRace(race) || !race.result) return;

      const teamAStats = stats.find(s => s.team === race.teamA)!;
      const teamBStats = stats.find(s => s.team === race.teamB)!;

      teamAStats.totalRaces++;
      teamBStats.totalRaces++;

      const teamAPoints = race.result.slice(0, 3).reduce((a, b) => a + b, 0);
      const teamBPoints = race.result.slice(3).reduce((a, b) => a + b, 0);

      if (teamAPoints < teamBPoints) {
        teamAStats.wins++;
      } else if (teamBPoints < teamAPoints) {
        teamBStats.wins++;
      } else {
        if (race.result.indexOf(1) < 3) {
          teamBStats.wins++;
        } else {
          teamAStats.wins++;
        }
      }
    });

    stats.forEach(team => {
      team.winPercentage = team.totalRaces > 0 ? (team.wins / team.totalRaces) * 100 : 0;
    });

    // Process win percentage groups for this league
    const winPercentageGroups = new Map<number, TeamStats[]>();
    stats.forEach(team => {
      if (!winPercentageGroups.has(team.winPercentage)) {
        winPercentageGroups.set(team.winPercentage, []);
      }
      winPercentageGroups.get(team.winPercentage)!.push(team);
    });

    const sortedTeams: TeamStats[] = [];
    let globalPlace = 1;

    for (const [winPct, group] of Array.from(winPercentageGroups.entries()).sort((a, b) => b[0] - a[0])) {
      if (group.length === 1) {
        group[0].place = globalPlace;
        sortedTeams.push(group[0]);
        globalPlace++;
      } else {
        group.forEach(team => team.place = globalPlace);
        const resolved = resolveTeamGroup(group, leagueRaces);
        sortedTeams.push(...resolved);
        globalPlace += group.length;
      }
    }

    leagueLeaderboards[leagueName] = sortedTeams;
  });

  return leagueLeaderboards;
}

// Update the POST handler
export async function POST(req: Request) {
  try {
    const { raceNumber, result } = await req.json();

    if (
      typeof raceNumber !== 'number' ||
      (result !== null &&
        (!Array.isArray(result) ||
          result.length !== 6 ||
          result.some(score => typeof score !== 'number')))
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid input: raceNumber must be a number and result must be an array of 6 numbers or null',
        },
        { status: 400 }
      );
    }

    const races = await loadSchedule();
    const raceIndex = races.findIndex(r => r.raceNumber === raceNumber);

    if (raceIndex === -1) {
      return NextResponse.json({ error: `Race ${raceNumber} not found` }, { status: 404 });
    }

    races[raceIndex].result = result;
    await saveSchedule(races);

    const leagueLeaderboards = computeLeaderboard(races);
    const leaderboardPath = path.join(process.cwd(), 'data', 'leaderboard.json');
    await fs.writeFile(leaderboardPath, JSON.stringify(leagueLeaderboards, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Results and leaderboards updated successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/results:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
