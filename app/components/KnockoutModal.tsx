'use client';

import { useState, useEffect, useMemo } from 'react';

// Add racing format type
type RacingFormat = '2v2' | '3v3' | '4v4';

// Add helper function to get boats per team
const getBoatsPerTeam = (format: RacingFormat): number => {
  switch (format) {
    case '2v2': return 2;
    case '3v3': return 3;
    case '4v4': return 4;
    default: return 3;
  }
};

// Update the Race type definition to include racingFormat
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
  league?: string;
  matchNumber?: number;
  racingFormat?: RacingFormat; // Add this line
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

// Update the props interface to include racingFormat
type KnockoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  leagues: { [key: string]: Team[] };
  onConfirm: (config: KnockoutConfig) => void;
  settings: {
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
    boatSets: Array<{
      id: string;
      team1Color: string;
      team2Color: string;
    }>;
    racingFormat: '2v2' | '3v3' | '4v4'; // Add this line
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
    // Add safety check for undefined settings
    if (!settings) {
      return [];
    }
    
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
      // For non-leagues mode, use global boat sets
      return (settings.boatSets || []).map(set => ({
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

  // Update the useEffect to ensure knockout winners are recalculated when races change
  useEffect(() => {
    if (isOpen && races.length > 0) {
      console.log('Races updated, recalculating knockout winners...');
      const winners = getKnockoutWinners(races);
      setKnockoutWinners(winners);
      console.log('Updated knockout winners:', winners);
      
      // Regenerate matchups if we have all the required data
      if (stage && selectedLeagues.length > 0 && bestOf) {
        console.log('Regenerating matchups due to race update...');
        generateMatchups(selectedLeagues);
      }
    }
  }, [races, isOpen]); // Add races as dependency

  // Enhanced PreviousWinners component with better styling and more information
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
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <h4 className="font-medium text-green-800 mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {getStageDisplayName(stage)} Winners:
        </h4>
        <div className="space-y-3">
          {Object.entries(winnersByLeague).map(([league, winners]) => (
            <div key={league}>
              <h5 className="text-sm font-medium text-green-700 mb-2">{league} League:</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-4">
                {winners.map(({ matchNumber, winner }) => (
                  <div 
                    key={matchNumber}
                    className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm flex items-center justify-between"
                  >
                    <span className="font-medium">{winner}</span>
                    <span className="text-xs bg-green-200 px-2 py-1 rounded">Match {matchNumber}</span>
                  </div>
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

  // Update the getPreviousStageWinners function to fix semi-final bracket progression
  const getPreviousStageWinners = (leagueName: string): Team[] => {
    const previousStage = getPreviousStage(stage || '');
    if (!previousStage || !knockoutWinners[previousStage]) {
      return [];
    }

    const stageWinners = knockoutWinners[previousStage];
    
    // Filter winners by league and sort by match number to maintain bracket order
    const leagueWinners = Object.entries(stageWinners)
      .filter(([_, winnerInfo]) => winnerInfo.league === leagueName)
      .sort(([a], [b]) => parseInt(a) - parseInt(b)); // Sort by match number to maintain bracket progression
    
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

    // FIXED: Proper bracket progression for semi-finals
    // Quarter Finals matches: 1(1v8), 2(2v7), 3(3v6), 4(4v5)
    // Semi Finals should be: Semi1(Winner1 vs Winner4), Semi2(Winner2 vs Winner3)

    if (previousStage === 'quarter' && stage === 'semi') {
      if (winnerTeams.length === 4) {
        console.log('Reordering quarter final winners for semi-finals:');
        console.log('Quarter winners by match:', winnerTeams.map((t, i) => `Match ${i+1}: ${t.team}`));
        
        // Reorder: [Winner1, Winner4, Winner2, Winner3] for proper semi-final bracket
        const reorderedWinners = [
          winnerTeams[0], // Match 1 winner (will face Match 4 winner)
          winnerTeams[3], // Match 4 winner (will face Match 1 winner)
          winnerTeams[1], // Match 2 winner (will face Match 3 winner)
          winnerTeams[2]  // Match 3 winner (will face Match 2 winner)
        ];
        
        console.log('Semi-final matchups will be:');
        console.log(`Semi 1: ${reorderedWinners[0].team} vs ${reorderedWinners[1].team}`);
        console.log(`Semi 2: ${reorderedWinners[2].team} vs ${reorderedWinners[3].team}`);
        
        return reorderedWinners;
      }
    } else if (previousStage === 'semi' && stage === 'final') {
      // For finals, winners are already in the correct order (Semi1 winner, Semi2 winner)
      return winnerTeams;
    }

    // For quarter finals or any other case, return teams in match order
    return winnerTeams;
  };

  // Enhanced getKnockoutWinners function to better handle race results
  const getKnockoutWinners = (races: Race[]) => {
    const knockoutWinners: { [key: string]: { [key: number]: { winner: string; league: string } } } = {};
    
    console.log('=== ANALYZING KNOCKOUT RACES ===');
    console.log('Total races:', races.length);
    
    // Filter knockout races with results
    const knockoutRaces = races.filter(race => {
      const hasResult = race.isKnockout && race.result && Array.isArray(race.result) && race.result.length > 0;
      if (hasResult) {
        console.log(`Found knockout race ${race.raceNumber}: ${race.teamA} vs ${race.teamB} (${race.stage} #${race.matchNumber})`);
      }
      return hasResult;
    });
    
    console.log('Knockout races with results:', knockoutRaces.length);
    
    // Group races by stage and match number
    const racesByStageAndMatch: { 
      [stage: string]: { 
        [matchNumber: number]: Race[] 
      } 
    } = {};
    
    knockoutRaces.forEach(race => {
      const stage = race.stage || 'unknown';
      const matchNumber = race.matchNumber || 0;
      
      if (!racesByStageAndMatch[stage]) {
        racesByStageAndMatch[stage] = {};
      }
      if (!racesByStageAndMatch[stage][matchNumber]) {
        racesByStageAndMatch[stage][matchNumber] = [];
      }
      
      racesByStageAndMatch[stage][matchNumber].push(race);
    });
    
    console.log('Races grouped by stage and match:', racesByStageAndMatch);
    
    // Process each stage and match to determine winners
    Object.entries(racesByStageAndMatch).forEach(([stage, matches]) => {
      console.log(`\n--- Processing ${stage} stage ---`);
      knockoutWinners[stage] = {};
      
      Object.entries(matches).forEach(([matchNumberStr, matchRaces]) => {
        const matchNumber = parseInt(matchNumberStr);
        
        if (matchRaces.length === 0) return;
        
        // Sort races by race number to ensure proper order
        const sortedRaces = matchRaces.sort((a, b) => a.raceNumber - b.raceNumber);
        
        // Count wins for each team in this match
        const teamAWins = { count: 0, team: sortedRaces[0].teamA };
        const teamBWins = { count: 0, team: sortedRaces[0].teamB };
        
        console.log(`\nMatch ${matchNumber}: ${teamAWins.team} vs ${teamBWins.team}`);
        console.log(`Races in this match: ${sortedRaces.map(r => r.raceNumber).join(', ')}`);
        
        sortedRaces.forEach((race, raceIndex) => {
          // Get the racing format for this specific race or use settings default with safety check
          const raceFormat = race.racingFormat || settings?.racingFormat || '3v3';
          const boatsPerTeam = getBoatsPerTeam(raceFormat);
          
          console.log(`  Race ${race.raceNumber} (${raceFormat} format):`, race.result);
          
          // Calculate points for each team in this race using dynamic format
          const teamAPoints = race.result!.slice(0, boatsPerTeam).reduce((a: number, b: number) => a + b, 0);
          const teamBPoints = race.result!.slice(boatsPerTeam, boatsPerTeam * 2).reduce((a: number, b: number) => a + b, 0);
          
          let raceWinner: string;
          if (teamAPoints < teamBPoints) {
            raceWinner = race.teamA;
            teamAWins.count++;
          } else if (teamBPoints < teamAPoints) {
            raceWinner = race.teamB;
            teamBWins.count++;
          } else {
            // Tie-breaker: team WITHOUT first place wins (team WITH first place loses)
            const firstPlaceIndex = race.result!.indexOf(1);
            if (firstPlaceIndex < boatsPerTeam) {
              // Team A has first place, so Team B wins
              raceWinner = race.teamB;
              teamBWins.count++;
            } else {
              // Team B has first place, so Team A wins
              raceWinner = race.teamA;
              teamAWins.count++;
            }
          }
          
          console.log(`    ${raceWinner} wins (${teamAPoints} vs ${teamBPoints})`);
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
          // Match not yet complete - determine current leader
          if (teamAWins.count > teamBWins.count) {
            matchWinner = teamAWins.team;
          } else if (teamBWins.count > teamAWins.count) {
            matchWinner = teamBWins.team;
          } else {
            // Tied - use the winner of the most recent race
            const lastRace = sortedRaces[sortedRaces.length - 1];
            const lastRaceFormat = lastRace.racingFormat || settings?.racingFormat || '3v3';
            const lastRaceBoatsPerTeam = getBoatsPerTeam(lastRaceFormat);
            const lastRaceTeamAPoints = lastRace.result!.slice(0, lastRaceBoatsPerTeam).reduce((a: number, b: number) => a + b, 0);
            const lastRaceTeamBPoints = lastRace.result!.slice(lastRaceBoatsPerTeam, lastRaceBoatsPerTeam * 2).reduce((a: number, b: number) => a + b, 0);
            
            if (lastRaceTeamAPoints < lastRaceTeamBPoints) {
              matchWinner = lastRace.teamA;
            } else if (lastRaceTeamBPoints < lastRaceTeamAPoints) {
              matchWinner = lastRace.teamB;
            } else {
              // Tie-breaker - team WITHOUT 1st place wins
              const firstPlaceIndex = lastRace.result!.indexOf(1);
              matchWinner = firstPlaceIndex < lastRaceBoatsPerTeam ? lastRace.teamB : lastRace.teamA;
            }
          }
        }
        
        console.log(`  Match Result: ${matchWinner} leads/wins series ${teamAWins.count}-${teamBWins.count} (needs ${racesToWin} to win)`);
        console.log(`  Match Complete: ${matchComplete}`);
        
        // Record the winner (even if match is not complete, we track the current leader)
        const winnerTeam = Object.keys(leagues).find(leagueName => 
          leagues[leagueName].some(team => team.team === matchWinner)
        );
        
        const winnerLeague = winnerTeam ? winnerTeam : sortedRaces[0].league || '';
        
        knockoutWinners[stage][matchNumber] = {
          winner: matchWinner,
          league: winnerLeague
        };
        
        console.log(`  Recorded winner: ${matchWinner} from ${winnerLeague} league`);
      });
    });
    
    console.log('\n=== FINAL KNOCKOUT WINNERS ===');
    Object.entries(knockoutWinners).forEach(([stage, matches]) => {
      console.log(`${stage}:`, Object.entries(matches).map(([match, info]) => `Match ${match}: ${info.winner}`));
    });
    
    return knockoutWinners;
  };

  // Enhanced matchup generation with better winner progression
  const generateMatchups = (selectedLeagueNames: string[]) => {
    console.log('=== GENERATING MATCHUPS ===');
    console.log('Selected leagues:', selectedLeagueNames);
    console.log('Current stage:', stage);
    console.log('Available knockout winners:', knockoutWinners);
    console.log('Settings mode:', settings?.useLeagues ? 'leagues' : 'non-leagues');
    
    const newMatchups: { teamA: string; teamB: string; boatSet?: string; league: string; matchNumber?: number }[] = [];
    let globalMatchNumber = 1;

    selectedLeagueNames.forEach(leagueName => {
      console.log(`\n--- Processing league: ${leagueName} ---`);
      
      const leagueTeams = leagues[leagueName] || [];
      console.log(`Available teams in ${leagueName}:`, leagueTeams.map(t => `${t.team} (${t.place})`));
      
      let sortedTeams: Team[] = [];

      // Check if we should use previous knockout winners
      const previousStage = getPreviousStage(stage || '');
      const shouldUseWinners = stage && previousStage && knockoutWinners[previousStage];
      
      console.log(`Previous stage: ${previousStage}, Should use winners: ${shouldUseWinners}`);
      
      if (shouldUseWinners) {
        const previousStageWinners = getPreviousStageWinners(leagueName);
        
        if (previousStageWinners.length > 0) {
          sortedTeams = previousStageWinners;
          console.log(`✓ Using ${previousStageWinners.length} previous ${previousStage} winners for ${leagueName}:`, 
            sortedTeams.map(t => `${t.team} (seed ${t.place})`));
        } else {
          // Fall back to leaderboard if no winners found
          sortedTeams = [...leagueTeams].sort((a: Team, b: Team) => {
            if (a.place !== b.place) return a.place - b.place;
            return b.winPercentage - a.winPercentage;
          });
          console.log(`⚠ No previous winners found for ${leagueName}, using leaderboard:`,
            sortedTeams.map(t => `${t.team} (${t.place})`));
        }
      } else {
        // First stage or no previous winners - use leaderboard
        sortedTeams = [...leagueTeams].sort((a: Team, b: Team) => {
          if (a.place !== b.place) return a.place - b.place;
          return b.winPercentage - a.winPercentage;
        });
        console.log(`Using leaderboard for ${leagueName} ${stage} stage:`,
          sortedTeams.map(t => `${t.team} (${t.place})`));
      }

      // Handle boat sets for both league and non-league modes with safety checks
      let availableBoatSets: any[] = [];
      
      if (settings?.useLeagues) {
        // League mode: find specific league settings
        const leagueSettings = settings.leagues?.find(l => l.name === leagueName);
        const leagueBoatSets = leagueSettings?.boatSets || [];
        availableBoatSets = leagueBoatSets.length > 0 ? leagueBoatSets : 
          (settings.leagues?.flatMap(league => league.boatSets) || []);
      } else {
        // Non-league mode: use global boat sets
        availableBoatSets = settings?.boatSets || [];
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
      let requiredTeams = 0;

      // Determine required matchups based on stage with proper bracket seeding
      if (stage === 'quarter') {
        // Quarter Finals: 1vs8, 2vs7, 3vs6, 4vs5
        pairs = [[0,7], [1,6], [2,5], [3,4]];
        requiredTeams = 8;
        console.log('Quarter Finals bracket:');
        console.log('  Match 1: 1st vs 8th');
        console.log('  Match 2: 2nd vs 7th');
        console.log('  Match 3: 3rd vs 6th');
        console.log('  Match 4: 4th vs 5th');
      } else if (stage === 'semi') {
        // FIXED: Semi Finals with proper bracket progression
        // The sortedTeams array from getPreviousStageWinners is already reordered as:
        // [Winner1, Winner4, Winner2, Winner3]
        // So pairs [0,1] and [2,3] create the correct matchups
        pairs = [[0,1], [2,3]];
        requiredTeams = 4;
        console.log('Semi Finals bracket (after quarter finals):');
        console.log('  Semi 1: Winner of Match 1 vs Winner of Match 4');
        console.log('  Semi 2: Winner of Match 2 vs Winner of Match 3');
      } else if (stage === 'final') {
        // Finals: Winner of Semi 1 vs Winner of Semi 2
        pairs = [[0,1]];
        requiredTeams = 2;
        console.log('Finals bracket:');
        console.log('  Final: Winner of Semi 1 vs Winner of Semi 2');
      }

      console.log(`Stage ${stage} requires ${requiredTeams} teams, have ${numTeams} teams`);
      console.log(`Will create ${pairs.length} matchups with pairs:`, pairs);

      // Create matchups for all required pairs
      pairs.forEach(([a, b], pairIndex) => {
        const defaultBoatSet = availableBoatSets[pairIndex % availableBoatSets.length];
        
        // Use available teams or empty strings if insufficient teams
        const teamA = sortedTeams[a]?.team || '';
        const teamB = sortedTeams[b]?.team || '';
        
        if (teamA && teamB) {
          let matchDescription = '';
          if (stage === 'quarter') {
            matchDescription = `${sortedTeams[a]?.place || '?'} vs ${sortedTeams[b]?.place || '?'}`;
          } else if (stage === 'semi') {
            // For semis, show which quarter final winners are matched
            if (pairIndex === 0) {
              matchDescription = 'QF Winner 1 vs QF Winner 4';
            } else {
              matchDescription = 'QF Winner 2 vs QF Winner 3';
            }
          } else if (stage === 'final') {
            matchDescription = 'Semi Winner 1 vs Semi Winner 2';
          }
          
          console.log(`✓ Match ${globalMatchNumber}: ${teamA} vs ${teamB} (${matchDescription}) - ${leagueName}`);
        } else {
          console.log(`⚠ Match ${globalMatchNumber}: Empty matchup created for ${leagueName} (insufficient teams: ${numTeams}/${requiredTeams})`);
        }
        
        newMatchups.push({
          teamA: teamA,
          teamB: teamB,
          boatSet: defaultBoatSet?.id,
          league: leagueName,
          matchNumber: globalMatchNumber
        });
        
        globalMatchNumber++;
      });

      // Log summary for this league
      if (numTeams < requiredTeams) {
        console.warn(`League ${leagueName}: Only ${numTeams} teams available for ${stage} stage (requires ${requiredTeams}). Created ${pairs.length} matchups with empty slots.`);
      }
    });

    console.log('\n=== FINAL MATCHUPS ===');
    newMatchups.forEach((matchup, i) => {
      console.log(`Match ${i + 1}: ${matchup.teamA} vs ${matchup.teamB} (${matchup.league})`);
    });

    setMatchups(newMatchups);
    setAllTeams(selectedLeagueNames.flatMap(name => leagues[name] || []));
  };

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

    // FIXED: Check for incomplete matchups
    const incompleteMatchups = matchups.filter(m => !m.teamA || !m.teamB);
    if (incompleteMatchups.length > 0) {
      alert(`Please select teams for all matchups. ${incompleteMatchups.length} matchup(s) are incomplete.`);
      return;
    }

    // Check for duplicate teams
    const allSelectedTeams = matchups.flatMap(m => [m.teamA, m.teamB]);
    const uniqueTeams = new Set(allSelectedTeams);
    if (allSelectedTeams.length !== uniqueTeams.size) {
      alert('Each team can only participate in one match per stage. Please check for duplicate team selections.');
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
    
    // Regenerate matchups if we have the required data
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

  // Add a function to handle match deletion
  const handleMatchupDelete = (index: number) => {
    const newMatchups = matchups.filter((_, i) => i !== index);
    
    // Update match numbers to maintain sequential numbering
    const updatedMatchups = newMatchups.map((matchup, i) => ({
      ...matchup,
      matchNumber: i + 1
    }));
    
    setMatchups(updatedMatchups);
    console.log('Deleted matchup at index:', index);
    console.log('Updated matchups:', updatedMatchups);
  };

  // Add a function to add a new empty matchup
  const handleAddMatchup = () => {
    const newMatchNumber = matchups.length + 1;
    const defaultBoatSet = boatSets[0]?.id || '';
    const defaultLeague = selectedLeagues[0] || '';
    
    const newMatchup = {
      teamA: '',
      teamB: '',
      boatSet: defaultBoatSet,
      league: defaultLeague,
      matchNumber: newMatchNumber
    };
    
    setMatchups([...matchups, newMatchup]);
    console.log('Added new matchup:', newMatchup);
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

          {/* Current Stage Status */}
          {Object.keys(knockoutWinners).length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-3">Stage Availability:</h4>
              <div className="space-y-2">
                {['quarter', 'semi', 'final'].map(stageKey => {
                  const stageWinners = knockoutWinners[stageKey];
                  const winnerCount = stageWinners ? Object.keys(stageWinners).length : 0;
                  const isAvailable = stageKey === 'quarter' || winnerCount > 0;
                  
                  let requiredWinners = 0;
                  if (stageKey === 'semi') requiredWinners = 4; // Need 4 quarter winners for semi
                  if (stageKey === 'final') requiredWinners = 2; // Need 2 semi winners for final
                  
                  return (
                    <div key={stageKey} className={`flex items-center justify-between p-2 rounded ${
                      isAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <span className="font-medium">
                        {stageKey === 'quarter' ? 'Quarter Finals' : 
                         stageKey === 'semi' ? 'Semi Finals' : 'Finals'}
                      </span>
                      <div className="text-sm">
                        {stageKey === 'quarter' ? 
                          'Always Available' :
                          `${winnerCount}/${requiredWinners} winners available`
                        }
                        {isAvailable && <span className="ml-2">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                {matchups.map((matchup, index) => {
                  // Check if this matchup has empty teams
                  const hasEmptyTeams = !matchup.teamA || !matchup.teamB;
                  
                  return (
                    <div
                      key={`matchup-${index}`}
                      className={`p-4 rounded-lg flex items-center justify-between ${
                        hasEmptyTeams 
                          ? 'bg-yellow-50 border border-yellow-200' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 flex items-center gap-4">
                        <select
                          value={matchup.teamA}
                          onChange={(e) => handleMatchupEdit(index, 'teamA', e.target.value)}
                          className={`p-2 border rounded ${
                            !matchup.teamA ? 'border-yellow-400 bg-yellow-50' : ''
                          }`}
                        >
                          <option value="">Select Team A</option>
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
                          className={`p-2 border rounded ${
                            !matchup.teamB ? 'border-yellow-400 bg-yellow-50' : ''
                          }`}
                        >
                          <option value="">Select Team B</option>
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

                      <div className="text-sm text-gray-600 ml-4 flex flex-col items-center">
                        <span>Match {matchup.matchNumber}</span>
                        {hasEmptyTeams && (
                          <span className="text-xs text-yellow-600 mt-1">
                            Manual Selection Required
                          </span>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleMatchupDelete(index)}
                        className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete this matchup"
                      >
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M6 18L18 6M6 6l12 12" 
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                
                {/* Add Matchup Button */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleAddMatchup}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 4v16m8-8H4" 
                      />
                    </svg>
                    Add Matchup
                  </button>
                </div>
                
                {/* Show warning if any matchups are incomplete */}
                {matchups.some(m => !m.teamA || !m.teamB) && (
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mt-4">
                    <div className="flex items-center">
                      <div className="text-yellow-600 mr-2">⚠️</div>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Incomplete Matchups Detected
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Some matchups require manual team selection. Please select teams for all highlighted matchups before creating the knockout schedule.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show match count summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-800 font-medium">
                      Total Matchups: {matchups.length}
                    </span>
                    <span className="text-blue-700">
                      Races to be created: {matchups.length * (bestOf || 1)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  {stage && selectedLeagues.length > 0 
                    ? 'Select a match format to generate matchups'
                    : 'Select leagues and stage to see matchups'
                  }
                </p>
                {stage && selectedLeagues.length > 0 && (
                  <button
                    onClick={handleAddMatchup}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 4v16m8-8H4" 
                      />
                    </svg>
                    Add First Matchup
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Create Knockouts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}