# Ongaku Music Library Frontend

A modern web frontend for the Ongaku Music Server API, built with Next.js, TypeScript, and Tailwind CSS.

## Features

### Core Functionality
- **Music Library Browser**: Browse your entire music collection with pagination
- **Advanced Search**: Full-text search across tracks, artists, albums, and genres
- **Filtering**: Filter tracks by artist, album, genre, or album artist
- **Sorting**: Sort tracks by any column (title, artist, album, year, duration, etc.)
- **Library Statistics**: View comprehensive library stats including total tracks, duration, and unique counts

### API Integration
This frontend is fully integrated with the Ongaku Music Server API v1.0.0:

#### Endpoints Used:
- `GET /tracks` - Paginated track listing with filters
- `GET /tracks/search` - Full-text search across all fields
- `GET /tracks/{id}` - Individual track details
- `GET /stats` - Library statistics
- `GET /artists` - List of all artists
- `GET /albums` - List of all albums  
- `GET /genres` - List of all genres
- `POST /rescan` - Trigger library rescan

#### Track Data Fields:
- Basic metadata: title, artist, album, genre
- Track details: track number, disc number, year
- Technical info: duration, bitrate, sample rate, bit depth, channels
- File info: format, path, creation/modification dates
- Additional tags: custom metadata as JSON

### UI Features
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Infinite Scroll**: Automatic loading of more tracks as you scroll
- **Library Browser Sidebar**: Navigate by artists, albums, genres, or view statistics
- **Active Filters Display**: Visual indicators for applied filters with easy removal
- **Loading States**: Smooth loading indicators throughout the interface

### Last.fm Integration
- **Account Connection**: Secure OAuth authentication with Last.fm
- **Automatic Scrobbling**: Tracks are automatically scrobbled when played for sufficient time
- **Now Playing Updates**: Real-time status updates to Last.fm
- **Privacy Controls**: Enable/disable scrobbling, disconnect account anytime
- **Smart Scrobbling**: Follows Last.fm guidelines (50% played or 4 minutes minimum)
- **Status Indicators**: Visual feedback when scrobbling is active

## Getting Started

### Prerequisites
- Node.js 18+ 
- The Ongaku Music Server running on `http://localhost:3000`

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ongaku-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

The API base URL is configured in `/lib/types.ts`:
```typescript
export const API_BASE_URL = "http://localhost:4000/api/v1"
```

Update this if your Ongaku server is running on a different host/port.

## Project Structure

```
├── app/
│   ├── components/
│   │   └── music-table.tsx      # Main track listing table
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── loading.tsx              # Loading UI
│   └── page.tsx                 # Main application page
├── components/
│   ├── library-browser.tsx      # Sidebar for browsing/filtering
│   ├── theme-provider.tsx       # Theme context provider
│   ├── theme-toggle.tsx         # Dark/light mode toggle
│   └── ui/                      # Reusable UI components
├── lib/
│   ├── api.ts                   # API service layer
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                 # Utility functions
└── public/                      # Static assets
```

## API Service Layer

The application uses a centralized API service (`/lib/api.ts`) that provides:

- Type-safe API calls
- Centralized error handling  
- Consistent request/response formatting
- Support for all Ongaku API endpoints

Example usage:
```typescript
import { apiService } from '@/lib/api'

// Get paginated tracks with filters
const tracks = await apiService.getTracks({
  page: 1,
  per_page: 50,
  artist: 'The Beatles'
})

// Search tracks
const searchResults = await apiService.searchTracks({
  q: 'Abbey Road',
  page: 1,
  per_page: 20
})

// Get library statistics
const stats = await apiService.getStats()
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and enhanced developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **next-themes** - Theme switching functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
