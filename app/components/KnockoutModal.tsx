'use client';

import { useState, useEffect, useMemo } from 'react';

// Update the Team type to match leaderboard structure
type Team = {
  team: string;  // Changed from 'name' to 'team'
  wins: number;
  totalRaces: number;
  winPercentage: number;
  points: number;
  place: number;
  league: string;
  tiebreakNote?: string;
};

// Update the props interface to include boat sets
type KnockoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  leagues: { [key: string]: Team[] };
  onConfirm: (config: KnockoutConfig) => void;
  settings: {
    leagues: Array<{
      id: string;
      name: string;
      boatSets: Array<{
        id: string;
        team1Color: string;
        team2Color: string;
      }>;
    }>;
  };
};

// Update the KnockoutConfig type to include league in matchups
export type KnockoutConfig = {
  selectedLeagues: string[];
  bestOf: 1 | 3 | 5;
  stage: 'quarter' | 'semi' | 'final';
  matchups: { 
    teamA: string; 
    teamB: string; 
    boatSet?: string;
    league: string; // Add league property
  }[];
};

// Update the bestOf type to include null for unselected state
type BestOf = 1 | 3 | 5 | null;

// Update the Stage type to be more specific
type Stage = 'quarter' | 'semi' | 'final' | null;

export default function KnockoutModal({ isOpen, onClose, leagues, onConfirm, settings }: KnockoutModalProps) {
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [bestOf, setBestOf] = useState<BestOf>(null);
  const [stage, setStage] = useState<Stage>(null);
  const [matchups, setMatchups] = useState<{
    teamA: string;
    teamB: string;
    boatSet?: string;
    league: string;
  }[]>([]);
  const [editingMatchup, setEditingMatchup] = useState<number | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [draggedMatchup, setDraggedMatchup] = useState<number | null>(null);

  // Extract boat sets from settings
  const boatSets = useMemo(() => {
    return settings.leagues.flatMap(league => 
      league.boatSets.map(set => ({
        id: set.id,
        name: `${league.name}: ${set.team1Color} vs ${set.team2Color}`,
        leagueId: league.id,
        team1Color: set.team1Color,
        team2Color: set.team2Color
      }))
    );
  }, [settings]);

  // Debug logs
  useEffect(() => {
    console.log('Modal mounted with leagues:', leagues);
    console.log('Available leagues:', Object.keys(leagues));
  }, [leagues]);

  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened with leagues:', leagues);
      // Reset state when modal opens
      setSelectedLeagues([]);
      setBestOf(null); // Start with no selection
      setStage(null); // Start with no selection
      setMatchups([]);
    }
  }, [isOpen]);

  const handleLeagueSelect = (leagueName: string) => {
    console.log('Selecting league:', leagueName);
    const newSelected = selectedLeagues.includes(leagueName)
      ? selectedLeagues.filter(l => l !== leagueName)
      : [...selectedLeagues, leagueName];
    
    console.log('Updated selected leagues:', newSelected);
    setSelectedLeagues(newSelected);
    setBestOf(null); // Reset format when leagues change
    setStage(null); // Reset stage when leagues change
    setMatchups([]);
  };

  const generateMatchups = (selectedLeagueNames: string[]) => {
    console.log('Generating matchups for leagues:', selectedLeagueNames);
    
    const newMatchups: { teamA: string; teamB: string; boatSet?: string; league: string }[] = [];

    // Process each league separately
    selectedLeagueNames.forEach(leagueName => {
      const leagueTeams = leagues[leagueName] || [];
      const sortedTeams = [...leagueTeams].sort((a, b) => {
        if (a.place !== b.place) return a.place - b.place;
        return b.winPercentage - a.winPercentage;
      });

      const leagueSettings = settings.leagues.find(l => l.name === leagueName);
      const leagueBoatSets = leagueSettings?.boatSets || [];

      const numTeams = sortedTeams.length;
      let pairs: [number, number][] = [];

      // Determine pairs based on stage and available teams
      if (stage === 'quarter' && numTeams >= 8) {
        pairs = [[0,7], [3,4], [1,6], [2,5]];
      } else if (stage === 'semi' && numTeams >= 4) {
        pairs = [[0,3], [1,2]];
      } else if (stage === 'final' && numTeams >= 2) {
        pairs = [[0,1]];
      }

      // Create matchups for this league
      pairs.forEach(([a, b], pairIndex) => {
        if (sortedTeams[a] && sortedTeams[b]) {
          // Assign default boat set based on match index
          const defaultBoatSet = leagueBoatSets[pairIndex % leagueBoatSets.length];
          
          newMatchups.push({
            teamA: sortedTeams[a].team,
            teamB: sortedTeams[b].team,
            boatSet: defaultBoatSet?.id, // Assign default boat set
            league: leagueName
          });
        }
      });
    });

    setMatchups(newMatchups);
    setAllTeams(selectedLeagueNames.flatMap(name => leagues[name] || []));
  };

  // Update handleSubmit to include refresh
  const handleSubmit = async () => {
    if (selectedLeagues.length === 0) {
      alert('Please select at least one league');
      return;
    }

    if (!bestOf) {
      alert('Please select a match format');
      return;
    }

    if (!stage) {
      alert('Please select a stage');
      return;
    }

    try {
      const config: KnockoutConfig = {
        selectedLeagues,
        bestOf,
        stage,
        matchups
      };

      console.log('Submitting knockout config:', config);
      await onConfirm(config);
      
      // Just close the modal - parent will handle refresh
      onClose();
    } catch (error) {
      console.error('Error creating knockouts:', error);
      alert('Error creating knockout schedule: ' + (error as Error).message);
    }
  };

  const setBestOfHandler = (value: BestOf) => {
    console.log('Setting best of:', value);
    setBestOf(value);
    setStage(null); // Reset stage when format changes
    setMatchups([]);
  };

  // Update the stage handler
  const setStageHandler = async (value: 'quarter' | 'semi' | 'final') => {
    // First update the stage
    setStage(value);

    // Then generate matchups if we have selected leagues
    if (selectedLeagues.length > 0 && bestOf) {
      generateMatchups(selectedLeagues);
    }
  };

  // Update the useEffect for stage changes to ensure matchups are generated
  useEffect(() => {
    if (stage && selectedLeagues.length > 0 && bestOf) {
      generateMatchups(selectedLeagues);
    }
  }, [stage, selectedLeagues, bestOf]);

  const handleMatchupEdit = (
    index: number, 
    field: 'teamA' | 'teamB' | 'boatSet', 
    value: string
  ) => {
    const newMatchups = [...matchups];
    newMatchups[index] = {
      ...newMatchups[index],
      [field]: value
    };
    setMatchups(newMatchups);
    console.log('Updated matchup:', newMatchups[index]); // Add logging
  };

  const handleDragStart = (index: number) => {
    setDraggedMatchup(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedMatchup === null) return;
    
    const newMatchups = [...matchups];
    const [removed] = newMatchups.splice(draggedMatchup, 1);
    newMatchups.splice(index, 0, removed);
    
    setMatchups(newMatchups);
    setDraggedMatchup(null);
  };

  // Update the return JSX to include proper button handlers and disable states
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
      isOpen ? '' : 'hidden'
    }`}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Create Knockout Stage</h2>
        
        <div className="space-y-6">
          {/* League Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Select Leagues</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(leagues).map(leagueName => (
                <button
                  key={leagueName}
                  onClick={() => handleLeagueSelect(leagueName)}
                  className={`px-4 py-2 rounded ${
                    selectedLeagues.includes(leagueName)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {leagueName}
                </button>
              ))}
            </div>
          </div>

          {/* Show teams in selected leagues */}
          {selectedLeagues.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Teams</h3>
              <div className="bg-gray-50 p-4 rounded">
                {selectedLeagues.map(leagueName => (
                  <div key={leagueName}>
                    <h4 className="font-medium">{leagueName}</h4>
                    <ul className="list-disc list-inside ml-4">
                      {leagues[leagueName]?.map(team => (
                        <li key={team.team} className="text-sm">
                          {team.team} (Wins: {team.wins}, Win%: {team.winPercentage}%)
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Match Format</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setBestOfHandler(1)}
                className={`px-4 py-2 rounded ${
                  bestOf === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                Single Race
              </button>
              <button
                onClick={() => setBestOfHandler(3)}
                className={`px-4 py-2 rounded ${
                  bestOf === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                Best of 3
              </button>
              <button
                onClick={() => setBestOfHandler(5)}
                className={`px-4 py-2 rounded ${
                  bestOf === 5 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                Best of 5
              </button>
            </div>
          </div>

          {/* Stage Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Stage</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setStageHandler('quarter')}
                disabled={!bestOf} // Disable if no format selected
                className={`px-4 py-2 rounded ${
                  stage === 'quarter' 
                    ? 'bg-blue-600 text-white' 
                    : !bestOf 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200'
                }`}
              >
                Quarter Finals
              </button>
              <button
                onClick={() => setStageHandler('semi')}
                disabled={!bestOf} // Disable if no format selected
                className={`px-4 py-2 rounded ${
                  stage === 'semi' 
                    ? 'bg-blue-600 text-white' 
                    : !bestOf 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200'
                }`}
              >
                Semi Finals
              </button>
              <button
                onClick={() => setStageHandler('final')}
                disabled={!bestOf} // Disable if no format selected
                className={`px-4 py-2 rounded ${
                  stage === 'final' 
                    ? 'bg-blue-600 text-white' 
                    : !bestOf 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200'
                }`}
              >
                Finals
              </button>
            </div>
          </div>

          {/* Matchup Configuration */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Matchups</h3>
            {matchups.length > 0 ? (
              <div className="space-y-2">
                {matchups.map((matchup, index) => (
                  <div
                    key={`matchup-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className="bg-gray-50 p-4 rounded-lg flex items-center justify-between cursor-move hover:bg-gray-100"
                  >
                    <div className="flex-1 flex items-center gap-4">
                      <select
                        value={matchup.teamA}
                        onChange={(e) => handleMatchupEdit(index, 'teamA', e.target.value)}
                        className="p-2 border rounded"
                      >
                        {allTeams.map(team => ( // Remove league filter to show all teams
                          <option key={team.team} value={team.team}>
                            {team.team} ({team.league} - Place: {team.place})
                          </option>
                        ))}
                      </select>

                      <span className="font-medium">vs</span>

                      <select
                        value={matchup.teamB}
                        onChange={(e) => handleMatchupEdit(index, 'teamB', e.target.value)}
                        className="p-2 border rounded"
                      >
                        {allTeams.map(team => ( // Remove league filter to show all teams
                          <option key={team.team} value={team.team}>
                            {team.team} ({team.league} - Place: {team.place})
                          </option>
                        ))}
                      </select>

                      <select
                        value={matchup.boatSet || ''}
                        onChange={(e) => handleMatchupEdit(index, 'boatSet', e.target.value)}
                        className="p-2 border rounded ml-4"
                      >
                        <option value="">Select Boats</option>
                        {boatSets.map(set => (
                          <option key={set.id} value={set.id}>
                            {set.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-gray-500 text-sm ml-4">
                      {matchup.league} - Match {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedLeagues.length > 0 ? (
              <div className="text-gray-500 italic">
                Not enough teams for {stage} stage (need {
                  stage === 'quarter' ? '8' : 
                  stage === 'semi' ? '4' : '2'
                } teams)
              </div>
            ) : (
              <div className="text-gray-500 italic">
                Select a league to view matchups
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedLeagues.length === 0 || matchups.length === 0}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              Create Knockout Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}