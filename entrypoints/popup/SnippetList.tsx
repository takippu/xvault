import React, { useState } from 'react';
import { TextSnippet } from './App'; // Import the exported interface
import { FiCopy, FiEdit, FiTrash2, FiCheck, FiX } from 'react-icons/fi'; // Import icons from react-icons

interface SnippetListProps {
  snippets: TextSnippet[];
  onCopySnippet: (snippet: TextSnippet) => void; // Expect the whole snippet object
  copiedSnippetId: string | null; // ID of the snippet just copied
  onDeleteSnippet?: (snippetId: string) => void; // Optional delete handler
  onEditSnippet?: (snippetId: string, updatedText: string, updatedTitle?: string) => void; // Optional edit handler
  mode: 'copy' | 'delete' | 'edit'; // Current mode
}

const SnippetList: React.FC<SnippetListProps> = ({
  snippets,
  onCopySnippet,
  copiedSnippetId, // Receive the copied ID prop
  onDeleteSnippet,
  onEditSnippet,
  mode, // Current mode
}) => {
  // State for editing
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  // Apply Tailwind classes
  return (
    // Container takes available space and allows scrolling
    <div className="flex-grow overflow-y-auto mb-3">
      <h3 className="text-sm font-semibold mb-2 text-primary">Snippets</h3>
      {snippets.length === 0 ? (
        <p className="text-xs text-secondary">No snippets in this folder yet.</p> 
      ) : (
        // Remove default list styling, add spacing between items
        <ul className="space-y-2">
          {snippets.map((snippet) => (
            // Conditionally add 'group' class only if snippet has a title
            <li key={snippet.id} className={`${snippet.title ? 'group' : ''} flex justify-between items-start p-2 border border-color rounded bg-base`}>
              {/* Snippet text area - Apply theme classes */}
              <div
                className="text-xs text-primary whitespace-pre-wrap break-all mr-3 flex-grow bg-secondary-base p-1.5 rounded font-mono relative cursor-default"
              >
                {editingSnippetId === snippet.id ? (
                  <div className="space-y-1">
                    {/* Apply theme classes to inputs */}
                    <input
                      type="text"
                      className="w-full p-1 border border-color rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-base text-primary"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title (optional)"
                    />
                    <textarea
                      className="w-full p-1 border border-color rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] bg-base text-primary"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="Snippet text (required)"
                    />
                  </div>
                ) : (
                  /* Remove group class from pre tag */
                  <pre className="m-0 font-mono relative p-1 rounded">
                    {/* Show title or text by default */}
                    <span className="block group-hover:hidden">{snippet.title || snippet.text}</span>
                    {/* Only show hidden text and apply hover effect if title exists */}
                    {snippet.title && (
                      <>
                        {/* Apply hover background only to the hidden text span */}
                        <span className="hidden group-hover:inline text-hovers font-black  p-1 rounded">{snippet.text}</span>
                        {/* Hide label on hover */}
                        <span className="absolute top-0 right-0 text-[10px] text-primary bg-secondary-base px-1 rounded-bl group-hover:hidden">
                          Hover to see content
                        </span>
                      </>
                    )}
                  </pre>
                )}
              </div>
              {/* Single action button that changes based on mode */}
              <div className="flex-shrink-0">
                {mode === 'copy' && (
                  <button
                    className={`
                      p-1.5 border-none rounded text-white text-xs cursor-pointer transition-colors duration-200 ease-in-out
                      ${copiedSnippetId === snippet.id
                        ? 'bg-gray-500 cursor-default' // Copied state
                        : 'bg-green-600 hover:bg-green-700' // Normal state
                      }
                    `}
                    onClick={() => onCopySnippet(snippet)}
                    title="Copy snippet"
                    disabled={copiedSnippetId === snippet.id}
                  >
                    <FiCopy size={14} />
                  </button>
                )}
                
                {mode === 'edit' && (
                  editingSnippetId === snippet.id ? (
                    <div className="flex space-x-1">
                      <button
                        className="p-1.5 border-none rounded text-white text-xs cursor-pointer transition-colors duration-200 ease-in-out bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          if (onEditSnippet && editText.trim()) {
                            onEditSnippet(snippet.id, editText, editTitle || undefined);
                            setEditingSnippetId(null);
                          }
                        }}
                        title="Save changes"
                        disabled={!editText.trim()}
                      >
                        <FiCheck size={14} />
                      </button>
                      <button
                        className="p-1.5 border-none rounded text-white text-xs cursor-pointer transition-colors duration-200 ease-in-out bg-gray-600 hover:bg-gray-700"
                        onClick={() => setEditingSnippetId(null)}
                        title="Cancel editing"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="p-1.5 border-none rounded text-white text-xs cursor-pointer transition-colors duration-200 ease-in-out bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => {
                        setEditText(snippet.text);
                        setEditTitle(snippet.title || '');
                        setEditingSnippetId(snippet.id);
                      }}
                      title="Edit snippet"
                    >
                      <FiEdit size={14} />
                    </button>
                  )
                )}
                
                {mode === 'delete' && onDeleteSnippet && (
                  <button
                    className="p-1.5 border-none rounded text-white text-xs cursor-pointer transition-colors duration-200 ease-in-out bg-red-600 hover:bg-red-700"
                    onClick={() => onDeleteSnippet(snippet.id)}
                    title="Delete snippet"
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SnippetList;
