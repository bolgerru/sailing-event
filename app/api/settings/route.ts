import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

type RacingFormat = '2v2' | '3v3' | '4v4';

type Settings = {
  useLeagues: boolean;
  leagues: Array<{
    id: string;
    name: string;
    teams: string[];
    boatSets: Array<{
      id: string;
      team1Color: string;
      team2Color: string;
    }>;
  }>;
  teamInput: string;
  boatSets: Array<{
    id: string;
    team1Color: string;
    team2Color: string;
  }>;
  racingFormat: RacingFormat;
  eventName: string;
};

async function getBlobData(fileName: string) {
  try {
    const blobUrl = `https://${process.env.BLOB_READ_WRITE_TOKEN?.split('vercel_blob_rw_')[1]?.split('_')[0]}.public.blob.vercel-storage.com/${fileName}`;
    const response = await fetch(blobUrl);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.log(`${fileName} not found in blob`);
    return null;
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
    let settings: Settings | null = await getBlobData('settings.json');
    
    if (!settings) {
      // Default settings if none exist
      settings = {
        useLeagues: false,
        leagues: [],
        teamInput: '',
        boatSets: [],
        racingFormat: '3v3',
        eventName: 'IUSA Event 1'
      };
    }

    // Ensure backward compatibility
    if (!settings.racingFormat) {
      settings.racingFormat = '3v3';
    }
    if (!settings.eventName) {
      settings.eventName = 'IUSA Event 1';
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error loading settings from Blob:', error);
    return NextResponse.json({
      useLeagues: false,
      leagues: [],
      teamInput: '',
      boatSets: [],
      racingFormat: '3v3',
      eventName: 'IUSA Event 1'
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received settings update:', body);

    // Validate racing format
    if (body.racingFormat && !['2v2', '3v3', '4v4'].includes(body.racingFormat)) {
      return NextResponse.json(
        { error: 'Invalid racing format. Must be 2v2, 3v3, or 4v4' },
        { status: 400 }
      );
    }

    const settings: Settings = {
      useLeagues: body.useLeagues ?? false,
      leagues: body.leagues ?? [],
      teamInput: body.teamInput ?? '',
      boatSets: body.boatSets ?? [],
      racingFormat: body.racingFormat ?? '3v3',
      eventName: body.eventName ?? 'IUSA Event 1'
    };

    await saveBlobData('settings.json', settings);
    console.log('Settings saved successfully to Blob:', settings);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings to Blob:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}