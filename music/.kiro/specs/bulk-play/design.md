# Design Document

## Overview

The bulk play feature introduces a new `/playbulk` command that allows users to queue entire directories of music files at once. The feature leverages existing music player infrastructure while adding directory-specific autocomplete and bulk file processing capabilities.

## Architecture

### Command Structure
The `/playbulk` command follows the same architectural pattern as existing commands:
- Discord slash command registration
- Autocomplete functionality for directory suggestions
- Integration with existing music player service
- Discord Components v2 for rich UI feedback

### Directory Processing Flow
1. **Autocomplete Phase**: Scan music_collection for directories only
2. **Selection Phase**: User selects directory from autocomplete
3. **File Discovery Phase**: Recursively scan selected directory for music files
4. **Queue Integration Phase**: Add discovered files to existing music queue
5. **Feedback Phase**: Display results in rich embed message

## Components and Interfaces

### New Command: `/playbulk`
**File**: `src/commands/playbulk.js`

**Interface**:
```javascript
{
  data: SlashCommandBuilder
    .setName('playbulk')
    .setDescription('Queue all music files from a directory')
    .addStringOption(option =>
      option.setName('directory')
        .setDescription('Directory to load music from')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  execute: async (interaction) => { /* implementation */ },
  autocomplete: async (interaction) => { /* directory suggestions */ }
}
```

### Directory Scanner Utility
**File**: `src/utils/directoryScanner.js`

**Interface**:
```javascript
class DirectoryScanner {
  // Get all directories in music collection for autocomplete
  async getDirectories(musicDirectory, query = '')
  
  // Get all music files from a specific directory (recursive)
  async getMusicFilesFromDirectory(directoryPath, supportedFormats)
  
  // Validate directory exists and is accessible
  async validateDirectory(directoryPath)
}
```

### Music Player Service Extensions
**Existing File**: `src/services/musicPlayer.js`

**New Methods**:
```javascript
// Add multiple files to queue at once
async addMultipleToQueue(guildId, filePaths)

// Get queue length for feedback
getQueueLength(guildId)
```

## Data Models

### Directory Information
```javascript
{
  name: string,           // Directory name
  path: string,           // Full directory path
  relativePath: string,   // Path relative to music_collection
  fileCount: number       // Number of music files (for display)
}
```

### Bulk Operation Result
```javascript
{
  directoryName: string,
  filesFound: Array<{
    name: string,
    path: string,
    title: string,
    artist: string
  }>,
  filesAdded: number,
  newQueueLength: number,
  startedPlaying: boolean
}
```

## Error Handling

### Directory Not Found
- **Trigger**: Selected directory doesn't exist
- **Response**: "Directory not found" error message
- **Recovery**: Suggest using autocomplete to find valid directories

### No Music Files Found
- **Trigger**: Directory exists but contains no supported music files
- **Response**: "No music files found in directory" with supported formats list
- **Recovery**: Suggest checking subdirectories or file formats

### Voice Channel Required
- **Trigger**: User not in voice channel when executing command
- **Response**: Same error handling as `/play` command
- **Recovery**: Prompt user to join voice channel

### File Access Errors
- **Trigger**: Permission issues or corrupted files
- **Response**: Generic "Unable to access some files" message
- **Recovery**: Continue with accessible files, log specific errors

## Testing Strategy

### Unit Tests
- Directory scanning functionality
- Autocomplete filtering and sorting
- File path validation
- Queue integration methods

### Integration Tests
- Full command execution flow
- Music player service integration
- Discord Components v2 message formatting
- Error handling scenarios

### User Acceptance Tests
- Directory autocomplete accuracy
- Bulk file loading performance
- Queue integration with existing playback
- Error message clarity and helpfulness

## Performance Considerations

### Directory Scanning Optimization
- Cache directory structure for autocomplete (5-minute TTL)
- Limit recursive depth to prevent infinite loops
- Batch file processing to avoid memory issues

### Autocomplete Performance
- Limit directory suggestions to 25 items
- Use fuzzy matching similar to existing `/play` command
- Prioritize directories with more music files

### Queue Management
- Add files to queue in batches to prevent blocking
- Maintain existing queue order and playback state
- Provide progress feedback for large directories

## UI/UX Design

### Autocomplete Interface
- Show directory names with file counts: "Album Name (15 files)"
- Use fuzzy matching for partial directory names
- Sort by relevance and file count

### Success Message Format
```
## Directory Queued
📁 **Album Name**

**Files Added:** 15 tracks
**New Queue Length:** 23 tracks
**Status:** Added to queue / Now playing

**Tracks:**
1. Artist - Song Title
2. Artist - Another Song
...
(and 10 more tracks)
```

### Error Message Format
```
## Error
❌ **Directory Not Found**

The directory "Album Name" could not be found.
Use autocomplete to see available directories.
```

## Integration Points

### Existing Music Player Service
- Reuse existing `playFile()` method for individual tracks
- Extend queue management for bulk operations
- Maintain existing audio quality and metadata extraction

### Existing Fuzzy Search System
- Adapt fuzzy search algorithm for directory names
- Reuse caching mechanisms for performance
- Maintain consistent search behavior with `/play`

### Discord Components v2
- Use existing container builders and message formatting
- Maintain consistent UI styling with other commands
- Reuse button interactions for queue management

## Security Considerations

### Path Traversal Prevention
- Validate all directory paths are within music_collection
- Sanitize user input to prevent directory traversal attacks
- Use path.resolve() and path.relative() for safe path handling

### File System Access
- Limit file system access to configured music directory
- Handle permission errors gracefully
- Prevent access to system directories or sensitive files