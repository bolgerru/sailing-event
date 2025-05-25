import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db'; // Updated import path

export async function POST(request: Request) {
  try {
    const { raceNumber, startTime } = await request.json();

    // Update race status in database
    await db.race.update({
      where: { raceNumber },
      data: {
        status: 'in_progress',
        startTime
      }
    });

    return NextResponse.json({ message: 'Race started successfully' });
  } catch (error) {
    console.error('Error starting race:', error);
    return NextResponse.json(
      { error: 'Failed to start race' },
      { status: 500 }
    );
  }
}