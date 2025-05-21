// components/AdminContent.tsx
'use client';

import { useUser, SignIn } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { getRaces, saveRaceResult } from '@/lib/data';

export default function AdminContent() {
  const { user, isLoaded } = useUser();
  const [races, setRaces] = useState<any[] | null>(null);
  const [formData, setFormData] = useState<{ [key: number]: number[] }>({});

  useEffect(() => {
    const fetchData = async () => {
      const raceData = await getRaces();
      setRaces(raceData);
    };
    fetchData();
  }, []);

  if (!isLoaded) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold mb-4">
          You must be signed in to view this page.
        </h2>
        <SignIn routing="path" path="/admin" />
      </div>
    );
  }

  const isAdmin = user.publicMetadata?.isAdmin === true;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h2 className="text-xl font-semibold text-red-600">
          You are not authorized to view this page.
        </h2>
      </div>
    );
  }

  const handleChange = (raceNumber: number, index: number, value: number) => {
    const current = formData[raceNumber] || Array(6).fill(0);
    const updated = [...current];
    updated[index] = value;
    setFormData({ ...formData, [raceNumber]: updated });
  };

  const handleSubmit = async (raceNumber: number) => {
    const result = formData[raceNumber];
    if (result && result.length === 6 && new Set(result).size === 6) {
      await saveRaceResult(raceNumber, result);
      alert(`Results saved for Race ${raceNumber}`);
    } else {
      alert('Please enter all 6 unique positions (1 to 6)');
    }
  };

  if (!races) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin: Enter Race Results</h1>
      <div className="space-y-6">
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
                    min={1}
                    max={6}
                    value={formData[race.raceNumber]?.[i] || ''}
                    onChange={(e) =>
                      handleChange(race.raceNumber, i, parseInt(e.target.value))
                    }
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSubmit(race.raceNumber)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save Result
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
