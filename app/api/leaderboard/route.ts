// api/leaderboard/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

async function getBlobData(fileName: string) {
  try {
    const blobUrl = `https://${process.env.BLOB_READ_WRITE_TOKEN?.split('vercel_blob_rw_')[1]?.split('_')[0]}.public.blob.vercel-storage.com/${fileName}`;
    const response = await fetch(blobUrl);
    if (response.ok) {
      return await response.json();
    }
    return {};
  } catch (error) {
    console.log(`${fileName} not found in blob, returning empty object`);
    return {};
  }
}

export async function GET() {
  try {
    const leaderboard = await getBlobData('leaderboard.json');
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error reading leaderboard from Blob:', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, {
      status: 500,
    });
  }
}