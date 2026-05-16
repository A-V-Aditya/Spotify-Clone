document.addEventListener('DOMContentLoaded', () => {
    // === Authentication Logic ===
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const authTitle = document.getElementById('auth-title');
    const authBtn = document.getElementById('auth-btn');
    const authFooterText = document.getElementById('auth-footer-text');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    let isLoginMode = true;

    // Check auth state
    if (localStorage.getItem('isMusicAppAuthenticated') === 'true') {
        showApp();
    }

    function handleToggleAuth() {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authTitle.textContent = 'Log in to Music App';
            authBtn.textContent = 'Log In';
            authFooterText.innerHTML = 'Don\'t have an account? <span id="toggle-auth" style="color: var(--primary); cursor: pointer; text-decoration: underline;">Sign up</span>';
        } else {
            authTitle.textContent = 'Sign up for Music App';
            authBtn.textContent = 'Sign Up';
            authFooterText.innerHTML = 'Already have an account? <span id="toggle-auth" style="color: var(--primary); cursor: pointer; text-decoration: underline;">Log in</span>';
        }
        document.getElementById('toggle-auth').addEventListener('click', handleToggleAuth);
    }

    document.getElementById('toggle-auth').addEventListener('click', handleToggleAuth);

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = usernameInput.value.trim();
        const password = passwordInput.value;
        const users = JSON.parse(localStorage.getItem('musicAppUsers') || '{}');

        if (isLoginMode) {
            if (users[email] && users[email] === password) {
                localStorage.setItem('isMusicAppAuthenticated', 'true');
                showApp();
            } else {
                alert('Invalid email or password. Please try again or sign up.');
            }
        } else {
            if (users[email]) {
                alert('Account already exists with this email.');
            } else {
                users[email] = password;
                localStorage.setItem('musicAppUsers', JSON.stringify(users));
                localStorage.setItem('isMusicAppAuthenticated', 'true');
                showApp();
            }
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('isMusicAppAuthenticated');
        showAuth();
        // pause audio if playing
        if (typeof audioPlayer !== 'undefined' && audioPlayer.src) {
            audioPlayer.pause();
        }
        isPlaying = false;
        updatePlayBtn();
    });

    function showApp() {
        authView.classList.add('hidden');
        appView.classList.remove('hidden');
        renderPlaylists();
        loadLikedSongs();
        loadUserPlaylists();
    }

    function showAuth() {
        authView.classList.remove('hidden');
        appView.classList.add('hidden');
        usernameInput.value = '';
        passwordInput.value = '';
    }

    // === Track Data ===
    const rawTracks = [
        {
            id: 1,
            artist: "Synthwave",
            url: "https://res.cloudinary.com/dc5x95nig/video/upload/q_auto/f_auto/v1778163705/sc_s2_ag4gqd.mp3"
        },
        {
            id: 2,
            artist: "Lofi Chill",
            url: "https://res.cloudinary.com/dc5x95nig/video/upload/q_auto/f_auto/v1778163600/sc_s1_kxcvnk.mp3"
        }
    ];

    // Process track names from URL and remove covers
    const tracks = rawTracks.map(track => {
        const parts = track.url.split('/');
        let filename = parts[parts.length - 1];
        // Remove .mp3 or other extensions for display
        filename = filename.replace(/\.[^/.]+$/, "");
        return {
            ...track,
            title: filename
        };
    });

    let currentTrackIndex = -1; // -1 means no track loaded yet
    let isPlaying = false;
    let likedSongIds = JSON.parse(localStorage.getItem('musicAppLikedSongs') || '[]');
    let userPlaylists = JSON.parse(localStorage.getItem('musicAppPlaylists') || '[]');

    let currentViewingPlaylistIndex = -1;
    let trackToAddId = null;

    // === UI Elements ===
    const featuredGrid = document.getElementById('featured-grid');
    const playlistGrid = document.getElementById('playlist-grid');
    const searchResults = document.getElementById('search-results');
    const libraryPlaylists = document.getElementById('library-playlists');
    const likedSongsList = document.getElementById('liked-songs-list');
    const playlistDetailsList = document.getElementById('playlist-details-list');
    const playlistDetailsTitle = document.getElementById('playlist-details-title');
    const deletePlaylistBtn = document.getElementById('delete-playlist-btn');
    
    // Views
    const views = {
        home: document.getElementById('home-view'),
        search: document.getElementById('search-view'),
        library: document.getElementById('library-view'),
        liked: document.getElementById('liked-songs-view'),
        playlistDetails: document.getElementById('playlist-details-view')
    };

    // Nav Items
    const navItems = {
        home: document.getElementById('nav-home'),
        search: document.getElementById('nav-search'),
        library: document.getElementById('nav-library')
    };

    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.crossOrigin = "anonymous";
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.getElementById('progress-bar');
    const volumeBar = document.getElementById('volume-bar');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const currentTitleEl = document.getElementById('current-title');
    const currentArtistEl = document.getElementById('current-artist');
    const searchInput = document.getElementById('search-input');
    const heartBtn = document.querySelector('.player-bar .heart');
    const createPlaylistBtn = document.getElementById('nav-create-playlist');
    const navLikedSongsBtn = document.getElementById('nav-liked-songs');

    // Modal UI
    const playlistModal = document.getElementById('playlist-modal');
    const modalPlaylistList = document.getElementById('modal-playlist-list');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // === Navigation Logic ===
    function switchView(viewName) {
        // Hide all views
        Object.values(views).forEach(v => v.classList.add('hidden'));
        // Remove active class from nav
        Object.values(navItems).forEach(n => {
            if (n) n.classList.remove('active');
        });
        
        // Show target view
        if (views[viewName]) {
            views[viewName].classList.remove('hidden');
        }
        if (navItems[viewName]) {
            navItems[viewName].classList.add('active');
        }
    }

    navItems.home.addEventListener('click', () => switchView('home'));
    navItems.search.addEventListener('click', () => switchView('search'));
    navItems.library.addEventListener('click', () => switchView('library'));
    navLikedSongsBtn.addEventListener('click', () => switchView('liked'));

    // Helper to get add to playlist button
    function getAddBtnHTML(trackId) {
        return `<button class="icon-btn add-to-pl-btn" data-id="${trackId}" title="Add to Playlist" style="margin-right: 12px; font-size: 14px;"><i class="fas fa-plus"></i></button>`;
    }

    // Attach listener for add to playlist buttons inside lists
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-pl-btn');
        if (btn) {
            e.stopPropagation();
            trackToAddId = parseInt(btn.getAttribute('data-id'));
            openPlaylistModal();
        }
    });

    // Modal Logic
    function openPlaylistModal() {
        if (userPlaylists.length === 0) {
            alert('You do not have any playlists. Please create one first!');
            return;
        }
        modalPlaylistList.innerHTML = '';
        userPlaylists.forEach((pl, index) => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.style.backgroundColor = 'rgba(255,255,255,0.05)';
            item.innerHTML = `<div class="item-info"><div class="item-title">${pl.name}</div></div>`;
            item.addEventListener('click', () => {
                if (!pl.tracks.includes(trackToAddId)) {
                    pl.tracks.push(trackToAddId);
                    localStorage.setItem('musicAppPlaylists', JSON.stringify(userPlaylists));
                    loadUserPlaylists();
                    // Refresh current open playlist details if active
                    if (views.playlistDetails && !views.playlistDetails.classList.contains('hidden') && currentViewingPlaylistIndex === index) {
                        renderPlaylistDetails(index);
                    }
                }
                closePlaylistModal();
            });
            modalPlaylistList.appendChild(item);
        });
        playlistModal.classList.remove('hidden');
    }

    function closePlaylistModal() {
        playlistModal.classList.add('hidden');
        trackToAddId = null;
    }

    closeModalBtn.addEventListener('click', closePlaylistModal);

    function renderPlaylists() {
        if (featuredGrid.children.length > 0) return; // Prevent double rendering
        
        featuredGrid.innerHTML = '';
        playlistGrid.innerHTML = '';

        tracks.forEach((track, index) => {
            // Render Featured Item
            const featuredItem = document.createElement('div');
            featuredItem.className = 'featured-item';
            featuredItem.innerHTML = `
                <div class="default-cover-icon"><i class="fas fa-music"></i></div>
                <div class="info">${track.title}</div>
            `;
            featuredItem.addEventListener('click', () => playTrack(index));
            featuredGrid.appendChild(featuredItem);

            // Render Playlist Card
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="default-cover-icon"><i class="fas fa-music"></i></div>
                <h3>${track.title}</h3>
                <p>${track.artist}</p>
                <button class="play-hover-btn"><i class="fas fa-play" style="margin-left: 2px;"></i></button>
            `;
            card.addEventListener('click', () => playTrack(index));
            playlistGrid.appendChild(card);
        });
    }

    // === Search Logic ===
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        searchResults.innerHTML = '';
        
        if (!query) return;

        const filtered = tracks.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
        
        if (filtered.length === 0) {
            searchResults.innerHTML = '<p style="color: var(--text-subdued); padding: 16px;">No results found.</p>';
            return;
        }

        filtered.forEach(track => {
            const index = tracks.findIndex(t => t.id === track.id);
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-icon"><i class="fas fa-music"></i></div>
                <div class="item-info">
                    <div class="item-title">${track.title}</div>
                    <div class="item-artist">${track.artist}</div>
                </div>
                ${getAddBtnHTML(track.id)}
                <button class="icon-btn" style="opacity: 0.7;"><i class="fas fa-play"></i></button>
            `;
            item.addEventListener('click', (ev) => {
                if(!ev.target.closest('.add-to-pl-btn')) {
                    playTrack(index);
                }
            });
            searchResults.appendChild(item);
        });
    });

    // === Liked Songs Logic ===
    function loadLikedSongs() {
        likedSongsList.innerHTML = '';
        const likedTracks = tracks.filter(t => likedSongIds.includes(t.id));

        if (likedTracks.length === 0) {
            likedSongsList.innerHTML = '<p style="color: var(--text-subdued); padding: 16px;">You haven\'t liked any songs yet.</p>';
            return;
        }

        likedTracks.forEach(track => {
            const index = tracks.findIndex(t => t.id === track.id);
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-icon"><i class="fas fa-music"></i></div>
                <div class="item-info">
                    <div class="item-title">${track.title}</div>
                    <div class="item-artist">${track.artist}</div>
                </div>
                ${getAddBtnHTML(track.id)}
                <button class="icon-btn" style="color: var(--primary);"><i class="fas fa-heart"></i></button>
            `;
            item.addEventListener('click', (ev) => {
                if(!ev.target.closest('.add-to-pl-btn')) {
                    playTrack(index);
                }
            });
            likedSongsList.appendChild(item);
        });
    }

    function toggleLike() {
        if (currentTrackIndex === -1) return;
        const currentTrack = tracks[currentTrackIndex];
        
        if (likedSongIds.includes(currentTrack.id)) {
            likedSongIds = likedSongIds.filter(id => id !== currentTrack.id);
            heartBtn.innerHTML = '<i class="far fa-heart"></i>';
            heartBtn.style.color = '';
        } else {
            likedSongIds.push(currentTrack.id);
            heartBtn.innerHTML = '<i class="fas fa-heart"></i>';
            heartBtn.style.color = 'var(--primary)';
        }
        
        localStorage.setItem('musicAppLikedSongs', JSON.stringify(likedSongIds));
        loadLikedSongs(); // refresh the view
    }

    heartBtn.addEventListener('click', toggleLike);

    // === Playlists Logic ===
    function loadUserPlaylists() {
        libraryPlaylists.innerHTML = '';
        
        if (userPlaylists.length === 0) {
            libraryPlaylists.innerHTML = '<p style="color: var(--text-subdued); padding: 16px; grid-column: 1/-1;">Create your first playlist!</p>';
            return;
        }

        userPlaylists.forEach((playlist, pIndex) => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="default-cover-icon" style="background-color: #282828; width: 100%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 48px; border-radius: 4px; margin-bottom: 16px;">
                    <i class="fas fa-music"></i>
                </div>
                <h3>${playlist.name}</h3>
                <p>${playlist.tracks.length} songs</p>
            `;
            
            // View playlist details when clicking the card
            card.addEventListener('click', () => {
                renderPlaylistDetails(pIndex);
            });
            libraryPlaylists.appendChild(card);
        });
    }

    function renderPlaylistDetails(index) {
        currentViewingPlaylistIndex = index;
        const playlist = userPlaylists[index];
        playlistDetailsTitle.textContent = playlist.name;
        playlistDetailsList.innerHTML = '';

        if (playlist.tracks.length === 0) {
            playlistDetailsList.innerHTML = '<p style="color: var(--text-subdued); padding: 16px;">This playlist is empty. Add songs to it!</p>';
        } else {
            playlist.tracks.forEach(trackId => {
                const trackIndex = tracks.findIndex(t => t.id === trackId);
                if (trackIndex === -1) return;
                const track = tracks[trackIndex];
                
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <div class="list-item-icon"><i class="fas fa-music"></i></div>
                    <div class="item-info">
                        <div class="item-title">${track.title}</div>
                        <div class="item-artist">${track.artist}</div>
                    </div>
                    <button class="icon-btn remove-from-pl-btn" title="Remove from Playlist" style="margin-right: 12px; color: var(--text-subdued);"><i class="fas fa-trash"></i></button>
                    <button class="icon-btn" style="opacity: 0.7;"><i class="fas fa-play"></i></button>
                `;
                
                item.querySelector('.remove-from-pl-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    playlist.tracks = playlist.tracks.filter(id => id !== track.id);
                    localStorage.setItem('musicAppPlaylists', JSON.stringify(userPlaylists));
                    renderPlaylistDetails(index);
                    loadUserPlaylists();
                });

                item.addEventListener('click', (ev) => {
                    if(!ev.target.closest('.remove-from-pl-btn')) {
                        playTrack(trackIndex);
                    }
                });
                playlistDetailsList.appendChild(item);
            });
        }
        
        switchView('playlistDetails');
    }

    deletePlaylistBtn.addEventListener('click', () => {
        if (currentViewingPlaylistIndex !== -1) {
            if (confirm("Are you sure you want to delete this playlist?")) {
                userPlaylists.splice(currentViewingPlaylistIndex, 1);
                localStorage.setItem('musicAppPlaylists', JSON.stringify(userPlaylists));
                loadUserPlaylists();
                switchView('library');
            }
        }
    });

    createPlaylistBtn.addEventListener('click', () => {
        const name = prompt("Enter playlist name:");
        if (name && name.trim()) {
            userPlaylists.push({
                name: name.trim(),
                tracks: []
            });
            localStorage.setItem('musicAppPlaylists', JSON.stringify(userPlaylists));
            loadUserPlaylists();
            switchView('library');
        }
    });

    // Add + button next to player heart
    const playerTrackInfo = document.querySelector('.now-playing');
    const plAddBtnPlayer = document.createElement('button');
    plAddBtnPlayer.className = 'icon-btn';
    plAddBtnPlayer.innerHTML = '<i class="fas fa-plus"></i>';
    plAddBtnPlayer.title = "Add to Playlist";
    plAddBtnPlayer.style.marginLeft = "14px";
    plAddBtnPlayer.addEventListener('click', () => {
        if (currentTrackIndex !== -1) {
            trackToAddId = tracks[currentTrackIndex].id;
            openPlaylistModal();
        } else {
            alert("Play a song first.");
        }
    });
    playerTrackInfo.appendChild(plAddBtnPlayer);

    // === Player Logic ===
    function loadTrack(index) {
        currentTrackIndex = index;
        const track = tracks[index];
        audioPlayer.src = track.url;
        currentTitleEl.textContent = track.title;
        currentArtistEl.textContent = track.artist;
        
        // Update heart icon state
        if (likedSongIds.includes(track.id)) {
            heartBtn.innerHTML = '<i class="fas fa-heart"></i>';
            heartBtn.style.color = 'var(--primary)';
        } else {
            heartBtn.innerHTML = '<i class="far fa-heart"></i>';
            heartBtn.style.color = '';
        }

        // Reset progress
        progressBar.value = 0;
        progressBar.style.background = `linear-gradient(to right, var(--primary) 0%, #535353 0%)`;
        currentTimeEl.textContent = "0:00";
    }

    function playTrack(index) {
        if (currentTrackIndex !== index) {
            loadTrack(index);
        }
        audioPlayer.play().then(() => {
            isPlaying = true;
            updatePlayBtn();
        }).catch(err => {
            console.error("Error playing audio:", err);
            // In case of playback failure, revert play state
            isPlaying = false;
            updatePlayBtn();
        });
    }

    function togglePlay() {
        if (currentTrackIndex !== -1 && audioPlayer.src) {
            if (isPlaying) {
                audioPlayer.pause();
                isPlaying = false;
                updatePlayBtn();
            } else {
                audioPlayer.play().then(() => {
                    isPlaying = true;
                    updatePlayBtn();
                }).catch(err => console.error("Playback error", err));
            }
        } else if (tracks.length > 0) {
            // Play first track if nothing is loaded
            playTrack(0);
        }
    }

    function updatePlayBtn() {
        if (isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play" style="margin-left: 2px;"></i>';
        }
    }

    function playNext() {
        if (tracks.length === 0) return;
        const newIndex = (currentTrackIndex + 1) % tracks.length;
        playTrack(newIndex);
    }

    function playPrev() {
        if (tracks.length === 0) return;
        // Standard behavior: restart song if more than 3 seconds in
        if (audioPlayer.currentTime > 3) {
            audioPlayer.currentTime = 0;
            if (!isPlaying) togglePlay();
        } else {
            // Otherwise go to previous song
            let newIndex = currentTrackIndex - 1;
            if (newIndex < 0) newIndex = tracks.length - 1;
            playTrack(newIndex);
        }
    }

    playPauseBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', playNext);
    prevBtn.addEventListener('click', playPrev);

    // Audio Event Listeners
    audioPlayer.addEventListener('timeupdate', () => {
        if (audioPlayer.duration) {
            const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.value = progressPercent;
            currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
            totalTimeEl.textContent = formatTime(audioPlayer.duration);
            
            // Sync slider background
            progressBar.style.background = `linear-gradient(to right, var(--primary) ${progressPercent}%, #535353 ${progressPercent}%)`;
        }
    });

    audioPlayer.addEventListener('ended', playNext);

    progressBar.addEventListener('input', (e) => {
        if (audioPlayer.duration) {
            const seekTime = (e.target.value / 100) * audioPlayer.duration;
            audioPlayer.currentTime = seekTime;
            // Immediate UI update while dragging
            progressBar.style.background = `linear-gradient(to right, var(--primary) ${e.target.value}%, #535353 ${e.target.value}%)`;
        }
    });

    volumeBar.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value;
        const volPercent = e.target.value * 100;
        volumeBar.style.background = `linear-gradient(to right, #fff ${volPercent}%, #535353 ${volPercent}%)`;
    });

    // Initial volume background setup
    volumeBar.style.background = `linear-gradient(to right, #fff 100%, #535353 100%)`;

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
});
