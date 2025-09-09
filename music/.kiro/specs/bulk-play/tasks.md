# Implementation Plan

- [x] 1. Create directory scanner utility
  - Create `src/utils/directoryScanner.js` with methods for directory discovery and file scanning
  - Implement `getDirectories()` method to find all directories in music_collection for autocomplete
  - Implement `getMusicFilesFromDirectory()` method to recursively scan selected directory for music files
  - Implement `validateDirectory()` method to check directory exists and is accessible
  - Add fuzzy matching for directory names similar to existing file search
  - Include caching mechanism for directory structure (5-minute TTL)
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Extend music player service for bulk operations
  - Add `addMultipleToQueue()` method to `src/services/musicPlayer.js` for bulk file queuing
  - Add `getQueueLength()` method to return current queue size for feedback
  - Ensure bulk operations integrate properly with existing queue management
  - Handle batch processing to prevent memory issues with large directories
  - Maintain existing audio quality and metadata extraction for each file
  - _Requirements: 1.4, 3.1, 3.2, 3.3, 4.2, 4.4, 5.3, 5.4_

- [x] 3. Create playbulk command structure
  - Create `src/commands/playbulk.js` with basic slash command structure
  - Define command with directory parameter and autocomplete enabled
  - Implement command registration and basic error handling framework
  - Add voice channel validation using existing patterns from `/play` command
  - Set up command description and parameter configuration
  - _Requirements: 1.1, 6.2_

- [x] 4. Implement directory autocomplete functionality
  - Add `autocomplete()` method to playbulk command that uses directoryScanner
  - Filter and sort directory suggestions based on user input
  - Limit suggestions to 25 directories maximum
  - Show directory names with file counts in format "Directory Name (X files)"
  - Use fuzzy matching algorithm similar to existing `/play` command
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Implement main command execution logic
  - Add main `execute()` method that processes selected directory
  - Validate selected directory exists and is accessible
  - Scan directory for music files using directoryScanner utility
  - Handle case where no music files are found in directory
  - Integrate with existing voice channel connection logic
  - _Requirements: 1.2, 1.3, 1.6, 6.1, 6.3_

- [x] 6. Implement queue integration and playback logic
  - Determine if music is currently playing or queue is empty
  - Add all found files to queue using music player service
  - Start playback if no music is currently playing
  - Append to existing queue if music is already playing
  - Handle edge cases where queue operations fail
  - _Requirements: 1.4, 3.1, 3.2, 3.3_

- [x] 7. Create rich UI feedback with file listings
  - Build Discord Components v2 embed message showing directory name and file list
  - Display number of files found and added to queue
  - Show new total queue length after bulk operation
  - Truncate file list if too long and show "...and X more files"
  - Use consistent styling with existing commands (colors, emojis, formatting)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Implement comprehensive error handling
  - Add "Directory not found" error handling with helpful message
  - Add "No music files found" error with supported formats list
  - Add "Voice channel required" error using existing error patterns
  - Add generic file access error handling for permission issues
  - Ensure all error messages are user-friendly and actionable
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Add security and validation measures
  - Implement path traversal prevention using path.resolve() and path.relative()
  - Validate all directory paths are within configured music_collection
  - Sanitize user input to prevent directory traversal attacks
  - Add file system permission error handling
  - Ensure no access to system directories or sensitive files
  - _Requirements: 5.1, 5.2_

- [x] 10. Create unit tests for directory scanner
  - Write tests for `getDirectories()` method with various directory structures
  - Write tests for `getMusicFilesFromDirectory()` with nested directories and mixed file types
  - Write tests for `validateDirectory()` with valid and invalid paths
  - Write tests for fuzzy matching functionality on directory names
  - Write tests for caching behavior and TTL expiration
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 11. Create integration tests for playbulk command
  - Write tests for full command execution flow from autocomplete to queue
  - Write tests for music player service integration with bulk operations
  - Write tests for Discord Components v2 message formatting and display
  - Write tests for error handling scenarios and edge cases
  - Write tests for queue integration with existing playback states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_

- [x] 12. Performance optimization and testing
  - Test performance with large directories (100+ files)
  - Optimize directory scanning for deep nested structures
  - Test autocomplete response times with many directories
  - Implement progress feedback for very large bulk operations
  - Test memory usage during bulk file processing
  - _Requirements: 1.5, 2.1, 2.2_