import React from 'react';
import { Folder } from './App'; // Assuming Folder interface is exported from App.tsx or moved
import { FiEdit, FiTrash2 } from 'react-icons/fi';

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onEditFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  openFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  snippetMode: 'copy' | 'delete' | 'edit';
}

const FolderList: React.FC<FolderListProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
  openFolders,
  onToggleFolder,
  snippetMode,
}) => {
  return (
    <div className="flex-grow overflow-y-auto mb-3">
      <h2 className="text-sm font-semibold mb-2 text-primary">Folders</h2>
      {folders.length === 0 ? (
        <p className="text-xs text-gray-500">No folders yet.</p>
      ) : (
        <ul className="space-y-1">
          {folders.map((folder) => (
            <li
              key={folder.id}
              className={`
                flex justify-between items-center p-1.5 rounded cursor-pointer
                transition-colors duration-150 ease-in-out text-xs
                ${folder.id === selectedFolderId
                  ? 'folders text-primary hover:hover-color'
                  : 'text-primary hover:hover-color'
                }
              `}
              onClick={() => onSelectFolder(folder.id)}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center flex-grow">
                  <span className="truncate">{folder.name}</span>
                </div>
                <span className={`
                  whitespace-nowrap text-xs
                  ${folder.id === selectedFolderId ? 'text-primary' : 'text-primary'}
                `}>
                  ({folder.snippets.length})
                </span>
              </div>
              {snippetMode !== 'copy' && (
                <div className="flex items-center">
                  <button
                    className="p-1 hover:text-blue-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditFolder(folder.id);
                    }}
                    title="Edit Folder"
                  >
                    <FiEdit size={14} />
                  </button>
                  <button
                    className="p-1 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder(folder.id);
                    }}
                    title="Delete Folder"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FolderList;
