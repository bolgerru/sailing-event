import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  result?: number[] | null;
};

type TeamStats = {
  team: string;
  wins: number;
  totalRaces: number;
  points: number;
  winPercentage: number;
  place: number;  // Add this line
};

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

async function saveSchedule(races: Race[]) {
  const filePath = path.join(process.cwd(), 'data', 'schedule.json');
  await fs.writeFile(filePath, JSON.stringify(races, null, 2));
}

// Add this helper function at the top level
function isCompletedRace(race: Race): boolean {
  return race.result !== null && 
         race.result !== undefined && 
         race.result.length === 6 && 
         !race.result.every(score => score === 0);
}

// Modify getHeadToHeadRecord to use this check
function getHeadToHeadRecord(teamA: string, teamB: string, races: Race[]): {wins: number, avgPoints: number} {
  const matches = races.filter(race => 
    (race.teamA === teamA && race.teamB === teamB) || 
    (race.teamA === teamB && race.teamB === teamA)
  ).filter(isCompletedRace);

  console.log(`H2H matches between ${teamA} and ${teamB}:`, 
    matches.map(m => `Race ${m.raceNumber}: ${m.result?.join(',')}`));

  let wins = 0;
  let totalPoints = 0;
  let matchCount = 0;

  matches.forEach(race => {
    if (!race.result) return;
    matchCount++;
    const isTeamA = race.teamA === teamA;
    const teamPoints = isTeamA ? 
      race.result.slice(0, 3).reduce((a, b) => a + b, 0) :
      race.result.slice(3).reduce((a, b) => a + b, 0);
    const otherTeamPoints = isTeamA ?
      race.result.slice(3).reduce((a, b) => a + b, 0) :
      race.result.slice(0, 3).reduce((a, b) => a + b, 0);

    console.log(`Race ${race.raceNumber}: ${teamA} scored ${teamPoints}, ${teamB} scored ${otherTeamPoints}`);

    if (teamPoints < otherTeamPoints) wins++;
    else if (teamPoints === otherTeamPoints) {
      const pos1Index = race.result.indexOf(1);
      if ((isTeamA && pos1Index >= 3) || (!isTeamA && pos1Index < 3)) wins++;
    }
    totalPoints += teamPoints;
  });

  return {
    wins,
    avgPoints: matchCount > 0 ? totalPoints / matchCount : Infinity
  };
}

// Modify getLastMatchResult to use this check
function getLastMatchResult(teamA: string, teamB: string, races: Race[]): number {
  const match = races
    .filter(race => 
      (race.teamA === teamA && race.teamB === teamB) || 
      (race.teamA === teamB && race.teamB === teamA)
    )
    .filter(isCompletedRace)
    .pop();

  if (!match || !match.result) return 0;
  
  const isTeamA = match.teamA === teamA;
  const teamPoints = isTeamA ?
    match.result.slice(0, 3).reduce((a, b) => a + b, 0) :
    match.result.slice(3).reduce((a, b) => a + b, 0);
  const otherTeamPoints = isTeamA ?
    match.result.slice(3).reduce((a, b) => a + b, 0) :
    match.result.slice(0, 3).reduce((a, b) => a + b, 0);

  return teamPoints < otherTeamPoints ? 1 : (teamPoints > otherTeamPoints ? -1 : 0);
}

function getCommonOpponentStats(teamA: string, teamB: string, races: Race[]): number {
  const allTeams = new Set(races.flatMap(race => [race.teamA, race.teamB]));
  const commonOpponents = Array.from(allTeams).filter(team => 
    team !== teamA && team !== teamB &&
    races.some(race => isCompletedRace(race) && 
      ((race.teamA === teamA && race.teamB === team) || 
       (race.teamA === team && race.teamB === teamA))) &&
    races.some(race => isCompletedRace(race) && 
      ((race.teamA === teamB && race.teamB === team) || 
       (race.teamA === team && race.teamB === teamB)))
  );

  console.log(`Common opponents for ${teamA} vs ${teamB}:`, commonOpponents);

  // If no common opponents, return 0 to keep teams tied
  if (commonOpponents.length === 0) {
    return 0;
  }

  let teamATotal = 0;
  let teamBTotal = 0;
  let matches = 0;

  commonOpponents.forEach(opponent => {
    const teamAStats = getHeadToHeadRecord(teamA, opponent, races);
    const teamBStats = getHeadToHeadRecord(teamB, opponent, races);
    teamATotal += teamAStats.avgPoints;
    teamBTotal += teamBStats.avgPoints;
    matches++;
  });

  // Only compare averages if we have matches
  return matches > 0 ? teamATotal / matches - teamBTotal / matches : 0;
}

// Add debug logging for average points
function resolveTeamGroup(teams: TeamStats[], races: Race[]): TeamStats[] {
  console.log(`\nResolving tie for teams: ${teams.map(t => t.team).join(', ')}`);
  
  if (teams.length <= 1) return teams;

  // Try head-to-head records first
  const h2hGroups = new Map<number, TeamStats[]>();
  teams.forEach(teamA => {
    let h2hWins = 0;
    teams.forEach(teamB => {
      if (teamA.team === teamB.team) return;
      const h2h = getHeadToHeadRecord(teamA.team, teamB.team, races);
      h2hWins += h2h.wins;
    });
    if (!h2hGroups.has(h2hWins)) h2hGroups.set(h2hWins, []);
    h2hGroups.get(h2hWins)!.push(teamA);
    console.log(`Team ${teamA.team}: ${h2hWins} h2h wins`);
  });

  // Log h2h groups
  if (h2hGroups.size > 1) {
    console.log('H2H groups created:', 
      Array.from(h2hGroups.entries())
        .map(([wins, group]) => 
          `${wins} wins: ${group.map(t => t.team).join(',')}`
        ).join(' | ')
    );
  } else {
    console.log('No h2h separation, moving to average points');
  }

  // If head-to-head created groups, resolve each group recursively
  if (h2hGroups.size > 1) {
    return Array.from(h2hGroups.entries())
      .sort((a, b) => b[0] - a[0])
      .flatMap(([_, group]) => resolveTeamGroup(group, races));
  }

  // Try average points in matches between tied teams
  const avgPointsGroups = new Map<number, TeamStats[]>();
  teams.forEach(teamA => {
    let totalPoints = 0;
    let matches = 0;
    teams.forEach(teamB => {
      if (teamA.team === teamB.team) return;
      const h2h = getHeadToHeadRecord(teamA.team, teamB.team, races);
      if (h2h.avgPoints !== Infinity) {
        totalPoints += h2h.avgPoints;
        matches++;
      }
    });
    const avgPoints = matches > 0 ? totalPoints / matches : Infinity;
    console.log(`Team ${teamA.team} average points: ${avgPoints}`);
    
    // Round to 2 decimal places to avoid floating point comparison issues
    const roundedPoints = Math.round(avgPoints * 100) / 100;
    if (!avgPointsGroups.has(roundedPoints)) {
      avgPointsGroups.set(roundedPoints, []);
    }
    avgPointsGroups.get(roundedPoints)!.push(teamA);
  });

  if (avgPointsGroups.size > 1) {
    console.log('Average points groups created:', 
      Array.from(avgPointsGroups.entries())
        .map(([points, group]) => 
          `${points} points: ${group.map(t => t.team).join(',')}`
        ).join(' | ')
    );
    return Array.from(avgPointsGroups.entries())
      .sort((a, b) => a[0] - b[0])
      .flatMap(([_, group]) => resolveTeamGroup(group, races));
  } else {
    console.log('No separation by average points');
  }

  // After average points tiebreaker
  if (teams.length === 2) {
    // Only use latest head-to-head for 2-team ties
    const lastMatch = getLastMatchResult(teams[0].team, teams[1].team, races);
    if (lastMatch !== 0) {
      return lastMatch > 0 ? teams : [teams[1], teams[0]];
    }
  }

  // For 3+ team ties or if 2 teams are still tied, use common opponents
  return teams.sort((a, b) => getCommonOpponentStats(a.team, b.team, races));
}

// Modify the race processing in computeLeaderboard
function computeLeaderboard(races: Race[]): TeamStats[] {
  const teams = new Set<string>();
  races.forEach(race => {
    teams.add(race.teamA);
    teams.add(race.teamB);
  });

  // Initialize stats
  const stats = Array.from(teams).map(team => ({
    team,
    wins: 0,
    totalRaces: 0,
    points: 0,
    winPercentage: 0,
    place: 0  // Add this line
  }));

  // Process each race
  races.forEach(race => {
    if (!isCompletedRace(race) || !race.result) return;

    const teamAStats = stats.find(s => s.team === race.teamA);
    const teamBStats = stats.find(s => s.team === race.teamB);
    
    if (teamAStats && teamBStats) {
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
    }
  });

  // Calculate win percentages
  stats.forEach(team => {
    team.winPercentage = team.totalRaces > 0 ? (team.wins / team.totalRaces) * 100 : 0;
  });

  // Group by win percentage and resolve ties
  const winPercentageGroups = new Map<number, TeamStats[]>();
  stats.forEach(team => {
    if (!winPercentageGroups.has(team.winPercentage)) {
      winPercentageGroups.set(team.winPercentage, []);
    }
    winPercentageGroups.get(team.winPercentage)!.push(team);
  });

  // After resolving all ties, assign places
  const sortedTeams = Array.from(winPercentageGroups.entries())
    .sort((a, b) => b[0] - a[0])
    .flatMap(([_, group]) => resolveTeamGroup(group, races));

  // Replace the place assignment section in computeLeaderboard:

  // Assign places based on final position after tie-breaking
  let currentPlace = 1;
  let samePlace = 1;
  sortedTeams.forEach((team, index) => {
    if (index === 0) {
      team.place = currentPlace;
      console.log(`First team ${team.team}: place ${currentPlace}`);
    } else {
      const prevTeam = sortedTeams[index - 1];
      
      if (team.winPercentage === prevTeam.winPercentage) {
        // Get all teams with this win percentage
        const tiedTeams = sortedTeams.filter(t => t.winPercentage === team.winPercentage);
        console.log(`Checking tie between ${tiedTeams.map(t => t.team).join(', ')}`);
        
        // Check if teams are actually tied after all tiebreakers
        const commonOpponentStats = getCommonOpponentStats(team.team, prevTeam.team, races);
        const areTied = commonOpponentStats === 0;
        
        if (areTied) {
          team.place = prevTeam.place;
          samePlace++;
          console.log(`${team.team} tied with ${prevTeam.team}, place: ${team.place}`);
        } else {
          currentPlace += samePlace;
          team.place = currentPlace;
          samePlace = 1;
          console.log(`${team.team} separated from ${prevTeam.team}, place: ${currentPlace}`);
        }
      } else {
        currentPlace += samePlace;
        team.place = currentPlace;
        samePlace = 1;
        console.log(`${team.team} different win percentage, place: ${currentPlace}`);
      }
    }
  });

  return sortedTeams;
}

export async function POST(req: Request) {
  try {
    const { raceNumber, result } = await req.json();
    console.log('Received:', { raceNumber, result });

    if (typeof raceNumber !== 'number' || 
        (result !== null && (!Array.isArray(result) || result.length !== 6))) {
      return NextResponse.json(
        { error: 'Invalid input: raceNumber must be a number and result must be an array of 6 numbers or null' },
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

    races[raceIndex].result = result;
    await saveSchedule(races);
    console.log('Schedule updated');

    const leaderboard = computeLeaderboard(races);
    const leaderboardPath = path.join(process.cwd(), 'data', 'leaderboard.json');
    await fs.writeFile(leaderboardPath, JSON.stringify(leaderboard, null, 2));
    console.log('Leaderboard updated');

    return NextResponse.json({ 
      success: true,
      message: 'Results and leaderboard updated successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/results:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}