'use client';

import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import Link from 'next/link';
import KnockoutModal, { KnockoutConfig } from '../../components/KnockoutModal';

// Add racing format types at the top of the file
type RacingFormat = '2v2' | '3v3' | '4v4';

// Update the Race type to include racing format
type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  result?: number[] | null;
  winner?: string | null;
  boats?: {
    [key: string]: string; // Allow any string as key for boat colors
  };
  status?: 'not_started' | 'in_progress' | 'finished';
  startTime?: string;
  endTime?: string;
  isKnockout?: boolean;
  stage?: string;
  league?: string;
  matchNumber?: number;
  racingFormat?: RacingFormat;
};

interface BoatSet {
  id: string;
  team1Color: string;
  team2Color: string;
}

interface League {
  id: string;
  name: string;
  teams: string[] | string; // Allow both formats
  boatSets: BoatSet[];
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

// Update the Settings type
type Settings = {
  useLeagues: boolean;
  leagues: League[]; // Use the League interface
  teamInput: string;
  boatSets: BoatSet[];
  racingFormat: RacingFormat;
};

// Get the number of boats per team based on racing format
const getBoatsPerTeam = (format: RacingFormat): number => {
  switch (format) {
    case '2v2': return 2;
    case '3v3': return 3;
    case '4v4': return 4;
    default: return 3;
  }
};

// Update the NUMBERS constant to be dynamic
const getValidPositions = (format: RacingFormat): number[] => {
  const boatsPerTeam = getBoatsPerTeam(format);
  const totalBoats = boatsPerTeam * 2;
  return Array.from({ length: totalBoats }, (_, i) => i + 1);
};

// Update the BOAT_INDICES constant to be dynamic
const getBoatIndices = (format: RacingFormat): number[] => {
  const boatsPerTeam = getBoatsPerTeam(format);
  return Array.from({ length: boatsPerTeam }, (_, i) => i);
};

const scrollToElement = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const getKnockoutStageDisplayName = (stage?: string): string => {
  switch (stage?.toLowerCase()) {
    case 'quarter': return 'Quarter Final';
    case 'semi': return 'Semi Final';
    case 'final': return 'Final';
    default: return 'Knockout';
  }
};

// Add helper function to get league tag colors
const getLeagueTagColors = (league?: string): string => {
  if (!league) return 'bg-gray-100 text-gray-800';
  
  switch (league.toLowerCase()) {
    case 'gold': return 'bg-yellow-100 text-yellow-800';
    case 'silver': return 'bg-gray-100 text-gray-700';
    case 'bronze': return 'bg-orange-100 text-orange-800';
    case 'main': return 'bg-blue-100 text-blue-800'; // For overall/main league
    default: return 'bg-purple-100 text-purple-800'; // Default for other leagues
  }
};

// Add helper function to get knockout stage tag colors
const getKnockoutStageTagColors = (stage?: string): string => {
  switch (stage?.toLowerCase()) {
    case 'quarter': return 'bg-red-100 text-red-800';
    case 'semi': return 'bg-orange-100 text-orange-800';
    case 'final': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Memoized BoatInputs component
const BoatInputs = memo(({ 
  raceNumber, 
  startIndex, 
  formData, 
  onchange,
  format = '3v3'
}: { 
  raceNumber: number;
  startIndex: number;
  formData: { [key: number]: (number | '')[] };
  onchange: (raceNumber: number, index: number, value: number | '') => void; // Changed to accept number | ''
  format?: RacingFormat;
}) => {
  const validPositions = getValidPositions(format);
  const boatIndices = getBoatIndices(format);

  const handleInputChange = (index: number, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1) {
      onchange(raceNumber, index, numValue);
    }
  };

  const handleInputBlur = (index: number, value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 1) {
      // Clear invalid input
      onchange(raceNumber, index, ''); // Now this is allowed by the type
    }
  };

  // Add console log to debug state updates
  console.log(`BoatInputs for race ${raceNumber}, formData:`, formData[raceNumber]);

  return (
    <>
      {boatIndices.map((i: number) => (
        <div key={i} className="space-y-2 mb-2 last:mb-0">
          <div className="flex justify-between text-xs">
            <label>Boat {i + 1}</label>
            <span className="font-medium">
              {formData[raceNumber]?.[i + startIndex] || '-'}
            </span>
          </div>
          <div className="flex gap-1">
            {validPositions.map((num: number) => (
              <button
                key={num}
                onClick={() => {
                  console.log(`Clicked ${num} for race ${raceNumber}, boat ${i + 1}`);
                  onchange(raceNumber, i + startIndex, num);
                }}
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
              onChange={(e) => handleInputChange(i + startIndex, e.target.value)}
              onBlur={(e) => handleInputBlur(i + startIndex, e.target.value)}
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
    boatSets: [],
    racingFormat: '3v3'
  });
  const [racingFormat, setRacingFormat] = useState<RacingFormat>('3v3');

  // --- START OF FUNCTION DEFINITIONS ---

  const fetchRaces = useCallback(async () => {
    try {
      const response = await fetch('/api/schedule');
      if (response.ok) {
        const data = await response.json();
        setRaces(data);
        
        // Initialize form data with stored results whenever races are fetched
        const formDataFromResults: { [key: number]: (number | '')[] } = {};
        data.forEach((race: Race) => {
          if (race.result && Array.isArray(race.result) && race.result.length > 0) {
            formDataFromResults[race.raceNumber] = [...race.result];
          }
        });
        
        // Update form data, but preserve any unsaved changes
        setFormData(prevFormData => {
          const newFormData = { ...formDataFromResults };
          
          // Keep any form data that doesn't have a stored result (user is currently editing)
          Object.keys(prevFormData).forEach(raceNumberStr => {
            const raceNumber = parseInt(raceNumberStr);
            const race = data.find((r: Race) => r.raceNumber === raceNumber);
            
            // If there's no stored result, keep the form data
            if (!race?.result || race.result.length === 0) {
              newFormData[raceNumber] = prevFormData[raceNumber];
            }
          });
          
          return newFormData;
        });
        
        console.log('Races fetched and form data updated with stored results');
      } else {
        console.error('Failed to fetch races');
      }
    } catch (error) {
      console.error('Error fetching races:', error);
    }
  }, []);

  const getTeamScore = useCallback((result: (number | '')[] | undefined, startIndex: number, format: RacingFormat): number => {
    if (!result || !Array.isArray(result)) return 0;
    const boatsPerTeam = getBoatsPerTeam(format);
    return result.slice(startIndex, startIndex + boatsPerTeam)
      .filter((pos): pos is number => typeof pos === 'number') // Type guard
      .reduce((sum, pos) => sum + pos, 0);
  }, []);

  const determineWinner = useCallback((race: Race, result: (number | '')[]): string => {
    const format = race.racingFormat || racingFormat || '3v3';
    const boatsPerTeam = getBoatsPerTeam(format);
    
    const teamABoats = result.slice(0, boatsPerTeam).map(v => typeof v === 'number' ? v : 0);
    const teamBBoats = result.slice(boatsPerTeam, boatsPerTeam * 2).map(v => typeof v === 'number' ? v : 0);
    const sumA = teamABoats.reduce((a, b) => a + b, 0);
    const sumB = teamBBoats.reduce((a, b) => a + b, 0);

    if (sumA < sumB) return race.teamA;
    if (sumB < sumA) return race.teamB;

    const firstPlaceIndex = result.findIndex((pos) => pos === 1);
    return firstPlaceIndex < boatsPerTeam ? race.teamB : race.teamA;
  }, [racingFormat]);

  // Fix the handleChange function to work with arrays instead of objects
  const handleChange = useCallback((raceNumber: number, index: number, value: number | '') => {
    setFormData(prev => {
      const currentRaceData = prev[raceNumber] || [];
      const newRaceData = [...currentRaceData];
      
      // Ensure the array is long enough
      const format = races.find(r => r.raceNumber === raceNumber)?.racingFormat || racingFormat || '3v3';
      const totalBoats = getBoatsPerTeam(format) * 2;
      while (newRaceData.length < totalBoats) {
        newRaceData.push('');
      }
      
      newRaceData[index] = value;
      
      return {
        ...prev,
        [raceNumber]: newRaceData
      };
    });
  }, [races, racingFormat]);

  // Update the handleSubmit function to be less strict about validation
  const handleSubmit = useCallback(async (raceNumber: number) => {
    const resultInput = formData[raceNumber];
    if (!resultInput) {
      alert('Please enter race results');
      return;
    }

    const race = races.find(r => r.raceNumber === raceNumber);
    if (!race) {
      alert('Race not found');
      return;
    }

    const format = race.racingFormat || racingFormat || '3v3';
    const boatsPerTeam = getBoatsPerTeam(format);
    const totalBoats = boatsPerTeam * 2;

    const resultArray: (number | '')[] = [];
    for (let i = 0; i < totalBoats; i++) {
        resultArray.push(resultInput[i] || '');
    }
    
    if (resultArray.some(pos => pos === '')) {
      alert('Please fill in all boat positions');
      return;
    }

    const numericResult = resultArray.map(pos => parseInt(pos.toString()));
    
    // Only check that positions are positive integers
    if (numericResult.some(pos => isNaN(pos) || pos < 1)) {
      alert('All positions must be positive numbers');
      return;
    }

    

    // Warn if positions are not consecutive from 1, but allow saving
    const sortedPositions = [...numericResult].sort((a, b) => a - b);
    const expectedPositions = Array.from({ length: totalBoats }, (_, i) => i + 1);
    const isConsecutive = sortedPositions.every((pos, index) => pos === expectedPositions[index]);
    
    if (!isConsecutive) {
      const confirm = window.confirm(
        `Warning: Positions are not consecutive from 1-${totalBoats}. Got: [${sortedPositions.join(', ')}]. Do you want to save anyway?`
      );
      if (!confirm) return;
    }

    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          raceNumber, 
          result: numericResult
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Race saved with timing:', responseData.race);
        
        // Update form data to reflect the saved result
        setFormData(prev => ({
          ...prev,
          [raceNumber]: [...numericResult]
        }));
        
        await fetchRaces();
        alert(`Result saved successfully at ${new Date(responseData.race.endTime).toLocaleTimeString()}`);
      } else {
        const errorData = await response.text();
        alert(`Failed to save result: ${errorData}`);
      }
    } catch (error) {
      console.error('Error saving result:', error);
      alert('Error saving result');
    }
  }, [formData, races, racingFormat, fetchRaces]);

  const handleClear = useCallback(async (raceNumber: number) => {
    try {
      const response = await fetch('/api/results', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceNumber }),
      });

      if (response.ok) {
        // Clear the form data for this race
        setFormData(prev => {
          const newData = { ...prev };
          delete newData[raceNumber];
          return newData;
        });
        
        await fetchRaces(); // Refresh races after clearing
        alert('Result cleared successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to clear result: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error clearing result:', error);
      alert('Error clearing result');
    }
  }, [fetchRaces]);

  const handleLeagueChange = useCallback((leagueIndex: number, field: keyof League, value: any) => {
    setLeagues(prev => {
      const newLeagues = [...prev];
      if (field === 'teams') {
        // Store the raw string value directly, don't split until form submission
        newLeagues[leagueIndex] = {
          ...newLeagues[leagueIndex],
          teams: value // Store as string instead of splitting immediately
        };
      } else {
        (newLeagues[leagueIndex] as any)[field] = value;
      }
      return newLeagues;
    });
  }, []);
  
  const handleRemoveLeague = useCallback((leagueIndex: number) => {
    setLeagues(prev => prev.filter((_, index) => index !== leagueIndex));
  }, []);

  const handleAddLeague = useCallback(() => {
    const newLeague: League = {
      id: `league-${Date.now()}`,
      name: '',
      teams: [],
      boatSets: [{ id: `set-${Date.now()}`, team1Color: '', team2Color: '' }]
    };
    setLeagues(prev => [...prev, newLeague]);
  }, []);

  const handleAddBoatSetToLeague = useCallback((leagueIndex: number) => {
    setLeagues(prev => {
      const newLeagues = [...prev];
      if (newLeagues[leagueIndex]) { // Check if league exists
        newLeagues[leagueIndex].boatSets.push({
          id: `set-${Date.now()}`,
          team1Color: '',
          team2Color: ''
        });
      }
      return newLeagues;
    });
  }, []);
  
  const handleBoatSetChange = useCallback((index: number, field: keyof BoatSet, value: string) => {
    setBoatSets(prev => {
      const newBoatSets = [...prev];
      (newBoatSets[index] as any)[field] = value;
      return newBoatSets;
    });
  }, []);

  const handleRemoveBoatSet = useCallback((index: number) => {
    setBoatSets(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddBoatSet = useCallback(() => {
    const newBoatSet: BoatSet = {
      id: `set-${Date.now()}`,
      team1Color: '',
      team2Color: ''
    };
    setBoatSets(prev => [...prev, newBoatSet]);
  }, []);

  const handleAddRoundRobin = async () => {
    try {
      if (!settings || (!settings.useLeagues && !settings.teamInput)) {
        alert('No settings found. Please generate an initial schedule first.');
        return;
      }

      // Use current settings to add another round robin
      const endpoint = '/api/schedule/add-round-robin';
      const body = settings.useLeagues 
        ? { 
            leagues: settings.leagues.map(l => ({ 
              ...l, 
              boatSets: l.boatSets.map(bs => ({
                id: bs.id, 
                team1Color: bs.team1Color, 
                team2Color: bs.team2Color
              })) 
            })), 
            racingFormat: settings.racingFormat 
          }
        : { 
            teams: settings.teamInput.split(',').map((t) => t.trim()).filter(Boolean), 
            boatSets: settings.boatSets.map(bs => ({
              id: bs.id, 
              team1Color: bs.team1Color, 
              team2Color: bs.team2Color
            })), 
            racingFormat: settings.racingFormat 
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.text();
        alert(`Error adding round robin: ${error}`);
        return;
      }

      const result = await response.json();
      alert(`Round robin added successfully! Added ${result.newRaces} races.`);
      await fetchRaces(); // Refresh races
    } catch (error) {
      console.error('Error adding round robin:', error);
      alert('An error occurred while adding round robin.');
    }
  };

  // --- END OF FUNCTION DEFINITIONS ---

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
          throw new Error('Failed to load settings');
        }
        const data = await response.json();
        
        setSettings(data);
        
        if (data) {
          setUseLeagues(data.useLeagues ?? false);
          setRacingFormat(data.racingFormat || '3v3');
          
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
  const saveSettings = async (newSettings: Partial<Settings>) => { // Use Partial<Settings>
    try {
      console.log('Saving settings:', newSettings);
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      setSettings(prev => ({ ...prev, ...newSettings }));
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleShowTeamInput = async () => {
    try {
      setShowTeamInput(true);
      // Settings are already loaded in the useEffect, no need to fetch again
      console.log('Using already loaded settings for team input dialog:', settings);

      // Populate form fields based on current `settings` state
      setUseLeagues(settings.useLeagues);
      setRacingFormat(settings.racingFormat || '3v3');

      if (settings.useLeagues && Array.isArray(settings.leagues)) {
        const formattedLeagues = settings.leagues.map(league => ({
          id: league.id || `league-${Date.now()}`,
          name: league.name || '',
          teams: Array.isArray(league.teams) 
            ? league.teams.join(', ') // Convert array back to string for editing
            : league.teams || '', // Keep as string if already string
          boatSets: Array.isArray(league.boatSets) ? league.boatSets.map(set => ({
            id: set.id || `set-${Date.now()}`,
            team1Color: set.team1Color || '',
            team2Color: set.team2Color || ''
          })) : []
        }));
        setLeagues(formattedLeagues);
        setTeamInput(''); // Clear non-league input
        setBoatSets([]);  // Clear non-league boat sets
      } else {
        setTeamInput(settings.teamInput || '');
        if (Array.isArray(settings.boatSets) && settings.boatSets.length > 0) {
          setBoatSets(settings.boatSets);
        } else {
          // Only set default if boatSets is empty AND not in league mode
          if (!settings.useLeagues && boatSets.length === 0) {
            setBoatSets([{ id: `set-1-${Date.now()}`, team1Color: '', team2Color: '' }]);
          } else if (settings.useLeagues) {
            setBoatSets([]); // Clear if switching to league mode
          }
        }
        setLeagues([]); // Clear league input
      }
    } catch (error) {
      console.error('Error in handleShowTeamInput:', error);
    }
  };

  const handleGenerateSchedule = async () => {
    const currentSettingsToSave: Settings = {
      useLeagues,
      leagues: useLeagues ? leagues.map(league => ({
        ...league,
        teams: typeof league.teams === 'string' 
          ? league.teams.split(',').map(team => team.trim()).filter(team => team.length > 0)
          : league.teams
      })) : [],
      teamInput: useLeagues ? '' : teamInput,
      boatSets: useLeagues ? [] : boatSets,
      racingFormat
    };

    if (useLeagues) {
      if (leagues.length === 0 || leagues.every(l => {
        const teams = typeof l.teams === 'string' 
          ? l.teams.split(',').map(t => t.trim()).filter(Boolean)
          : l.teams;
        return teams.length === 0;
      })) {
        alert('Please add at least one league with teams');
        return;
      }
      // Further validation for league boat sets if necessary
    } else {
      if (boatSets.length === 0) {
        alert('Please add at least one boat set for non-league mode');
        return;
      }
      const teamsArray = teamInput.split(',').map((t) => t.trim()).filter(Boolean);
      if (teamsArray.length < 2) {
        alert('Please enter at least 2 teams for non-league mode');
        return;
      }
    }

    // Save settings first
    await saveSettings(currentSettingsToSave); 
    console.log('Settings saved before generating schedule.');

    // Proceed with schedule generation
    const endpoint = '/api/schedule/generate';
    const body = useLeagues 
      ? { 
          leagues: leagues.map(l => ({ 
            ...l, 
            teams: typeof l.teams === 'string' 
              ? l.teams.split(',').map(team => team.trim()).filter(Boolean)
              : l.teams,
            boatSets: l.boatSets.map(bs => ({
              id: bs.id, 
              team1Color: bs.team1Color, 
              team2Color: bs.team2Color
            })) 
          })), 
          racingFormat 
        }
      : { 
          teams: teamInput.split(',').map((t) => t.trim()).filter(Boolean), 
          boatSets: boatSets.map(bs => ({
            id: bs.id, 
            team1Color: bs.team1Color, 
            team2Color: bs.team2Color
          })), 
          racingFormat 
        };

    try {
      const scheduleRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!scheduleRes.ok) {
        const error = await scheduleRes.text();
        alert(`Error generating schedule: ${error}`);
        return;
      }

      const leaderboardRes = await fetch('/api/results/reset', { method: 'POST' });
      if (!leaderboardRes.ok) {
        alert('Warning: Failed to reset leaderboard');
      }
      
      alert('Schedule generated successfully');
      setShowTeamInput(false);
      window.location.reload();
    } catch (error) {
      console.error('Error in schedule generation process:', error);
      alert('An error occurred during schedule generation.');
    }
  };

  // Update the raceData useMemo to check for both stored results and form data
  const raceData = useMemo(() => 
    races.map(race => {
      const result = formData[race.raceNumber] || []; // Form data
      const storedResult = race.result || []; // Stored result from database
      const format = race.racingFormat || racingFormat || '3v3';
      const boatsPerTeam = getBoatsPerTeam(format);
      
      // Use stored result if available, otherwise use form data
      const activeResult = storedResult.length > 0 ? storedResult : result;
      
      const teamAScore = getTeamScore(activeResult, 0, format);
      const teamBScore = getTeamScore(activeResult, boatsPerTeam, format);
      
      let winner = null;
      
      // Check if we have a complete result (either stored or in form)
      if (Array.isArray(activeResult) && activeResult.length === boatsPerTeam * 2) {
        const allPositionsFilled = activeResult.every(pos => typeof pos === 'number' && pos >= 1 && pos <= boatsPerTeam * 2);
        if (allPositionsFilled) {
          winner = determineWinner(race, activeResult as (number | '')[]);
        }
      }
      
      const isTeamAWinning = winner === race.teamA;
      const isTeamBWinning = winner === race.teamB;

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
    [races, formData, racingFormat, getTeamScore, determineWinner]
  );

  useEffect(() => {
    const unfinishedKnockouts = races.filter(r => r.isKnockout && !r.result);
    if (unfinishedKnockouts.length > 0) {
      const stagePriority = { 'final': 3, 'semi': 2, 'quarter': 1 } as const;
      unfinishedKnockouts.sort((a, b) => {
        const priorityA = stagePriority[a.stage as keyof typeof stagePriority] || 0;
        const priorityB = stagePriority[b.stage as keyof typeof stagePriority] || 0;
        if (priorityA !== priorityB) return priorityB - priorityA;
        return (a.matchNumber || 0) - (b.matchNumber || 0) || a.raceNumber - b.raceNumber;
      });
      setNextUnfinishedRace(unfinishedKnockouts[0]);
    } else {
      const unfinishedRegular = races.find(r => !r.isKnockout && !r.result);
      setNextUnfinishedRace(unfinishedRegular || null);
    }
  }, [races]);

  const fetchLeaderboard = useCallback(async () => { // Added useCallback
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      } else {
        console.error('Failed to fetch leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  }, []);

  const handleCreateKnockouts = async (config: KnockoutConfig) => {
    try {
      // Ensure settings are up-to-date before creating knockouts
      const currentSettingsResponse = await fetch('/api/settings');
      if (!currentSettingsResponse.ok) throw new Error("Failed to fetch current settings");
      const currentSettingsData = await currentSettingsResponse.json();
      
      const payload = {
        ...config,
        racingFormat: currentSettingsData.racingFormat || racingFormat, // Use fetched or current state
        // Pass leagues from current settings if in league mode
        leagues: currentSettingsData.useLeagues ? currentSettingsData.leagues : undefined, 
      };

      const response = await fetch('/api/knockouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      window.location.reload(); // Refresh to see new knockout races
    } catch (error) {
      console.error('Error in handleCreateKnockouts:', error);
      alert('Failed to create knockout schedule: ' + (error as Error).message);
    }
  };

  const refreshData = useCallback(async () => { // Added useCallback
    try {
      await Promise.all([fetchRaces(), fetchLeaderboard()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [fetchRaces, fetchLeaderboard]); // Added dependencies

  const handleOpenKnockoutModal = async () => {
    await refreshData();
    setShowKnockoutModal(true);
  };

  useEffect(() => {
    // Fetch initial data on mount
    refreshData();

    // Initialize form data - but only once on initial load
    if (races.length > 0 && Object.keys(formData).length === 0) {
      const initialFormData: { [key: number]: (number | '')[] } = {};
      
      races.forEach(race => {
        if (race.result && Array.isArray(race.result) && race.result.length > 0) {
          initialFormData[race.raceNumber] = [...race.result];
        }
      });
      
      if (Object.keys(initialFormData).length > 0) {
        setFormData(initialFormData);
        console.log('Initialized form data with stored results:', initialFormData);
      }
    }

    // Periodic refresh only if not showing team input dialog - but use a longer interval
    let intervalId: NodeJS.Timeout | null = null;
    if (!showTeamInput) {
      intervalId = setInterval(refreshData, 60000); // Refresh every minute instead of 30s
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showTeamInput, refreshData]); // Remove races dependency to prevent constant reinitializing

  // JSX rendering starts here
  return (
    <div className="space-y-6">
      {/* Add link to Race Control at the top */}
      <div className="flex justify-between items-start"> {/* Changed items-center to items-start */}
        {!showTeamInput && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto"> {/* Added flex-col for mobile */}
            <Link
              href="/race-control"
              className="bg-green-600 text-white px-3 py-2 sm:px-4 rounded hover:bg-green-700 transition-colors text-center text-sm sm:text-base"
            >
              Race Control
            </Link>
            <button
              onClick={handleShowTeamInput}
              className="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded hover:bg-blue-700 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              Generate New Schedule
            </button>
            <button
              onClick={handleAddRoundRobin}
              className="bg-orange-600 text-white px-3 py-2 sm:px-4 rounded hover:bg-orange-700 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              Add Round Robin
            </button>
            <button
              onClick={handleOpenKnockoutModal}
              className="bg-purple-600 text-white px-3 py-2 sm:px-4 rounded hover:bg-purple-700 transition-colors text-sm sm:text-base whitespace-nowrap"
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
                onChange={(e) => {
                  setUseLeagues(e.target.checked);
                  // When switching modes, reset the other mode's data
                  if (e.target.checked) {
                    setTeamInput('');
                    setBoatSets([]);
                    if (leagues.length === 0) handleAddLeague(); // Add a default league
                  } else {
                    setLeagues([]);
                     if (boatSets.length === 0) handleAddBoatSet(); // Add a default boat set
                  }
                }}
                className="rounded text-blue-600"
              />
              <span>Use Multiple Leagues</span>
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Racing Format
            </label>
            <div className="flex gap-4">
              {(['2v2', '3v3', '4v4'] as const).map((format) => (
                <label key={format} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="racingFormat"
                    value={format}
                    checked={racingFormat === format}
                    onChange={(e) => setRacingFormat(e.target.value as RacingFormat)}
                    className="text-blue-600"
                  />
                  <span>{format} Racing</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {racingFormat} = {getBoatsPerTeam(racingFormat)} boats per team, {getBoatsPerTeam(racingFormat) * 2} boats total per race
            </p>
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
                    {leagues.length > 1 && (
                        <button
                        onClick={() => handleRemoveLeague(leagueIndex)}
                        className="text-red-600 hover:text-red-800 px-2"
                        >
                        ×
                        </button>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm mb-2">Teams (comma-separated):</label>
                    <textarea
                      value={typeof league.teams === 'string' ? league.teams : league.teams.join(', ')}
                      onChange={(e) => handleLeagueChange(leagueIndex, 'teams', e.target.value)}
                      className="w-full border rounded px-2 py-1 h-24"
                      placeholder="Enter team names, separated by commas"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm mb-2">Boat Sets for this League:</label>
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
                          placeholder="Team 1 Color (e.g., Red)"
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
                            placeholder="Team 2 Color (e.g., Blue)"
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
                      + Add Boat Set to League
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddLeague}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Add Another League
              </button>
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
                  <label className="block text-sm mb-2">Global Boat Sets:</label>
                  {boatSets.map((set, index) => (
                    <div key={set.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        value={set.team1Color}
                        onChange={(e) => handleBoatSetChange(index, 'team1Color', e.target.value)}
                        placeholder="Team 1 Color (e.g., Red)"
                        className="w-full border rounded px-2 py-1"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={set.team2Color}
                          onChange={(e) => handleBoatSetChange(index, 'team2Color', e.target.value)}
                          placeholder="Team 2 Color (e.g., Blue)"
                          className="flex-1 border rounded px-2 py-1"
                        />
                         {boatSets.length > 1 && (
                            <button
                            onClick={() => handleRemoveBoatSet(index)}
                            className="text-red-600 hover:text-red-800 px-2"
                            >
                            ×
                            </button>
                        )}
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
      
      {nextUnfinishedRace && (
        <button
          onClick={() => scrollToElement(`race-${nextUnfinishedRace.raceNumber}`)}
          className="fixed bottom-28 right-4 md:bottom-20 md:right-8 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 z-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="hidden md:inline">
            {nextUnfinishedRace.isKnockout 
              ? `Next ${getKnockoutStageDisplayName(nextUnfinishedRace.stage)}` 
              : 'Next Unfinished Race'
            }
          </span>
          <span className="md:hidden">
            {nextUnfinishedRace.isKnockout 
              ? getKnockoutStageDisplayName(nextUnfinishedRace.stage).split(' ')[0]
              : 'Race'
            }
          </span>
          {` (${nextUnfinishedRace.raceNumber})`}
        </button>
      )}

      <button
        onClick={scrollToTop}
        className="fixed bottom-4 right-4 md:bottom-8 md:right-8 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-colors z-50"
        title="Jump to Top"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>

      {raceData.map(({ race, result, isTeamAWinning, isTeamBWinning, winner }) => {
        const format = race.racingFormat || racingFormat || '3v3';
        const boatsPerTeam = getBoatsPerTeam(format);

        return (
          <div 
            key={race.raceNumber} 
            id={`race-${race.raceNumber}`}
            className="p-3 bg-white border rounded-md"
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xl md:text-2xl font-bold text-gray-700">
                  Race {race.raceNumber}
                </p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {format} Racing
                </span>
                {race.league && (
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${getLeagueTagColors(race.league)}
                  `}>
                    {race.league === 'main' ? 'Overall' : `${race.league} League`}
                  </span>
                )}
                {race.isKnockout && race.stage && (
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${getKnockoutStageTagColors(race.stage)}
                  `}>
                    {getKnockoutStageDisplayName(race.stage)}
                    {race.matchNumber && ` #${race.matchNumber}`}
                  </span>
                )}
              </div>
              {race.status === 'in_progress' ? (
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">In Progress</span>
              ) : race.status === 'finished' ? (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">Finished</span>
              ) : (
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">Not Started</span>
              )}
            </div>
            <div className="mb-3">
              <div className="flex justify-between items-baseline">
                <div className="text-center flex-1">
                  <h3 className="text-base md:text-lg font-semibold">{race.teamA}</h3>
                  <span className="text-xs text-gray-600">({race.boats?.teamA || 'N/A'})</span>
                </div>
                <span className="text-gray-400 mx-2">vs</span>
                <div className="text-center flex-1">
                  <h3 className="text-base md:text-lg font-semibold">{race.teamB}</h3>
                  <span className="text-xs text-gray-600">({race.boats?.teamB || 'N/A'})</span>
                </div>
              </div>
            </div>
            {winner && (
              <div className="mb-3 text-green-700 font-semibold text-sm md:text-base">
                Winner: {winner}
              </div>
            )}
            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              <div className="space-y-2">
                <h3 className={`font-medium text-sm md:text-base ${isTeamAWinning ? 'text-green-600' : (winner ? 'text-red-600' : 'text-gray-700')}`}>{race.teamA}</h3>
                <div className={`space-y-4 p-3 rounded-md ${isTeamAWinning ? 'bg-green-50' : (winner ? 'bg-red-50' : 'bg-gray-50')}`}>
                  <div className="bg-white shadow-sm p-2 rounded-md">
                    <BoatInputs raceNumber={race.raceNumber} startIndex={0} formData={formData} onchange={handleChange} format={format} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className={`font-medium text-sm md:text-base ${isTeamBWinning ? 'text-green-600' : (winner ? 'text-red-600' : 'text-gray-700')}`}>{race.teamB}</h3>
                <div className={`space-y-4 p-3 rounded-md ${isTeamBWinning ? 'bg-green-50' : (winner ? 'bg-red-50' : 'bg-gray-50')}`}>
                  <div className="bg-white p-2 rounded-md">
                    <BoatInputs raceNumber={race.raceNumber} startIndex={boatsPerTeam} formData={formData} onchange={handleChange} format={format} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleSubmit(race.raceNumber)} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm md:text-base hover:bg-blue-700">
                Save Result
              </button>
              <button onClick={() => handleClear(race.raceNumber)} className="flex-1 bg-gray-500 text-white px-4 py-2 rounded text-sm md:text-base hover:bg-gray-600">
                Clear Results
              </button>
            </div>
          </div>
        );
      })}

      <KnockoutModal
        isOpen={showKnockoutModal}
        onClose={() => setShowKnockoutModal(false)}
        leagues={leaderboard} // Pass the fetched leaderboard data
        settings={settings || { // Add fallback for undefined settings
          useLeagues: false,
          leagues: [],
          boatSets: [],
          racingFormat: '3v3'
        }}
        races={races} // Pass current races
        onConfirm={handleCreateKnockouts}
      />
    </div>
  );
}
