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
      // Sort by win percentage
      const sortedByWinPct = h2hStats.sort((a, b) => b.winPercentage - a.winPercentage);
      console.log('Initial order:', sortedByWinPct.map(s => 
        `${s.team} (${s.winPercentage.toFixed(2)}%)`
      ).join(' → '));

      // Group teams by win percentage
      const winPctGroups = new Map<number, TeamStats[]>();
      sortedByWinPct.forEach(stat => {
        if (!winPctGroups.has(stat.winPercentage)) {
          winPctGroups.set(stat.winPercentage, []);
        }
        winPctGroups.get(stat.winPercentage)!.push(
          group.find(t => t.team === stat.team)!
        );
      });

      const finalOrder: TeamStats[] = [];
      let currentPlace = Math.min(...group.map(t => t.place || 1));

      // Process each win percentage group
      for (const [winPct, teams] of Array.from(winPctGroups.entries()).sort((a, b) => b[0] - a[0])) {
        console.log(`\n=== Processing teams with ${winPct.toFixed(2)}% win rate ===`);
        console.log('Teams:', teams.map(t => t.team).join(', '));

        if (teams.length === 1) {
          // Single team - get teams beaten and lost to in THIS win percentage group
          const beatenTeams = sortedByWinPct
            .filter(s => s.winPercentage < winPct)
            .map(s => s.team);
          const lostToTeams = sortedByWinPct
            .filter(s => s.winPercentage > winPct)
            .map(s => s.team);

          teams[0].place = currentPlace;
          
          const parts: string[] = [];
          if (beatenTeams.length > 0) {
            parts.push(`Beat ${beatenTeams.join(', ')}`);
          }
          if (lostToTeams.length > 0) {
            parts.push(`Lost to ${lostToTeams.join(', ')}`);
          }
          
          teams[0].tiebreakNote = parts.length > 0 
            ? `${parts.join('. ')} in head-to-head matches`
            : undefined;
          finalOrder.push(teams[0]);
          currentPlace++;
        } else {
          // Multiple teams tied - recursively resolve
          console.log(`Found sub-tie between: ${teams.map(t => t.team).join(', ')}`);
          console.log('Starting recursive tiebreak resolution...');
          
          // Set initial places for the subgroup
          teams.forEach(team => {
            team.place = currentPlace;
          });

          // Create a subset of races that include ANY of these tied teams
          // (not just races between them)
          const subGroupRaces = races.filter(race => 
            teams.some(t => t.team === race.teamA || t.team === race.teamB)
          );

          // Recursively resolve the tie with all relevant races
          const resolvedSubGroup = resolveTeamGroup(teams, subGroupRaces);
          // Keep existing tiebreak notes from recursive resolution
          finalOrder.push(...resolvedSubGroup);
          currentPlace = Math.max(...resolvedSubGroup.map(t => t.place)) + 1;
          
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
          const beatenTeams = sortedByPoints.slice(1).map(s => s.team).join(', ');
          team.tiebreakNote = `Beat ${beatenTeams} on average points scored`;
        } else {
          const lostTo = sortedByPoints[i - 1].team;
          team.tiebreakNote = `Lost to ${lostTo} on average points scored`;
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
        
        // Teams this team beat (lower points is better)
        const beatenTeams = sorted
          .filter(s => s.points > stat.points)
          .map(s => s.team);
        
        // Teams this team lost to (lower points is better)
        const lostToTeams = sorted
          .filter(s => s.points < stat.points)
          .map(s => s.team);
        
        // Teams tied with
        const tiedTeams = sorted
          .filter(s => s.points === stat.points && s.team !== team.team)
          .map(s => s.team);

        const parts: string[] = [];
        if (beatenTeams.length > 0) {
          parts.push(`Beat ${beatenTeams.join(', ')}`);
        }
        if (lostToTeams.length > 0) {
          parts.push(`Lost to ${lostToTeams.join(', ')}`);
        }
        if (tiedTeams.length > 0) {
          parts.push(`Tied with ${tiedTeams.join(', ')}`);
        }

        team.tiebreakNote = `${parts.join('. ')} against common opponents (${commonOpponents.join(', ')})`;
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
    team.tiebreakNote = `Tied with ${tiedTeams.map(t => t.team).join(', ')}`;
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

// Update the POST handler to handle race status updates
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { raceNumber, result, status, startTime, endTime } = body;

    // Validate raceNumber
    if (typeof raceNumber !== 'number') {
      return NextResponse.json(
        { error: 'raceNumber must be a number' },
        { status: 400 }
      );
    }

    const races = await loadSchedule();
    const raceIndex = races.findIndex(r => r.raceNumber === raceNumber);

    if (raceIndex === -1) {
      return NextResponse.json(
        { error: `Race ${raceNumber} not found` },
        { status: 404 }
      );
    }

    // Update race data
    races[raceIndex] = {
      ...races[raceIndex],
      ...(status && { status }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(result !== undefined && { result })
    };

    await saveSchedule(races);

    // Only compute leaderboard if results were updated
    if (result !== undefined) {
      const leagueLeaderboards = computeLeaderboard(races);
      const leaderboardPath = path.join(process.cwd(), 'data', 'leaderboard.json');
      await fs.writeFile(leaderboardPath, JSON.stringify(leagueLeaderboards, null, 2));
    }

    return NextResponse.json({
      success: true,
      message: 'Race updated successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
