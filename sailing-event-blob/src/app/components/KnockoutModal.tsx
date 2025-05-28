import React from 'react';

interface KnockoutModalProps {
  match: {
    teamA: string;
    teamB: string;
    stage: string;
    matchNumber: number;
    status: string;
  };
  onClose: () => void;
}

const KnockoutModal: React.FC<KnockoutModalProps> = ({ match, onClose }) => {
  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Knockout Match</h2>
        <p>
          <strong>Match:</strong> {match.teamA} vs {match.teamB}
        </p>
        <p>
          <strong>Stage:</strong> {match.stage}
        </p>
        <p>
          <strong>Match Number:</strong> {match.matchNumber}
        </p>
        <p>
          <strong>Status:</strong> {match.status}
        </p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default KnockoutModal;