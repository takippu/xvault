import React from 'react';
import { FiGlobe, FiGithub, FiLinkedin } from 'react-icons/fi';

const About: React.FC = () => {
  const socialLinks = [
    { name: 'Website', url: '#', icon: <FiGlobe size={18} /> },
    { name: 'GitHub', url: '#', icon: <FiGithub size={18} /> },
    { name: 'LinkedIn', url: '#', icon: <FiLinkedin size={18} /> },
  ];

  return (
    <div className="flex flex-col min-h-0 h-full p-4 overflow-y-auto bg-base text-primary">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">PetiRahsia</h1>
        <p className="text-sm">
          Your secure digital vault for storing and organizing code snippets across the web.
          Effortlessly save, categorize, and access your code fragments with just a few clicks.
        </p>
      </div>

      {/* Features Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Features</h2>
        <ul className="space-y-2">
          <li className="flex items-start">
            <span className="mr-2">🔒</span>
            <span>Advanced security with PBKDF2 password protection and AES-GCM encryption</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">📁</span>
            <span>Organize snippets in customizable folders with persistent storage</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">🔍</span>
            <span>Powerful search across snippet titles and content</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">🔄</span>
            <span>Import/Export functionality for data backup and transfer</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">🎨</span>
            <span>Dark/Light theme support with modern UI design</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">⚡</span>
            <span>Fast and lightweight browser extension with session persistence</span>
          </li>
        </ul>
      </div>

      {/* Developer Section */}
      <div className="mt-auto pt-4 border-t border-color">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold mb-3">Developer</h2>
            <div className="mb-3">
              <p className="text-sm">[Developer Name]</p>
              <p className="text-xs text-secondary">Full Stack Developer</p>
            </div>
          </div>

          {/* Social Links - With React Icons */}
          <div className="flex gap-3">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center p-2 rounded hover-color transition-colors duration-150"
                title={link.name}
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;