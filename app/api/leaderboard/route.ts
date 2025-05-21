// api/leaderboard/route.ts
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'leaderboard.json');
    console.log('Reading leaderboard from:', filePath); // Debug log
    
    const fileContents = await fs.readFile(filePath, 'utf-8');
    console.log('Leaderboard contents:', fileContents); // Debug log
    
    const leaderboard = JSON.parse(fileContents);
    
    return new Response(JSON.stringify(leaderboard), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    return new Response(JSON.stringify({ error: 'Failed to load leaderboard' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}