"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

// Update the Race type to include knockout properties
type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  league?: string;
  result: number[] | null;
  boats: {
    teamA: string;
    teamB: string;
  };
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
  endTime?: string;
  goToChangeover?: boolean;
  isLaunching?: boolean;
  isKnockout?: boolean;
  stage?: string;
  matchNumber?: number;
};

// Update the isValidResult function to handle all race formats (2v2, 3v3, 4v4)
function isValidResult(result: number[] | null): boolean {
  if (!Array.isArray(result)) return false;
  
  // Valid formats: 2v2 (4 positions), 3v3 (6 positions), 4v4 (8 positions)
  const validLengths = [4, 6, 8];
  
  return (
    validLengths.includes(result.length) &&
    result.every((pos) => typeof pos === 'number' && pos > 0) &&
    result.length % 2 === 0 // Must be even number (equal teams)
  );
}

// Update the getWinner function to correctly award victory to the team with 1st place

function getWinner(result: number[] | null, teamA: string, teamB: string): string | null {
  if (!isValidResult(result)) return null;

  const halfLength = result!.length / 2;
  
  // First half positions belong to teamA, second half to teamB
  const teamAPoints = result!.slice(0, halfLength).reduce((a, b) => a + b, 0);
  const teamBPoints = result!.slice(halfLength).reduce((a, b) => a + b, 0);

  if (teamAPoints < teamBPoints) return teamA;
  if (teamBPoints < teamAPoints) return teamB;

  // If tied, winner is team WITHOUT the first-place finish (1st place LOSES the tiebreaker)
  const firstPlaceIndex = result!.indexOf(1);
  if (firstPlaceIndex < halfLength) {
    return teamB; // TeamA has 1st place, so TeamB WINS
  } else {
    return teamA; // TeamB has 1st place, so TeamA WINS
  }
}

// Add helper function to get race format from result length
function getRaceFormat(result: number[] | null): string {
  if (!isValidResult(result)) return 'Unknown';
  
  const halfLength = result!.length / 2;
  return `${halfLength}v${halfLength}`;
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

function StatusTag({ status }: { status?: string }) {
  if (!status || status === 'not_started') return null;
  
  return status === 'in_progress' ? (
    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
      Finished
    </span>
  ) : (
    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
      Finished
    </span>
  );
}

function LiveDuration({ startTime }: { startTime: string }) {
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    function updateDuration() {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = now - start;
      
      const minutes = Math.floor(Math.abs(diff) / 60000);
      const seconds = Math.floor((Math.abs(diff) % 60000) / 1000);
      
      setDuration(`${minutes}m ${seconds}s`);
    }

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span>{duration}</span>;
}

type Metrics = {
  averageRaceLength: string;
  timeBetweenRaces: string;
  timeBetweenRacesMs: number;
  lastUpdated: string;
};

// Update the EstimatedStartTime component with the new logic
function EstimatedStartTime({ race, lastStartedRace, timeBetweenRaces }: { 
  race: Race; 
  lastStartedRace: Race | null;
  timeBetweenRaces?: number;
}) {
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');

  useEffect(() => {
    function updateCountdown() {
      if (!lastStartedRace?.startTime) {
        setTimeUntilStart('Calculating...');
        return;
      }

      const lastStartTime = new Date(lastStartedRace.startTime);
      const racesBetween = race.raceNumber - lastStartedRace.raceNumber;
      
      // Use provided timeBetweenRaces or default to 3 minutes (180000ms)
      const timeBetweenRacesMs = timeBetweenRaces || 180000; // 3 minutes default
      
      const estimatedStart = new Date(lastStartTime.getTime() + (racesBetween * timeBetweenRacesMs));
      
      const now = new Date();
      const diff = estimatedStart.getTime() - now.getTime();
      
      // If countdown has passed, show "Starting soon"
      if (diff <= 0) {
        setTimeUntilStart('Starting soon');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        setTimeUntilStart(`~${hours}h ${remainingMinutes}m`);
      } else {
        setTimeUntilStart(`~${minutes}m ${seconds}s`);
      }
    }

    const interval = setInterval(updateCountdown, 1000);
    updateCountdown();

    return () => clearInterval(interval);
  }, [race, lastStartedRace, timeBetweenRaces]);

  if (!lastStartedRace?.startTime) {
    return null;
  }

  return (
    <div className="text-gray-500 text-sm flex items-center justify-center gap-1">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-medium">{timeUntilStart}</span>
    </div>
  );
}

// Add helper function for knockout stage colors
function getKnockoutStageTagColors(stage: string): string {
  switch (stage.toLowerCase()) {
    case 'final':
      return 'bg-yellow-100 text-yellow-800';
    case 'semi-final':
    case 'semifinal':
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

// Add helper function for knockout stage display names
function getKnockoutStageDisplayName(stage: string): string {
  switch (stage.toLowerCase()) {
    case 'final':
      return 'Final';
    case 'semi-final':
    case 'semifinal':
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

// Add helper function to calculate match series status
function getMatchSeriesStatus(races: Race[], teamA: string, teamB: string, stage: string, matchNumber?: number) {
  // Find all races for this specific match
  const matchRaces = races.filter(race => 
    race.isKnockout && 
    race.stage === stage && 
    race.matchNumber === matchNumber &&
    ((race.teamA === teamA && race.teamB === teamB) || 
     (race.teamA === teamB && race.teamB === teamA))
  );

  const completedRaces = matchRaces.filter(race => isValidResult(race.result));
  const totalRaces = matchRaces.length;
  
  // Count wins for each team
  let teamAWins = 0;
  let teamBWins = 0;
  
  completedRaces.forEach(race => {
    const winner = getWinner(race.result, race.teamA, race.teamB);
    if (winner === teamA) teamAWins++;
    if (winner === teamB) teamBWins++;
  });

  const racesToWin = Math.ceil(totalRaces / 2); // Best of X format
  
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

export default function SchedulePage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [expandedRace, setExpandedRace] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const knockoutResultsRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  
  const lastStartedRace = useMemo(() => {
    return races
      .filter(r => r.startTime)
      .sort((a, b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime())[0];
  }, [races]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [racesRes, metricsRes] = await Promise.all([
          fetch('/api/schedule'),
          fetch('/api/metrics')
        ]);
        
        if (!racesRes.ok) throw new Error('Failed to fetch races');
        if (!metricsRes.ok) throw new Error('Failed to fetch metrics');
        
        const racesData = await racesRes.json();
        const metricsData = await metricsRes.json();
        
        setRaces(racesData);
        setMetrics(metricsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const filterOptions = useMemo(() => {
    const options = new Set<string>();
    options.add('all');
    
    races.forEach((race: Race) => {
      if (race.league) {
        options.add(`league:${race.league}`);
      }
    });

    races.forEach((race: Race) => {
      options.add(`team:${race.teamA}`);
      options.add(`team:${race.teamB}`);
    });

    return Array.from(options);
  }, [races]);

  const filteredRaces = useMemo(() => {
    if (filter === 'all') return races;

    const [type, value] = filter.split(':');
    
    return races.filter((race: Race) => {
      if (type === 'league') {
        return race.league === value;
      }
      if (type === 'team') {
        return race.teamA === value || race.teamB === value;
      }
      return true;
    });
  }, [races, filter]);

  const completedRaces = filteredRaces.filter(race => isValidResult(race.result));
  const upcomingRaces = filteredRaces.filter(race => !isValidResult(race.result));

  // Add knockout races filtering
  const knockoutRaces = useMemo(() => {
    return races.filter(race => race.isKnockout);
  }, [races]);

  const regularRaces = useMemo(() => {
    if (filter === 'all') return races.filter(race => !race.isKnockout);

    const [type, value] = filter.split(':');
    
    return races.filter((race: Race) => {
      if (race.isKnockout) return false; // Exclude knockout races from regular filtering
      
      if (type === 'league') {
        return race.league === value;
      }
      if (type === 'team') {
        return race.teamA === value || race.teamB === value;
      }
      return true;
    });
  }, [races, filter]);

  const completedKnockoutRaces = knockoutRaces.filter(race => isValidResult(race.result));
  const upcomingKnockoutRaces = knockoutRaces.filter(race => !isValidResult(race.result));
  const completedRegularRaces = regularRaces.filter(race => isValidResult(race.result));
  const upcomingRegularRaces = regularRaces.filter(race => !isValidResult(race.result));

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function formatDuration(time: number | string | Date): string {
    let duration: number;
    
    if (typeof time === 'number') {
      duration = time;
    } else {
      const startTime = new Date(time).getTime();
      duration = Date.now() - startTime;
    }

    const minutes = Math.floor(Math.abs(duration) / 60000);
    const seconds = Math.floor((Math.abs(duration) % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToKnockoutResults = () => {
    knockoutResultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-gray-500">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-800">
        Schedule & Results
      </h1>

      {metrics && (
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-1">Average Race Length</h3>
              <p className="text-2xl font-bold text-blue-900">{metrics.averageRaceLength}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-1">Time Between Races</h3>
              <p className="text-2xl font-bold text-green-900">{metrics.timeBetweenRaces}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* KNOCKOUT RACES SECTION - Fixed all JSX syntax errors */}
      {knockoutRaces.length > 0 && (
        <div className="space-y-6 bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border-2 border-purple-200">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-purple-800 mb-2"> Knockout Stage</h2>
          </div>

          {/* Upcoming Knockout Races - Only show races WITHOUT results AND from incomplete series */}
          {upcomingKnockoutRaces.filter(race => {
            if (isValidResult(race.result)) return false; // Exclude races with results
            
            // Check if this race's series is already complete
            const seriesStatus = getMatchSeriesStatus(races, race.teamA, race.teamB, race.stage!, race.matchNumber);
            return !seriesStatus.isSeriesComplete; // Only show if series is NOT complete
          }).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-700 border-b border-purple-300 pb-2">
                Next Knockout Matches
              </h3>
              <div className="grid gap-4">
                {upcomingKnockoutRaces
                  .filter(race => {
                    if (isValidResult(race.result)) return false; // Exclude races with results
                    
                    // Check if this race's series is already complete
                    const seriesStatus = getMatchSeriesStatus(races, race.teamA, race.teamB, race.stage!, race.matchNumber);
                    return !seriesStatus.isSeriesComplete; // Only show if series is NOT complete
                  })
                  .map((race) => (
                  <div key={race.raceNumber} 
                    className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-purple-500"
                    onClick={() => setExpandedRace(expandedRace === race.raceNumber ? null : race.raceNumber)}
                  >
                    <div className="flex items-center border-b border-gray-100">
                      <div className="w-16 md:w-24 h-16 md:h-24 flex items-center justify-center bg-purple-600 text-white">
                        <span className="text-2xl md:text-4xl font-bold">
                          {race.raceNumber}
                        </span>
                      </div>
                      <div className="flex-1 p-3">
                        <div className="flex flex-col items-center">
                          <div className="text-base md:text-lg font-semibold text-center w-full">
                            <span className="text-purple-600">{race.teamA}</span>
                            <span className="mx-1 md:mx-2 text-gray-400">vs</span>
                            <span className="text-purple-600">{race.teamB}</span>
                          </div>
                          <div className="text-xs md:text-sm text-gray-500 text-center mt-1">
                            ({race.boats.teamA}) vs ({race.boats.teamB})
                            {race.result && (
                              <span className="ml-2 text-blue-600 font-medium">
                                [{getRaceFormat(race.result)}]
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex gap-2 flex-wrap justify-center">
                            {race.stage && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKnockoutStageTagColors(race.stage)}`}>
                                {getKnockoutStageDisplayName(race.stage)}
                                {race.matchNumber && ` #${race.matchNumber}`}
                              </span>
                            )}
                            {race.league && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getLeagueTagColors(race.league)}`}>
                                {race.league === 'main' ? 'Overall' : `${race.league} League`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Add estimated start time to the right side for knockout races */}
                      {!isValidResult(race.result) && race.status !== 'in_progress' && (
                        <div className="w-24 md:w-32 p-2 text-center border-l border-gray-100">
                          <div className="text-xs text-gray-500 mb-1">Expected:</div>
                          <EstimatedStartTime 
                            race={race} 
                            lastStartedRace={lastStartedRace} 
                            timeBetweenRaces={metrics?.timeBetweenRacesMs} 
                          />
                        </div>
                      )}
                    </div>

                    {expandedRace === race.raceNumber && (
                      <div className="p-4 bg-purple-50 border-t border-purple-100">
                        <div className="space-y-2 text-sm">
                          {race.startTime && (
                            <p className="text-gray-600">
                              Started: {new Date(race.startTime).toLocaleString()}
                            </p>
                          )}
                          {race.endTime && (
                            <p className="text-gray-600">
                              Finished: {new Date(race.endTime).toLocaleString()}
                            </p>
                          )}
                          {race.status === 'in_progress' && race.startTime && (
                            <p className="text-yellow-600 font-semibold">
                              ⏱️ Live Duration: <LiveDuration startTime={race.startTime} />
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-purple-50">
                      {/* Remove isValidResult check since these races shouldn't have results */}
                      <div className="text-center">
                        {/* Prioritize "in_progress" status over launching/changeover tags */}
                        {race.status === 'in_progress' ? (
                          <span className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-full text-base font-medium inline-block">
                            🏁 Race in Progress
                          </span>
                        ) : race.isLaunching ? (
                          <span className="bg-purple-100 text-purple-800 px-4 py-3 rounded-full text-base font-medium inline-block">
                            🚀 You Are Launching
                          </span>
                        ) : race.goToChangeover ? (
                          <span className="bg-orange-100 text-orange-800 px-4 py-3 rounded-full text-base font-medium inline-block">
                            ⛵ Go to Changeover
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-sm">
                            Waiting to start
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          

          {/* Knockout Match Series Status - Shows who's winning/won the best-of matches */}
          {completedKnockoutRaces.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-purple-700 border-b border-purple-300 pb-2">
                🏆 Match Series Status
              </h3>
              <div className="grid gap-4">
                {/* Group knockout races by match */}
                {Array.from(new Set(completedKnockoutRaces.map(race => 
                  `${race.stage}-${race.matchNumber}-${race.teamA}-${race.teamB}`
                ))).map(matchKey => {
                  // Parse the match key to get details - FIXED PARSING
                  const parts = matchKey.split('-');
                  const stage = parts[0];
                  const matchNumber = parseInt(parts[1]);
                  const teamA = parts[2];
                  const teamB = parts[3];
                  
                  // Find a representative race for this match
                  const representativeRace = completedKnockoutRaces.find(race => 
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
                          
                          {seriesStatus.isSeriesComplete && (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                              ✅ Series Complete
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
                        {seriesStatus.seriesWinner && (
                          <div className="text-center bg-green-50 p-3 rounded-md">
                            <h4 className="text-lg font-semibold text-green-600">
                              🏆 Match Winner: {seriesStatus.seriesWinner}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Won {seriesStatus.seriesWinner === teamA ? seriesStatus.teamAWins : seriesStatus.teamBWins} out of {seriesStatus.racesToWin} races needed
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
        </div>
      )}

      {/* REGULAR RACES SECTION */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter Round Races
        </label>
        <select
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Regular Races</option>
          
          {filterOptions
            .filter(opt => opt.startsWith('league:'))
            .map(opt => {
              const league = opt.split(':')[1];
              return (
                <option key={opt} value={opt}>
                  {league === 'main' ? 'Overall League' : `${league} League`}
                </option>
              );
            })}
          
          {filterOptions
            .filter(opt => opt.startsWith('team:'))
            .map(opt => {
              const team = opt.split(':')[1];
              return (
                <option key={opt} value={opt}>
                  {team} (Team)
                </option>
              );
            })}
        </select>
      </div>

      {regularRaces.length === 0 && (
        <p className="text-center text-gray-500">No round races found for the selected filters.</p>
      )}

      {/* Upcoming Regular Races - Only show races WITHOUT results */}
      {upcomingRegularRaces.filter(race => !isValidResult(race.result)).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Next Round Races</h2>
          <div className="grid gap-4">
            {upcomingRegularRaces
              .filter(race => !isValidResult(race.result)) // Exclude races with results
              .map((race) => (
              <div
                key={race.raceNumber}
                className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setExpandedRace(expandedRace === race.raceNumber ? null : race.raceNumber)}
              >
                <div className="flex items-center border-b border-gray-100">
                  <div className="w-16 md:w-24 h-16 md:h-24 flex items-center justify-center bg-blue-600 text-white">
                    <span className="text-2xl md:text-4xl font-bold">
                      {race.raceNumber}
                    </span>
                  </div>
                  <div className="flex-1 p-3">
                    <div className="flex flex-col items-center">
                      <div className="text-base md:text-lg font-semibold text-center w-full">
                        <span className="text-blue-600">{race.teamA}</span>
                        <span className="mx-1 md:mx-2 text-gray-400">vs</span>
                        <span className="text-blue-600">{race.teamB}</span>
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 text-center mt-1">
                        ({race.boats.teamA}) vs ({race.boats.teamB})
                        {race.result && (
                          <span className="ml-2 text-blue-600 font-medium">
                            [{getRaceFormat(race.result)}]
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-2 flex-wrap justify-center">
                        {race.league && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getLeagueTagColors(race.league)}`}>
                            {race.league === 'main' ? 'Overall' : `${race.league} League`}
                          </span>
                        )}
                        {/* Remove StatusTag from here - status is shown prominently in bottom section */}
                      </div>
                    </div>
                  </div>
                  {/* Add estimated start time to the right side */}
                  {!isValidResult(race.result) && race.status !== 'in_progress' && (
                    <div className="w-24 md:w-32 p-2 text-center border-l border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Expected:</div>
                      <EstimatedStartTime 
                        race={race} 
                        lastStartedRace={lastStartedRace} 
                        timeBetweenRaces={metrics?.timeBetweenRacesMs} 
                      />
                    </div>
                  )}
                </div>

                {expandedRace === race.raceNumber && (
                  <div className="p-4 bg-blue-50 border-t border-blue-100">
                    <div className="space-y-2 text-sm">
                      {race.startTime && (
                        <p className="text-gray-600">
                          Started: {new Date(race.startTime).toLocaleString()}
                        </p>
                      )}
                      {race.endTime && (
                        <p className="text-gray-600">
                          Finished: {new Date(race.endTime).toLocaleString()}
                        </p>
                      )}
                      {race.status === 'in_progress' && race.startTime && (
                        <p className="text-yellow-600 font-semibold">
                          ⏱️ Live Duration: <LiveDuration startTime={race.startTime} />
                        </p>
                      )}
                      {race.status === 'finished' && race.startTime && race.endTime && (
                        <p className="text-gray-600">
                          Duration: {formatDuration(new Date(race.endTime).getTime() - new Date(race.startTime).getTime())}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50">
                  {/* Remove isValidResult check since these races shouldn't have results */}
                  <div className="text-center">
                    {/* Prioritize "in_progress" status over launching/changeover tags */}
                    {race.status === 'in_progress' ? (
                      <span className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-full text-base font-medium inline-block">
                        🏁 Race in Progress
                      </span>
                    ) : race.isLaunching ? (
                      <span className="bg-purple-100 text-purple-800 px-4 py-3 rounded-full text-base font-medium inline-block">
                        🚀 You Are Launching
                      </span>
                    ) : race.goToChangeover ? (
                      <span className="bg-orange-100 text-orange-800 px-4 py-3 rounded-full text-base font-medium inline-block">
                        ⛵ Go to Changeover
                      </span>
                    ) : (
                      <span className="text-gray-400 italic text-sm">
                        Waiting to start
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed sections remain the same - only show races WITH results */}
      {completedKnockoutRaces.length > 0 && (
        <div className="space-y-4" ref={knockoutResultsRef}>
          <h3 className="text-lg font-semibold text-purple-700 border-b border-purple-300 pb-2">
            Knockout Race Results
          </h3>
          <div className="grid gap-4">
            {completedKnockoutRaces.map((race) => {
              const winner = getWinner(race.result, race.teamA, race.teamB);

              return (
                <div
                  key={race.raceNumber}
                  className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setExpandedRace(expandedRace === race.raceNumber ? null : race.raceNumber)}
                >
                  <div className="flex items-center border-b border-gray-100">
                    <div className="w-16 md:w-24 h-16 md:h-24 flex items-center justify-center bg-green-600 text-white">
                      <span className="text-2xl md:text-4xl font-bold">
                        {race.raceNumber}
                      </span>
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex flex-col items-center">
                        <div className="text-base md:text-lg font-semibold text-center w-full">
                          <span className="text-purple-600">{race.teamA}</span>
                          <span className="mx-1 md:mx-2 text-gray-400">vs</span>
                          <span className="text-purple-600">{race.teamB}</span>
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 text-center mt-1">
                          ({race.boats.teamA}) vs ({race.boats.teamB})
                          {race.result && (
                            <span className="ml-2 text-blue-600 font-medium">
                              [{getRaceFormat(race.result)}]
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex gap-2 flex-wrap justify-center">
                          {race.stage && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKnockoutStageTagColors(race.stage)}`}>
                              {getKnockoutStageDisplayName(race.stage)}
                              {race.matchNumber && ` #${race.matchNumber}`}
                            </span>
                          )}
                          {race.league && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getLeagueTagColors(race.league)}`}>
                              {race.league === 'main' ? 'Overall' : `${race.league} League`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedRace === race.raceNumber && (
                    <div className="p-4 bg-green-50 border-t border-green-100">
                      <div className="space-y-2 text-sm">
                        {race.startTime && (
                          <p className="text-gray-600">
                            Started: {new Date(race.startTime).toLocaleString()}
                          </p>
                        )}
                        {race.endTime && (
                          <p className="text-gray-600">
                            Finished: {new Date(race.endTime).toLocaleString()}
                          </p>
                        )}
                        {race.startTime && race.endTime && (
                          <p className="text-gray-600">
                            Duration: {formatDuration(new Date(race.endTime).getTime() - new Date(race.startTime).getTime())}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-green-50">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-green-600">
                        🏆 Winner: {winner}
                      </h3>
                    </div>
                    <div className="flex justify-around">
                      <div className="flex-1 text-center">
                        <h4 className="font-semibold text-green-600">{race.teamA}</h4>
                        <div className="flex justify-center gap-2 mt-2">
                          {race.result!.slice(0, race.result!.length / 2).map((pos, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
                                winner === race.teamA ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {pos}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 text-center">
                        <h4 className="font-semibold text-green-600">{race.teamB}</h4>
                        <div className="flex justify-center gap-2 mt-2">
                          {race.result!.slice(race.result!.length / 2).map((pos, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
                                winner === race.teamB ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {pos}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Regular Race Results - Make sure this section is visible */}
      {completedRegularRaces.length > 0 && (
        <div className="space-y-4" ref={resultsRef}>
          <h2 className="text-xl font-semibold text-gray-700">Race Results</h2>
          <div className="grid gap-4">
            {completedRegularRaces.map((race) => {
              const winner = getWinner(race.result, race.teamA, race.teamB);

              return (
                <div
                  key={race.raceNumber}
                  className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setExpandedRace(expandedRace === race.raceNumber ? null : race.raceNumber)}
                >
                  <div className="flex items-center border-b border-gray-100">
                    <div className="w-16 md:w-24 h-16 md:h-24 flex items-center justify-center bg-green-600 text-white">
                      <span className="text-2xl md:text-4xl font-bold">
                        {race.raceNumber}
                      </span>
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex flex-col items-center">
                        <div className="text-base md:text-lg font-semibold text-center w-full">
                          <span className="text-green-600">{race.teamA}</span>
                          <span className="mx-1 md:mx-2 text-gray-400">vs</span>
                          <span className="text-green-600">{race.teamB}</span>
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 text-center mt-1">
                          ({race.boats.teamA}) vs ({race.boats.teamB})
                          {race.result && (
                            <span className="ml-2 text-blue-600 font-medium">
                              [{getRaceFormat(race.result)}]
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex gap-2 flex-wrap justify-center">
                          {race.league && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getLeagueTagColors(race.league)}`}>
                              {race.league === 'main' ? 'Overall' : `${race.league} League`}
                            </span>
                          )}
                          {/* Remove StatusTag from here - status is shown prominently in bottom section */}
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedRace === race.raceNumber && (
                    <div className="p-4 bg-green-50 border-t border-green-100">
                      <div className="space-y-2 text-sm">
                        {race.startTime && (
                          <p className="text-gray-600">
                            Started: {new Date(race.startTime).toLocaleString()}
                          </p>
                        )}
                        {race.endTime && (
                          <p className="text-gray-600">
                            Finished: {new Date(race.endTime).toLocaleString()}
                          </p>
                        )}
                        {race.startTime && race.endTime && (
                          <p className="text-gray-600">
                            Duration: {formatDuration(new Date(race.endTime).getTime() - new Date(race.startTime).getTime())}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-green-50">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-green-600">
                        🏆 Winner: {winner}
                      </h3>
                    </div>
                    <div className="flex justify-around">
                      <div className="flex-1 text-center">
                        <h4 className="font-semibold text-green-600">{race.teamA}</h4>
                        <div className="flex justify-center gap-2 mt-2">
                          {race.result!.slice(0, race.result!.length / 2).map((pos, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
                                winner === race.teamA ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {pos}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 text-center">
                        <h4 className="font-semibold text-green-600">{race.teamB}</h4>
                        <div className="flex justify-center gap-2 mt-2">
                          {race.result!.slice(race.result!.length / 2).map((pos, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
                                winner === race.teamB ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {pos}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fixed Jump to Knockout Results Button - Left side */}
      {completedKnockoutRaces.length > 0 && (
        <button
          onClick={scrollToKnockoutResults}
          className="fixed bottom-4 left-4 bg-purple-600 text-white px-3 py-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50 flex items-center gap-2"
          title="Jump to Knockout Results"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
          <span className="text-sm font-medium">KO Results</span>
        </button>
      )}

      {/* Fixed Jump to Results Button - Centered at bottom */}
      {completedRegularRaces.length > 0 && (
        <button
          onClick={scrollToResults}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-green-700 transition-colors z-50 flex items-center gap-2"
          title="Jump to Results"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Results</span>
        </button>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
          title="Back to Top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}


    </div>
  );
}
