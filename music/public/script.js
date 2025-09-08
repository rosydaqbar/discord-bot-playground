class MusicBotUI {
    constructor() {
        this.servers = [];
        this.musicCollection = [];
        this.currentServer = null;
        this.filteredMusic = [];
        this.botReady = false;
        
        this.init();
    }

    init() {
        this.bindEvents();
        
        // Give the bot a moment to start up before initial load
        setTimeout(() => {
            this.loadData();
            this.startPolling();
        }, 2000);
    }

    bindEvents() {
        // Collapsible server status section
        document.getElementById('serverStatusHeader').addEventListener('click', () => {
            this.toggleServerStatus();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterMusic(e.target.value);
        });

        // Sort functionality
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortMusic(e.target.value);
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });

        // Playback controls
        document.getElementById('playPauseBtn').addEventListener('click', () => {
            this.togglePlayPause();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.skipTrack();
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopPlayback();
        });

        // Volume control
        const volumeSlider = document.getElementById('volumeSlider');
        volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });

        // Modal controls
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('serverModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    async loadData() {
        try {
            // Check bot status first
            const isReady = await this.checkBotStatus();
            
            // Only load servers if bot is ready, always load music collection
            if (isReady) {
                await Promise.all([
                    this.loadServers(),
                    this.loadMusicCollection()
                ]);
            } else {
                // Still load music collection even if bot isn't ready
                await this.loadMusicCollection();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async checkBotStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            this.botReady = status.botReady;
            this.updateConnectionStatus(status.botReady, status);
            
            if (!status.botReady) {
                document.getElementById('serverList').innerHTML = 
                    '<div class="loading">🤖 Discord bot is connecting...</div>';
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error checking bot status:', error);
            this.botReady = false;
            this.updateConnectionStatus(false, null, error.message);
            return false;
        }
    }

    updateConnectionStatus(isReady, status = null, error = null) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (error) {
            statusIndicator.textContent = '❌';
            statusText.textContent = 'Connection Error';
            connectionStatus.className = 'connection-status error';
        } else if (isReady) {
            statusIndicator.textContent = '✅';
            statusText.textContent = `Connected • ${status.guilds} servers`;
            connectionStatus.className = 'connection-status connected';
        } else {
            statusIndicator.textContent = '🔄';
            statusText.textContent = 'Connecting to Discord...';
            connectionStatus.className = 'connection-status connecting';
        }
    }

    async loadServers() {
        // Don't try to load servers if bot isn't ready
        if (!this.botReady) {
            document.getElementById('serverList').innerHTML = 
                '<div class="loading">🤖 Discord bot is connecting...</div>';
            return;
        }

        try {
            const response = await fetch('/api/queue');
            
            if (response.status === 503) {
                // Discord client not ready yet
                this.botReady = false;
                document.getElementById('serverList').innerHTML = 
                    '<div class="loading">Discord bot is starting up...</div>';
                return;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Handle the new response format
            if (data.clientReady === false) {
                this.botReady = false;
                document.getElementById('serverList').innerHTML = 
                    '<div class="loading">🤖 Discord bot is connecting...</div>';
                return;
            }
            
            this.servers = data.guilds || data; // Handle both old and new format
            this.renderServers();
        } catch (error) {
            console.error('Error loading servers:', error);
            document.getElementById('serverList').innerHTML = 
                '<div class="error">Failed to load servers - Bot may be starting up</div>';
        }
    }

    async loadMusicCollection() {
        try {
            const response = await fetch('/api/collection');
            this.musicCollection = await response.json();
            this.filteredMusic = [...this.musicCollection];
            this.renderMusicCollection();
        } catch (error) {
            console.error('Error loading music collection:', error);
            document.getElementById('musicList').innerHTML = 
                '<div class="error">Failed to load music collection</div>';
        }
    }

    renderServers() {
        const serverList = document.getElementById('serverList');
        
        if (this.servers.length === 0) {
            serverList.innerHTML = '<div class="no-servers">No Discord servers found - Bot may be starting up</div>';
            return;
        }

        serverList.innerHTML = this.servers.map(server => {
            const statusClass = server.isPlaying ? 'status-playing' : 
                               server.isPaused ? 'status-paused' : 'status-idle';
            const statusText = server.isPlaying ? 'Playing' : 
                              server.isPaused ? 'Paused' : 'Idle';

            return `
                <div class="server-card">
                    <h3>
                        <span class="server-status-indicator ${statusClass}"></span>
                        ${server.guildName}
                    </h3>
                    <p><strong>Status:</strong> ${statusText}</p>
                    ${server.currentTrack ? `
                        <p><strong>Now Playing:</strong> ${server.currentTrack.title}</p>
                        <p><strong>Artist:</strong> ${server.currentTrack.author}</p>
                    ` : ''}
                    <p><strong>Queue:</strong> ${server.queueSize} songs</p>
                    <p><strong>Volume:</strong> ${server.volume}%</p>
                </div>
            `;
        }).join('');
    }

    renderMusicCollection() {
        const musicList = document.getElementById('musicList');
        
        if (this.filteredMusic.length === 0) {
            musicList.innerHTML = '<div class="no-music">No music files found</div>';
            return;
        }

        musicList.innerHTML = this.filteredMusic.map(track => {
            const formatClass = `format-${track.format.substring(1)}`;
            const duration = this.formatDuration(track.duration);
            const fileSize = this.formatFileSize(track.size);
            const bitrate = track.bitrate ? `${Math.round(track.bitrate)}kbps` : 'Unknown';
            const sampleRate = track.sampleRate ? `${track.sampleRate}Hz` : 'Unknown';

            return `
                <div class="music-card">
                    <h4>
                        ${track.title}
                        <span class="format-badge ${formatClass}">${track.format.substring(1)}</span>
                    </h4>
                    <div class="artist">${track.artist}</div>
                    <div class="music-info">
                        <div><i class="fas fa-clock"></i> ${duration}</div>
                        <div><i class="fas fa-hdd"></i> ${fileSize}</div>
                        <div><i class="fas fa-music"></i> ${bitrate}</div>
                        <div><i class="fas fa-wave-square"></i> ${sampleRate}</div>
                    </div>
                    <button class="play-btn" onclick="musicUI.playTrack('${track.filename}')">
                        <i class="fas fa-play"></i> Play
                    </button>
                </div>
            `;
        }).join('');
    }

    filterMusic(query) {
        const searchTerm = query.toLowerCase();
        this.filteredMusic = this.musicCollection.filter(track => 
            track.title.toLowerCase().includes(searchTerm) ||
            track.artist.toLowerCase().includes(searchTerm) ||
            track.album.toLowerCase().includes(searchTerm) ||
            track.filename.toLowerCase().includes(searchTerm)
        );
        this.renderMusicCollection();
    }

    sortMusic(criteria) {
        this.filteredMusic.sort((a, b) => {
            switch (criteria) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'artist':
                    return a.artist.localeCompare(b.artist);
                case 'album':
                    return a.album.localeCompare(b.album);
                case 'duration':
                    return b.duration - a.duration;
                case 'dateAdded':
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
                default:
                    return 0;
            }
        });
        this.renderMusicCollection();
    }

    async playTrack(filename) {
        if (this.servers.length === 0) {
            alert('No Discord servers available');
            return;
        }

        if (this.servers.length === 1) {
            await this.playOnServer(filename, this.servers[0].guildId);
        } else {
            this.showServerSelection(filename);
        }
    }

    showServerSelection(filename) {
        const modal = document.getElementById('serverModal');
        const serverSelection = document.getElementById('serverSelection');
        
        serverSelection.innerHTML = this.servers.map(server => `
            <div class="server-option" onclick="musicUI.playOnServer('${filename}', '${server.guildId}')">
                <h4>${server.guildName}</h4>
                <p>Status: ${server.isPlaying ? 'Playing' : server.isPaused ? 'Paused' : 'Idle'}</p>
            </div>
        `).join('');
        
        modal.style.display = 'block';
    }

    async playOnServer(filename, guildId) {
        this.closeModal();
        
        try {
            const response = await fetch('/api/play', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename: filename.replace(/\.[^/.]+$/, ""), guildId })
            });

            const result = await response.json();
            
            if (response.status === 503) {
                this.showNotification('Discord bot is starting up, please wait...', 'warning');
                return;
            }
            
            if (result.success) {
                this.showNotification(`Now playing: ${result.track.title}`, 'success');
                this.loadServers(); // Refresh server status
            } else {
                this.showNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error playing track:', error);
            this.showNotification('Failed to play track - Bot may be starting up', 'error');
        }
    }

    async togglePlayPause() {
        const activeServer = this.servers.find(s => s.isPlaying || s.isPaused);
        if (!activeServer) return;

        const action = activeServer.isPlaying ? 'pause' : 'resume';
        await this.controlPlayback(action, activeServer.guildId);
    }

    async skipTrack() {
        const activeServer = this.servers.find(s => s.isPlaying);
        if (!activeServer) return;

        await this.controlPlayback('skip', activeServer.guildId);
    }

    async stopPlayback() {
        const activeServer = this.servers.find(s => s.isPlaying || s.isPaused);
        if (!activeServer) return;

        await this.controlPlayback('stop', activeServer.guildId);
    }

    async controlPlayback(action, guildId) {
        try {
            const response = await fetch(`/api/control/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ guildId })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Playback ${action}ed`, 'success');
                this.loadServers(); // Refresh server status
            } else {
                this.showNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error controlling playback:', error);
            this.showNotification('Failed to control playback', 'error');
        }
    }

    async setVolume(volume) {
        const activeServer = this.servers.find(s => s.isPlaying || s.isPaused);
        if (!activeServer) return;

        document.getElementById('volumeValue').textContent = `${volume}%`;

        try {
            const response = await fetch('/api/volume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ guildId: activeServer.guildId, volume: parseInt(volume) })
            });

            const result = await response.json();
            
            if (!result.success) {
                this.showNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error setting volume:', error);
        }
    }

    closeModal() {
        document.getElementById('serverModal').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '9999',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            backgroundColor: type === 'success' ? '#48bb78' : 
                           type === 'error' ? '#f56565' : '#667eea'
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    updateNowPlaying() {
        const activeServer = this.servers.find(s => s.isPlaying || s.isPaused);
        const nowPlayingInfo = document.getElementById('nowPlayingInfo');
        
        if (!activeServer || !activeServer.currentTrack) {
            nowPlayingInfo.innerHTML = '<div class="no-music">No music currently playing</div>';
            this.updateControlButtons(false);
            return;
        }

        const track = activeServer.currentTrack;
        nowPlayingInfo.innerHTML = `
            <div class="current-track">
                <h3>${track.title}</h3>
                <div class="artist">${track.author}</div>
                <div class="track-info">
                    <span>Duration: ${track.duration}</span>
                    <span>Server: ${activeServer.guildName}</span>
                </div>
            </div>
        `;

        this.updateControlButtons(true, activeServer.isPlaying);
        
        // Update volume slider
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        volumeSlider.value = activeServer.volume;
        volumeValue.textContent = `${activeServer.volume}%`;
    }

    updateControlButtons(hasActiveTrack, isPlaying = false) {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const nextBtn = document.getElementById('nextBtn');
        const stopBtn = document.getElementById('stopBtn');

        playPauseBtn.disabled = !hasActiveTrack;
        nextBtn.disabled = !hasActiveTrack;
        stopBtn.disabled = !hasActiveTrack;

        if (hasActiveTrack) {
            playPauseBtn.innerHTML = isPlaying ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    toggleServerStatus() {
        const header = document.getElementById('serverStatusHeader');
        const content = document.getElementById('serverList');
        const icon = document.getElementById('serverStatusIcon');
        
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            content.classList.remove('collapsed');
            header.classList.remove('collapsed');
            icon.style.transform = 'rotate(0deg)';
        } else {
            // Collapse
            content.classList.add('collapsed');
            header.classList.add('collapsed');
            icon.style.transform = 'rotate(-90deg)';
        }
    }

    startPolling() {
        // Poll server status every 15 seconds to reduce server load
        setInterval(async () => {
            // Check if bot is ready before polling
            const isReady = await this.checkBotStatus();
            
            if (isReady) {
                await this.loadServers();
                this.updateNowPlaying();
            } else {
                // If bot isn't ready, show connecting message and don't poll servers
                document.getElementById('serverList').innerHTML = 
                    '<div class="loading">🤖 Discord bot is connecting...</div>';
            }
        }, 15000); // Reduced from 5 seconds to 15 seconds
    }

    formatDuration(seconds) {
        if (!seconds) return 'Unknown';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }
}

// Initialize the UI when the page loads
const musicUI = new MusicBotUI();