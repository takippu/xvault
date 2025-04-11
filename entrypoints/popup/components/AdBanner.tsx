import React from 'react';
import { FiX } from 'react-icons/fi';

interface AdBannerProps {
  onUpgrade?: () => void;
}

const AdBanner: React.FC<AdBannerProps> = ({ onUpgrade }) => {
  return (
    <div className="w-full bg-secondary-base border-t border-color py-2 px-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <div className="text-xs text-primary mb-1 opacity-80">Advertisement</div>
          {/* Ad placeholder - this would be replaced with actual ad code */}
          <div className="bg-gray-200 dark:bg-gray-700 h-14 rounded flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
            Ad Banner Placeholder
          </div>
        </div>
        <div className="ml-3 flex flex-col items-end">
          <button 
            onClick={onUpgrade}
            className="text-xs font-medium text-white primary hover:bg-opacity-90 px-2 py-1 rounded transition-colors duration-200 cursor-pointer"
          >
            Remove Ads
          </button>
          <span className="text-[10px] text-primary opacity-70 mt-1">
            Upgrade to Premium
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;