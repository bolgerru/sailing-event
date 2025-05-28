'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Race {
  raceNumber: number;
  teamA: string;
  teamB: string;
  boats: {
    teamA: string;
    teamB: string;
  };
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
  result: number[] | null; // Remove the ? to make it required (not optional)
  isKnockout?: boolean;
  stage?: string;
  matchNumber?: number;
  league?: string;
}

interface Settings {
  eventName: string;
}

// Helper functions from schedule page
function isValidResult(result: number[] | null): boolean {
  if (!Array.isArray(result)) return false;
  
  const validLengths = [4, 6, 8];
  
  return (
    validLengths.includes(result.length) &&
    result.every((pos) => typeof pos === 'number' && pos > 0) &&
    result.length % 2 === 0
  );
}

function getWinner(result: number[] | null, teamA: string, teamB: string): string | null {
  if (!isValidResult(result)) return null;

  const halfLength = result!.length / 2;
  
  const teamAPoints = result!.slice(0, halfLength).reduce((a, b) => a + b, 0);
  const teamBPoints = result!.slice(halfLength).reduce((a, b) => a + b, 0);

  if (teamAPoints < teamBPoints) return teamA;
  if (teamBPoints < teamAPoints) return teamB;

  const firstPlaceIndex = result!.indexOf(1);
  if (firstPlaceIndex < halfLength) {
    return teamB; // TeamA has 1st place, so TeamB WINS
  } else {
    return teamA; // TeamB has 1st place, so TeamA WINS
  }
}

function getMatchSeriesStatus(races: Race[], teamA: string, teamB: string, stage: string, matchNumber?: number) {
  const matchRaces = races.filter(race => 
    race.isKnockout && 
    race.stage === stage && 
    race.matchNumber === matchNumber &&
    ((race.teamA === teamA && race.teamB === teamB) || 
     (race.teamA === teamB && race.teamB === teamA))
  );

  const completedRaces = matchRaces.filter(race => isValidResult(race.result));
  const totalRaces = matchRaces.length;
  
  let teamAWins = 0;
  let teamBWins = 0;
  
  completedRaces.forEach(race => {
    const winner = getWinner(race.result || null, race.teamA, race.teamB);
    if (winner === teamA) teamAWins++;
    if (winner === teamB) teamBWins++;
  });

  const racesToWin = Math.ceil(totalRaces / 2);
  
  return {
    teamAWins,
    teamBWins,
    completedRaces: completedRaces.length,
    totalRaces,
    racesToWin,
    seriesWinner: teamAWins >= racesToWin ? teamA : teamBWins >= racesToWin ? teamB : null,
    isSeriesComplete: teamAWins >= racesToWin || teamBWins >= racesToWin
  };
}

function getKnockoutStageTagColors(stage: string): string {
  switch (stage.toLowerCase()) {
    case 'final':
      return 'bg-yellow-100 text-yellow-800';
    case 'semi-final':
    case 'semifinal':
    case 'semi':
      return 'bg-orange-100 text-orange-800';
    case 'quarter-final':
    case 'quarterfinal':
      return 'bg-red-100 text-red-800';
    case 'round-16':
    case 'round of 16':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-indigo-100 text-indigo-800';
  }
}

function getKnockoutStageDisplayName(stage: string): string {
  switch (stage.toLowerCase()) {
    case 'final':
      return 'Final';
    case 'semi-final':
    case 'semifinal':
    case 'semi':
      return 'Semi-Final';
    case 'quarter-final':
    case 'quarterfinal':
      return 'Quarter-Final';
    case 'round-16':
    case 'round of 16':
      return 'Round of 16';
    default:
      return stage.charAt(0).toUpperCase() + stage.slice(1);
  }
}

function getLeagueTagColors(league: string): string {
  switch (league.toLowerCase()) {
    case 'gold':
      return 'bg-yellow-100 text-yellow-800';
    case 'silver':
      return 'bg-gray-100 text-gray-800';
    case 'bronze':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

export default function HomePage() {
  const [racesInProgress, setRacesInProgress] = useState<Race[]>([]);
  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState<string>('IUSA Event 1');
  const [races, setRaces] = useState<Race[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both races and settings
        const [racesResponse, settingsResponse] = await Promise.all([
          fetch('/api/schedule'),
          fetch('/api/settings')
        ]);

        const racesData = await racesResponse.json();
        setRaces(racesData);
        
        // Load event name from settings
        if (settingsResponse.ok) {
          const settingsData: Settings = await settingsResponse.json();
          setEventName(settingsData.eventName || 'IUSA Event 1');
        }

        // Find all races in progress
        const inProgressRaces = racesData.filter((r: Race) => r.status === 'in_progress');
        setRacesInProgress(inProgressRaces);

        // Find next race
        const upcomingRaces = racesData.filter((r: Race) => 
          r.status === 'not_started' || (!r.status && !isValidResult(r.result))
        );

        let nextUpcomingRace = null;

        if (upcomingRaces.length > 0) {
          // Check if there are knockout races
          const knockoutRaces = racesData.filter((race: Race) => race.isKnockout);
          
          if (knockoutRaces.length > 0) {
            // For knockouts: find next race from a match that doesn't have a winner
            for (const race of upcomingRaces.filter((r: Race) => r.isKnockout)) {
              const seriesStatus = getMatchSeriesStatus(racesData, race.teamA, race.teamB, race.stage!, race.matchNumber);
              if (!seriesStatus.isSeriesComplete) {
                nextUpcomingRace = race;
                break;
              }
            }
            
            // If no knockout races available, fall back to regular races
            if (!nextUpcomingRace) {
              const regularUpcoming = upcomingRaces.filter((r: Race) => !r.isKnockout);
              if (regularUpcoming.length > 0) {
                nextUpcomingRace = regularUpcoming[0];
              }
            }
          } else {
            // No knockouts: just get the next race in the schedule
            nextUpcomingRace = upcomingRaces[0];
          }
        }

        setNextRace(nextUpcomingRace);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Get knockout match series status
  const knockoutRaces = races.filter(race => race.isKnockout);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
          {eventName}
        </h1>
        <p className="text-gray-600">Live Results and Schedule</p>
      </div>

      {/* Current Race(s) Status */}
      {racesInProgress.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-blue-800 text-center">
            {racesInProgress.length === 1 ? 'Race In Progress' : `${racesInProgress.length} Races In Progress`}
          </h2>
          {racesInProgress.map((race) => (
            <div key={race.raceNumber} className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="text-lg font-semibold">
                {race.teamA} vs {race.teamB}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Race {race.raceNumber} • {race.boats.teamA} vs {race.boats.teamB}
              </div>
              {race.isKnockout && (
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKnockoutStageTagColors(race.stage!)}`}>
                    {getKnockoutStageDisplayName(race.stage!)} #{race.matchNumber}
                  </span>
                  {race.league && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ml-2 ${getLeagueTagColors(race.league)}`}>
                      {race.league === 'main' ? 'Overall' : `${race.league} League`}
                    </span>
                  )}
                </div>
              )}
              {race.startTime && (
                <div className="text-sm text-gray-600 mt-2">
                  Started: {new Date(race.startTime).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">No race currently in progress</p>
        </div>
      )}

      {/* Next Race */}
      {nextRace && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-green-800 mb-2">
            Next Race
          </h2>
          <div className="text-lg font-semibold">
            {nextRace.teamA} vs {nextRace.teamB}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Race {nextRace.raceNumber} • {nextRace.boats.teamA} vs {nextRace.boats.teamB}
          </div>
          {nextRace.isKnockout && (
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKnockoutStageTagColors(nextRace.stage!)}`}>
                {getKnockoutStageDisplayName(nextRace.stage!)} #{nextRace.matchNumber}
              </span>
              {nextRace.league && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ml-2 ${getLeagueTagColors(nextRace.league)}`}>
                  {nextRace.league === 'main' ? 'Overall' : `${nextRace.league} League`}
                </span>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {(() => {
                  const seriesStatus = getMatchSeriesStatus(races, nextRace.teamA, nextRace.teamB, nextRace.stage!, nextRace.matchNumber);
                  return `Series: ${seriesStatus.teamAWins}-${seriesStatus.teamBWins} (Best of ${seriesStatus.totalRaces})`;
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Knockout Match Series Status */}
      {knockoutRaces.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border-2 border-purple-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-purple-800 mb-2">🏆 Knockout Stage Progress</h2>
            <p className="text-purple-600">Current match series standings</p>
          </div>
          
          <div className="grid gap-4">
            {/* Group ALL knockout races by match (not just completed ones) */}
            {Array.from(new Set(knockoutRaces.map(race => 
              `${race.stage}-${race.matchNumber}-${race.teamA}-${race.teamB}`
            ))).map(matchKey => {
              // Parse the match key to get details
              const parts = matchKey.split('-');
              const stage = parts[0];
              const matchNumber = parseInt(parts[1]);
              const teamA = parts[2];
              const teamB = parts[3];
              
              // Find a representative race for this match
              const representativeRace = knockoutRaces.find(race => 
                race.stage === stage && 
                race.matchNumber === matchNumber &&
                ((race.teamA === teamA && race.teamB === teamB) || 
                 (race.teamA === teamB && race.teamB === teamA))
              );

              if (!representativeRace) return null;

              const seriesStatus = getMatchSeriesStatus(races, teamA, teamB, stage, matchNumber);

              return (
                <div
                  key={matchKey}
                  className="bg-white shadow-lg rounded-lg overflow-hidden border-l-4 border-purple-500"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKnockoutStageTagColors(stage)}`}>
                          {getKnockoutStageDisplayName(stage)} #{matchNumber}
                        </span>
                        {representativeRace.league && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getLeagueTagColors(representativeRace.league)}`}>
                            {representativeRace.league === 'main' ? 'Overall' : `${representativeRace.league} League`}
                          </span>
                        )}
                      </div>
                      
                      {seriesStatus.isSeriesComplete ? (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          ✅ Series Complete
                        </span>
                      ) : seriesStatus.completedRaces === 0 ? (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          📅 Upcoming
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                          ⚡ In Progress
                        </span>
                      )}
                    </div>

                    {/* Teams and Series Score */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-center flex-1">
                        <h3 className={`text-lg font-bold ${seriesStatus.seriesWinner === teamA ? 'text-green-600' : 'text-gray-800'}`}>
                          {teamA}
                        </h3>
                        <div className={`text-3xl font-bold ${seriesStatus.seriesWinner === teamA ? 'text-green-600' : 'text-gray-600'}`}>
                          {seriesStatus.teamAWins}
                        </div>
                      </div>
                      
                      <div className="px-4 text-center">
                        <div className="text-gray-400 font-bold text-sm">BEST OF {seriesStatus.totalRaces}</div>
                        <div className="text-gray-400 font-bold text-lg">-</div>
                        <div className="text-xs text-gray-500">
                          ({seriesStatus.completedRaces}/{seriesStatus.totalRaces} races)
                        </div>
                      </div>
                      
                      <div className="text-center flex-1">
                        <h3 className={`text-lg font-bold ${seriesStatus.seriesWinner === teamB ? 'text-green-600' : 'text-gray-800'}`}>
                          {teamB}
                        </h3>
                        <div className={`text-3xl font-bold ${seriesStatus.seriesWinner === teamB ? 'text-green-600' : 'text-gray-600'}`}>
                          {seriesStatus.teamBWins}
                        </div>
                      </div>
                    </div>

                    {/* Series Winner */}
                    {seriesStatus.seriesWinner ? (
                      <div className="text-center bg-green-50 p-3 rounded-md">
                        <h4 className="text-lg font-semibold text-green-600">
                          🏆 Match Winner: {seriesStatus.seriesWinner}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Won {seriesStatus.seriesWinner === teamA ? seriesStatus.teamAWins : seriesStatus.teamBWins} out of {seriesStatus.racesToWin} races needed
                        </p>
                      </div>
                    ) : seriesStatus.completedRaces === 0 ? (
                      <div className="text-center bg-blue-50 p-3 rounded-md">
                        <h4 className="text-lg font-semibold text-blue-600">
                          📅 Match Not Started
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Best of {seriesStatus.totalRaces} series • First to {seriesStatus.racesToWin} wins
                        </p>
                      </div>
                    ) : (
                      <div className="text-center bg-yellow-50 p-3 rounded-md">
                        <h4 className="text-lg font-semibold text-yellow-600">
                          ⚡ Match In Progress
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          First to {seriesStatus.racesToWin} wins advances
                        </p>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {!seriesStatus.isSeriesComplete && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{teamA} needs {seriesStatus.racesToWin - seriesStatus.teamAWins} more</span>
                          <span>{teamB} needs {seriesStatus.racesToWin - seriesStatus.teamBWins} more</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                            style={{
                              width: `${Math.max(seriesStatus.teamAWins, seriesStatus.teamBWins) / seriesStatus.racesToWin * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="flex justify-center gap-4">
        <Link 
          href="/schedule" 
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Full Schedule
        </Link>
        <Link 
          href="/leaderboard" 
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Leaderboard
        </Link>
      </div>
    </div>
  );
}