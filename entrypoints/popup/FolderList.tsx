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
  return (
    <div className="folder-list-container">
      <h2>Folders</h2>
      {folders.length === 0 ? (
        <p>No folders yet.</p>
      ) : (
        <ul>
          {folders.map((folder) => (
            <li
              key={folder.id}
              className={`folder-item ${folder.id === selectedFolderId ? 'selected' : ''}`}
              onClick={() => onSelectFolder(folder.id)}
            >
              <span className="folder-name">{folder.name}</span>
              <span className="snippet-count">({folder.snippets.length})</span>
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
