'use client';

import { useEffect, useState } from 'react';

type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  result?: number[] | null;
  winner?: string | null;
  boats?: {
    [key: string]: string;  // Format: "set-1-team1": "blue", "set-1-team2": "red"
  };
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

export default function AdminResultsForm({ races: initialRaces }: { races: Race[] }) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [formData, setFormData] = useState<{ [key: number]: (number | '')[] }>({});
  const [teamInput, setTeamInput] = useState<string>('');
  const [showTeamInput, setShowTeamInput] = useState(false);
  const [boatSets, setBoatSets] = useState<BoatSet[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [useLeagues, setUseLeagues] = useState(false);

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
        setRaces(freshRaces);
        const updatedData: { [key: number]: (number | '')[] } = {};
        freshRaces.forEach((race: Race) => {
          updatedData[race.raceNumber] = race.result || Array(6).fill('');
        });
        setFormData(updatedData);
      } else {
        alert('Failed to fetch updated races');
      }
    } catch (error) {
      alert('Error fetching races: ' + (error as Error).message);
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

  const handleChange = (raceNumber: number, index: number, value: number) => {
    const current = formData[raceNumber] || Array(6).fill('');  // Changed from fill(0) to fill('')
    const updated = [...current];
    updated[index] = value || '';  // Use empty string if value is 0 or empty
    setFormData({ ...formData, [raceNumber]: updated });
  };

  const handleSubmit = async (raceNumber: number) => {
    const result = formData[raceNumber];
    if (
      result &&
      result.length === 6 &&
      result.every((pos): pos is number => 
        typeof pos === 'number' && pos >= 1
      )
    ) {
      const race = races.find((r) => r.raceNumber === raceNumber);
      if (!race) return alert('Race not found');

      const winner = determineWinner(race, result);

      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raceNumber, result }),
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

  const handleShowTeamInput = () => {
    // Get existing teams
    const existingTeams = Array.from(
      new Set(races.flatMap((race) => [race.teamA, race.teamB]))
    ).join(', ');
    setTeamInput(existingTeams);

    // Get all unique boat sets from races
    const uniqueBoatSets = new Map<string, BoatSet>();
    races.forEach((race, index) => {
      if (race.boats?.teamA && race.boats?.teamB) {
        const boatKey = `${race.boats.teamA}-${race.boats.teamB}`;
        if (!uniqueBoatSets.has(boatKey)) {
          uniqueBoatSets.set(boatKey, {
            id: `set-${uniqueBoatSets.size + 1}`,
            team1Color: race.boats.teamA,
            team2Color: race.boats.teamB
          });
        }
      }
    });

    // Convert Map to array and set boat sets
    const loadedBoatSets = Array.from(uniqueBoatSets.values());
    setBoatSets(loadedBoatSets.length > 0 ? loadedBoatSets : [{
      id: 'set-1',
      team1Color: '',
      team2Color: ''
    }]);

    setShowTeamInput(true);
  };

  const handleAddBoatSet = () => {
    setBoatSets([...boatSets, { id: `set-${boatSets.length + 1}`, team1Color: '', team2Color: '' }]);
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

  const handleAddLeague = () => {
    setLeagues([
      ...leagues,
      {
        id: `league-${leagues.length + 1}`,
        name: `League ${leagues.length + 1}`,
        teams: [],
        boatSets: [{
          id: `set-1`,
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

  const handleAddBoatSetToLeague = (leagueIndex: number) => {
    const newLeagues = [...leagues];
    const league = newLeagues[leagueIndex];
    league.boatSets.push({
      id: `set-${league.boatSets.length + 1}`,
      team1Color: '',
      team2Color: ''
    });
    setLeagues(newLeagues);
  };

  const handleGenerateSchedule = async () => {
    if (useLeagues) {
      // Validate leagues
      if (leagues.length === 0) {
        alert('Please add at least one league');
        return;
      }

      for (const league of leagues) {
        if (league.teams.length < 2) {
          alert(`${league.name} needs at least 2 teams`);
          return;
        }
        if (league.boatSets.length === 0) {
          alert(`${league.name} needs at least one boat set`);
          return;
        }
      }

      // Generate schedule with leagues
      const scheduleRes = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagues }),
      });

      const scheduleData = await scheduleRes.json();
      if (!scheduleRes.ok) {
        alert(`Error generating schedule: ${scheduleData.error || 'Unknown error'}`);
        return;
      }

      const leaderboardRes = await fetch('/api/results/reset', {
        method: 'POST',
      });

      if (!leaderboardRes.ok) {
        alert('Warning: Failed to reset leaderboard');
      }

      alert('Schedule generated and leaderboard reset successfully');
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

      const scheduleRes = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teams,
          boatSets: boatSets.map((set) => ({
            ...set,
            id: set.id.replace('set-', '')
          })),
        }),
      });

      const scheduleData = await scheduleRes.json();
      if (!scheduleRes.ok) {
        alert(`Error generating schedule: ${scheduleData.error || 'Unknown error'}`);
        return;
      }

      const leaderboardRes = await fetch('/api/results/reset', {
        method: 'POST',
      });

      if (!leaderboardRes.ok) {
        alert('Warning: Failed to reset leaderboard');
      }

      alert('Schedule generated and leaderboard reset successfully');
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

  return (
    <div className="space-y-6">
      {/* Add Generate Schedule button at the top */}
      {!showTeamInput && (
        <div className="flex justify-end">
          <button
            onClick={handleShowTeamInput}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Generate New Schedule
          </button>
        </div>
      )}

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
                      <div key={set.id} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={set.team1Color}
                          onChange={(e) => {
                            const newLeagues = [...leagues];
                            newLeagues[leagueIndex].boatSets[setIndex].team1Color = e.target.value;
                            setLeagues(newLeagues);
                          }}
                          className="border rounded px-2 py-1"
                          placeholder="Team 1 Color"
                        />
                        <span>vs</span>
                        <input
                          type="text"
                          value={set.team2Color}
                          onChange={(e) => {
                            const newLeagues = [...leagues];
                            newLeagues[leagueIndex].boatSets[setIndex].team2Color = e.target.value;
                            setLeagues(newLeagues);
                          }}
                          className="border rounded px-2 py-1"
                          placeholder="Team 2 Color"
                        />
                        {/* Add remove button */}
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
                    <div key={set.id} className="flex gap-2 mb-2 items-center">
                      <input
                        type="text"
                        value={set.team1Color}
                        onChange={(e) => handleBoatSetChange(index, 'team1Color', e.target.value)}
                        placeholder="Team 1 Color"
                        className="border rounded px-2 py-1"
                      />
                      <span>vs</span>
                      <input
                        type="text"
                        value={set.team2Color}
                        onChange={(e) => handleBoatSetChange(index, 'team2Color', e.target.value)}
                        placeholder="Team 2 Color"
                        className="border rounded px-2 py-1"
                      />
                      <button
                        onClick={() => handleRemoveBoatSet(index)}
                        className="text-red-600 hover:text-red-800 px-2"
                      >
                        ×
                      </button>
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
      
      {races.map((race) => {
        const result = formData[race.raceNumber];
        const teamAScore = getTeamScore(result, 0);
        const teamBScore = getTeamScore(result, 3);
        const isTeamAWinning = teamAScore < teamBScore;
        const isTeamBWinning = teamBScore < teamAScore;
        const winner = result && result.every((n) => 
          typeof n === 'number' && n >= 1
        ) ? determineWinner(race, result) : null;

        return (
          <div key={race.raceNumber} className="p-3 bg-white border rounded-md">
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
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2 mb-2 last:mb-0">
                        <div className="flex justify-between text-xs">
                          <label>Boat {i + 1}</label>
                          <span className="font-medium">
                            {formData[race.raceNumber]?.[i] || '-'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <button
                              key={num}
                              onClick={() => handleChange(race.raceNumber, i, num)}
                              className={`flex-1 h-8 text-sm rounded border ${
                                formData[race.raceNumber]?.[i] === num
                                  ? 'bg-blue-600 border-blue-700 text-white' 
                                  : 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50'
                              }`}
                              style={{
                                WebkitTapHighlightColor: 'transparent'
                              }}
                            >
                              {num}
                            </button>
                          ))}
                          <input
                            type="number"
                            min={1}
                            value={formData[race.raceNumber]?.[i] || ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value)) {
                                handleChange(race.raceNumber, i, value);
                              }
                            }}
                            className="w-14 h-8 text-sm border rounded text-center"
                            placeholder="..."
                          />
                        </div>
                      </div>
                    ))}
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
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2 mb-2 last:mb-0">
                        <div className="flex justify-between text-xs">
                          <label>Boat {i + 1}</label>
                          <span className="font-medium">
                            {formData[race.raceNumber]?.[i + 3] || '-'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <button
                              key={num}
                              onClick={() => handleChange(race.raceNumber, i + 3, num)}
                              className={`flex-1 h-8 text-sm rounded border ${
                                formData[race.raceNumber]?.[i + 3] === num
                                  ? 'bg-blue-600 border-blue-700 text-white' 
                                  : 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50'
                              }`}
                              style={{
                                WebkitTapHighlightColor: 'transparent'
                              }}
                            >
                              {num}
                            </button>
                          ))}
                          <input
                            type="number"
                            min={1}
                            value={formData[race.raceNumber]?.[i + 3] || ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value)) {
                                handleChange(race.raceNumber, i + 3, value);
                              }
                            }}
                            className="w-14 h-8 text-sm border rounded text-center"
                            placeholder="..."
                          />
                        </div>
                      </div>
                    ))}
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
        );
      })}
    </div>
  );
}