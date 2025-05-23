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

    function countTeamInLastNRacesOfSet(team: string, boatSet: BoatSet, n: number) {
      const recentRaces = races.slice(-n);
      return recentRaces.filter(
        (r) =>
          (r.teamA === team || r.teamB === team) &&
          r.boats.teamA === boatSet.team1Color &&
          r.boats.teamB === boatSet.team2Color
      ).length;
    }

    function appearedInBothLast2RacesOfSet(team: string, boatSet: BoatSet) {
      const racesOfSameSet = races.filter(
        (r) =>
          (r.boats.teamA === boatSet.team1Color && r.boats.teamB === boatSet.team2Color) ||
          (r.boats.teamA === boatSet.team2Color && r.boats.teamB === boatSet.team1Color)
      );

      const lastTwoSameSet = racesOfSameSet.slice(-2);

      if (lastTwoSameSet.length < 2) {
        return false;
      }

      for (const r of lastTwoSameSet) {
        const raceColors = [r.boats.teamA, r.boats.teamB];
        const boatSetColors = [boatSet.team1Color, boatSet.team2Color];
        const sameBoatSet =
          raceColors.includes(boatSetColors[0]) &&
          raceColors.includes(boatSetColors[1]);
        const teamInRace = r.teamA === team || r.teamB === team;
        if (!(teamInRace && sameBoatSet)) {
          return false;
        }
      }
      return true;
    }

    let remainingPairings = [...allPairings];

    while (remainingPairings.length > 0) {
      const currentBoatSet = boatSets[races.length % boatSets.length];
      const currentRaceNumber = raceNumber;

      // Filter 1: exclude teams that appeared in last 2 races but NOT using current boat set
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

      const excludedByFilter1 = remainingPairings.filter(
        ([teamA, teamB]) =>
          recentlyRacedTeams.has(teamA) || recentlyRacedTeams.has(teamB)
      );
      const candidates = remainingPairings.filter(
        ([teamA, teamB]) =>
          !recentlyRacedTeams.has(teamA) && !recentlyRacedTeams.has(teamB)
      );

      let filter1Candidates = candidates;
      if (filter1Candidates.length === 0) {
        filter1Candidates = [...remainingPairings];
      }

      // Filter 3: Prefer pairings where at least one team appeared in last race of this boat set
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

      // Filter 2: Exclude pairings where a team appeared in BOTH last 2 races of this boat set
      const excludedByFilter2 = filter3Candidates.filter(
        ([teamA, teamB]) =>
          appearedInBothLast2RacesOfSet(teamA, currentBoatSet) ||
          appearedInBothLast2RacesOfSet(teamB, currentBoatSet)
      );

      const notInBothLast2 = filter3Candidates.filter(
        ([teamA, teamB]) =>
          !appearedInBothLast2RacesOfSet(teamA, currentBoatSet) &&
          !appearedInBothLast2RacesOfSet(teamB, currentBoatSet)
      );

      const finalCandidates = notInBothLast2.length > 0 ? notInBothLast2 : filter3Candidates;

      // Select best candidate with tie-breaker on fewer appearances in last 2 races of current boat set
      let selectedPairing = finalCandidates[0];
      for (const pairing of finalCandidates) {
        const [teamA, teamB] = pairing;

        const teamACount = countTeamInLastNRacesOfSet(teamA, currentBoatSet, 2);
        const teamBCount = countTeamInLastNRacesOfSet(teamB, currentBoatSet, 2);

        const selectedCount =
          countTeamInLastNRacesOfSet(selectedPairing[0], currentBoatSet, 2) +
          countTeamInLastNRacesOfSet(selectedPairing[1], currentBoatSet, 2);

        const currentCount = teamACount + teamBCount;

        if (currentCount < selectedCount) {
          selectedPairing = pairing;
        }
      }

      // --- Consistent color assignment for consecutive races with the same boat set ---
      const lastRace = [...races].reverse().find(
        (r) =>
          r.boats.teamA === currentBoatSet.team1Color &&
          r.boats.teamB === currentBoatSet.team2Color
      );

      let teamA = selectedPairing[0];
      let teamB = selectedPairing[1];

      if (lastRace) {
        const { teamA: lastTeamA, teamB: lastTeamB } = lastRace;

        const teamAPosition = lastTeamA === teamA ? 'A' : lastTeamB === teamA ? 'B' : null;
        const teamBPosition = lastTeamA === teamB ? 'A' : lastTeamB === teamB ? 'B' : null;

        if (teamAPosition && teamBPosition) {
          if (teamAPosition === 'A' && teamBPosition === 'B') {
            // positions are correct, no change
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
          // else teamBPosition === 'B', no swap needed
        }
      }

      // Add race with consistent assignment
      races.push({
        raceNumber: raceNumber++,
        teamA,
        teamB,
        boats: {
          teamA: currentBoatSet.team1Color,
          teamB: currentBoatSet.team2Color,
        },
      });

      // Remove selected pairing (order-insensitive)
      remainingPairings = remainingPairings.filter(
        ([a, b]) =>
          !(
            (a === selectedPairing[0] && b === selectedPairing[1]) ||
            (a === selectedPairing[1] && b === selectedPairing[0])
          )
      );
    }

    // Save schedule to JSON file
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    const scheduleFile = path.join(dataDir, 'schedule.json');
    fs.writeFileSync(scheduleFile, JSON.stringify(races, null, 2));

    return NextResponse.json({ schedule: races });
  } catch (error) {
    console.error('Error generating schedule:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
