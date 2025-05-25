import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

interface Settings {
  useLeagues: boolean;
  leagues: any[];
  teamInput: string;
  boatSets: any[];
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'settings.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const settings = JSON.parse(fileContents);
    return NextResponse.json(settings);
  } catch (error) {
    // Return default settings if file doesn't exist
    return NextResponse.json({
      useLeagues: false,
      leagues: [],
      teamInput: '',
      boatSets: [{
        id: 'set-1',
        team1Color: '',
        team2Color: ''
      }]
    });
  }
}

export async function POST(req: Request) {
  try {
    const settings: Settings = await req.json();
    const filePath = path.join(process.cwd(), 'data', 'settings.json');
    await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}