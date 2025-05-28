import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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
  eventName: string; // Add this field
};

export async function GET() {
  try {
    const settingsFile = path.join(process.cwd(), 'data', 'settings.json');
    
    let settings: Settings;
    try {
      const data = await fs.readFile(settingsFile, 'utf8');
      settings = JSON.parse(data);
      
      // Ensure racingFormat is set (backward compatibility)
      if (!settings.racingFormat) {
        settings.racingFormat = '3v3';
      }
      
      // Ensure eventName is set (backward compatibility)
      if (!settings.eventName) {
        settings.eventName = 'IUSA Event 1';
      }
    } catch (error) {
      // If file doesn't exist, return default settings
      console.log('Settings file not found, using defaults');
      settings = {
        useLeagues: false,
        leagues: [],
        teamInput: '',
        boatSets: [],
        racingFormat: '3v3',
        eventName: 'IUSA Event 1' // Default event name
      };
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
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

    // Ensure all fields are set
    const settings: Settings = {
      useLeagues: body.useLeagues ?? false,
      leagues: body.leagues ?? [],
      teamInput: body.teamInput ?? '',
      boatSets: body.boatSets ?? [],
      racingFormat: body.racingFormat ?? '3v3',
      eventName: body.eventName ?? 'IUSA Event 1' // Default if not provided
    };

    const settingsFile = path.join(process.cwd(), 'data', 'settings.json');
    await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));

    console.log('Settings saved successfully:', settings);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}