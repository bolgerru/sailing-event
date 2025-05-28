import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { BlobClient } from '../../../lib/blob-client'; // Adjust the import path as necessary

export async function POST(request: Request) {
  try {
    const { matchups } = await request.json();
    
    // Validate matchups input
    if (!Array.isArray(matchups) || matchups.length === 0) {
      return NextResponse.json({ error: 'Invalid matchups data' }, { status: 400 });
    }

    const blobClient = new BlobClient();
    const scheduleFilePath = path.join(process.cwd(), 'data', 'schedule.json');

    // Load existing schedule
    const existingScheduleData = await fs.readFile(scheduleFilePath, 'utf-8');
    const existingSchedule = JSON.parse(existingScheduleData);

    // Add round-robin matchups to the schedule
    const newMatchups = matchups.map((matchup, index) => ({
      raceNumber: existingSchedule.length + index + 1,
      teamA: matchup.teamA,
      teamB: matchup.teamB,
      status: 'not_started',
      isKnockout: false,
      boats: {
        teamA: 'Red',
        teamB: 'Black'
      }
    }));

    const updatedSchedule = [...existingSchedule, ...newMatchups];

    // Save updated schedule back to the file
    await fs.writeFile(scheduleFilePath, JSON.stringify(updatedSchedule, null, 2));

    // Optionally, upload the updated schedule to blob storage
    await blobClient.uploadSchedule(updatedSchedule);

    return NextResponse.json({ success: true, message: 'Round-robin matchups added successfully' });
  } catch (error) {
    console.error('Error adding round-robin matchups:', error);
    return NextResponse.json({ error: 'Failed to add round-robin matchups' }, { status: 500 });
  }
}