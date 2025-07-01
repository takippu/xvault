# 🔐 xVault - Secure Snippet Manager Browser Extension

> A powerful, secure, and privacy-focused browser extension for managing your code snippets, notes, and text content with military-grade encryption and seamless organization.

![xVault Extension](./public/icon/128x128.png)

## 📋 Table of Contents

- [What is xVault?](#what-is-xvault)
- [🚀 Key Features](#-key-features)
- [🔒 Security Features](#-security-features)
- [🎨 User Interface](#-user-interface)
- [📱 Core Functionality](#-core-functionality)
- [⚙️ Technical Features](#️-technical-features)
- [🛠️ Development Setup](#️-development-setup)
- [📦 Building & Installation](#-building--installation)
- [🔧 Configuration](#-configuration)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## What is xVault?

**xVault** is a sophisticated browser extension that transforms how you manage and access your text snippets, code blocks, and notes. Built with security as a core principle, xVault provides a secure, encrypted vault for storing your frequently used text content with instant access and powerful organization tools.

### Why xVault?
- 🔒 **Privacy-First**: All data stored locally with optional military-grade encryption
- ⚡ **Lightning Fast**: Instant access to your snippets with one-click copying
- 🗂️ **Organized**: Hierarchical folder system for perfect organization
- 🔍 **Smart Search**: Find any snippet instantly with powerful search
- 🌓 **Beautiful UI**: Modern, responsive design with dark/light themes
- 📤 **Portable**: Easy import/export for backup and synchronization

---

## 🚀 Key Features

### 🔒 Security Features

#### **Multi-Layer Password Protection**
- **PBKDF2 Hashing**: 100,000 iterations with SHA-256 for password security
- **Salt-Based Security**: Unique salt generation for each password
- **Session Management**: Optional "Remember Me" with secure session tokens
- **Rate Limiting**: Protection against brute force attacks
- **Enhanced Integrity Verification**: Multiple checkpoints to detect tampering

#### **Advanced Encryption**
- **AES-GCM Encryption**: Industry-standard encryption for sensitive data
- **Optional Folder Encryption**: Additional layer of protection for folder contents
- **Secure Key Derivation**: Password-based key generation for data encryption
- **Data Integrity Checks**: Cryptographic verification of stored data

#### **Security Boot System**
- **System Integrity Verification**: Checks for security system tampering on startup
- **Multi-Location Data Verification**: Stores security data in multiple locations
- **Device Fingerprinting**: Unique device identification for enhanced security
- **Fallback Security Mechanisms**: Multiple layers of security validation

### 📱 Core Functionality

#### **Snippet Management**
- **Create & Edit**: Rich text snippet creation with optional titles
- **Copy with One Click**: Instant clipboard copying with visual feedback
- **Multiple Modes**: Copy, Edit, and Delete modes for different workflows
- **Smart Paste Detection**: Automatic clipboard content detection and paste assistance

#### **Folder Organization**
- **Unlimited Folders**: Create and organize snippets in custom folders
- **Hierarchical Structure**: Nested organization for complex categorization
- **Folder Operations**: Rename, delete, and manage folders with confirmation dialogs
- **Quick Navigation**: Collapsible sidebar with folder count indicators

#### **Search & Discovery**
- **Real-Time Search**: Instant search across snippet titles and content
- **Smart Filtering**: Search results update as you type
- **Content Preview**: Hover to preview full snippet content for titled items
- **Search Highlighting**: Visual indication of search matches

#### **Import & Export**
- **Flexible Backup**: Export all data as encrypted or plain JSON
- **Password Protection**: Optional encryption for exported data
- **Easy Migration**: Import data from exported files or clipboard
- **Data Validation**: Automatic validation of imported data structure

### 🎨 User Interface

#### **Modern Design**
- **Responsive Layout**: Optimized for different screen sizes
- **Clean Interface**: Minimalist design focused on functionality
- **Visual Feedback**: Toast notifications and hover effects
- **Smooth Animations**: Framer Motion powered transitions

#### **Theme System**
- **Dark/Light Themes**: Automatic detection of system preference
- **Custom Color Schemes**: Carefully crafted color palettes for each theme
- **Theme Persistence**: Remembers your theme preference
- **System Integration**: Follows OS dark mode settings

#### **Interactive Elements**
- **Modal Dialogs**: Confirmation dialogs for destructive actions
- **Collapsible Sidebar**: Hide/show folder navigation
- **Mode Indicators**: Visual indicators for current operation mode
- **Status Feedback**: Real-time feedback for all user actions

### ⚙️ Technical Features

#### **Storage System**
- **IndexedDB Primary**: Large storage capacity (hundreds of MB)
- **localStorage Fallback**: Automatic fallback for compatibility
- **Storage Migration**: Seamless migration between storage systems
- **Data Compression**: Efficient storage utilization

#### **Security Architecture**
- **Local-Only Storage**: No data transmitted to external servers
- **Browser Isolation**: Secure browser storage APIs
- **Memory Protection**: Secure handling of sensitive data in memory
- **Extension Permissions**: Minimal required permissions for maximum security

#### **Performance Optimization**
- **Lazy Loading**: Components loaded on demand
- **Efficient Rendering**: Optimized React rendering with hooks
- **Memory Management**: Proper cleanup and memory management
- **Fast Search**: Optimized search algorithms for instant results

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (or yarn equivalent)
- **Browser**: Chrome, Firefox, or Edge for testing

### 1. Clone the Repository

```bash
git clone https://github.com/takippu/xvault.git
cd xvault
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Start development for Firefox
npm run dev:firefox

# Type checking
npm run compile
```

### 4. Development Environment

The extension will automatically reload when you make changes. Open your browser's extension management page and load the extension from the `.output` directory.

---

## 📦 Building & Installation

### Building for Production

```bash
# Build for Chrome/Edge
npm run build

# Build for Firefox
npm run build:firefox

# Create distribution packages
npm run zip
npm run zip:firefox
```

### Manual Installation

#### Chrome/Edge:
1. Run `npm run build`
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `.output/chrome-mv3` directory

#### Firefox:
1. Run `npm run build:firefox`
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the manifest file from `.output/firefox-mv2`

### Store Installation

*Coming soon to Chrome Web Store and Firefox Add-ons*

---

## 🔧 Configuration

### Build Configuration

The extension uses WXT for build configuration. Key settings in `wxt.config.ts`:

```typescript
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'clipboardWrite', 'clipboardRead'],
    // Additional manifest settings
  },
});
```

### Storage Configuration

Configure storage preferences in `StorageContext.tsx`:

```typescript
// Use IndexedDB for large storage capacity
<StorageProvider useIndexedDB={true}>
  <App />
</StorageProvider>
```

### Security Configuration

Security settings are managed in `enhancedSecurity.ts`:

- **Password iterations**: 100,000 PBKDF2 iterations
- **Encryption algorithm**: AES-GCM 256-bit
- **Session timeout**: Configurable session persistence
- **Rate limiting**: Failed attempt protection

---

## 📁 Project Structure

```
xvault/
├── entrypoints/
│   ├── background.ts          # Background service worker
│   ├── content.ts            # Content script (minimal)
│   └── popup/               # Main popup interface
│       ├── App.tsx          # Main application component
│       ├── components/      # Reusable UI components
│       ├── contexts/        # React contexts (Storage, Theme)
│       ├── utils/          # Utility functions
│       │   ├── crypto.ts   # Cryptographic functions
│       │   ├── dbStorage.ts # IndexedDB implementation
│       │   ├── enhancedSecurity.ts # Security features
│       │   └── importExport.ts # Data import/export
│       └── [components].tsx # Individual page components
├── public/
│   └── icon/               # Extension icons
├── src/
│   └── components/         # Shared components
├── assets/                # Static assets
├── package.json           # Dependencies and scripts
├── wxt.config.ts         # Build configuration
├── tailwind.config.js    # Styling configuration
└── tsconfig.json         # TypeScript configuration
```

### Key Files Explained

- **`App.tsx`**: Main application logic and state management
- **`StorageContext.tsx`**: Unified storage interface for IndexedDB/localStorage
- **`enhancedSecurity.ts`**: Advanced security features and authentication
- **`crypto.ts`**: Cryptographic utilities for encryption/decryption
- **`importExport.ts`**: Data backup and restoration functionality
- **`ThemeContext.tsx`**: Theme management and persistence

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage for security features
- Update documentation for new features
- Follow the existing code style and conventions

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🔒 Security & Privacy

xVault is designed with privacy as a fundamental principle:

- **No Data Collection**: We don't collect any user data
- **Local Storage Only**: All data remains on your device
- **No Network Requests**: Extension works entirely offline
- **Open Source**: Full transparency with open source code
- **Regular Security Audits**: Continuous security improvements

For security concerns or vulnerability reports, please contact our security team.

---

## 📞 Support

- **Documentation**: Check our [Wiki](https://github.com/takippu/xvault/wiki)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/takippu/xvault/issues)
- **Discussions**: Join our [GitHub Discussions](https://github.com/takippu/xvault/discussions)

---

<div align="center">

**Built with ❤️ for developers who value security and productivity**

[⭐ Star this repo](https://github.com/takippu/xvault) | [🐛 Report Bug](https://github.com/takippu/xvault/issues) | [💡 Request Feature](https://github.com/takippu/xvault/issues/new)

</div>


p.s yes this is all ai-generated dont believe em