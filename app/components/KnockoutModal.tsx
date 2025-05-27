'use client';

import { useState, useEffect, useMemo } from 'react';

// Update the Race type definition to include the league property
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
  isKnockout?: boolean;
  stage?: string;
  league?: string; // Add this line
  matchNumber?: number;
};

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

// Update the props interface to include global boat sets
type KnockoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  leagues: { [key: string]: Team[] };
  onConfirm: (config: KnockoutConfig) => void;
  settings: {
    useLeagues: boolean; // Add this
    leagues: Array<{
      id: string;
      name: string;
      boatSets: Array<{
        id: string;
        team1Color: string;
        team2Color: string;
      }>;
    }>;
    boatSets: Array<{ // Add global boat sets
      id: string;
      team1Color: string;
      team2Color: string;
    }>;
  };
  races: Race[];
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
    matchNumber?: number; // Add match number
  }[];
};

// Update the bestOf type to include null for unselected state
type BestOf = 1 | 3 | 5 | null;

// Update the Stage type to be more specific
type Stage = 'quarter' | 'semi' | 'final' | null;

export default function KnockoutModal({ isOpen, onClose, leagues, onConfirm, settings, races }: KnockoutModalProps) {
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [bestOf, setBestOf] = useState<BestOf>(null);
  const [stage, setStage] = useState<Stage>(null);
  const [matchups, setMatchups] = useState<{
    teamA: string;
    teamB: string;
    boatSet?: string;
    league: string;
    matchNumber?: number;
  }[]>([]);
  const [editingMatchup, setEditingMatchup] = useState<number | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  // Remove draggedMatchup state since we're removing drag-and-drop

  // Add state for knockout winners
  const [knockoutWinners, setKnockoutWinners] = useState<{ [key: string]: { [key: number]: { winner: string; league: string } } }>({});

  // FIXED: Extract boat sets from both league and global settings
  const boatSets = useMemo(() => {
    if (settings.useLeagues) {
      // For leagues mode, use league-specific boat sets
      const allBoatSets = settings.leagues.flatMap(league => 
        league.boatSets.map(set => ({
          id: set.id,
          name: `${league.name}: ${set.team1Color} vs ${set.team2Color}`,
          leagueId: league.id,
          team1Color: set.team1Color,
          team2Color: set.team2Color
        }))
      );
      
      return allBoatSets.length > 0 ? allBoatSets : [];
    } else {
      // FIXED: For non-leagues mode, use global boat sets
      return settings.boatSets.map(set => ({
        id: set.id,
        name: `${set.team1Color} vs ${set.team2Color}`,
        leagueId: 'global',
        team1Color: set.team1Color,
        team2Color: set.team2Color
      }));
    }
  }, [settings]);

  // Debug logs
  useEffect(() => {
    console.log('Modal mounted with leagues:', leagues);
    console.log('Available leagues:', Object.keys(leagues));
  }, [leagues]);

  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened with leagues:', leagues);
      console.log('Settings:', settings);
      
      // Select leagues based on mode
      if (settings.useLeagues) {
        // For league mode, let user select from available leagues
        setSelectedLeagues([]);
      } else {
        // For non-league mode, auto-select all available leagues from leaderboard
        const allLeagueNames = Object.keys(leagues);
        console.log('Auto-selecting leagues for non-league mode:', allLeagueNames);
        setSelectedLeagues(allLeagueNames);
      }
      
      setBestOf(null);
      setStage(null);
      setMatchups([]);
      
      // Calculate knockout winners from previous races
      const winners = getKnockoutWinners(races);
      setKnockoutWinners(winners);
      console.log('Previous knockout winners:', winners);
    }
  }, [isOpen, leagues, races, settings]);

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

  // Add the PreviousWinners component definition
  const PreviousWinners = ({ stage }: { stage: string }) => {
    const stageWinners = knockoutWinners[stage];
    if (!stageWinners || Object.keys(stageWinners).length === 0) {
      return null;
    }

    const getStageDisplayName = (stageName: string) => {
      switch (stageName.toLowerCase()) {
        case 'quarter': return 'Quarter Finals';
        case 'semi': return 'Semi Finals';
        case 'final': return 'Finals';
        default: return stageName;
      }
    };

    // Group winners by league
    const winnersByLeague: { [league: string]: Array<{ matchNumber: string; winner: string }> } = {};
    
    Object.entries(stageWinners).forEach(([matchNumber, winnerInfo]) => {
      if (!winnersByLeague[winnerInfo.league]) {
        winnersByLeague[winnerInfo.league] = [];
      }
      winnersByLeague[winnerInfo.league].push({ matchNumber, winner: winnerInfo.winner });
    });

    return (
      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <h4 className="font-medium text-green-800 mb-2">
          Previous {getStageDisplayName(stage)} Winners:
        </h4>
        <div className="space-y-2">
          {Object.entries(winnersByLeague).map(([league, winners]) => (
            <div key={league}>
              <h5 className="text-sm font-medium text-green-700">{league}:</h5>
              <div className="flex flex-wrap gap-2 ml-2">
                {winners.map(({ matchNumber, winner }) => (
                  <span 
                    key={matchNumber}
                    className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm"
                  >
                    Match {matchNumber}: {winner}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Add helper function to get previous stage
  const getPreviousStage = (currentStage: string): string => {
    switch (currentStage) {
      case 'semi': return 'quarter';
      case 'final': return 'semi';
      default: return '';
    }
  };

  // Update the getPreviousStageWinners function with correct bracket progression
  const getPreviousStageWinners = (leagueName: string): Team[] => {
    const previousStage = getPreviousStage(stage || '');
    if (!previousStage || !knockoutWinners[previousStage]) {
      return [];
    }

    const stageWinners = knockoutWinners[previousStage];
    
    // Filter winners by league first
    const leagueWinners = Object.entries(stageWinners)
      .filter(([_, winnerInfo]) => winnerInfo.league === leagueName)
      .sort(([a], [b]) => parseInt(a) - parseInt(b)); // Sort by match number
    
    if (leagueWinners.length === 0) {
      console.log(`No previous ${previousStage} winners found for league: ${leagueName}`);
      return [];
    }

    // Get the original teams from leaderboard to maintain seeding information
    const leagueTeams = leagues[leagueName] || [];
    
    // Create Team objects for winners, preserving their original seeding
    const winnerTeams: Team[] = [];
    
    leagueWinners.forEach(([matchNumber, winnerInfo]) => {
      const winnerName = winnerInfo.winner;
      const originalTeam = leagueTeams.find(team => team.team === winnerName);
      
      if (originalTeam) {
        winnerTeams.push(originalTeam);
      } else {
        // If team not found in current league, create a basic Team object
        winnerTeams.push({
          team: winnerName,
          wins: 0,
          totalRaces: 0,
          winPercentage: 0,
          points: 0,
          place: winnerTeams.length + 1,
          league: leagueName,
          tiebreakNote: `${previousStage} winner`
        });
      }
    });

    console.log(`Found ${winnerTeams.length} previous ${previousStage} winners for ${leagueName}:`, 
      winnerTeams.map(t => `${t.team} (seed ${t.place})`));

    // For proper bracket seeding: reorder based on stage transition
    if (previousStage === 'quarter' && stage === 'semi') {
      // Quarter finals produce 4 winners per league
      if (winnerTeams.length === 4) {
        // Sort winners by their original seeding (place)
        const sortedBySeeding = [...winnerTeams].sort((a, b) => a.place - b.place);
        
        // Return in order: [highest, lowest, second-highest, second-lowest]
        // This creates matchups: highest vs lowest, second-highest vs second-lowest
        return [
          sortedBySeeding[0], // Highest seed (best place number)
          sortedBySeeding[3], // Lowest seed
          sortedBySeeding[1], // Second highest seed
          sortedBySeeding[2]  // Second lowest seed
        ];
      }
    } else if (previousStage === 'semi' && stage === 'final') {
      // Semi-finals produce 2 winners per league
      if (winnerTeams.length === 2) {
        // Sort by original seeding for final
        const sortedBySeeding = [...winnerTeams].sort((a, b) => a.place - b.place);
        return [
          sortedBySeeding[0], // Higher seed
          sortedBySeeding[1]  // Lower seed
        ];
      }
    }

    return winnerTeams;
  };

  // Update the generateMatchups function to handle non-league boat sets
  const generateMatchups = (selectedLeagueNames: string[]) => {
    console.log('Generating matchups for leagues:', selectedLeagueNames);
    console.log('Settings mode:', settings.useLeagues ? 'leagues' : 'non-leagues');
    
    const newMatchups: { teamA: string; teamB: string; boatSet?: string; league: string; matchNumber?: number }[] = [];
    let globalMatchNumber = 1;

    selectedLeagueNames.forEach(leagueName => {
      const leagueTeams = leagues[leagueName] || [];
      let sortedTeams: Team[] = [];

      // Check if we should use previous knockout winners
      const shouldUseWinners = stage && knockoutWinners[getPreviousStage(stage)];
      
      if (shouldUseWinners) {
        const previousStageWinners = getPreviousStageWinners(leagueName);
        
        if (previousStageWinners.length > 0) {
          sortedTeams = previousStageWinners;
          console.log(`Using previous ${getPreviousStage(stage)} winners for ${leagueName}:`, 
            sortedTeams.map(t => `${t.team} (seed ${t.place})`));
        } else {
          sortedTeams = [...leagueTeams].sort((a: Team, b: Team) => {
            if (a.place !== b.place) return a.place - b.place;
            return b.winPercentage - a.winPercentage;
          });
          console.log(`No previous winners found for ${leagueName}, using leaderboard`);
        }
      } else {
        sortedTeams = [...leagueTeams].sort((a: Team, b: Team) => {
          if (a.place !== b.place) return a.place - b.place;
          return b.winPercentage - a.winPercentage;
        });
        console.log(`Using leaderboard for ${leagueName} ${stage} stage`);
      }

      // IMPROVED: Handle boat sets for both league and non-league modes
      let availableBoatSets: any[] = [];
      
      if (settings.useLeagues) {
        // League mode: find specific league settings
        const leagueSettings = settings.leagues.find(l => l.name === leagueName);
        const leagueBoatSets = leagueSettings?.boatSets || [];
        availableBoatSets = leagueBoatSets.length > 0 ? leagueBoatSets : 
          settings.leagues.flatMap(league => league.boatSets);
      } else {
        // Non-league mode: use global boat sets
        availableBoatSets = settings.boatSets || [];
        console.log('Using global boat sets:', availableBoatSets);
      }

      // Fallback if no boat sets found
      if (availableBoatSets.length === 0) {
        console.warn(`No boat sets available for league ${leagueName}, creating default`);
        availableBoatSets = [{
          id: 'default-boats',
          team1Color: 'Team A Boats',
          team2Color: 'Team B Boats'
        }];
      }

      const numTeams = sortedTeams.length;
      let pairs: [number, number][] = [];

      if (stage === 'quarter' && numTeams >= 8) {
        pairs = [[0,7], [1,6], [2,5], [3,4]];
      } else if (stage === 'semi' && numTeams >= 4) {
        pairs = [[0,3], [1,2]];
      } else if (stage === 'final' && numTeams >= 2) {
        pairs = [[0,1]];
      }

      pairs.forEach(([a, b], pairIndex) => {
        if (sortedTeams[a] && sortedTeams[b]) {
          const defaultBoatSet = availableBoatSets[pairIndex % availableBoatSets.length];
          
          console.log(`Match ${globalMatchNumber}: ${sortedTeams[a].team} (seed ${sortedTeams[a].place}) vs ${sortedTeams[b].team} (seed ${sortedTeams[b].place}) - ${leagueName}`);
          
          newMatchups.push({
            teamA: sortedTeams[a].team,
            teamB: sortedTeams[b].team,
            boatSet: defaultBoatSet?.id,
            league: leagueName,
            matchNumber: globalMatchNumber
          });
          
          globalMatchNumber++;
        }
      });
    });

    setMatchups(newMatchups);
    setAllTeams(selectedLeagueNames.flatMap(name => leagues[name] || []));
  };

  // Fix the getKnockoutWinners function to properly determine match winners based on series results
  const getKnockoutWinners = (races: Race[]) => {
    const knockoutWinners: { [key: string]: { [key: number]: { winner: string; league: string } } } = {};
    
    // Group races by stage and match number
    const racesByStageAndMatch: { 
      [stage: string]: { 
        [matchNumber: number]: Race[] 
      } 
    } = {};
    
    races
      .filter(race => race.isKnockout && race.result && race.status === 'finished')
      .forEach(race => {
        const stage = race.stage || '';
        const matchNumber = race.matchNumber || 0;
        
        if (!racesByStageAndMatch[stage]) {
          racesByStageAndMatch[stage] = {};
        }
        if (!racesByStageAndMatch[stage][matchNumber]) {
          racesByStageAndMatch[stage][matchNumber] = [];
        }
        
        racesByStageAndMatch[stage][matchNumber].push(race);
      });
    
    // Process each stage and match to determine winners
    Object.entries(racesByStageAndMatch).forEach(([stage, matches]) => {
      knockoutWinners[stage] = {};
      
      Object.entries(matches).forEach(([matchNumberStr, matchRaces]) => {
        const matchNumber = parseInt(matchNumberStr);
        
        if (matchRaces.length === 0) return;
        
        // Sort races by race number to ensure proper order
        const sortedRaces = matchRaces.sort((a, b) => a.raceNumber - b.raceNumber);
        
        // Count wins for each team in this match
        const teamAWins = { count: 0, team: sortedRaces[0].teamA };
        const teamBWins = { count: 0, team: sortedRaces[0].teamB };
        
        console.log(`Analyzing Match ${matchNumber} in ${stage}:`);
        console.log(`  ${teamAWins.team} vs ${teamBWins.team}`);
        
        sortedRaces.forEach((race, raceIndex) => {
          // Calculate points for each team in this race
          const teamAPoints = race.result!.slice(0, 3).reduce((a: number, b: number) => a + b, 0);
          const teamBPoints = race.result!.slice(3).reduce((a: number, b: number) => a + b, 0);
          
          let raceWinner: string;
          if (teamAPoints < teamBPoints) {
            raceWinner = race.teamA;
            teamAWins.count++;
          } else if (teamBPoints < teamAPoints) {
            raceWinner = race.teamB;
            teamBWins.count++;
          } else {
            // Tie-breaker: first place wins
            const firstPlaceIndex = race.result!.indexOf(1);
            if (firstPlaceIndex < 3) {
              raceWinner = race.teamA;
              teamAWins.count++;
            } else {
              raceWinner = race.teamB;
              teamBWins.count++;
            }
          }
          
          console.log(`    Race ${raceIndex + 1}: ${raceWinner} wins (${teamAPoints} vs ${teamBPoints})`);
        });
        
        // Determine match winner based on series format
        const totalRaces = sortedRaces.length;
        const racesToWin = Math.ceil(totalRaces / 2); // For Best of 3: need 2, for Best of 5: need 3
        
        let matchWinner: string;
        let matchComplete = false;
        
        if (teamAWins.count >= racesToWin) {
          matchWinner = teamAWins.team;
          matchComplete = true;
        } else if (teamBWins.count >= racesToWin) {
          matchWinner = teamBWins.team;
          matchComplete = true;
        } else {
          // Match not yet complete - determine based on current leader
          // But only count as winner if all races in the series are finished
          if (teamAWins.count > teamBWins.count) {
            matchWinner = teamAWins.team;
          } else if (teamBWins.count > teamAWins.count) {
            matchWinner = teamBWins.team;
          } else {
            // Tied - use the winner of the most recent race
            const lastRace = sortedRaces[sortedRaces.length - 1];
            const lastRaceTeamAPoints = lastRace.result!.slice(0, 3).reduce((a: number, b: number) => a + b, 0);
            const lastRaceTeamBPoints = lastRace.result!.slice(3).reduce((a: number, b: number) => a + b, 0);
            
            if (lastRaceTeamAPoints < lastRaceTeamBPoints) {
              matchWinner = lastRace.teamA;
            } else if (lastRaceTeamBPoints < lastRaceTeamAPoints) {
              matchWinner = lastRace.teamB;
            } else {
              const firstPlaceIndex = lastRace.result!.indexOf(1);
              matchWinner = firstPlaceIndex < 3 ? lastRace.teamA : lastRace.teamB;
            }
          }
          
          // Only consider the match complete if we have enough races for the format
          // or if one team already has enough wins
          matchComplete = teamAWins.count >= racesToWin || teamBWins.count >= racesToWin;
        }
        
        console.log(`  Match Result: ${matchWinner} wins series ${teamAWins.count}-${teamBWins.count} (needs ${racesToWin} to win)`);
        console.log(`  Match Complete: ${matchComplete}`);
        
        // Only record the winner if the match is complete or if we have a clear series winner
        if (matchComplete || teamAWins.count >= racesToWin || teamBWins.count >= racesToWin) {
          // Determine the league of the winner
          const winnerTeam = Object.keys(leagues).find(leagueName => 
            leagues[leagueName].some(team => team.team === matchWinner)
          );
          
          const winnerLeague = winnerTeam ? winnerTeam : sortedRaces[0].league || '';
          
          knockoutWinners[stage][matchNumber] = {
            winner: matchWinner,
            league: winnerLeague
          };
          
          console.log(`  Recorded winner: ${matchWinner} from ${winnerLeague}`);
        }
      });
    });
    
    return knockoutWinners;
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
    // Remove the stage reset - keep the current stage selection
    // setStage(null); // <- Remove this line
    
    // Regenerate matchups if we have all required selections
    if (stage && selectedLeagues.length > 0) {
      generateMatchups(selectedLeagues);
    }
  };

  // Update the stage handler
  const setStageHandler = async (value: 'quarter' | 'semi' | 'final') => {
    console.log('Setting stage to:', value);
    setStage(value);

    // Generate matchups immediately if we have the required data
    if (selectedLeagues.length > 0 && bestOf) {
      generateMatchups(selectedLeagues);
    }
  };

  // Update the useEffect for stage changes to ensure matchups are generated
  useEffect(() => {
    if (stage && selectedLeagues.length > 0 && bestOf) {
      console.log('Stage, leagues, or bestOf changed. Regenerating matchups...');
      generateMatchups(selectedLeagues);
    }
  }, [stage, selectedLeagues, bestOf, knockoutWinners]); // Add knockoutWinners as dependency

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

  // Update the return JSX to include proper button handlers and disable states
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
      isOpen ? '' : 'hidden'
    }`}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Create Knockout Stage</h2>
        
        <div className="space-y-6">
          {/* Show previous knockout winners if any exist */}
          {Object.keys(knockoutWinners).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Previous Knockout Results</h3>
              {['quarter', 'semi', 'final'].map(stage => (
                <PreviousWinners key={stage} stage={stage} />
              ))}
            </div>
          )}

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

          {/* Stage Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Stage</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setStageHandler('quarter')}
                className={`px-4 py-2 rounded ${
                  stage === 'quarter' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200'
                }`}
              >
                Quarter Finals
                {knockoutWinners['quarter'] && (
                  <span className="ml-1 text-xs">✓</span>
                )}
              </button>
              <button
                onClick={() => setStageHandler('semi')}
                className={`px-4 py-2 rounded ${
                  stage === 'semi' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200'
                }`}
              >
                Semi Finals
                {knockoutWinners['semi'] && (
                  <span className="ml-1 text-xs">✓</span>
                )}
              </button>
              <button
                onClick={() => setStageHandler('final')}
                className={`px-4 py-2 rounded ${
                  stage === 'final' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200'
                }`}
              >
                Finals
                {knockoutWinners['final'] && (
                  <span className="ml-1 text-xs">✓</span>
                )}
              </button>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Match Format</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setBestOfHandler(1)}
                disabled={!stage}
                className={`px-4 py-2 rounded ${
                  bestOf === 1 
                    ? 'bg-blue-600 text-white' 
                    : !stage 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200'
                }`}
              >
                Single Race
              </button>
              <button
                onClick={() => setBestOfHandler(3)}
                disabled={!stage}
                className={`px-4 py-2 rounded ${
                  bestOf === 3 
                    ? 'bg-blue-600 text-white' 
                    : !stage 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200'
                }`}
              >
                Best of 3
              </button>
              <button
                onClick={() => setBestOfHandler(5)}
                disabled={!stage}
                className={`px-4 py-2 rounded ${
                  bestOf === 5 
                    ? 'bg-blue-600 text-white' 
                    : !stage 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200'
                }`}
              >
                Best of 5
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
                    className="bg-gray-50 p-4 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex-1 flex items-center gap-4">
                      <select
                        value={matchup.teamA}
                        onChange={(e) => handleMatchupEdit(index, 'teamA', e.target.value)}
                        className="p-2 border rounded"
                      >
                        {allTeams.map(team => (
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
                        {allTeams.map(team => (
                          <option key={team.team} value={team.team}>
                            {team.team} ({team.league} - Place: {team.place})
                          </option>
                        ))}
                      </select>

                      <select
                        value={matchup.boatSet || ''}
                        onChange={(e) => handleMatchupEdit(index, 'boatSet', e.target.value)}
                        className="p-2 border rounded"
                      >
                        <option value="">Select Boat Set</option>
                        {boatSets.map(set => (
                          <option key={set.id} value={set.id}>
                            {set.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-sm text-gray-600 ml-4">
                      Match {matchup.matchNumber}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                {stage && selectedLeagues.length > 0 
                  ? 'Select a match format to generate matchups'
                  : 'Select leagues and stage to see matchups'
                }
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!bestOf || !stage || selectedLeagues.length === 0 || matchups.length === 0}
              className={`px-4 py-2 rounded ${
                bestOf && stage && selectedLeagues.length > 0 && matchups.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Create Knockout Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}