import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { raceNumber, startTime } = await request.json();

    // Read the current schedule
    const scheduleFile = path.join(process.cwd(), 'data', 'schedule.json');
    const scheduleData = await fs.readFile(scheduleFile, 'utf8');
    const races = JSON.parse(scheduleData);

    // Find and update the race
    const raceIndex = races.findIndex((race: any) => race.raceNumber === raceNumber);
    
    if (raceIndex === -1) {
      return NextResponse.json(
        { error: 'Race not found' },
        { status: 404 }
      );
    }

    // Update race status and start time
    races[raceIndex] = {
      ...races[raceIndex],
      status: 'in_progress',
      startTime: startTime
    };

    // Write back to file
    await fs.writeFile(scheduleFile, JSON.stringify(races, null, 2));

    return NextResponse.json({ message: 'Race started successfully' });
  } catch (error) {
    console.error('Error starting race:', error);
    return NextResponse.json(
      { error: 'Failed to start race' },
      { status: 500 }
    );
  }
}