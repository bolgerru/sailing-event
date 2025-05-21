'use client';

import { useEffect, useState } from 'react';

type Race = {
  raceNumber: number;
  teamA: string;
  teamB: string;
  result?: number[] | null;
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
  const [showBoatInput, setShowBoatInput] = useState(false);

  // Initialize formData based on races
  useEffect(() => {
    const initialData: { [key: number]: number[] } = {};
    races.forEach((race) => {
      initialData[race.raceNumber] = race.result || Array(6).fill(0);
    });
    setFormData(initialData);
  }, [races]);

  // Fetch latest races and update state and formData
  const fetchRaces = async () => {
    try {
      const response = await fetch('/api/schedule');
      if (response.ok) {
        const freshRaces = await response.json();
        setRaces(freshRaces);
        // Also update formData for new races
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

  const handleAddBoatSet = () => {
    setBoatSets([...boatSets, { 
      id: `set-${boatSets.length + 1}`,
      team1Color: '',
      team2Color: ''
    }]);
  };

  const handleBoatSetChange = (index: number, field: keyof BoatSet, value: string) => {
    const newBoatSets = [...boatSets];
    newBoatSets[index][field] = value;
    setBoatSets(newBoatSets);
  };

  const handleGenerateSchedule = async () => {
    if (!teamInput.trim()) {
      alert('Please enter team names');
      return;
    }
    if (boatSets.length === 0) {
      alert('Please add at least one boat set');
      return;
    }

    const teams = teamInput.split(',').map(team => team.trim()).filter(team => team);
    if (teams.length < 2) {
      alert('Please enter at least 2 teams');
      return;
    }

    const scheduleRes = await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams, boatSets }),
    });

    const scheduleData = await scheduleRes.json();
    if (!scheduleRes.ok) {
      alert(`Error generating schedule: ${scheduleData.error || 'Unknown error'}`);
      return;
    }

    // Then, reset the leaderboard
    const leaderboardRes = await fetch('/api/results/reset', {
      method: 'POST',
    });

    if (!leaderboardRes.ok) {
      alert('Warning: Failed to reset leaderboard');
    }

    alert('Schedule generated and leaderboard reset successfully');
    setShowTeamInput(false);
    setTeamInput('');
    await fetchRaces();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 mb-6">
        {showTeamInput ? (
          <div className="bg-white p-4 border rounded-md">
            <label className="block text-sm mb-2">
              Enter team names (separated by commas):
            </label>
            <textarea
              value={teamInput}
              onChange={(e) => setTeamInput(e.target.value)}
              className="w-full border rounded px-2 py-1 mb-4 h-24"
              placeholder="Example: Team1,Team2,Team3"
            />
            
            <div className="mb-4">
              <label className="block text-sm mb-2">Boat Sets:</label>
              {boatSets.map((set, index) => (
                <div key={set.id} className="flex gap-2 mb-2">
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
                onClick={() => {
                  setShowTeamInput(false);
                  setBoatSets([]);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowTeamInput(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 self-end"
          >
            Generate New Schedule
          </button>
        )}
      </div>

      {races.map((race) => (
        <div key={race.raceNumber} className="p-4 bg-white border rounded-md">
          <h2 className="text-lg font-semibold mb-2">
            Race {race.raceNumber}: {race.teamA} vs {race.teamB}
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-2">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <label className="block text-sm mb-1">Boat {i + 1}</label>
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
      ))}
    </div>
  );
}
