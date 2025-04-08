import React from 'react';
import { Folder } from './App'; // Assuming Folder interface is exported from App.tsx or moved

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void; // Optional delete handler
}

const FolderList: React.FC<FolderListProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onDeleteFolder,
}) => {
  // Apply Tailwind classes
  return (
    // Container takes available space and allows scrolling
    <div className="flex-grow overflow-y-auto mb-3">
      <h2 className="text-sm font-semibold mb-2 text-gray-600">Folders</h2>
      {folders.length === 0 ? (
        <p className="text-xs text-gray-500">No folders yet.</p>
      ) : (
        // Remove default list styling
        <ul className="space-y-1">
          {folders.map((folder) => (
            <li
              key={folder.id}
              // Base item styles + conditional selected styles
              className={`
                flex justify-between items-center p-1.5 rounded cursor-pointer
                transition-colors duration-150 ease-in-out text-xs
                ${folder.id === selectedFolderId
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-gray-700 hover:bg-gray-200'
                }
              `}
              onClick={() => onSelectFolder(folder.id)}
            >
              {/* Folder name with truncation */}
              <span className="truncate mr-2 flex-grow">{folder.name}</span>
              {/* Snippet count, adjust color when selected */}
              <span className={`
                whitespace-nowrap text-xs
                ${folder.id === selectedFolderId ? 'text-blue-200' : 'text-gray-500'}
              `}>
                ({folder.snippets.length})
              </span>
              {/* Optional: Add delete button later */}
              {/* {onDeleteFolder && (
                <button
                  className="delete-folder-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent folder selection when clicking delete
                    onDeleteFolder(folder.id);
                  }}
                >
                  Delete
                </button>
              )} */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FolderList;
