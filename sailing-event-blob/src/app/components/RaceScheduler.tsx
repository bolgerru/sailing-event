import React, { useState } from 'react';
import { uploadFile } from '../../lib/blob-storage'; // Assuming this function handles file uploads

const RaceScheduler: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file to upload.');
      return;
    }

    try {
      await uploadFile(file);
      setMessage('File uploaded successfully!');
    } catch (error) {
      setMessage('Error uploading file: ' + error.message);
    }
  };

  return (
    <div>
      <h1>Race Scheduler</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload Race File</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default RaceScheduler;