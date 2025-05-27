import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { KnockoutConfig } from '../../components/KnockoutModal'; // Updated import path

export async function POST(req: Request) {
  try {
    const config: KnockoutConfig = await req.json();
    
    // Load current schedule
    const schedulePath = path.join(process.cwd(), 'data', 'schedule.json');
    const currentSchedule = JSON.parse(await fs.readFile(schedulePath, 'utf-8'));

    // Get next race number
    const nextRaceNumber = Math.max(...currentSchedule.map((r: any) => r.raceNumber)) + 1;

    // Create knockout matches
    const knockoutMatches = [];
    let currentRaceNumber = nextRaceNumber;

    for (const matchup of config.matchups) {
      // Generate races based on best-of format
      const numRaces = config.bestOf;
      
      for (let i = 0; i < numRaces; i++) {
        knockoutMatches.push({
          raceNumber: currentRaceNumber + i,
          teamA: matchup.teamA,
          teamB: matchup.teamB,
          boats: {
            teamA: 'Red',
            teamB: 'Black'
          },
          isKnockout: true,
          knockoutStage: config.stage,
          bestOf: config.bestOf,
          matchNumber: Math.floor(i / config.bestOf),
          raceInMatch: i + 1,
          status: 'not_started',
          isLaunching: false,
          goToChangeover: false
        });
      }
      
      currentRaceNumber += numRaces;
    }

    // Remove any unfinished non-knockout races
    const updatedSchedule = [
      ...currentSchedule.filter((race: any) => 
        race.status === 'finished' || race.status === 'in_progress'
      ),
      ...knockoutMatches
    ];

    // Save updated schedule
    await fs.writeFile(schedulePath, JSON.stringify(updatedSchedule, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating knockout schedule:', error);
    return NextResponse.json({ error: 'Failed to create knockout schedule' }, { status: 500 });
  }
}