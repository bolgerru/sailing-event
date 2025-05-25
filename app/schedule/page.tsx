"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

// First update the Race type to include status and times
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
};

function isValidResult(result: number[] | null): boolean {
  return (
    Array.isArray(result) &&
    result.length === 6 &&
    result.every((pos) => typeof pos === 'number' && pos > 0)
  );
}

function getWinner(result: number[] | null, teamA: string, teamB: string): string | null {
  if (!isValidResult(result)) return null;

  const teamAPoints = result!.slice(0, 3).reduce((a, b) => a + b, 0);
  const teamBPoints = result!.slice(3).reduce((a, b) => a + b, 0);

  if (teamAPoints < teamBPoints) return teamA;
  if (teamBPoints < teamAPoints) return teamB;

  return result!.indexOf(1) < 3 ? teamB : teamA;
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
    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
      In Progress
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

function EstimatedStartTime({ race, lastStartedRace, timeBetweenRaces }: { 
  race: Race; 
  lastStartedRace: Race | null;
  timeBetweenRaces: number;
}) {
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');

  useEffect(() => {
    function updateCountdown() {
      if (!lastStartedRace?.startTime) return;

      const lastStartTime = new Date(lastStartedRace.startTime);
      const racesBetween = race.raceNumber - lastStartedRace.raceNumber;
      const estimatedStart = new Date(lastStartTime.getTime() + (racesBetween * timeBetweenRaces));
      
      const now = new Date();
      const diff = estimatedStart.getTime() - now.getTime();
      
      if (diff < 0) {
        setTimeUntilStart('Starting soon');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeUntilStart(`~${minutes}m ${seconds}s`);
    }

    const interval = setInterval(updateCountdown, 1000);
    updateCountdown();

    return () => clearInterval(interval);
  }, [race, lastStartedRace, timeBetweenRaces]);

  return (
    <div className="text-gray-500 text-sm">
      {timeUntilStart ? (
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {timeUntilStart}
        </span>
      ) : (
        'Calculating...'
      )}
    </div>
  );
}

export default function SchedulePage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [expandedRace, setExpandedRace] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
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

      <div className="bg-white p-4 rounded-lg shadow">
        <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
          Filter Matches
        </label>
        <select
          id="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="all">All Races</option>
          
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

      {filteredRaces.length === 0 && (
        <p className="text-center text-gray-500">No matches found for the selected filters.</p>
      )}

      {upcomingRaces.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Next Races</h2>
          <div className="grid gap-4">
            {upcomingRaces.map((race) => (
              <div key={race.raceNumber} 
                className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setExpandedRace(expandedRace === race.raceNumber ? null : race.raceNumber)}
              >
                {/* Update the race card header structure */}
                <div className="flex items-center border-b border-gray-100">
                  <div className="w-16 md:w-24 h-16 md:h-24 flex items-center justify-center bg-blue-500 text-white">
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
                      </div>
                      {race.league && (
                        <div className="mt-2">
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${getLeagueTagColors(race.league)}
                          `}>
                            {race.league === 'main' ? 'Overall' : `${race.league} League`}
                          </span>
                        </div>
                      )}
                      <div className="mt-2">
                        <StatusTag status={race.status} />
                      </div>
                    </div>
                  </div>
                </div>

                {expandedRace === race.raceNumber && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
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
                        <p className="text-yellow-600">
                          Duration: <LiveDuration startTime={race.startTime} />
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50">
                  {isValidResult(race.result) ? (
                    <div className="text-center space-y-2">
                      <div className="flex justify-center items-center gap-2 md:gap-8">
                        <div className={`flex-1 ${getWinner(race.result, race.teamA, race.teamB) === race.teamA ? 'text-green-600' : 'text-red-600'}`}>
                          <p className="font-semibold mb-1 text-sm md:text-base">{race.teamA}</p>
                          <div className="flex justify-center gap-1 md:gap-3">
                            {race.result!.slice(0, 3).map((pos, i) => (
                              <span key={i} className="bg-gray-100 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm">
                                {pos}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-gray-400 font-bold px-1 md:px-2">VS</div>
                        <div className={`flex-1 ${getWinner(race.result, race.teamA, race.teamB) === race.teamB ? 'text-green-600' : 'text-red-600'}`}>
                          <p className="font-semibold mb-1 text-sm md:text-base">{race.teamB}</p>
                          <div className="flex justify-center gap-1 md:gap-3">
                            {race.result!.slice(3).map((pos, i) => (
                              <span key={i} className="bg-gray-100 rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-sm">
                                {pos}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 italic text-sm">
                      No result yet
                    </p>
                  )}
                </div>

                {!race.startTime && !race.status && lastStartedRace && (
                  <div className="p-3 border-t border-gray-100">
                    <EstimatedStartTime 
                      race={race}
                      lastStartedRace={lastStartedRace}
                      timeBetweenRaces={metrics?.timeBetweenRacesMs || 180000}
                    />
                  </div>
                )}

                {!race.startTime && race.goToChangeover && !race.isLaunching && (
                  <div className="p-3 bg-yellow-50 border-t border-yellow-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path 
                            fillRule="evenodd" 
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-800">
                          Go to Changeover Area
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!race.startTime && race.isLaunching && (
                  <div className="p-3 bg-blue-50 border-t border-blue-100">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path 
                            fillRule="evenodd" 
                            d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-800">
                          You are launching
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixed "Jump to Results" Button - now centered */}
      <div className="fixed bottom-1 left-1/2 transform -translate-x-1/2 z-50">
        <button
          onClick={scrollToResults}
          className="bg-blue-600 text-white px-6 py-2 rounded-full shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Jump to Results
        </button>
      </div>

      {/* Results Section */}
      <div ref={resultsRef} className="pt-24">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Race Results
        </h2>
        {completedRaces.length === 0 && (
          <p className="text-center text-gray-500">No results available.</p>
        )}
        {completedRaces.length > 0 && (
          <div className="grid gap-4">
            {completedRaces.map((race) => {
              const winner = getWinner(race.result, race.teamA, race.teamB);

              return (
                <div
                  key={race.raceNumber}
                  className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setExpandedRace(expandedRace === race.raceNumber ? null : race.raceNumber)}
                >
                  {/* Race Header - updated structure */}
                  <div className="flex items-center border-b border-gray-100">
                    <div className="w-16 md:w-24 h-16 md:h-24 flex items-center justify-center bg-blue-500 text-white">
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
                        </div>
                        {race.league && (
                          <div className="mt-2">
                            <span className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                              ${getLeagueTagColors(race.league)}
                            `}>
                              {race.league === 'main' ? 'Overall' : `${race.league} League`}
                            </span>
                          </div>
                        )}
                        <div className="mt-2">
                          <StatusTag status={race.status} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Timing Info */}
                  {expandedRace === race.raceNumber && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
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

                  {/* Winner and Positions */}
                  <div className="p-4 bg-gray-50">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-green-600">
                        Winner: {winner}
                      </h3>
                    </div>
                    <div className="flex justify-around">
                      {/* Team A Positions */}
                      <div className="flex-1 text-center">
                        <h4 className="font-semibold text-blue-600">{race.teamA}</h4>
                        <div className="flex justify-center gap-2 mt-2">
                          {race.result!.slice(0, 3).map((pos, i) => (
                            <div
                              key={i}
                              className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-lg font-bold ${
                                winner === race.teamA ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {pos}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Team B Positions */}
                      <div className="flex-1 text-center">
                        <h4 className="font-semibold text-blue-600">{race.teamB}</h4>
                        <div className="flex justify-center gap-2 mt-2">
                          {race.result!.slice(3).map((pos, i) => (
                            <div
                              key={i}
                              className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-lg font-bold ${
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
        )}
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <div className="fixed bottom-4 right-4">
          <button
            onClick={scrollToTop}
            className="bg-blue-600 text-white rounded-full p-3 shadow-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15V9m0 0L9 12m3-3l3 3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}