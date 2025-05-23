// app/api/schedule/route.ts
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
    let boatSetIndex = 0;

    // Generate round-robin schedule
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const currentBoatSet = boatSets[boatSetIndex % boatSets.length];
        races.push({
          raceNumber: raceNumber++,
          teamA: teams[i],
          teamB: teams[j],
          boats: {
            teamA: currentBoatSet.team1Color,
            teamB: currentBoatSet.team2Color
          },
          result: Array(6).fill(0)
        });
        boatSetIndex++;
      }
    }

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