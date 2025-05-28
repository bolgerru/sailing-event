import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Race {
  raceNumber: number;
  teamA: string;
  teamB: string;
  result?: number[] | null;
  winner?: string | null;
  boats?: {
    [key: string]: string;
  };
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
  endTime?: string;
  isKnockout?: boolean;
  stage?: string;
  league?: string;
  matchNumber?: number;
  racingFormat?: '2v2' | '3v3' | '4v4';
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { removeAll, removeUnsailedOnly } = body;

    // Load current schedule
    const scheduleFile = path.join(process.cwd(), 'data', 'schedule.json');
    
    if (!await fs.access(scheduleFile).then(() => true).catch(() => false)) {
      return NextResponse.json({ error: 'Schedule file not found' }, { status: 404 });
    }

    const scheduleData = await fs.readFile(scheduleFile, 'utf8');
    const races: Race[] = JSON.parse(scheduleData);

    console.log('=== KNOCKOUT REMOVAL REQUEST ===');
    console.log('Remove all:', removeAll);
    console.log('Remove unsailed only:', removeUnsailedOnly);
    console.log('Total races:', races.length);
    console.log('Knockout races:', races.filter(r => r.isKnockout).length);

    let racesToRemove: Race[] = [];
    let racesToKeep: Race[] = [];

    if (removeAll) {
      // Remove ALL knockout races
      racesToRemove = races.filter(race => race.isKnockout);
      racesToKeep = races.filter(race => !race.isKnockout);
      
      console.log('Removing ALL knockout races:', racesToRemove.length);
    } else if (removeUnsailedOnly) {
      // Remove only unsailed knockout races
      racesToRemove = races.filter(race => 
        race.isKnockout && (!race.result || race.result.length === 0)
      );
      racesToKeep = races.filter(race => 
        !race.isKnockout || (race.isKnockout && race.result && race.result.length > 0)
      );
      
      console.log('Removing unsailed knockout races:', racesToRemove.length);
      console.log('Keeping completed knockout races:', races.filter(r => r.isKnockout && r.result && r.result.length > 0).length);
    } else {
      return NextResponse.json({ error: 'Must specify either removeAll or removeUnsailedOnly' }, { status: 400 });
    }

    if (racesToRemove.length === 0) {
      return NextResponse.json({ 
        message: 'No knockout races found to remove',
        removedCount: 0,
        keptCount: racesToKeep.length
      });
    }

    // Log details of races being removed
    console.log('\nRaces being removed:');
    racesToRemove.forEach(race => {
      console.log(`  Race ${race.raceNumber}: ${race.teamA} vs ${race.teamB} (${race.stage} #${race.matchNumber}) - ${race.result ? 'Completed' : 'Unsailed'}`);
    });

    // Renumber remaining races to maintain sequential numbering
    const finalRaces = racesToKeep
      .sort((a, b) => a.raceNumber - b.raceNumber)
      .map((race, index) => ({
        ...race,
        raceNumber: index + 1
      }));

    console.log('\nFinal schedule:');
    console.log(`  Total races: ${finalRaces.length}`);
    console.log(`  Regular races: ${finalRaces.filter(r => !r.isKnockout).length}`);
    console.log(`  Knockout races: ${finalRaces.filter(r => r.isKnockout).length}`);

    // Save the updated schedule
    await fs.writeFile(scheduleFile, JSON.stringify(finalRaces, null, 2));

    // Update leaderboard to reflect any changes
    try {
      const leaderboardResponse = await fetch(new URL('/api/results/compute', request.url), {
        method: 'POST'
      });
      if (!leaderboardResponse.ok) {
        console.warn('Failed to update leaderboard after knockout removal');
      }
    } catch (error) {
      console.warn('Error updating leaderboard:', error);
    }

    const keptKnockoutCount = finalRaces.filter(r => r.isKnockout).length;

    return NextResponse.json({
      message: `Successfully removed ${racesToRemove.length} knockout races`,
      removedCount: racesToRemove.length,
      keptCount: finalRaces.length,
      knockoutRacesRemaining: keptKnockoutCount,
      details: {
        removedRaces: racesToRemove.map(r => ({
          raceNumber: r.raceNumber,
          teams: `${r.teamA} vs ${r.teamB}`,
          stage: r.stage,
          matchNumber: r.matchNumber,
          completed: !!(r.result && r.result.length > 0)
        }))
      }
    });

  } catch (error) {
    console.error('Error removing knockout races:', error);
    return NextResponse.json(
      { error: 'Failed to remove knockout races' },
      { status: 500 }
    );
  }
}