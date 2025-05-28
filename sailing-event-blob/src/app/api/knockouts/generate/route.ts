import { NextResponse } from 'next/server';
import { BlobClient } from '../../../lib/blob-client';

export async function POST(req: Request) {
  try {
    const { matchups, bestOf, stage } = await req.json();
    const blobClient = new BlobClient();

    // Generate knockout matches based on the provided matchups
    const knockoutMatches = matchups.map((matchup, index) => ({
      matchNumber: index + 1,
      teamA: matchup.teamA,
      teamB: matchup.teamB,
      bestOf: bestOf,
      stage: stage,
      status: 'not_started',
    }));

    // Save the generated matches to blob storage
    await blobClient.uploadKnockoutMatches(knockoutMatches);

    return NextResponse.json({ success: true, matches: knockoutMatches });
  } catch (error) {
    console.error('Error generating knockout matches:', error);
    return NextResponse.json({ error: 'Failed to generate knockout matches' }, { status: 500 });
  }
}