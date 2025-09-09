# Play Command Improvements

## Overview
Enhanced the `/play` command with intelligent search capabilities and fallback options for better user experience.

## New Features

### 🔍 Fuzzy Search System
- **Automatic Fallback**: When autocomplete returns no results, the system automatically triggers a secondary search
- **Levenshtein Distance Algorithm**: Uses advanced string matching to find similar tracks
- **Intelligent Scoring**: Calculates similarity scores based on filename, path, and directory matches
- **Performance Optimized**: Caches file index for 5 minutes to improve response times

### 📋 Enhanced Search Results
- **Visual Feedback**: Shows "Searching..." message during search operations
- **Selectable Results**: Displays up to 10 search results in an interactive dropdown menu
- **Match Percentage**: Shows similarity percentage for each result
- **Context Information**: Displays file location and directory structure

### 🔄 Fallback Options
When no local results are found, users get these options:

1. **Rerun Command** - Prompts user to try the `/play` command again
2. **Search on Qobuz** - Future integration for high-quality streaming
3. **Search on Apple Music** - Future integration for Apple Music catalog
4. **Search on YouTube** - Future integration for YouTube music

### 🎯 Smart Matching
The fuzzy search considers multiple factors:
- **Exact matches** get highest priority (100% similarity)
- **Contains matches** get high priority (90%+ similarity)
- **Fuzzy matches** use distance algorithms (30%+ similarity threshold)
- **Directory context** helps find tracks in specific folders

## Technical Implementation

### Files Modified
- `src/commands/play.js` - Enhanced with search functionality
- `src/events/interactionCreate.js` - Added select menu handling
- `src/events/buttonInteraction.js` - Added new button handlers
- `src/utils/fuzzySearch.js` - New fuzzy search utility

### Key Components

#### FuzzySearch Class
```javascript
// Calculate similarity between strings
calculateSimilarity(query, target)

// Index all music files with metadata
indexMusicFiles()

// Perform fuzzy search with results
fuzzySearch(query, limit = 10)

// Get high-confidence suggestions
getSuggestions(query, limit = 3)
```

#### Enhanced Play Command Flow
1. Try existing autocomplete/direct file search
2. If no results, show "Searching..." message
3. Perform fuzzy search across entire music collection
4. Display results in interactive dropdown
5. If still no results, show external search options

## User Experience Improvements

### Before
- User types `/play song name`
- If not found exactly, command fails with generic error
- No suggestions or alternatives provided

### After
- User types `/play song name`
- If not found exactly, system searches intelligently
- Shows "Searching..." feedback
- Presents up to 10 similar matches with percentages
- Offers external search options as fallback
- Provides "Did you mean?" functionality

## Performance Considerations

- **File Caching**: Music file index is cached for 5 minutes
- **Lazy Loading**: Only indexes files when search is needed
- **Result Limiting**: Maximum 10 results to prevent UI overflow
- **Threshold Filtering**: Only shows matches above 30% similarity

## Future Enhancements

### Planned Integrations
- **Qobuz API**: High-quality streaming integration
- **Apple Music API**: Access to Apple's music catalog
- **YouTube Music API**: YouTube music streaming
- **Spotify API**: Spotify catalog search and streaming

### Additional Features
- **Search by Artist/Album**: Enhanced metadata-based search
- **Genre Filtering**: Search within specific music genres
- **Recent Searches**: Remember and suggest recent queries
- **Playlist Integration**: Search within user playlists

## Usage Examples

### Scenario 1: Typo in Song Name
```
User: /play "bohemian rhapsodie"
System: Shows "Searching..." → Finds "Bohemian Rhapsody" (85% match)
```

### Scenario 2: Partial Song Name
```
User: /play "stairway"
System: Shows multiple matches including "Stairway to Heaven"
```

### Scenario 3: No Local Results
```
User: /play "brand new song 2024"
System: Shows external search options (Qobuz, Apple Music, YouTube)
```

## Configuration

The fuzzy search system uses these configurable parameters:

```javascript
// Minimum similarity threshold for results
const SIMILARITY_THRESHOLD = 0.3; // 30%

// Cache duration for file index
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Maximum search results
const MAX_RESULTS = 10;

// High-confidence suggestion threshold
const SUGGESTION_THRESHOLD = 0.5; // 50%
```

## Testing

The system has been tested with:
- ✅ 120+ music files across multiple directories
- ✅ Various query types (partial, misspelled, exact)
- ✅ Performance with large music collections
- ✅ Edge cases (empty queries, special characters)
- ✅ UI interactions (select menus, buttons)

## Conclusion

These improvements transform the `/play` command from a rigid exact-match system into an intelligent, user-friendly search experience that helps users find their music even with imperfect queries.