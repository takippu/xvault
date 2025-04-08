import React from 'react';
import { TextSnippet } from './App'; // Import the exported interface

interface SnippetListProps {
  snippets: TextSnippet[];
  onCopySnippet: (snippet: TextSnippet) => void; // Expect the whole snippet object
  copiedSnippetId: string | null; // ID of the snippet just copied
  onDeleteSnippet?: (snippetId: string) => void; // Optional delete handler
}

const SnippetList: React.FC<SnippetListProps> = ({
  snippets,
  onCopySnippet,
  copiedSnippetId, // Receive the copied ID prop
  onDeleteSnippet,
}) => {
  // Apply Tailwind classes
  return (
    // Container takes available space and allows scrolling
    <div className="flex-grow overflow-y-auto mb-3">
      <h3 className="text-sm font-semibold mb-2 text-gray-600">Snippets</h3>
      {snippets.length === 0 ? (
        <p className="text-xs text-gray-500">No snippets in this folder yet.</p>
      ) : (
        // Remove default list styling, add spacing between items
        <ul className="space-y-2">
          {snippets.map((snippet) => (
            // Snippet item layout
            <li key={snippet.id} className="flex justify-between items-start p-2 border border-gray-200 rounded bg-white">
              {/* Snippet text area with pre-wrap */}
              <pre className="text-xs text-gray-800 whitespace-pre-wrap break-all mr-3 flex-grow bg-gray-50 p-1.5 rounded font-mono">{snippet.text}</pre>
              {/* Actions container */}
              <div className="flex-shrink-0">
                <button
                  // Base button styles + conditional 'copied' styles
                  className={`
                    py-1 px-2.5 border-none rounded text-white text-xs cursor-pointer transition-colors duration-200 ease-in-out
                    min-w-[60px]
                    ${copiedSnippetId === snippet.id
                      ? 'bg-gray-500 cursor-default' // Copied state
                      : 'bg-green-600 hover:bg-green-700' // Default state
                    }
                  `}
                  onClick={() => onCopySnippet(snippet)}
                  title="Copy snippet"
                  disabled={copiedSnippetId === snippet.id}
                >
                  {copiedSnippetId === snippet.id ? 'Copied!' : 'Copy'}
                </button>
                {/* Optional: Add delete button later */}
                {/* {onDeleteSnippet && (
                  <button
                    className="delete-snippet-btn"
                    onClick={() => onDeleteSnippet(snippet.id)}
                  >
                    Delete
                  </button>
                )} */}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SnippetList;
