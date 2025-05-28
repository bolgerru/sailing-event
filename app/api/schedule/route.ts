import { NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

async function getBlobData(fileName: string) {
  try {
    const blobUrl = `https://${process.env.BLOB_READ_WRITE_TOKEN?.split('vercel_blob_rw_')[1]?.split('_')[0]}.public.blob.vercel-storage.com/${fileName}`;
    const response = await fetch(blobUrl);
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (error) {
    console.log(`${fileName} not found in blob, returning empty array`);
    return [];
  }
}

async function saveBlobData(fileName: string, data: any) {
  const blob = await put(fileName, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
  return blob;
}

export async function GET() {
  try {
    const schedule = await getBlobData('schedule.json');
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error loading schedule from Blob:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const races = await request.json();
    await saveBlobData('schedule.json', races);
    return NextResponse.json({ message: 'Schedule saved successfully' });
  } catch (error) {
    console.error('Error saving schedule to Blob:', error);
    return NextResponse.json(
      { error: 'Failed to save schedule' },
      { status: 500 }
    );
  }
}
