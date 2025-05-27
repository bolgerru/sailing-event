import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type RacingFormat = '2v2' | '3v3' | '4v4';

type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  league?: string;
  boats: {
    teamA: string;
    teamB: string;
  };
  racingFormat: RacingFormat; // Add this field
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received schedule generation request:', body);

    // Extract racing format from request body
    const racingFormat: RacingFormat = body.racingFormat || '3v3';
    console.log('Racing format:', racingFormat);

    if (body.leagues) {
      // League-based generation
      const { leagues } = body;
      
      if (!Array.isArray(leagues) || leagues.length === 0) {
        return NextResponse.json(
          { error: 'At least one league is required' },
          { status: 400 }
        );
      }

      console.log('Generating league-based schedule with format:', racingFormat);
      console.log('Leagues:', leagues.map((l: any) => ({ name: l.name, teams: l.teams.length })));

      const schedule: Race[] = [];
      let raceNumber = 1;

      // Process each league
      leagues.forEach((league: any) => {
        if (!Array.isArray(league.teams) || league.teams.length < 2) {
          console.warn(`Skipping league ${league.name}: insufficient teams`);
          return;
        }

        console.log(`\nProcessing ${league.name} league:`);
        console.log(`Teams: ${league.teams.join(', ')}`);

        // Get boat sets for this league
        const boatSets = Array.isArray(league.boatSets) && league.boatSets.length > 0 
          ? league.boatSets 
          : [{ id: 'default', team1Color: 'Red', team2Color: 'Blue' }];

        console.log(`Boat sets: ${boatSets.map((b: any) => b.id).join(', ')}`);

        // Generate round-robin for this league
        const teams = league.teams;
        let currentBoatSet = 0;

        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            const boatSet = boatSets[currentBoatSet % boatSets.length];
            
            const race: Race = {
              raceNumber: raceNumber++,
              teamA: teams[i],
              teamB: teams[j],
              league: league.name,
              boats: {
                teamA: boatSet.team1Color,
                teamB: boatSet.team2Color
              },
              racingFormat // Add this field
            };

            schedule.push(race);
            console.log(`Race ${race.raceNumber}: ${race.teamA} vs ${race.teamB} (${racingFormat}, ${boatSet.id})`);
            
            currentBoatSet++;
          }
        }
      });

      // Save schedule
      const schedulePath = path.join(process.cwd(), 'data', 'schedule.json');
      await fs.writeFile(schedulePath, JSON.stringify(schedule, null, 2));

      console.log(`\nGenerated ${schedule.length} races with ${racingFormat} format`);
      return NextResponse.json({ 
        success: true, 
        races: schedule.length,
        racingFormat 
      });

    } else {
      // Non-league generation
      const { teams, boatSets } = body;

      if (!Array.isArray(teams) || teams.length < 2) {
        return NextResponse.json(
          { error: 'At least 2 teams are required' },
          { status: 400 }
        );
      }

      if (!Array.isArray(boatSets) || boatSets.length === 0) {
        return NextResponse.json(
          { error: 'At least one boat set is required' },
          { status: 400 }
        );
      }

      console.log('Generating non-league schedule with format:', racingFormat);
      console.log('Teams:', teams);
      console.log('Boat sets:', boatSets.map((b: any) => b.id));

      const schedule: Race[] = [];
      let raceNumber = 1;
      let currentBoatSet = 0;

      // Generate round-robin
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const boatSet = boatSets[currentBoatSet % boatSets.length];
          
          const race: Race = {
            raceNumber: raceNumber++,
            teamA: teams[i],
            teamB: teams[j],
            boats: {
              teamA: boatSet.team1Color,
              teamB: boatSet.team2Color
            },
            racingFormat // Add this field
          };

          schedule.push(race);
          console.log(`Race ${race.raceNumber}: ${race.teamA} vs ${race.teamB} (${racingFormat}, ${boatSet.id})`);
          
          currentBoatSet++;
        }
      }

      // Save schedule
      const schedulePath = path.join(process.cwd(), 'data', 'schedule.json');
      await fs.writeFile(schedulePath, JSON.stringify(schedule, null, 2));

      console.log(`\nGenerated ${schedule.length} races with ${racingFormat} format`);
      return NextResponse.json({ 
        success: true, 
        races: schedule.length,
        racingFormat 
      });
    }

  } catch (error) {
    console.error('Error generating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}
