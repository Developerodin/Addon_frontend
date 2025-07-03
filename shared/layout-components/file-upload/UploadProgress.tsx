import React from 'react';

export interface UploadProgressProps {
  progress: number;
  className?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ 
  progress, 
  className = '' 
}) => {
  const normalizedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <div className={`upload-progress ${className}`}>
      <div className="upload-progress-bar">
        <div 
          className="upload-progress-fill"
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
      <span className="upload-progress-text">
        {Math.round(normalizedProgress)}%
      </span>
    </div>
  );
}; 