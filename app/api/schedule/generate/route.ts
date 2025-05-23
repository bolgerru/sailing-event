import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface BoatSet {
  id: string;
  team1Color: string;
  team2Color: string;
}

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

    // Generate all possible unique pairs (no team vs itself)
    const allPairings: [string, string][] = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        if (teams[i] !== teams[j]) {
          allPairings.push([teams[i], teams[j]]);
        }
      }
    }

    const races: {
      raceNumber: number;
      teamA: string;
      teamB: string;
      boats: {
        teamA: string;
        teamB: string;
      };
      result?: number[];
    }[] = [];

    let raceNumber = 1;

    // Helper: count how many times team appeared in last N races of the same boat set
    function countTeamInLastNRacesOfSet(team: string, boatSet: BoatSet, n: number) {
      const recentRaces = races.slice(-n);
      return recentRaces.filter(
        (r) =>
          (r.teamA === team || r.teamB === team) &&
          r.boats.teamA === boatSet.team1Color &&
          r.boats.teamB === boatSet.team2Color
      ).length;
    }

    // Helper: check if team appeared in both last 2 races of boat set
    function appearedInBothLast2RacesOfSet(team: string, boatSet: BoatSet) {
      const lastTwo = races.slice(-2);
      if (lastTwo.length < 2) return false;
      return (
        lastTwo.every(
          (r) =>
            (r.teamA === team || r.teamB === team) &&
            r.boats.teamA === boatSet.team1Color &&
            r.boats.teamB === boatSet.team2Color
        )
      );
    }

    // MAIN LOOP
    let remainingPairings = [...allPairings];

    while (remainingPairings.length > 0) {
      const currentBoatSet = boatSets[races.length % boatSets.length];

      // --- FILTER 1: exclude teams that appeared in last 2 races but NOT using current boat set ---

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

      // Before filter 1:
      console.log(`\n[Filter 1] Before excluding teams from last 2 races in other boat sets:`);
      console.log(`- Remaining pairings count: ${remainingPairings.length}`);
      console.log(`- Remaining pairings: ${remainingPairings.map(p => `${p[0]} vs ${p[1]}`).join(', ')}`);

      // Pairings excluded by filter 1
      const excludedByFilter1 = remainingPairings.filter(
        ([teamA, teamB]) =>
          recentlyRacedTeams.has(teamA) || recentlyRacedTeams.has(teamB)
      );
      // Pairings remaining after filter 1
      let candidates = remainingPairings.filter(
        ([teamA, teamB]) =>
          !recentlyRacedTeams.has(teamA) && !recentlyRacedTeams.has(teamB)
      );

      console.log(`- Teams excluded due to recent races in other boat sets (last 2 races): ${Array.from(recentlyRacedTeams).join(', ') || '(none)'}`);
      console.log(`- Pairings excluded by Filter 1 (${excludedByFilter1.length}): ${excludedByFilter1.map(p => `${p[0]} vs ${p[1]}`).join(', ') || '(none)'}`);
      console.log(`- Pairings remaining after Filter 1 (${candidates.length}): ${candidates.map(p => `${p[0]} vs ${p[1]}`).join(', ') || '(none)'}`);

      if (candidates.length === 0) {
        console.log(
          '- No pairings left after Filter 1, reverting to all remaining pairings.'
        );
        candidates = [...remainingPairings];
      }

      // --- FILTER 3 (moved up): Prefer pairings where at least one team appeared in the last race of this boat set ---

      const lastRaceOfBoatSet = [...races].reverse().find(
        (r) => r.boats.teamA === currentBoatSet.team1Color && r.boats.teamB === currentBoatSet.team2Color
      );

      const candidatesWithLastRaceTeam = candidates.filter(
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

      const excludedByFilter3 = candidates.filter(
        ([teamA, teamB]) => !candidatesWithLastRaceTeam.includes([teamA, teamB])
      );

      console.log(`\n[Filter 3] Prefer pairings where at least one team was in last race of this boat set:`);
      console.log(`- Last race of boat set: ${lastRaceOfBoatSet ? `${lastRaceOfBoatSet.teamA} vs ${lastRaceOfBoatSet.teamB}` : '(none)'}`);
      console.log(`- Pairings included by Filter 3 (${candidatesWithLastRaceTeam.length}): ${candidatesWithLastRaceTeam.map(p => `${p[0]} vs ${p[1]}`).join(', ') || '(none)'}`);
      console.log(`- Pairings excluded by Filter 3 (${candidates.length - candidatesWithLastRaceTeam.length}): ${candidates.filter(p => !candidatesWithLastRaceTeam.includes(p)).map(p => `${p[0]} vs ${p[1]}`).join(', ') || '(none)'}`);

      // If no candidates after filter 3, fallback to candidates
      const filteredCandidates = candidatesWithLastRaceTeam.length > 0 ? candidatesWithLastRaceTeam : candidates;

      // --- FILTER 2 (moved down): Prefer pairings where neither team appeared in BOTH last 2 races of this boat set ---

      const excludedByFilter2 = filteredCandidates.filter(
        ([teamA, teamB]) =>
          appearedInBothLast2RacesOfSet(teamA, currentBoatSet) ||
          appearedInBothLast2RacesOfSet(teamB, currentBoatSet)
      );

      const notInBothLast2 = filteredCandidates.filter(
        ([teamA, teamB]) =>
          !appearedInBothLast2RacesOfSet(teamA, currentBoatSet) &&
          !appearedInBothLast2RacesOfSet(teamB, currentBoatSet)
      );

      console.log(`\n[Filter 2] Filtering out pairings where a team appeared in both last 2 races of current boat set:`);
      console.log(`- Pairings excluded by Filter 2 (${excludedByFilter2.length}): ${excludedByFilter2.map(p => `${p[0]} vs ${p[1]}`).join(', ') || '(none)'}`);
      console.log(`- Pairings remaining after Filter 2 (${notInBothLast2.length}): ${notInBothLast2.map(p => `${p[0]} vs ${p[1]}`).join(', ') || '(none)'}`);

      const finalCandidates = notInBothLast2.length > 0 ? notInBothLast2 : filteredCandidates;

      // Select first candidate
      let selectedPairing = finalCandidates[0];

      // Log detailed info about selection
      for (const pairing of finalCandidates) {
        const [teamA, teamB] = pairing;
        const teamAInLast2 = countTeamInLastNRacesOfSet(teamA, currentBoatSet, 2);
        const teamBInLast2 = countTeamInLastNRacesOfSet(teamB, currentBoatSet, 2);
        const teamAInBothLast2 = appearedInBothLast2RacesOfSet(teamA, currentBoatSet);
        const teamBInBothLast2 = appearedInBothLast2RacesOfSet(teamB, currentBoatSet);
        const appearedInLastRace =
          lastRaceOfBoatSet &&
          (lastRaceOfBoatSet.teamA === teamA ||
            lastRaceOfBoatSet.teamB === teamA ||
            lastRaceOfBoatSet.teamA === teamB ||
            lastRaceOfBoatSet.teamB === teamB);

        console.log(`\nChecking pairing: ${teamA} vs ${teamB}`);
        console.log(` - Team A appeared in last 2 races of this boat set: ${teamAInLast2}`);
        console.log(` - Team B appeared in last 2 races of this boat set: ${teamBInLast2}`);
        console.log(` - Team A in both last 2 races? ${teamAInBothLast2}`);
        console.log(` - Team B in both last 2 races? ${teamBInBothLast2}`);
        console.log(` - Appeared in last race? ${appearedInLastRace}`);
        if (pairing === selectedPairing) {
          console.log(`--> Selected pairing: ${teamA} vs ${teamB} on boat set ${currentBoatSet.team1Color} vs ${currentBoatSet.team2Color}`);
        }
      }

      if (!selectedPairing) {
        selectedPairing = remainingPairings[0];
        console.log(`No optimal pairing found, falling back to: ${selectedPairing[0]} vs ${selectedPairing[1]}`);
      }

            // Add race to schedule
      races.push({
        raceNumber: raceNumber++,
        teamA: selectedPairing[0],
        teamB: selectedPairing[1],
        boats: {
          teamA: currentBoatSet.team1Color,
          teamB: currentBoatSet.team2Color,
        },
        result: [],  // <-- initialize as an empty array
      });

      // Remove selected pairing from remaining pairings
      remainingPairings = remainingPairings.filter(
        (p) =>
          !(
            (p[0] === selectedPairing[0] && p[1] === selectedPairing[1]) ||
            (p[0] === selectedPairing[1] && p[1] === selectedPairing[0])
          )
      );
    }

    // Save schedule to JSON file (optional)
    const filePath = path.join(process.cwd(), 'data', 'schedule.json');
    fs.writeFileSync(filePath, JSON.stringify(races, null, 2));

    return NextResponse.json({ races });
  } catch (error: unknown) {
  // Narrow error to an object with a message property
  const message =
    error && typeof error === 'object' && 'message' in error
      ? (error as { message: string }).message
      : String(error);

  return NextResponse.json({ error: message }, { status: 500 });
}

}

