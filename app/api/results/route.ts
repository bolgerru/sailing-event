import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { updateMetrics } from '../../lib/metrics';

// Keep all your existing type definitions
type TeamStats = {
  team: string;
  wins: number;
  totalRaces: number;
  winPercentage: number;
  points: number;
  place: number;
  league: string;
  tiebreakNote?: string;
};

type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  league?: string;
  result?: number[] | null;
  boats: {
    teamA: string;
    teamB: string;
  };
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
  endTime?: string;
  goToChangeover?: boolean;
  isLaunching?: boolean;
  isKnockout?: boolean;
  bestOf?: number;
  stage?: string;
  matchNumber?: number;
  racingFormat?: '2v2' | '3v3' | '4v4';
};

// Add missing type definitions
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

// Blob helper functions
async function getBlobData(fileName: string) {
  try {
    const blobUrl = `https://${process.env.BLOB_READ_WRITE_TOKEN?.split('vercel_blob_rw_')[1]?.split('_')[0]}.public.blob.vercel-storage.com/${fileName}`;
    const response = await fetch(blobUrl);
    if (response.ok) {
      return await response.json();
    }
    return fileName === 'schedule.json' ? [] : {};
  } catch (error) {
    console.log(`${fileName} not found in blob, returning default`);
    return fileName === 'schedule.json' ? [] : {};
  }
}

async function saveBlobData(fileName: string, data: any) {
  const blob = await put(fileName, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
  return blob;
}

function getBoatsPerTeam(format?: string): number {
  switch (format) {
    case '2v2': return 2;
    case '3v3': return 3;
    case '4v4': return 4;
    default: return 3;
  }
}

// Load/save functions using Blob
async function loadSchedule(): Promise<Race[]> {
  return await getBlobData('schedule.json');
}

async function saveSchedule(races: Race[]) {
  await saveBlobData('schedule.json', races);
}

// Add the missing debugResult function
function debugResult(raceNumber: number, result: any, racingFormat: string) {
  console.log(`\n--- Debugging Race ${raceNumber} Result ---`);
  console.log('Racing format:', racingFormat);
  console.log('Result received:', result);
  console.log('Result type:', typeof result);
  console.log('Is array:', Array.isArray(result));
  if (Array.isArray(result)) {
    console.log('Array length:', result.length);
    console.log('Array contents:', result.map((v, i) => `[${i}]=${v} (${typeof v})`).join(', '));
  }
}

// Keep all your existing business logic functions
function isCompletedRace(race: Race): boolean {
  if (!race.result || race.result === null || race.result === undefined) {
    return false;
  }

  const expectedLength = getBoatsPerTeam(race.racingFormat) * 2;
  return (
    race.result.length === expectedLength &&
    !race.result.every(score => score === 0) &&
    race.result.every(score => typeof score === 'number' && score > 0)
  );
}

// Update the getHeadToHeadRecord function to handle multiple matches

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

  console.log(`\n--- Head-to-Head: ${teamA} vs ${teamB} ---`);
  console.log(`Found ${matches.length} completed matches between these teams`);

  matches.forEach((race, index) => {
    if (!race.result) return;
    matchCount++;
    
    const boatsPerTeam = getBoatsPerTeam(race.racingFormat);
    const isTeamA = race.teamA === teamA;
    
    const teamPoints = isTeamA
      ? race.result.slice(0, boatsPerTeam).reduce((a, b) => a + b, 0)
      : race.result.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a, b) => a + b, 0);
    const otherTeamPoints = isTeamA
      ? race.result.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a, b) => a + b, 0)
      : race.result.slice(0, boatsPerTeam).reduce((a, b) => a + b, 0);

    let winner = '';
    if (teamPoints < otherTeamPoints) {
      wins++;
      winner = teamA;
    } else if (teamPoints === otherTeamPoints) {
      // Tie-breaker: team WITHOUT first place wins (team with 1st place loses)
      const pos1Index = race.result.indexOf(1);
      if ((isTeamA && pos1Index >= boatsPerTeam) || (!isTeamA && pos1Index < boatsPerTeam)) {
        wins++; // teamA didn't get first place, so teamA wins
        winner = teamA;
      } else {
        winner = teamB;
      }
    } else {
      winner = teamB;
    }
    
    totalPoints += teamPoints;
    
    console.log(`  Race ${race.raceNumber}: ${teamA}=${teamPoints}pts, ${teamB}=${otherTeamPoints}pts → Winner: ${winner}`);
  });

  const avgPoints = matchCount > 0 ? totalPoints / matchCount : Infinity;
  
  console.log(`Result: ${teamA} won ${wins}/${matchCount} matches, avg ${avgPoints.toFixed(2)} points`);

  return {
    wins,
    avgPoints,
  };
}

// Update the resolveTeamGroup function to add the last race tiebreaker

function resolveTeamGroup(group: TeamStats[], races: Race[]): TeamStats[] {
  if (group.length <= 1) return group;

  console.log('\n=================================================================');
  console.log(`=== Resolving Tie Group with ${group.length} Teams ===`);
  console.log('=================================================================');
  console.log(`Teams tied: [${group.map(t => t.team).join(', ')}]`);
  console.log(`Win percentage: ${group[0].winPercentage.toFixed(2)}%`);

  // Step 1: Calculate comprehensive head-to-head records
  console.log('\n=== Step 1: Head-to-Head Analysis (All Matches) ===');
  
  // Create a comprehensive head-to-head matrix
  const h2hMatrix: { [key: string]: { [key: string]: { wins: number; totalMatches: number; avgPoints: number } } } = {};
  
  // Initialize matrix
  group.forEach(teamA => {
    h2hMatrix[teamA.team] = {};
    group.forEach(teamB => {
      if (teamA.team !== teamB.team) {
        const record = getHeadToHeadRecord(teamA.team, teamB.team, races);
        const allMatches = races.filter(race =>
          ((race.teamA === teamA.team && race.teamB === teamB.team) ||
           (race.teamA === teamB.team && race.teamB === teamA.team)) &&
          isCompletedRace(race)
        );
        
        h2hMatrix[teamA.team][teamB.team] = {
          wins: record.wins,
          totalMatches: allMatches.length,
          avgPoints: record.avgPoints
        };
      }
    });
  });

  // Display the comprehensive matrix
  console.log('\nComplete Head-to-Head Matrix:');
  console.log('Team'.padEnd(12) + group.map(t => t.team.padEnd(10)).join(''));
  group.forEach(teamA => {
    let row = teamA.team.padEnd(12);
    group.forEach(teamB => {
      if (teamA.team === teamB.team) {
        row += '-'.padEnd(10);
      } else {
        const record = h2hMatrix[teamA.team][teamB.team];
        row += `${record.wins}/${record.totalMatches}`.padEnd(10);
      }
    });
    console.log(row);
  });

  // Check if all teams have played each other at least once
  const allTeamsHavePlayedEachOther = group.every(teamA =>
    group.every(teamB =>
      teamA.team === teamB.team || h2hMatrix[teamA.team][teamB.team].totalMatches > 0
    )
  );

  console.log(`\nAll teams have played each other? ${allTeamsHavePlayedEachOther ? 'Yes' : 'No'}`);

  if (allTeamsHavePlayedEachOther) {
    console.log('\n✓ Complete head-to-head data available - calculating cumulative records');
    
    // Calculate cumulative head-to-head stats for each team against all others in the group
    const h2hStats: H2HStats[] = group.map(team => {
      let totalWins = 0;
      let totalMatches = 0;
      let totalPointsSum = 0;
      let totalPointsCount = 0;

      group.forEach(opponent => {
        if (opponent.team !== team.team) {
          const record = h2hMatrix[team.team][opponent.team];
          totalWins += record.wins;
          totalMatches += record.totalMatches;
          if (record.avgPoints !== Infinity) {
            totalPointsSum += record.avgPoints * record.totalMatches;
            totalPointsCount += record.totalMatches;
          }
        }
      });

      const winPercentage = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
      const avgPoints = totalPointsCount > 0 ? totalPointsSum / totalPointsCount : Infinity;

      console.log(`\n${team.team} cumulative head-to-head:`, {
        wins: totalWins,
        totalMatches: totalMatches,
        'win %': winPercentage.toFixed(2) + '%',
        'avg points': avgPoints !== Infinity ? avgPoints.toFixed(2) : 'N/A'
      });

      return {
        team: team.team,
        wins: totalWins,
        totalGames: totalMatches,
        totalPoints: totalPointsSum,
        winPercentage,
        avgPoints,
        tiebreakNote: undefined
      };
    });

    // First try to break by win percentage
    const h2hWinPercentages = new Set(h2hStats.map(s => Math.round(s.winPercentage * 100) / 100)); // Round to avoid floating point issues
    
    if (h2hWinPercentages.size > 1) {
      // Sort by win percentage
      const sortedByWinPct = h2hStats.sort((a, b) => b.winPercentage - a.winPercentage);
      console.log('\nTie broken by head-to-head win percentage:');
      console.log('Order:', sortedByWinPct.map(s => 
        `${s.team} (${s.winPercentage.toFixed(2)}%, ${s.wins}/${s.totalGames})`
      ).join(' → '));

      // Group teams by win percentage and handle sub-ties
      const winPctGroups = new Map<number, TeamStats[]>();
      sortedByWinPct.forEach(stat => {
        const roundedWinPct = Math.round(stat.winPercentage * 100) / 100;
        if (!winPctGroups.has(roundedWinPct)) {
          winPctGroups.set(roundedWinPct, []);
        }
        winPctGroups.get(roundedWinPct)!.push(
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
          // Single team - assign place and create tiebreak note
          teams[0].place = currentPlace;
          
          // Create detailed tiebreak note showing head-to-head performance
          const teamStat = sortedByWinPct.find(s => s.team === teams[0].team)!;
          const beatenTeams = sortedByWinPct
            .filter(s => s.winPercentage < winPct)
            .map(s => s.team);
          const lostToTeams = sortedByWinPct
            .filter(s => s.winPercentage > winPct)
            .map(s => s.team);

          const parts: string[] = [];
          if (beatenTeams.length > 0) {
            parts.push(`Beat ${beatenTeams.join(', ')}`);
          }
          if (lostToTeams.length > 0) {
            parts.push(`Lost to ${lostToTeams.join(', ')}`);
          }
          
          teams[0].tiebreakNote = parts.length > 0 
            ? `${parts.join('. ')} in head-to-head (${teamStat.wins}/${teamStat.totalGames} = ${teamStat.winPercentage.toFixed(1)}%)`
            : `Head-to-head record: ${teamStat.wins}/${teamStat.totalGames} = ${teamStat.winPercentage.toFixed(1)}%`;
          
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

          // Create a subset of races that include these tied teams
          const subGroupRaces = races.filter(race => 
            teams.some(t => t.team === race.teamA || t.team === race.teamB)
          );

          // Recursively resolve the tie
          const resolvedSubGroup = resolveTeamGroup(teams, subGroupRaces);
          finalOrder.push(...resolvedSubGroup);
          currentPlace = Math.max(...resolvedSubGroup.map(t => t.place)) + 1;
        }
      }

      return finalOrder;
    }

    // If still tied on win percentage, try average points
    console.log('\nTied on head-to-head win percentage, checking average points');
    
    const sortedByPoints = h2hStats.sort((a, b) => a.avgPoints - b.avgPoints);
    const distinctAvgPoints = new Set(sortedByPoints.map(s => Math.round(s.avgPoints * 100) / 100));

    if (distinctAvgPoints.size > 1) {
      console.log('\n✓ Tie broken by head-to-head average points');
      console.log('Final order:', sortedByPoints.map(s => 
        `${s.team} (${s.avgPoints.toFixed(2)} avg pts)`
      ).join(' → '));

      // Assign places and tiebreak notes
      const startingPlace = Math.min(...group.map(t => t.place || 1));
      
      sortedByPoints.forEach((stat, index) => {
        const team = group.find(t => t.team === stat.team)!;
        team.place = startingPlace + index;
        
        const beatenTeams = sortedByPoints.slice(index + 1).map(s => s.team);
        const lostToTeams = sortedByPoints.slice(0, index).map(s => s.team);
        
        const parts: string[] = [];
        if (beatenTeams.length > 0) {
          parts.push(`Beat ${beatenTeams.join(', ')}`);
        }
        if (lostToTeams.length > 0) {
          parts.push(`Lost to ${lostToTeams.join(', ')}`);
        }
        
        team.tiebreakNote = parts.length > 0 
          ? `${parts.join('. ')} on head-to-head average points (${stat.avgPoints.toFixed(2)})`
          : `Head-to-head average points: ${stat.avgPoints.toFixed(2)}`;
      });

      return group.sort((a, b) => a.place - b.place);
    }

    console.log('\n× Teams also tied on head-to-head average points');
  }

  // NEW: Step 2 - Last Race Tiebreaker (only for exactly 2 teams)
  if (group.length === 2) {
    console.log('\n=== Step 2: Last Race Tiebreaker (Two Teams Only) ===');
    
    const teamA = group[0];
    const teamB = group[1];
    
    console.log(`Checking last race between ${teamA.team} and ${teamB.team}`);
    
    // Find the most recent completed race between these two teams
    const lastRace = races
      .filter(race => 
        ((race.teamA === teamA.team && race.teamB === teamB.team) ||
         (race.teamA === teamB.team && race.teamB === teamA.team)) &&
        isCompletedRace(race)
      )
      .sort((a, b) => b.raceNumber - a.raceNumber)[0]; // Get the most recent race
    
    if (lastRace && lastRace.result) {
      console.log(`Found last race: Race ${lastRace.raceNumber}`);
      console.log(`${lastRace.teamA} vs ${lastRace.teamB}, result: [${lastRace.result.join(', ')}]`);
      
      const boatsPerTeam = getBoatsPerTeam(lastRace.racingFormat);
      const isTeamAFirst = lastRace.teamA === teamA.team;
      
      const teamAPoints = isTeamAFirst
        ? lastRace.result.slice(0, boatsPerTeam).reduce((a, b) => a + b, 0)
        : lastRace.result.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a, b) => a + b, 0);
      const teamBPoints = isTeamAFirst
        ? lastRace.result.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a, b) => a + b, 0)
        : lastRace.result.slice(0, boatsPerTeam).reduce((a, b) => a + b, 0);

      console.log(`Last race points: ${teamA.team}=${teamAPoints}, ${teamB.team}=${teamBPoints}`);

      let winner: TeamStats | null = null;
      let winReason = '';

      if (teamAPoints < teamBPoints) {
        winner = teamA;
        winReason = `won by points (${teamAPoints} < ${teamBPoints})`;
      } else if (teamBPoints < teamAPoints) {
        winner = teamB;
        winReason = `won by points (${teamBPoints} < ${teamAPoints})`;
      } else {
        // Tie on points - use first place tiebreaker
        const pos1Index = lastRace.result.indexOf(1);
        const teamAHasFirst = isTeamAFirst ? pos1Index < boatsPerTeam : pos1Index >= boatsPerTeam;
        
        if (teamAHasFirst) {
          winner = teamB; // Team A got first place, so Team B wins
          winReason = `won by tiebreaker (${teamA.team} had 1st place)`;
        } else {
          winner = teamA; // Team B got first place, so Team A wins
          winReason = `won by tiebreaker (${teamB.team} had 1st place)`;
        }
      }

      if (winner) {
        const loser = winner === teamA ? teamB : teamA;
        const startingPlace = Math.min(teamA.place || 1, teamB.place || 1);
        
        winner.place = startingPlace;
        loser.place = startingPlace + 1;
        
        winner.tiebreakNote = `Beat ${loser.team} in last race (Race ${lastRace.raceNumber}, ${winReason})`;
        loser.tiebreakNote = `Lost to ${winner.team} in last race (Race ${lastRace.raceNumber}, ${winReason})`;
        
        console.log(`✓ Tie broken by last race: ${winner.team} beats ${loser.team}`);
        console.log(`  Winner: ${winner.team} (place ${winner.place})`);
        console.log(`  Loser: ${loser.team} (place ${loser.place})`);
        
        return [winner, loser].sort((a, b) => a.place - b.place);
      }
    } else {
      console.log('× No completed race found between these two teams');
    }
  } else {
    console.log('\n=== Skipping Last Race Tiebreaker ===');
    console.log(`More than 2 teams tied (${group.length}), proceeding to common opponents`);
  }

  // Step 3: Fall back to common opponents
  console.log('\n=== Step 3: Common Opponents Analysis ===');
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
        tiebreakNote: undefined
      };
    });

    // Sort by points against common opponents
    const sorted = commonOpponentStats.sort((a, b) => a.points - b.points);
    const distinctPoints = new Set(sorted.map(s => s.points));

    if (distinctPoints.size > 1) {
      console.log('\n✓ Tie broken by performance against common opponents');
      
      // Add tiebreak notes and assign places
      const startingPlace = Math.min(...group.map(t => t.place || 1));
      
      sorted.forEach((stat, index) => {
        const team = group.find(t => t.team === stat.team)!;
        team.place = startingPlace + index;
        
        const beatenTeams = sorted.slice(index + 1).map(s => s.team);
        const lostToTeams = sorted.slice(0, index).map(s => s.team);
        
        const parts: string[] = [];
        if (beatenTeams.length > 0) {
          parts.push(`Beat ${beatenTeams.join(', ')}`);
        }
        if (lostToTeams.length > 0) {
          parts.push(`Lost to ${lostToTeams.join(', ')}`);
        }
        
        team.tiebreakNote = `${parts.join('. ')} against common opponents (${commonOpponents.join(', ')}) - ${stat.points} total points`;
      });

      return group.sort((a, b) => a.place - b.place);
    }
  }

  // If we reach here, teams remain tied
  console.log('\n=== Final Result ===');
  console.log('Unable to break tie - teams will share same place');

  const sharedPlace = Math.min(...group.map(t => t.place || 1));
  group.forEach(team => {
    team.place = sharedPlace;
    const tiedTeams = group.filter(t => t.team !== team.team);
    team.tiebreakNote = `Tied with ${tiedTeams.map(t => t.team).join(', ')} (all tiebreakers exhausted)`;
  });

  return group;
}

// Update getLastMatchResult function
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

  const boatsPerTeam = getBoatsPerTeam(match.racingFormat);
  const isTeamA = match.teamA === teamA;
  
  const teamPoints = isTeamA
    ? match.result.slice(0, boatsPerTeam).reduce((a, b) => a + b, 0)
    : match.result.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a, b) => a + b, 0);
  const otherTeamPoints = isTeamA
    ? match.result.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a, b) => a + b, 0)
    : match.result.slice(0, boatsPerTeam).reduce((a, b) => a + b, 0);

  if (teamPoints < otherTeamPoints) {
    return 1; // teamA wins
  } else if (teamPoints > otherTeamPoints) {
    return -1; // teamA loses
  } else {
    // Tie on points - check first place
    const pos1Index = match.result.indexOf(1);
    if ((isTeamA && pos1Index >= boatsPerTeam) || (!isTeamA && pos1Index < boatsPerTeam)) {
      return 1; // teamA didn't get first place, so teamA wins
    } else {
      return -1; // teamA got first place, so teamA loses
    }
  }
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

// Update getPointsAgainstOpponents function
function getPointsAgainstOpponents(team: string, opponents: string[], races: Race[]): number {
  let totalPoints = 0;
  races.forEach(race => {
    if (!isCompletedRace(race) || !race.result) return;
    if (
      (race.teamA === team && opponents.includes(race.teamB)) ||
      (race.teamB === team && opponents.includes(race.teamA))
    ) {
      const boatsPerTeam = getBoatsPerTeam(race.racingFormat);
      const isTeamA = race.teamA === team;
      
      const teamPoints = isTeamA
        ? race.result.slice(0, boatsPerTeam).reduce((a, b) => a + b, 0)
        : race.result.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a, b) => a + b, 0);
      totalPoints += teamPoints;
    }
  });
  return totalPoints;
}

// Update the metrics check in updateChangeoverFlags
function updateChangeoverFlags(races: Race[]): void {
  console.log('\n=== Updating Changeover Flags ===');
  
  // Reset all flags first
  races.forEach(race => {
    race.goToChangeover = false;
    race.isLaunching = false;
  });

  // Group races by boat combinations
  const boatSets = new Map<string, Race[]>();
  races.forEach(race => {
    if (!race.boats) return;
    const boatKey = JSON.stringify([race.boats.teamA, race.boats.teamB].sort());
    if (!boatSets.has(boatKey)) {
      boatSets.set(boatKey, []);
    }
    boatSets.get(boatKey)!.push(race);
  });

  // Process each boat set
  boatSets.forEach((setRaces, boatKey) => {
    console.log(`\nProcessing boat set: ${boatKey}`);
    
    // Sort races in this set by race number
    const orderedRaces = setRaces.sort((a, b) => a.raceNumber - b.raceNumber);
    
    orderedRaces.forEach((race, index) => {
      // Skip if race is already finished
      if (race.status === 'finished') {
        console.log(`Race ${race.raceNumber}: Skipped (${race.status})`);
        return;
      }

      // First race in each boat set should get isLaunching
      if (index === 0) {
        race.isLaunching = true;
        console.log(`Race ${race.raceNumber}: First in set - Setting isLaunching = true`);
      } 
      // For every other race in the set
      else {
        // Find the race that finished 2 races before the previous race in this set
        const previousRace = orderedRaces[index - 1];
        const triggerRaceNumber = previousRace.raceNumber - 2;
        
        console.log(`Race ${race.raceNumber}: Looking for trigger race ${triggerRaceNumber}`);

        // Check all races, not just this set's races
        const triggerRace = races.find(r => r.raceNumber === triggerRaceNumber);

        if (triggerRaceNumber < 1) {
          race.goToChangeover = true;
          console.log(`Race ${race.raceNumber}: No trigger race (number < 1) - Setting goToChangeover = true`);
        } else if (!triggerRace) {
          console.log(`Race ${race.raceNumber}: Trigger race ${triggerRaceNumber} not found`);
        } else {
          console.log(`Race ${race.raceNumber}: Trigger race ${triggerRaceNumber} status = ${triggerRace.status || 'not started'}`);
          if (triggerRace.status === 'finished') {
            race.goToChangeover = true;
            console.log(`Race ${race.raceNumber}: Trigger race finished - Setting goToChangeover = true`);
          }
        }
      }
    });

    // Log final state for this boat set
    console.log('\nFinal flags for this boat set:');
    orderedRaces.forEach(race => {
      console.log(`Race ${race.raceNumber}: isLaunching=${!!race.isLaunching}, goToChangeover=${!!race.goToChangeover}`);
    });
  });
}

// Update the computeLeaderboard function to handle different racing formats
function computeLeaderboard(races: Race[]): { [key: string]: TeamStats[] } {
  // Filter out knockout matches first
  const regularRaces = races.filter(race => !race.isKnockout);

  // Log racing formats found
  const formats = new Set(regularRaces.map(race => race.racingFormat || '3v3'));
  console.log('Racing formats found in schedule:', Array.from(formats));

  // If no leagues are defined, create a default league with all regular races
  if (!regularRaces.some(race => race.league)) {
    console.log('\n=== Computing Single Leaderboard (No Leagues) ===');
    
    // Get all teams from regular matches only
    const teams = new Set<string>();
    regularRaces.forEach(race => {
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

    // Calculate stats for regular matches only
    regularRaces.forEach(race => {
      if (!isCompletedRace(race) || !race.result) return;

      const teamAStats = stats.find(s => s.team === race.teamA)!;
      const teamBStats = stats.find(s => s.team === race.teamB)!;

      teamAStats.totalRaces++;
      teamBStats.totalRaces++;

      const boatsPerTeam = getBoatsPerTeam(race.racingFormat);
      const teamAPoints = race.result.slice(0, boatsPerTeam).reduce((a, b) => a + b, 0);
      const teamBPoints = race.result.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a, b) => a + b, 0);

      if (teamAPoints < teamBPoints) {
        teamAStats.wins++;
      } else if (teamBPoints < teamAPoints) {
        teamBStats.wins++;
      } else {
        // Tie-breaker: team WITHOUT first place wins (team with 1st place loses)
        if (race.result.indexOf(1) < boatsPerTeam) {
          teamBStats.wins++; // Team A got first place, so Team B wins
        } else {
          teamAStats.wins++; // Team B got first place, so Team A wins
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

  // League-based logic - group regular races by league
  const leagueRaces = new Map<string, Race[]>();
  regularRaces.forEach(race => {
    if (!race.league) return;
    if (!leagueRaces.has(race.league)) {
      leagueRaces.set(race.league, []);
    }
    leagueRaces.get(race.league)!.push(race);
  });

  // Create leaderboard for each league using regular matches only
  const leagueLeaderboards: { [key: string]: TeamStats[] } = {};

  leagueRaces.forEach((leagueRaces, leagueName) => {
    console.log(`\n=== Computing Leaderboard for ${leagueName} League (Regular Matches Only) ===`);
    
    // Get teams in this league from regular matches
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
      league: leagueName,
    }));

    // Calculate stats for this league
    leagueRaces.forEach(race => {
      if (!isCompletedRace(race) || !race.result) return;

      const teamAStats = stats.find(s => s.team === race.teamA)!;
      const teamBStats = stats.find(s => s.team === race.teamB)!;

      teamAStats.totalRaces++;
      teamBStats.totalRaces++;

      const boatsPerTeam = getBoatsPerTeam(race.racingFormat);
      const teamAPoints = race.result.slice(0, boatsPerTeam).reduce((a, b) => a + b, 0);
      const teamBPoints = race.result.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a, b) => a + b, 0);

      if (teamAPoints < teamBPoints) {
        teamAStats.wins++;
      } else if (teamBPoints < teamAPoints) {
        teamBStats.wins++;
      } else {
        // Tie-breaker: team WITHOUT first place wins (team with 1st place loses)
        if (race.result.indexOf(1) < boatsPerTeam) {
          teamBStats.wins++; // Team A got first place, so Team B wins
        } else {
          teamAStats.wins++; // Team B got first place, so Team A wins
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

// GET endpoint
export async function GET() {
  try {
    const leaderboard = await getBlobData('leaderboard.json');
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error loading leaderboard from Blob:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

// POST endpoint for updating race results
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { raceNumber, result, status, startTime, endTime } = body;

    console.log(`POST /api/results - Race ${raceNumber}:`, { result, status });

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

    const race = races[raceIndex];
    const racingFormat = race.racingFormat || '3v3';
    const expectedLength = getBoatsPerTeam(racingFormat) * 2;

    console.log(`Race ${raceNumber} format: ${racingFormat}, expected length: ${expectedLength}`);

    // Validate result array if provided
    if (result !== undefined && result !== null) {
      debugResult(raceNumber, result, racingFormat);
      
      if (!Array.isArray(result)) {
        return NextResponse.json(
          { error: `Result must be an array. Got: ${typeof result}` },
          { status: 400 }
        );
      }

      if (result.length !== expectedLength) {
        return NextResponse.json(
          { error: `Result must contain exactly ${expectedLength} positions for ${racingFormat} racing format. Got ${result.length} positions: [${result.join(', ')}]` },
          { status: 400 }
        );
      }

      const invalidPositions = result.filter(pos => 
        typeof pos !== 'number' || 
        !Number.isInteger(pos) || 
        pos < 1
      );
      
      if (invalidPositions.length > 0) {
        return NextResponse.json(
          { error: `All positions must be positive integers. Invalid positions: [${invalidPositions.join(', ')}]. Got: [${result.join(', ')}]` },
          { status: 400 }
        );
      }

      console.log(`✓ Result validation passed for race ${raceNumber}`);
    }

    const currentTime = new Date().toISOString();
    let finalEndTime = endTime;
    let finalStatus = status;
    let finalStartTime = startTime;

    if (result !== undefined && result !== null && !endTime) {
      finalEndTime = currentTime;
    }

    if (result !== undefined && result !== null && !status) {
      finalStatus = 'finished';
    }

    if (status === 'in_progress' && !race.startTime && !startTime) {
      finalStartTime = currentTime;
    }

    // Update race data
    const updatedRace = {
      ...races[raceIndex],
      ...(finalStatus && { status: finalStatus }),
      ...(finalStartTime && { startTime: finalStartTime }),
      ...(finalEndTime && { endTime: finalEndTime }),
      ...(result !== undefined && { result })
    };

    races[raceIndex] = updatedRace;

    // Update changeover status and save
    if (finalStatus === 'finished' || (result !== undefined && result !== null)) {
      updateChangeoverFlags(races);
    }

    await saveSchedule(races);

    // Update metrics and leaderboard
    if ((finalStatus === 'finished' || (result !== undefined && result !== null)) && finalEndTime) {
      try {
        await updateMetrics(races);
      } catch (error) {
        console.error('Error updating metrics:', error);
      }
    }

    if (result !== undefined) {
      const leagueLeaderboards = computeLeaderboard(races);
      await saveBlobData('leaderboard.json', leagueLeaderboards);
    }

    return NextResponse.json({
      success: true,
      message: `Race ${raceNumber} updated successfully (${racingFormat} format)`,
      race: {
        raceNumber: updatedRace.raceNumber,
        teamA: updatedRace.teamA,
        teamB: updatedRace.teamB,
        result: updatedRace.result,
        status: updatedRace.status,
        startTime: updatedRace.startTime,
        endTime: updatedRace.endTime,
        racingFormat: updatedRace.racingFormat
      }
    });
  } catch (error) {
    console.error('Error in POST /api/results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Keep all your other helper functions exactly as they are
// (getHeadToHeadRecord, resolveTeamGroup, updateChangeoverFlags, computeLeaderboard, etc.)
