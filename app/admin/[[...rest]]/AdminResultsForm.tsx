'use client';

import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import Link from 'next/link';
// Update the import path below to the correct relative path if needed
import KnockoutModal, { KnockoutConfig } from '../../components/KnockoutModal';

type Race = {
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
};

interface BoatSet {
  id: string;
  team1Color: string;
  team2Color: string;
}

interface League {
  id: string;
  name: string;
  teams: string[];
  boatSets: BoatSet[];
}

const NUMBERS = [1, 2, 3, 4, 5, 6];
const BOAT_INDICES = [0, 1, 2];

// Memoized components
const BoatInputs = memo(({ 
  raceNumber, 
  startIndex, 
  formData, 
  onchange 
}: { 
  raceNumber: number;
  startIndex: number;
  formData: { [key: number]: (number | '')[] };
  onchange: (raceNumber: number, index: number, value: number) => void;
}) => {
  return (
    <>
      {BOAT_INDICES.map((i) => (
        <div key={i} className="space-y-2 mb-2 last:mb-0">
          <div className="flex justify-between text-xs">
            <label>Boat {i + 1}</label>
            <span className="font-medium">
              {formData[raceNumber]?.[i + startIndex] || '-'}
            </span>
          </div>
          <div className="flex gap-1">
            {NUMBERS.map((num) => (
              <button
                key={num}
                onClick={() => onchange(raceNumber, i + startIndex, num)}
                className={`flex-1 h-8 text-sm rounded border ${
                  formData[raceNumber]?.[i + startIndex] === num
                    ? 'bg-blue-600 border-blue-700 text-white' 
                    : 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {num}
              </button>
            ))}
            <input
              type="number"
              min={1}
              value={formData[raceNumber]?.[i + startIndex] || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  onchange(raceNumber, i + startIndex, value);
                }
              }}
              className="w-14 h-8 text-sm border rounded text-center"
              placeholder="..."
            />
          </div>
        </div>
      ))}
    </>
  );
});
BoatInputs.displayName = 'BoatInputs';

const scrollToElement = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

type Settings = {
  useLeagues: boolean;
  leagues: Array<{
    id: string;
    name: string;
    boatSets: Array<{
      id: string;
      team1Color: string;
      team2Color: string;
    }>;
  }>;
  teamInput: string;
  boatSets: Array<BoatSet>;
};

export default function AdminResultsForm({ races: initialRaces }: { races: Race[] }) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [formData, setFormData] = useState<{ [key: number]: (number | '')[] }>({});
  const [teamInput, setTeamInput] = useState<string>('');
  const [showTeamInput, setShowTeamInput] = useState(false);
  const [boatSets, setBoatSets] = useState<BoatSet[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [useLeagues, setUseLeagues] = useState(false);
  const [nextUnfinishedRace, setNextUnfinishedRace] = useState<Race | null>(null);
  const [showKnockoutModal, setShowKnockoutModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ [key: string]: Team[] }>({});
  const [settings, setSettings] = useState<Settings>({
    useLeagues: false,
    leagues: [],
    teamInput: '',
    boatSets: []
  });

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
          throw new Error('Failed to load settings');
        }
        const data = await response.json();
        
        // Store the complete settings object
        setSettings(data);
        
        // Only update state if we have valid data
        if (data) {
          setUseLeagues(data.useLeagues ?? false);
          if (data.useLeagues) {
            if (Array.isArray(data.leagues)) {
              setLeagues(data.leagues);
            }
          } else {
            if (typeof data.teamInput === 'string') {
              setTeamInput(data.teamInput);
            }
            if (Array.isArray(data.boatSets)) {
              setBoatSets(data.boatSets);
            }
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSavedSettings();
  }, []);

  // Save settings to API
  const saveSettings = async (newSettings: any) => {
    try {
      const currentResponse = await fetch('/api/settings');
      const currentSettings = await currentResponse.json();

      // Merge current settings with new settings
      const mergedSettings = {
        ...currentSettings,
        ...newSettings
      };

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedSettings)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Update the settings effect
  useEffect(() => {
    // Debounce the save operation
    const timeoutId = setTimeout(() => {
      saveSettings({
        useLeagues,
        leagues,
        teamInput,
        boatSets
      });
    }, 1000); // Wait 1 second after changes before saving

    return () => clearTimeout(timeoutId);
  }, [useLeagues, leagues, teamInput, boatSets]);

  useEffect(() => {
    // Load initial form data - set empty strings instead of zeros
    const initialData: { [key: number]: (number | '')[] } = {};
    initialRaces.forEach((race) => {
      // Use race.result if it exists, otherwise use array of empty strings
      initialData[race.raceNumber] = race.result || Array(6).fill('');
    });
    setFormData(initialData);

    // Load boat sets from the first race that has them
    const raceWithBoats = initialRaces.find(race => race.boats && Object.keys(race.boats).length > 0);
    if (raceWithBoats?.boats) {
      const sets = new Set(
        Object.keys(raceWithBoats.boats)
          .map(key => key.split('-')[1])
          .filter(Boolean)
      );

      const loadedBoatSets = Array.from(sets).map(setNumber => ({
        id: `set-${setNumber}`,
        team1Color: raceWithBoats.boats![`set-${setNumber}-team1`] || '',
        team2Color: raceWithBoats.boats![`set-${setNumber}-team2`] || ''
      }));

      setBoatSets(loadedBoatSets);
    }
  }, [initialRaces]);

  const fetchRaces = async () => {
    try {
      const response = await fetch('/api/schedule');
      if (response.ok) {
        const freshRaces = await response.json();
        setRaces(freshRaces); // Update the races state
        
        // Update the form data with new races
        const updatedData: { [key: number]: (number | '')[] } = {};
        freshRaces.forEach((race: Race) => {
          updatedData[race.raceNumber] = race.result || Array(6).fill('');
        });
        setFormData(updatedData);
        
        // Find next unfinished race
        const unfinishedRace = freshRaces.find((race: Race) => !race.result);
        setNextUnfinishedRace(unfinishedRace || null);
      } else {
        console.error('Failed to fetch updated races');
      }
    } catch (error) {
      console.error('Error fetching races:', error);
    }
  };

  const determineWinner = (race: Race, result: (number | '')[]): string => {
    const teamABoats = result.slice(0, 3).map(v => typeof v === 'number' ? v : 0);
    const teamBBoats = result.slice(3, 6).map(v => typeof v === 'number' ? v : 0);
    const sumA = teamABoats.reduce((a, b) => a + b, 0);
    const sumB = teamBBoats.reduce((a, b) => a + b, 0);

    if (sumA < sumB) return race.teamA;
    if (sumB < sumA) return race.teamB;

    const firstPlaceIndex = result.findIndex((pos) => pos === 1);
    return firstPlaceIndex < 3 ? race.teamB : race.teamA; // 1st was on teamA, they lose tie
  };

  const handleChange = useCallback((raceNumber: number, index: number, value: number) => {
    setFormData(prev => {
      const current = prev[raceNumber] || Array(6).fill('');
      const updated = [...current];
      updated[index] = value || '';
      return { ...prev, [raceNumber]: updated };
    });
  }, []);

  const handleStartRace = useCallback(async (raceNumber: number) => {
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          raceNumber,
          status: 'in_progress',
          startTime: new Date().toISOString()
        }),
      });

      if (!res.ok) throw new Error('Failed to start race');
      await fetchRaces();
    } catch (error) {
      alert('Error starting race: ' + (error as Error).message);
    }
  }, [fetchRaces]);

  const handleSubmit = async (raceNumber: number) => {
    const result = formData[raceNumber];
    if (
      result &&
      result.length === 6 &&
      result.every((pos): pos is number => 
        typeof pos === 'number' && pos >= 1
      )
    ) {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          raceNumber, 
          result,
          status: 'finished',
          endTime: new Date().toISOString()
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        console.error('Failed to parse response JSON:', e);
      }

      if (res.ok) {
        alert(`Results saved for Race ${raceNumber}`);
        await fetchRaces();
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`);
      }
    } else {
      alert('Please enter 6 positions with numbers greater than or equal to 1');
    }
  };

  const handleClear = async (raceNumber: number) => {
    // Set to empty strings instead of zeros
    setFormData({ ...formData, [raceNumber]: Array(6).fill('') });

    const res = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raceNumber, result: null }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Results cleared for Race ${raceNumber}`);
      await fetchRaces();
    } else {
      alert(`Error clearing results: ${data.error || 'Unknown error'}`);
    }
  };

  // Update the handleShowTeamInput function
  const handleShowTeamInput = async () => {
    try {
      setShowTeamInput(true);
      
      // Load settings first
      const response = await fetch('/api/settings');
      if (response.ok) {
        const settings = await response.json();
        console.log('Loaded settings:', settings);

        // Apply the loaded settings
        setUseLeagues(settings.useLeagues);
        
        if (settings.useLeagues && Array.isArray(settings.leagues)) {
          // Ensure each league has proper structure
          const formattedLeagues = settings.leagues.map((league: {
            id?: string;
            name?: string;
            teams?: string[];
            boatSets?: Array<{
              id?: string;
              team1Color?: string;
              team2Color?: string;
            }>;
          }) => ({
            id: league.id || `league-${Date.now()}`,
            name: league.name || '',
            teams: Array.isArray(league.teams) ? league.teams : [],
            boatSets: Array.isArray(league.boatSets) ? league.boatSets.map((set: {
              id?: string;
              team1Color?: string;
              team2Color?: string;
            }) => ({
              id: set.id || `set-${Date.now()}`,
              team1Color: set.team1Color || '',
              team2Color: set.team2Color || ''
            })) : []
          }));
          setLeagues(formattedLeagues);
        } else {
          // For non-league mode
          if (settings.teamInput) {
            setTeamInput(settings.teamInput);
          } else {
            // If no saved teams, get them from existing races
            const existingTeams = Array.from(
              new Set(races.flatMap((race) => [race.teamA, race.teamB]))
            ).join(', ');
            setTeamInput(existingTeams);
          }

          if (Array.isArray(settings.boatSets) && settings.boatSets.length > 0) {
            setBoatSets(settings.boatSets);
          } else {
            // Set default boat set if none exists
            setBoatSets([{
              id: `set-1-${Date.now()}`,
              team1Color: '',
              team2Color: ''
            }]);
          }
        }
      } else {
        console.error('Failed to load settings');
        // Set default values if settings load fails
        setUseLeagues(false);
        setTeamInput('');
        setBoatSets([{
          id: `set-1-${Date.now()}`,
          team1Color: '',
          team2Color: ''
        }]);
        setLeagues([]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Update the useEffect for initial settings load
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          console.log('Initial settings load:', data);
          setSettings(data);
        }
      } catch (error) {
        console.error('Error loading initial settings:', error);
      }
    };

    loadSavedSettings();
  }, []);

  const handleAddBoatSet = () => {
    const timestamp = Date.now(); // Add timestamp to ensure uniqueness
    setBoatSets([
      ...boatSets, 
      { 
        id: `set-${boatSets.length + 1}-${timestamp}`, 
        team1Color: '', 
        team2Color: '' 
      }
    ]);
  };

  const handleRemoveBoatSet = (index: number) => {
    const newBoatSets = [...boatSets];
    newBoatSets.splice(index, 1);
    setBoatSets(newBoatSets);
  };

  const handleBoatSetChange = (index: number, field: keyof BoatSet, value: string) => {
    const newBoatSets = [...boatSets];
    newBoatSets[index][field] = value;
    setBoatSets(newBoatSets);
  };

  // Update the handleAddLeague function to ensure unique boat set IDs
  const handleAddLeague = () => {
    const timestamp = Date.now();
    const newLeagueId = `league-${leagues.length + 1}-${timestamp}`;
    setLeagues([
      ...leagues,
      {
        id: newLeagueId,
        name: `League ${leagues.length + 1}`,
        teams: [],
        boatSets: [{
          id: `${newLeagueId}-set-1-${timestamp}`, // Include timestamp in boat set ID
          team1Color: '',
          team2Color: ''
        }]
      }
    ]);
  };

  const handleRemoveLeague = (index: number) => {
    const newLeagues = [...leagues];
    newLeagues.splice(index, 1);
    setLeagues(newLeagues);
  };

  const handleLeagueChange = (index: number, field: keyof League, value: any) => {
    const newLeagues = [...leagues];
    newLeagues[index][field] = value;
    setLeagues(newLeagues);
  };

  // Update the handleAddBoatSetToLeague function
  const handleAddBoatSetToLeague = (leagueIndex: number) => {
    const newLeagues = [...leagues];
    const league = newLeagues[leagueIndex];
    const timestamp = Date.now();
    const newSetId = `${league.id}-set-${league.boatSets.length + 1}-${timestamp}`;
    league.boatSets.push({
      id: newSetId,
      team1Color: '',
      team2Color: ''
    });
    setLeagues(newLeagues);
  };

  const handleGenerateSchedule = async () => {
    if (useLeagues) {
      if (leagues.length === 0) {
        alert('Please add at least one league');
        return;
      }

      // Generate schedule with league boat sets
      const scheduleRes = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leagues: leagues.map(league => ({
            ...league,
            boatSets: league.boatSets.map(set => ({
              id: set.id,
              team1Color: set.team1Color,
              team2Color: set.team2Color
            }))
          }))
        })
      });

      if (!scheduleRes.ok) {
        const error = await scheduleRes.text();
        alert(`Error generating schedule: ${error}`);
        return;
      }

      // Reset leaderboard
      const leaderboardRes = await fetch('/api/results/reset', {
        method: 'POST',
      });

      if (!leaderboardRes.ok) {
        alert('Warning: Failed to reset leaderboard');
      }

      // Save current settings with leagues
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useLeagues: true,
          leagues: leagues,
          teamInput: '',
          boatSets: []
        })
      });
      
      setShowTeamInput(false);
      await fetchRaces();
    } else {
      if (boatSets.length === 0) {
        alert('Please add at least one boat set');
        return;
      }

      const teams = teamInput.split(',').map((t) => t.trim()).filter(Boolean);
      if (teams.length < 2) {
        alert('Please enter at least 2 teams');
        return;
      }

      // Include full boat set information
      const scheduleRes = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teams,
          boatSets: boatSets.map((set) => ({
            id: set.id,
            team1Color: set.team1Color,
            team2Color: set.team2Color
          }))
        }),
      });

      const scheduleData = await scheduleRes.json();
      if (!scheduleRes.ok) {
        alert(`Error generating schedule: ${scheduleData.error || 'Unknown error'}`);
        return;
      }

      // Reset leaderboard
      const leaderboardRes = await fetch('/api/results/reset', {
        method: 'POST',
      });

      if (!leaderboardRes.ok) {
        alert('Warning: Failed to reset leaderboard');
      }

      alert('Schedule generated and leaderboard reset successfully');
      // Clear settings by posting empty default values
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useLeagues: false,
          leagues: [],
          teamInput: '',
          boatSets: [{
            id: `default-set-1-${Date.now()}`, // Add timestamp to default set
            team1Color: '',
            team2Color: ''
          }]
        })
      });
      setShowTeamInput(false);
      await fetchRaces();
    }
  };

  // Helper function to determine if team is winning (add this before the return statement)
  const getTeamScore = (positions: (number | '')[], startIndex: number) => {
    return positions
      ?.slice(startIndex, startIndex + 3)
      .reduce<number>((sum, pos) => {
        if (typeof pos === 'number') {
          return sum + pos;
        }
        return sum;
      }, 0);
  };

  // Memoize race calculations
  const raceData = useMemo(() => 
    races.map(race => {
      const result = formData[race.raceNumber];
      const teamAScore = getTeamScore(result, 0);
      const teamBScore = getTeamScore(result, 3);
      const isTeamAWinning = teamAScore < teamBScore;
      const isTeamBWinning = teamBScore < teamAScore;
      const winner = result && result.every((n) => 
        typeof n === 'number' && n >= 1
      ) ? determineWinner(race, result) : null;

      return {
        race,
        result,
        teamAScore,
        teamBScore,
        isTeamAWinning,
        isTeamBWinning,
        winner
      };
    }),
    [races, formData]
  );

  useEffect(() => {
    // Find first race that has no result, regardless of status
    const unfinishedRace = races.find(race => !race.result);
    setNextUnfinishedRace(unfinishedRace || null);
  }, [races]);

  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard...');
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched leaderboard data:', data);
        setLeaderboard(data);
      } else {
        throw new Error('Failed to fetch leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const handleCreateKnockouts = async (config: KnockoutConfig) => {
    try {
      const res = await fetch('/api/knockouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to create knockout schedule: ${error}`);
      }

      // Close modal first
      setShowKnockoutModal(false);

      // Then refresh everything
      await Promise.all([
        fetchRaces(),
        fetchLeaderboard()
      ]);
    } catch (error) {
      console.error('Error in handleCreateKnockouts:', error);
      alert('Error creating knockout schedule: ' + (error as Error).message);
    }
  };

  // Add a function to refresh both races and leaderboard
  const refreshData = async () => {
    try {
      await Promise.all([
        fetchRaces(),
        fetchLeaderboard()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Update the modal open handler
  const handleOpenKnockoutModal = async () => {
    await refreshData(); // Refresh data before opening modal
    setShowKnockoutModal(true);
  };

  // Add useEffect to fetch races periodically
  useEffect(() => {
    if (showTeamInput) {
      const interval = setInterval(fetchRaces, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [showTeamInput]);

  return (
    <div className="space-y-6">
      {/* Add link to Race Control at the top */}
      <div className="flex justify-between items-center">
        {!showTeamInput && (
          <div className="flex gap-4">
            <Link
              href="/race-control"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Race Control
            </Link>
            <button
              onClick={handleShowTeamInput}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Generate New Schedule
            </button>
            <button
              onClick={handleOpenKnockoutModal} // Use the new handler
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
            >
              Create Knockout Stage
            </button>
          </div>
        )}
      </div>

      {showTeamInput && (
        <div className="bg-white p-4 border rounded-md">
          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useLeagues}
                onChange={(e) => setUseLeagues(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Use Multiple Leagues</span>
            </label>
          </div>

          {useLeagues ? (
            <div className="space-y-6">
              {leagues.map((league, leagueIndex) => (
                <div key={league.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <input
                      type="text"
                      value={league.name}
                      onChange={(e) => handleLeagueChange(leagueIndex, 'name', e.target.value)}
                      className="font-bold text-lg border-b w-full mr-4"
                      placeholder="League Name"
                    />
                    <button
                      onClick={() => handleRemoveLeague(leagueIndex)}
                      className="text-red-600 hover:text-red-800 px-2"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm mb-2">Teams:</label>
                    <textarea
                      value={typeof league.teams === 'string' ? league.teams : league.teams.join(', ')}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        handleLeagueChange(leagueIndex, 'teams', inputValue);
                      }}
                      onBlur={(e) => {
                        // Convert to array when focus is lost
                        const teams = e.target.value
                          .split(',')
                          .map(team => team.trim())
                          .filter(team => team.length > 0);
                        handleLeagueChange(leagueIndex, 'teams', teams);
                      }}
                      className="w-full border rounded px-2 py-1 h-24"
                      placeholder="Enter team names, separated by commas"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm mb-2">Boat Sets:</label>
                    {league.boatSets.map((set, setIndex) => (
                      <div key={set.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        <input
                          type="text"
                          value={set.team1Color}
                          onChange={(e) => {
                            const newLeagues = [...leagues];
                            newLeagues[leagueIndex].boatSets[setIndex].team1Color = e.target.value;
                            setLeagues(newLeagues);
                          }}
                          className="w-full border rounded px-2 py-1"
                          placeholder="Team 1 Color"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={set.team2Color}
                            onChange={(e) => {
                              const newLeagues = [...leagues];
                              newLeagues[leagueIndex].boatSets[setIndex].team2Color = e.target.value;
                              setLeagues(newLeagues);
                            }}
                            className="flex-1 border rounded px-2 py-1"
                            placeholder="Team 2 Color"
                          />
                          {league.boatSets.length > 1 && (
                            <button
                              onClick={() => {
                                const newLeagues = [...leagues];
                                newLeagues[leagueIndex].boatSets.splice(setIndex, 1);
                                setLeagues(newLeagues);
                              }}
                              className="text-red-600 hover:text-red-800 px-2"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddBoatSetToLeague(leagueIndex)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      + Add Boat Set
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddLeague}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add League
              </button>

              {/* Add Generate Schedule button */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleGenerateSchedule}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Generate Schedule
                </button>
                <button
                  onClick={() => setShowTeamInput(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white p-4 border rounded-md">
                <label className="block text-sm mb-2">Enter team names (separated by commas):</label>
                <textarea
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  className="w-full border rounded px-2 py-1 mb-4 h-24"
                  placeholder="Enter team names (separated by commas)"
                />
                <div className="mb-4">
                  <label className="block text-sm mb-2">Boat Sets:</label>
                  {boatSets.map((set, index) => (
                    <div key={set.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={set.team1Color}
                        onChange={(e) => handleBoatSetChange(index, 'team1Color', e.target.value)}
                        placeholder="Team 1 Color"
                        className="w-full border rounded px-2 py-1"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={set.team2Color}
                          onChange={(e) => handleBoatSetChange(index, 'team2Color', e.target.value)}
                          placeholder="Team 2 Color"
                          className="flex-1 border rounded px-2 py-1"
                        />
                        <button
                          onClick={() => handleRemoveBoatSet(index)}
                          className="text-red-600 hover:text-red-800 px-2"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleAddBoatSet}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    + Add Boat Set
                  </button>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleGenerateSchedule}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Generate Schedule
                  </button>
                  <button
                    onClick={() => setShowTeamInput(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Floating button for next unfinished race */}
      {nextUnfinishedRace && (
        <button
          onClick={() => scrollToElement(`race-${nextUnfinishedRace.raceNumber}`)}
          className="fixed bottom-16 right-4 md:bottom-8 md:right-8 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 z-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="hidden md:inline">Next Unfinished Race</span>
          <span className="md:hidden">Race</span>
          {" "}({nextUnfinishedRace.raceNumber})
        </button>
      )}

      {raceData.map(({ race, result, isTeamAWinning, isTeamBWinning, winner }) => (
        <div 
          key={race.raceNumber} 
          id={`race-${race.raceNumber}`}
          className="p-3 bg-white border rounded-md"
        >
          <div className="flex justify-between items-center mb-3">
            <p className="text-xl md:text-2xl font-bold text-gray-700">
              Race {race.raceNumber}
            </p>
            {race.status === 'in_progress' ? (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                In Progress
              </span>
            ) : race.status === 'finished' ? (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                Finished
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                Not Started
              </span>
            )}
          </div>

          <div className="mb-3">
            <p className="text-center text-xl md:text-2xl font-bold text-gray-700 mb-3">
              Race {race.raceNumber}
            </p>
            <div className="flex justify-between items-baseline">
              <div className="text-center flex-1">
                <h3 className="text-base md:text-lg font-semibold">{race.teamA}</h3>
                <span className="text-xs text-gray-600">({race.boats?.teamA})</span>
              </div>
              <span className="text-gray-400 mx-2">vs</span>
              <div className="text-center flex-1">
                <h3 className="text-base md:text-lg font-semibold">{race.teamB}</h3>
                <span className="text-xs text-gray-600">({race.boats?.teamB})</span>
              </div>
            </div>
          </div>
          
          {winner && (
            <div className="mb-3 text-green-700 font-semibold text-sm md:text-base">
              Winner: {winner}
            </div>
          )}

          <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {/* Team A Boats */}
            <div className="space-y-2">
              <h3 className={`font-medium text-sm md:text-base ${
                isTeamAWinning ? 'text-green-600' : 'text-red-600'
              }`}>{race.teamA}</h3>
              <div className={`space-y-4 p-3 rounded-md ${
                isTeamAWinning ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="bg-white shadow-sm p-2 rounded-md">
                  <BoatInputs
                    raceNumber={race.raceNumber}
                    startIndex={0}
                    formData={formData}
                    onchange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Team B Boats */}
            <div className="space-y-2">
              <h3 className={`font-medium text-sm md:text-base ${
                isTeamBWinning ? 'text-green-600' : 'text-red-600'
              }`}>{race.teamB}</h3>
              <div className={`space-y-4 p-3 rounded-md ${
                isTeamBWinning ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="bg-white p-2 rounded-md">
                  <BoatInputs
                    raceNumber={race.raceNumber}
                    startIndex={3}
                    formData={formData}
                    onchange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleSubmit(race.raceNumber)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm md:text-base hover:bg-blue-700"
            >
              Save Result
            </button>
            <button
              onClick={() => handleClear(race.raceNumber)}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded text-sm md:text-base hover:bg-gray-600"
            >
              Clear Results
            </button>
          </div>
        </div>
      ))}

      <KnockoutModal
        isOpen={showKnockoutModal}
        onClose={() => setShowKnockoutModal(false)}
        leagues={leaderboard}
        settings={settings}
        onConfirm={handleCreateKnockouts}
      />
    </div>
  );
}

type Team = {
  team: string;
  wins: number;
  totalRaces: number;
  winPercentage: number;
  points: number;
  place: number;
  league: string;
  tiebreakNote?: string;
};