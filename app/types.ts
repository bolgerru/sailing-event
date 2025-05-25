export interface Race {
    raceNumber: number;
    teamA: string;
    teamB: string;
    result?: number[] | null;
    winner?: string | null;
    boats: {
        teamA: string;
        teamB: string;
    };
    status?: 'not_started' | 'in_progress' | 'finished';
    startTime?: string;
    endTime?: string;
    league?: string;
    isLaunching?: boolean;
    goToChangeover?: boolean;
}

export interface EstimatedStartTimeProps {
    race: Race;
    lastStartedRace: Race;
    timeBetweenRaces: number;
}