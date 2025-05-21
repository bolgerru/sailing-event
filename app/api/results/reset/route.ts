import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST() {
  try {
    const leaderboardPath = path.join(process.cwd(), 'data', 'leaderboard.json');
    
    // Write empty leaderboard
    await fs.writeFile(leaderboardPath, JSON.stringify([], null, 2));

    return NextResponse.json({ 
      success: true,
      message: 'Leaderboard reset successfully'
    });
  } catch (error) {
    console.error('Failed to reset leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to reset leaderboard' },
      { status: 500 }
    );
  }
}