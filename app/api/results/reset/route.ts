import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST() {
  try {
    // Write empty leaderboard to Blob
    await put('leaderboard.json', JSON.stringify({}, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });

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