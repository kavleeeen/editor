# Collaborative Design Editor

A real-time collaborative design editor built with React, TypeScript, and Fabric.js, featuring multi-user editing, comments with @mentions, and MongoDB persistence.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MongoDB database
- Backend API server (separate repository)

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone https://github.com/kavleeeen/editor
   cd Editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_BE_URL=http://localhost:3000
   VITE_VITE_WS_BE_URL=ws://localhost:1234
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

6. **Preview production build**
   ```bash
   npm run preview
   ```

## 🌐 Deployment

### Current Deployment
- **Platform**: GitHub Pages with custom domain
- **URL**: https://editor.kavleen.in/
- **Build Process**: Automated via GitHub Actions
- **Configuration**: Uses Vite with custom base path for GitHub Pages compatibility

### Deployment Steps
1. Push changes to main branch
2. GitHub Actions automatically builds and deploys
3. Custom domain configured via CNAME file
4. SPA routing handled with 404.html fallback

## 🗄️ Database & Backend

### Database
- **Database**: MongoDB
- **Collections**: 
  - `users` - User authentication and profile data
  - `canvases` - Design data and metadata
  - `comments` - Canvas comments and mentions

### REST API Endpoints
- **Authentication**: `/auth/login`, `/auth/register`
- **Canvas Management**: `/canvas` (GET, POST, PATCH)
- **Comments**: `/canvas/:id/comments` (GET, POST)
- **User Management**: `/canvas/users` (GET)
- **Sharing**: `/canvas/share`, `/canvas/share-multiple` (POST)

### Data Persistence
- **Auto-save**: Every 2.5 seconds after changes
- **Manual Save**: On title changes and explicit actions
- **Thumbnail Generation**: Automatic PNG thumbnails for design previews
- **Version Control**: Canvas state versioning with timestamps

## 🔐 Authentication

### Implementation
- **Method**: JWT (JSON Web Tokens)
- **Storage**: localStorage for token persistence
- **Libraries**: Custom JWT decoding utility
- **Flow**: 
  1. User registers/logs in via REST API
  2. JWT token stored in localStorage
  3. Token included in all authenticated requests
  4. Token decoded client-side for user info

### User Management
- **Registration**: Email, password, name required
- **Login**: Email/password authentication
- **Session**: Persistent across browser sessions
- **Logout**: Token removal and redirect to login

## 🎨 Canvas Functionality

### Canvas Specifications
- **Fixed Size**: 1080×1080 pixels (preset)
- **Scalability**: Auto-scales to fit viewport with padding
- **Background**: White default
- **Library**: Fabric.js for canvas manipulation

### Element Types & Styling

#### Text Elements
- **Library**: Fabric.js Textbox
- **Styling Options**:
  - Font family (Arial, Helvetica, Times New Roman, etc.)
  - Font color (fill)
  - Border color (stroke)
- **Features**: Double-click to edit, keyboard shortcuts

#### Image Elements  
- **Upload**: Drag & drop or file picker
- **Styling Options**:
  - Border color
  - Border width
  - Opacity
- **Formats**: PNG, JPG, GIF, WebP

#### Shape Elements
- **Types**: Rectangle, Circle, Triangle, Ellipse, Polygon
- **Styling Options**:
  - Fill color
  - Border color
  - Border width
- **Library**: Fabric.js built-in shapes

## 🔄 Transformations

### Selection & Manipulation
- **Selection Handles**: Custom-styled corner handles and borders
- **Bounding Box**: Dashed border with corner controls
- **Multi-selection**: Ctrl/Cmd+click for multiple objects
- **Library**: Fabric.js selection system

### Movement
- **Mouse**: Drag to move objects
- **Keyboard**: Arrow keys (1px) or Shift+Arrow (10px)
- **Snapping**: Visual guides for alignment

### Resizing
- **Corner Handles**: Drag corners to resize proportionally
- **Edge Handles**: Drag edges for single-axis resizing
- **Constraints**: Maintain aspect ratio with Shift key

### Rotation
- **Rotation Handle**: Top-center rotation control
- **Free Rotation**: 360-degree rotation capability
- **Snapping**: 15-degree increments with Shift key

## 📚 Layer Management

### Layer Order (Z-Index)
- **Visual List**: Right-side panel showing all layers
- **Drag & Drop**: Reorder layers by dragging
- **Bring Forward/Backward**: Automatic z-index management
- **Visual Indicators**: Layer type icons (T=Text, S=Shape, I=Image)

### Layer Operations
- **Rename**: Double-click layer name to edit
- **Delete**: Trash icon with confirmation dialog
- **Selection**: Click layer to select object on canvas
- **Persistence**: Custom names saved to MongoDB

### Implementation
- **Library**: Custom layer management system
- **State**: Redux for layer state management
- **Persistence**: Layer names stored in object metadata

## ↩️ Undo/Redo System

### Implementation
- **Library**: Custom Fabric.js history extension
- **History Limit**: 10+ actions (configurable)
- **Debouncing**: 300ms delay to prevent duplicate saves
- **Events Tracked**: object:added, object:modified, object:removed

### Features
- **Keyboard Shortcuts**: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Y (redo)
- **UI Controls**: Undo/Redo buttons in toolbar
- **State Management**: Separate undo/redo stacks
- **Collaboration**: History preserved across real-time sync

### Technical Details
- **Storage**: In-memory history arrays
- **Serialization**: Canvas JSON state snapshots
- **Performance**: Debounced saves to prevent excessive history entries

## 📤 Export Functionality

### PNG Export
- **Method**: Client-side canvas to PNG conversion
- **Quality**: High-resolution export (1x multiplier)
- **Format**: PNG with transparency support
- **Library**: Custom utility using Fabric.js toDataURL

### Export Process
1. **Canvas Serialization**: Convert Fabric.js canvas to data URL
2. **Blob Creation**: Convert data URL to PNG blob
3. **File Generation**: Create downloadable File object
4. **Upload**: Automatic thumbnail upload to backend

### Implementation
```typescript
// Export utility functions
canvasToPngBlob(canvas, quality)
canvasToPngFile(canvas, filename, quality)
```

## 💾 Persistence & MongoDB

### Data Storage
- **Database**: MongoDB with REST API backend
- **Collections**: 
  - `canvases`: Design data, metadata, thumbnails
  - `users`: Authentication and user profiles
  - `comments`: Canvas comments and mentions

### Auto-Save System
- **Frequency**: Every 2.5 seconds after changes
- **Triggers**: Object add/modify/remove events
- **Optimization**: Only saves when data changes
- **Thumbnail**: Automatic PNG generation and upload

### Data Structure
```typescript
interface CanvasData {
  designData: {
    version: string;
    objects: FabricObject[];
    background: string | null;
    width: number;
    height: number;
  };
  metadata: {
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  imageUrl?: string; // Thumbnail URL
}
```

## 👥 Real-Time Multi-User Editing

### Collaboration Technology
- **Library**: Yjs (CRDT - Conflict-free Replicated Data Type)
- **Transport**: WebSocket provider (y-websocket)
- **Server**: WebSocket server for real-time sync

### Features
- **Live Sync**: Real-time canvas state synchronization
- **Presence Awareness**: See other users' cursors and activity
- **Conflict Resolution**: Automatic conflict resolution via CRDT
- **User Indicators**: Avatar circles showing connected users

### Implementation
```typescript
// Yjs setup
const ydoc = new Y.Doc()
const provider = new WebsocketProvider(wsUrl, canvasId, ydoc)
const yShared = ydoc.getMap('shared-canvas')
```

### Presence System
- **User Avatars**: Colored circles with initials
- **Title Editing**: Visual indicators when others edit title
- **Connection Status**: Real-time connection indicators
- **User Info**: Name and initials from JWT token

## 💬 Comments & @Mentions

### Comment System
- **Real-time**: Yjs-powered live comment sync
- **Persistence**: MongoDB storage for comment history
- **UI**: Floating comment panel with chat interface
- **Timestamps**: Relative time display (e.g., "2m ago")

### @Mention Functionality
- **Library**: react-mentions for @mention input
- **User Lookup**: Real-time user search and selection
- **Format**: `@[Display Name](userId)` in UI, `$mention(userId)` in backend
- **Rendering**: Highlighted mentions in comment display

### Implementation
```typescript
// Mention input with user search
<MentionInputReactMentions
  value={newComment}
  onChange={setNewComment}
  users={usersList}
  placeholder="Add a comment..."
/>
```

### Comment Features
- **User Avatars**: Colored circles with initials
- **Mention Notifications**: Visual highlighting of @mentions
- **Auto-scroll**: Automatic scroll to new comments
- **Error Handling**: Graceful fallback for connection issues

## 📋 Design Management

### Design Creation
- **New Design**: "Create New Design" button creates blank canvas
- **Template**: 1080×1080 white canvas with default settings
- **Naming**: Auto-generated "Untitled Design" title
- **Persistence**: Immediate save to MongoDB

### Design Editing
- **Access**: Click design card to open editor
- **Real-time**: Live collaboration with other users
- **Auto-save**: Continuous saving of changes
- **Version Control**: Timestamp-based versioning

### Design Listing
- **Dashboard**: Grid view of all user designs
- **Thumbnails**: PNG previews generated automatically
- **Metadata**: Title, creation date, last updated
- **Pagination**: 50 designs per page with offset

### Design Features
- **Search**: Filter designs by title (future enhancement)
- **Sorting**: By creation date or last updated
- **Sharing**: Share designs with other users
- **Deletion**: Remove designs (future enhancement)

## 🛠️ Technical Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **Canvas Library**: Fabric.js 6.7.1
- **Collaboration**: Yjs + y-websocket
- **UI Components**: Material-UI + Custom CSS
- **Routing**: React Router DOM

### Backend Integration
- **API**: RESTful API with JWT authentication
- **Real-time**: WebSocket server for collaboration
- **Database**: MongoDB for persistence
- **File Upload**: Image upload service

### Key Libraries
```json
{
  "fabric": "^6.7.1",           // Canvas manipulation
  "yjs": "^13.6.27",            // CRDT for collaboration
  "y-websocket": "^3.0.0",      // WebSocket transport
  "react-mentions": "^4.4.10",  // @mention functionality
  "@reduxjs/toolkit": "^2.9.2", // State management
  "react-router-dom": "^7.9.4"   // Client-side routing
}
```

## 🎯 Functional Requirements Coverage

✅ **Canvas**: Fixed 1080×1080px preset with Fabric.js  
✅ **Add & Edit**: Text, images, shapes with styling options  
✅ **Transformations**: Move, resize, rotate with selection handles  
✅ **Layer Order**: Z-index management with rename/delete  
✅ **Undo/Redo**: 10+ action history with keyboard shortcuts  
✅ **Export**: Client-side PNG export with high quality  
✅ **Persistence**: MongoDB via REST API with auto-save  
✅ **Real-time Editing**: Multi-user collaboration with Yjs  
✅ **Comments**: @mention support with real-time sync  
✅ **Design Management**: Create, edit, list designs with thumbnails  

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
│   ├── Canvas/         # Fabric.js canvas implementation
│   ├── CommentPanel/   # Comments and @mentions
│   ├── LayersPanel/    # Layer management
│   └── ...
├── services/           # API services
├── store/              # Redux store and slices
├── utils/              # Utility functions
└── types/              # TypeScript definitions
```

### Key Features
- **TypeScript**: Full type safety throughout
- **ESLint**: Code quality and consistency
- **Responsive**: Mobile-friendly design
- **Accessibility**: Keyboard navigation and screen reader support
- **Performance**: Optimized rendering and state management

---

Built with ❤️ using React, TypeScript, and Fabric.js