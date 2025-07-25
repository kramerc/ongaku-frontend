# Last.fm Integration Setup

This application includes Last.fm integration for scrobbling tracks and displaying user listening history.

## Prerequisites

1. Create a Last.fm account at https://www.last.fm/
2. Create a Last.fm API account and get your API credentials:
   - Go to https://www.last.fm/api/account/create
   - Fill out the application form
   - Set the callback URL to: `http://localhost:3001/lastfm/callback` (or your domain + `/lastfm/callback`)
   - Note down your API Key and Shared Secret

## Configuration

1. Copy the environment variables template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and replace the placeholder values:
   ```env
   NEXT_PUBLIC_LASTFM_API_KEY=your_actual_api_key_here
   NEXT_PUBLIC_LASTFM_SECRET=your_actual_secret_here
   ```

## Authentication Flow

The Last.fm authentication flow works as follows:

1. User clicks "Connect to Last.fm" in the settings
2. A popup window opens with the Last.fm authorization page
3. User authorizes the application on Last.fm
4. Last.fm redirects to `/lastfm/callback` with an auth token
5. The callback page detects it's in a popup and sends the token to the parent window via `postMessage`
6. The parent window receives the token, closes the popup, and exchanges it for a session key
7. The session key is stored locally and used for scrobbling

## Implementation Details

### PostMessage Communication

Due to browser security restrictions (same-origin policy), the parent window cannot directly access the popup's URL when it's on Last.fm's domain. To solve this, the implementation uses the `postMessage` API:

- The popup (callback page) detects when it has the token and sends it to the parent
- The parent window listens for messages from the popup
- This approach bypasses cross-origin restrictions safely and securely

### Custom Last.fm Service

The implementation uses a custom `LastFmService` class that:
- Generates proper Last.fm authentication URLs
- Handles API signature generation using MD5 hashing
- Makes direct API calls to Last.fm's web service
- Manages session keys for authenticated requests

### Popup-based Authentication

Instead of redirecting the entire page, the app uses a popup window for authentication:
- Maintains the user's current state in the main application
- Provides a smooth authentication experience
- Uses `postMessage` API for secure communication between popup and parent

## Features

- ✅ **OAuth Authentication**: Users can connect their Last.fm accounts via popup
- ✅ **Now Playing Updates**: Automatically updates Last.fm when tracks start
- ✅ **Automatic Scrobbling**: Scrobbles tracks based on Last.fm's rules (50% or 4 minutes)
- ✅ **Settings Management**: Users can enable/disable scrobbling
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Session Persistence**: Login state persists across browser sessions

## Security Notes

⚠️ **Important**: The Last.fm API requires both the API key and secret on the client side to generate request signatures. This means the secret will be visible in the browser. This is a limitation of the Last.fm API design and is unavoidable when implementing client-side authentication.

For production use, consider:
- Using environment-specific secrets
- Implementing server-side proxy endpoints for additional security
- Regularly rotating your API credentials

## Troubleshooting

- **"API credentials not found"**: Make sure your `.env.local` file is properly configured
- **Authentication popup blocked**: Allow popups for your site in browser settings
- **Authentication fails**: Verify your API credentials are correct and active
- **Callback URL mismatch**: Ensure your Last.fm app settings match your callback URL

## API Documentation

For more information about the Last.fm API, see:
- [Last.fm API Documentation](https://www.last.fm/api)
- [Authentication Flow](https://www.last.fm/api/authentication)
- [Scrobbling API](https://www.last.fm/api/scrobbling)
