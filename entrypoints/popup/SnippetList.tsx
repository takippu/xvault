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
  return (
    <div className="snippet-list-container">
      <h3>Snippets</h3>
      {snippets.length === 0 ? (
        <p>No snippets in this folder yet.</p>
      ) : (
        <ul>
          {snippets.map((snippet) => (
            <li key={snippet.id} className="snippet-item">
              <pre className="snippet-text">{snippet.text}</pre>
              <div className="snippet-actions">
                <button
                  className={`copy-btn ${copiedSnippetId === snippet.id ? 'copied' : ''}`} // Add 'copied' class conditionally
                  onClick={() => onCopySnippet(snippet)} // Pass the whole snippet object
                  title="Copy snippet" // Tooltip for accessibility
                  disabled={copiedSnippetId === snippet.id} // Disable briefly after copy
                >
                  {copiedSnippetId === snippet.id ? 'Copied!' : 'Copy'} {/* Change text */}
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
