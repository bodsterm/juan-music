// Theme toggle
const toggle = document.getElementById('theme-toggle');
const body = document.body;
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    toggle.checked = true;
}
toggle.addEventListener('change', () => {
    body.classList.toggle('dark-mode');
    localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
});

// Spotify API setup
const clientId = 'YOUR_CLIENT_ID'; // Replace with your Spotify Client ID
const redirectUri = 'https://<username>.github.io/juan-music/callback.html';
let accessToken = '';

const loginButton = document.getElementById('login-button');
loginButton.addEventListener('click', () => {
    const scopes = 'playlist-read-private';
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
    window.location = authUrl;
});

// Handle OAuth callback
window.addEventListener('message', (event) => {
    if (event.data.type === 'SPOTIFY_AUTH') {
        accessToken = event.data.accessToken;
        loginButton.style.display = 'none';
        loadSection('library');
    }
});

// Sample local tracks (replace with your MP3s)
const localTracks = [
    {
        id: '1',
        name: 'Sample Track 1',
        artist: 'Artist 1',
        album: 'Album 1',
        duration: '3:00',
        url: 'audio/sample1.mp3'
    },
    {
        id: '2',
        name: 'Sample Track 2',
        artist: 'Artist 2',
        album: 'Album 2',
        duration: '4:00',
        url: 'audio/sample2.mp3'
    }
];

// Audio player
const audioPlayer = document.getElementById('audio-player');
const playPauseButton = document.getElementById('play-pause');
const progressBar = document.getElementById('progress-bar');
let currentTrackIndex = -1;
let isPlaying = false;

audioPlayer.addEventListener('timeupdate', () => {
    progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
});
progressBar.addEventListener('input', () => {
    audioPlayer.currentTime = (progressBar.value / 100) * audioPlayer.duration;
});
audioPlayer.addEventListener('ended', playNext);

function togglePlay() {
    if (isPlaying) {
        audioPlayer.pause();
        playPauseButton.textContent = '▶️';
    } else {
        audioPlayer.play();
        playPauseButton.textContent = '⏸';
    }
    isPlaying = !isPlaying;
}

function playTrack(index) {
    if (index < 0 || index >= localTracks.length) return;
    currentTrackIndex = index;
    const track = localTracks[index];
    audioPlayer.src = track.url;
    audioPlayer.play();
    isPlaying = true;
    playPauseButton.textContent = '⏸';
    document.getElementById('current-track').textContent = `${track.name} - ${track.artist}`;
}

function playPrevious() {
    playTrack(currentTrackIndex - 1);
}

function playNext() {
    playTrack(currentTrackIndex + 1);
}

// Load sections
async function loadSection(section) {
    const contentDiv = document.getElementById('content');
    const trackListDiv = document.getElementById('track-list');
    contentDiv.innerHTML = `<h2>${section.charAt(0).toUpperCase() + section.slice(1)}</h2>`;
    
    if (section === 'library') {
        trackListDiv.innerHTML = localTracks.map((track, index) => `
            <div class="track" onclick="playTrack(${index})">
                <span>${track.name} - ${track.artist}</span>
                <span>${track.duration}</span>
            </div>
        `).join('');
    } else if (section === 'playlists' && accessToken) {
        try {
            const response = await fetch('https://api.spotify.com/v1/me/playlists', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await response.json();
            trackListDiv.innerHTML = data.items.map(playlist => `
                <div class="track">
                    <span>${playlist.name}</span>
                    <span>${playlist.tracks.total} tracks</span>
                </div>
            `).join('');
        } catch (error) {
            trackListDiv.innerHTML = '<p>Error loading playlists. Please try again.</p>';
        }
    }
}

// Search tracks
async function searchTracks() {
    const query = document.getElementById('search-input').value.trim();
    const trackListDiv = document.getElementById('track-list');
    if (!query) {
        trackListDiv.innerHTML = '<p>Please enter a search query.</p>';
        return;
    }

    // Search local tracks
    const localResults = localTracks.filter(track =>
        track.name.toLowerCase().includes(query.toLowerCase()) ||
        track.artist.toLowerCase().includes(query.toLowerCase())
    );

    // Search Spotify (if authenticated)
    let spotifyResults = [];
    if (accessToken) {
        try {
            const response = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const data = await response.json();
            spotifyResults = data.tracks.items.map(track => ({
                name: track.name,
                artist: track.artists[0].name,
                album: track.album.name,
                duration: new Date(track.duration_ms).toISOString().substr(14, 5)
            }));
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    trackListDiv.innerHTML = [...localResults, ...spotifyResults].map((track, index) => `
        <div class="track" onclick="${localResults.includes(track) ? `playTrack(${localTracks.indexOf(track)})` : ''}">
            <span>${track.name} - ${track.artist}</span>
            <span>${track.duration}</span>
        </div>
    `).join('');
}

// Load library by default
loadSection('library');
