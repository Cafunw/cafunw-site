const DISCORD_ID = '796715087523217428';

let spotifyState = {
    active: false,
    start: 0,
    end: 0,
    song: '',
    artist: '',
    art: ''
};

let usernameTyped = false;

async function fetchDiscordProfile() {
    try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
        const data = await response.json();

        if (data.success) {
            const user = data.data.discord_user;

            // Update Username with Typewriter Effect (Once)
            if (!usernameTyped) {
                const rawName = user.username;
                // Capitalize first letter
                const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                typeWriter(formattedName, document.getElementById('username'));
                usernameTyped = true;
            }

            const avatarHash = user.avatar;
            if (avatarHash) {
                const avatarUrl = `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${avatarHash}.png?size=256`;
                document.getElementById('avatar').src = avatarUrl;
                document.getElementById('avatar').style.display = 'block';
                document.getElementById('avatar-placeholder').style.display = 'none';
            }

            // Update Status
            const status = data.data.discord_status;
            const statusDot = document.getElementById('status-dot');
            statusDot.className = 'status-indicator';
            
            switch (status) {
                case 'online': statusDot.classList.add('status-online'); break;
                case 'idle': statusDot.classList.add('status-idle'); break;
                case 'dnd': statusDot.classList.add('status-dnd'); break;
                default: statusDot.classList.add('status-offline');
            }

            // Update Spotify State
            const spotify = data.data.spotify;
            if (spotify) {
                spotifyState = {
                    active: true,
                    start: spotify.timestamps.start,
                    end: spotify.timestamps.end,
                    song: spotify.song,
                    artist: spotify.artist,
                    art: spotify.album_art_url
                };

                // Update static info only if changed (to prevent flickering)
                const titleEl = document.getElementById('spotify-title');
                if (titleEl.innerText !== spotify.song) {
                    titleEl.innerText = spotify.song;
                    document.getElementById('spotify-artist').innerText = spotify.artist;
                    document.getElementById('spotify-art').src = spotify.album_art_url;
                    document.getElementById('spotify-card').style.display = 'block';
                }
            } else {
                spotifyState.active = false;
                document.getElementById('spotify-card').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Discord data error:', error);
    }
}

function updateProgress() {
    if (spotifyState.active) {
        const now = Date.now();
        const total = spotifyState.end - spotifyState.start;
        const current = now - spotifyState.start;
        const percentage = (current / total) * 100;

        document.getElementById('spotify-progress').style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
        document.getElementById('spotify-current').innerText = formatTime(Math.min(current, total));
        document.getElementById('spotify-total').innerText = formatTime(total);
    }
    requestAnimationFrame(updateProgress);
}

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000) / 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function typeWriter(text, element) {
    element.innerText = ""; // Clear existing
    element.classList.add('typing'); // Add cursor
    let i = 0;
    const speed = 150; // Typing speed in ms

    function type() {
        if (i < text.length) {
            element.innerText += text.charAt(i);
            i++;
            setTimeout(type, speed);
        } else {
            // Remove cursor when done
            setTimeout(() => {
                element.classList.remove('typing');
            }, 500); // 0.5s delay before removing for smoothness
        }
    }
    type();
}

fetchDiscordProfile();
setInterval(fetchDiscordProfile, 5000); // Poll API less frequently
requestAnimationFrame(updateProgress); // Smooth UI updates
