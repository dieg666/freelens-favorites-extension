# FreeLens Favorites Extension

**Status**: Under development

Add favorites/bookmarking to FreeLens sidebar navigation with drag-and-drop reordering.

## Installation

```
https://github.com/dieg666/freelens-favorites-extension/raw/main/freelens-favorites-extension-1.0.0.tgz
```

**Important**: Clear extension cache before installation:
- macOS: `~/Library/Application Support/Freelens/`, `~/.freelens/extensions/`
- Windows: `%APPDATA%\Freelens\`, `%USERPROFILE%\.freelens\extensions\`

### Requirements

- FreeLens >= 1.6.0
- Node.js >= 22.16.0

### Tested On

- macOS (working)
- Windows 10 (working)

## Features

### Star Icons on Sidebar
- Hover over any sidebar navigation item to reveal a star icon (☆)
- Click to favorite/unfavorite items
- Stars are gray when unfavorited, white when favorited
- Smart detection ensures stars only appear on actual sidebar items (not table content, logs, etc.)

### Favorites Menu
- Appears first in the cluster sidebar (sticky positioning)
- Collapsible dropdown showing all favorited items for the current cluster
- Click any favorite to navigate directly to that resource
- Frosted glass effect with shadow when scrolling
- Collapse state persists across navigation

### Favorites Dashboard
- Dedicated page with modern card-based UI
- Drag-and-drop to reorder favorites
- Remove favorites with a single click
- Auto-refreshes when favorites are added/removed
- Bi-directional sync with sidebar stars and dropdown

### Cluster-Scoped Storage
- Favorites are stored per-cluster
- Switching clusters shows different favorites
- Data persisted to `~/Library/Application Support/Freelens/extension-store/`

## Installation

### From Source

1. Install dependencies:
```bash
cd freelens-favorites-extension
pnpm install
```

2. Build the extension:
```bash
pnpm build
```

3. Package the extension:
```bash
pnpm pack
```

4. Install in FreeLens:
   - Open FreeLens
   - Navigate to Extensions (Ctrl+Shift+E or Cmd+Shift+E)
   - Drag and drop `freelens-favorites-extension-1.0.0.tgz`

## Development

### Prerequisites
- Node.js >= 22.16.0
- pnpm >= 10.22.0
- FreeLens >= 1.6.0

### Build Commands

```bash
# Type checking (currently skipped)
pnpm type:check

# Build extension
pnpm build

# Build for production
pnpm build:production

# Clean build artifacts
pnpm clean

# Package for testing
pnpm pack:dev

# Run tests
pnpm test
```

## Architecture

The extension consists of three main parts:

1. **Main Process** (`src/main/`): Handles backend logic and store initialization
2. **Renderer Process** (`src/renderer/`): UI components and sidebar DOM manipulation
3. **Common** (`src/common/`): Shared MobX stores for cluster-scoped favorites

### Key Components

- **FavoritesStore** (`src/common/store/favorites-store.ts`): MobX store managing cluster-scoped favorites with persistent storage
- **FavoritesPage** (`src/renderer/components/favorites-page.tsx`): Dashboard with drag-and-drop reordering
- **FavoritesSidebar** (`src/renderer/components/favorites-sidebar.tsx`): Sticky menu with collapsible dropdown
- **SidebarInjection** (`src/renderer/utils/sidebar-injection.ts`): DOM manipulation for star icons with smart detection

### Design Patterns

#### Sidebar Item Detection
Stars only appear on actual sidebar navigation items using:
- `data-testid` attributes starting with `link-for-sidebar-item`
- Ancestor elements with sidebar-related classes
- Prevents stars on ingress classes, logs, table content, etc.

#### Sticky Positioning
Favorites menu stays anchored at top with:
- Frosted glass background (rgba(54, 57, 62, 0.98))
- Border and shadow when stuck
- Native FreeLens styling

#### Bi-directional Sync
- Stars update when removing from dashboard/dropdown
- Dashboard auto-refreshes when adding/removing favorites
- Collapse state persists across navigation

## Technical Implementation

### Storage Format
```typescript
{
  [clusterId: string]: {
    items: Array<{
      id: string;
      title: string;
      order: number;
    }>;
    lastModified: string;
  }
}
```

### Navigation
Uses `data-testid` attributes to trigger FreeLens navigation:
```typescript
element.click() // Simulates click on sidebar item
```

### Drag-and-Drop
Implements HTML5 drag-and-drop with:
- Visual feedback during drag
- Order persistence
- MobX state updates

## License

MIT

## Author

delgadodiaz (delgadodiaz@users.noreply.github.com)
