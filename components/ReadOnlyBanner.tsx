
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { AssetVersion } from '../types';

interface ReadOnlyBannerProps {
  isLatestVersion: boolean;
  activeVersion: AssetVersion;
  onGoToLatest: () => void;
}

const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({ isLatestVersion, activeVersion, onGoToLatest }) => {
  if (isLatestVersion) {
    return null;
  }

  return (
    <div className="flex-none bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-sm font-medium flex items-center justify-center">
      <AlertTriangle size={16} className="mr-2" />
      Viewing historical version V{activeVersion.versionNumber} from {format(activeVersion.createdAt, 'MMM d, yyyy')}. This view is read-only.
      <button onClick={onGoToLatest} className="ml-3 text-amber-900 underline hover:no-underline">
        Go to Latest
      </button>
    </div>
  );
};

export default ReadOnlyBanner;
