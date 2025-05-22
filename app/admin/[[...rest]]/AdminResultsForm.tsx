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

export default function AdminResultsForm({ races: initialRaces }: { races: Race[] }) {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [formData, setFormData] = useState<{ [key: number]: number[] }>({});
  const [teamInput, setTeamInput] = useState<string>('');
  const [showTeamInput, setShowTeamInput] = useState(false);
  const [boatSets, setBoatSets] = useState<BoatSet[]>([]);

  useEffect(() => {
    // Load initial form data
    const initialData: { [key: number]: number[] } = {};
    initialRaces.forEach((race) => {
      initialData[race.raceNumber] = race.result || Array(6).fill(0);
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
        const updatedData: { [key: number]: number[] } = {};
        freshRaces.forEach((race: Race) => {
          updatedData[race.raceNumber] = race.result || Array(6).fill(0);
        });
        setFormData(updatedData);
      } else {
        alert('Failed to fetch updated races');
      }
    } catch (error) {
      alert('Error fetching races: ' + (error as Error).message);
    }
  };

  const determineWinner = (race: Race, result: number[]): string => {
    const teamABoats = result.slice(0, 3);
    const teamBBoats = result.slice(3, 6);
    const sumA = teamABoats.reduce((a, b) => a + b, 0);
    const sumB = teamBBoats.reduce((a, b) => a + b, 0);

    if (sumA < sumB) return race.teamA;
    if (sumB < sumA) return race.teamB;

    const firstPlaceIndex = result.findIndex((pos) => pos === 1);
    return firstPlaceIndex < 3 ? race.teamB : race.teamA; // 1st was on teamA, they lose tie
  };

  const handleChange = (raceNumber: number, index: number, value: number) => {
    const current = formData[raceNumber] || Array(6).fill(0);
    const updated = [...current];
    updated[index] = value;
    setFormData({ ...formData, [raceNumber]: updated });
  };

  const handleSubmit = async (raceNumber: number) => {
    const result = formData[raceNumber];
    if (
      result &&
      result.length === 6 &&
      result.every((pos) => typeof pos === 'number' && pos >= 1)
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
    setFormData({ ...formData, [raceNumber]: Array(6).fill(0) });

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
    const existingTeams = Array.from(
      new Set(races.flatMap((race) => [race.teamA, race.teamB]))
    ).join(', ');
    setTeamInput(existingTeams);
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

  const handleGenerateSchedule = async () => {
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 mb-6">
        {showTeamInput ? (
          <div className="bg-white p-4 border rounded-md">
            <label className="block text-sm mb-2">Enter team names (separated by commas):</label>
            <textarea
              value={teamInput}
              onChange={(e) => setTeamInput(e.target.value)}
              className="w-full border rounded px-2 py-1 mb-4 h-24"
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
        ) : (
          <button
            onClick={handleShowTeamInput}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 self-end"
          >
            Generate New Schedule
          </button>
        )}
      </div>

      {races.map((race) => {
        const result = formData[race.raceNumber];
        const winner = result && result.every((n) => n >= 1)
          ? determineWinner(race, result)
          : null;

        return (
          <div key={race.raceNumber} className="p-4 bg-white border rounded-md">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                Race {race.raceNumber}: {race.teamA} vs {race.teamB}
              </h2>
              <div className="text-sm text-gray-600 mt-1">
                Boats: {race.boats?.[`set-1-team1`]} vs {race.boats?.[`set-1-team2`]}
              </div>
            </div>
            
            {winner && (
              <div className="mb-4 text-green-700 font-semibold">
                Winner: {winner}
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 mb-4">
              {/* Team A Boats */}
              <div className="space-y-2">
                <h3 className="font-medium text-blue-600">{race.teamA}</h3>
                <div className="space-y-2 bg-blue-50 p-3 rounded-md">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <label className="text-sm w-16">Boat {i + 1}</label>
                      <input
                        type="number"
                        min={0}
                        value={formData[race.raceNumber]?.[i] ?? ''}
                        onChange={(e) =>
                          handleChange(race.raceNumber, i, Number(e.target.value))
                        }
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Team B Boats */}
              <div className="space-y-2">
                <h3 className="font-medium text-red-600">{race.teamB}</h3>
                <div className="space-y-2 bg-red-50 p-3 rounded-md">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <label className="text-sm w-16">Boat {i + 1}</label>
                      <input
                        type="number"
                        min={0}
                        value={formData[race.raceNumber]?.[i + 3] ?? ''}
                        onChange={(e) =>
                          handleChange(race.raceNumber, i + 3, Number(e.target.value))
                        }
                        className="w-full border rounded px-2 py-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleSubmit(race.raceNumber)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save Result
              </button>
              <button
                onClick={() => handleClear(race.raceNumber)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
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
