# Product Requirements Document (PRD): Writer Studio

## 1. Overview
**Writer Studio** is a professional SaaS application designed for writers to craft, manage, and organize their stories, series, chapters, notes, and character details. It aims to offer a cleaner, more feature-rich, and organized alternative to platforms like Wattpad, targeting serious writers who need a dedicated workspace.

## 2. Target Audience
Writers, authors, and hobbyists who need a structured, distraction-free environment to write and organize complex stories, series, and fanfictions.

## 3. Tech Stack
- **Backend:** Python FastAPI
- **Frontend:** HTML5, CSS3 (Vanilla), Vanilla JavaScript
- **Database:** SQLite
- **Architecture:** Monolith SaaS application with RESTful APIs and server-side/client-side rendering.

## 4. UI/UX & Aesthetics
- **Theme:** Professional, elegant, and light-themed (to avoid straining eyes during long writing sessions). 
- **Color Palette:** Derived from the app's logo (Light Mint Blue background, Dark Navy Blue accents).
- **Layout:**
  - Desktop: Standard top navigation bar and sidebar for workspace management.
  - Mobile/Tablet: Bottom navigation bar for ease of access on touch devices.
- **Responsiveness:** Fully responsive across all device sizes (Mobile, Tablet, PC).
- **Editor:** Standard word processor layout resembling MS Word or LibreOffice Writer.

## 5. Core Features & Entities

### 5.1. User Management
- User Registration & Login (Email, Username, Password).
- User Profile Viewer and Manager.
- Account Settings and Preferences.
- Privacy Policy and Terms of Conditions pages.

### 5.2. Series Management
- A Series contains multiple Stories.
- **Attributes:** Name, Description, Tags, Cover Image, Copyright Type, etc.
- Export as `.wseries` or `.zip`.

### 5.3. Story Management
- A Story contains multiple Chapters/Parts.
- **Attributes:** Name, Summary, Tags, Genre, Fandom, Copyright Type, Original Characters (OCs), Crossover Fictions.
- Cover Image support (upload image or auto-generate text-based image).
- Ability to archive stories.
- Search functionality (across all stories and within a specific story).

### 5.4. Chapter Management
- **Types:** Standard Chapter, Author's Note, Explanation, Epilogue, Prologue, etc.
- **Attributes:** Name, Context, Order.
- Custom sorting and ordering.

### 5.5. Document Editor
- Professional WYSIWYG editor (MS Word / LO Writer style).
- **Notes:** 
  - General notes attached to a specific chapter.
  - Contextual comments attached to a specific selected text snippet.
- LaTeX support for advanced formatting.

### 5.6. Export & Import System
- **Standard Formats:** PDF, EPUB (auto-numbered with Table of Contents). Options to select and arrange chapters prior to export.
- **Proprietary Formats (Encrypted):**
  - `.wstory`: Entire story export/import.
  - `.wset`: Specific chapters export/import.
  - `.wseries`: Series export/import (contains multiple stories and a `details.json`).
- **Encryption Features:** Optional password protection, flag for editable/read-only by others. Only openable within Writer Studio.

### 5.7. Extensibility System (.wext)
- Support for custom extensions/plugins.
- **Format:** `.wext` (Encrypted package containing Python code, JS, CSS, and settings).
- **Capabilities:** Add new features, change UI/UX, assist the user.
- **Security:** Isolated execution. Extensions are user-specific (one user's extension does not affect others). Strict prevention of accessing login mechanisms or core app secrets.
- **Management:** Users can import, activate, deactivate, and configure settings (stored in a JSON config) for extensions.

## 6. Standard Pages
- Landing Page
- Dashboard / Workspace
- Editor Interface
- Settings
- User Profile
- Privacy Policy
- Terms & Conditions
