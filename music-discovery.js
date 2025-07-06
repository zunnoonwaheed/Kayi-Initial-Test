console.log("Spotify Music App Loading...")

class SpotifyMusicApp {
  constructor() {
    this.clientId = "a496fa67b4bb42899987cd469216e4f0"
    this.clientSecret = "101524d918b64888a9f89f11efcd6411"
    this.accessToken = null
    this.tokenExpiry = null

    this.currentAudio = null
    this.isPlaying = false
    this.searchTimeout = null
    this.currentFilter = "track"
    this.currentTrack = null
    this.currentPlayingCard = null
    this.currentActionTrack = null
    this.init()
  }

  async init() {
    console.log("Initializing Spotify Music App...")
    try {
      this.setupEventListeners()
      await this.getAccessToken()
      await this.loadInitialContent()
      this.hideLoading()
      this.showMainContent()
      console.log("App initialized successfully")
    } catch (error) {
      console.error("Initialization failed:", error)
      this.showError()
    }
  }

  setupEventListeners() {
    const searchInput = document.getElementById("searchInput")
    const searchBtn = document.getElementById("searchBtn")
    const clearBtn = document.getElementById("clearBtn")

    if (searchInput) {
      searchInput.addEventListener("input", (e) => this.handleSearchInput(e.target.value))
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.performSearch(e.target.value)
      })
    }

    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        const query = searchInput?.value?.trim()
        if (query) this.performSearch(query)
      })
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearSearch())
    }

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.setFilter(e.target.dataset.type))
    })

    const playPauseBtn = document.getElementById("playPauseBtn")
    const closePlayer = document.getElementById("closePlayer")
    const progressBar = document.getElementById("progressBar")
    const openSpotify = document.getElementById("openSpotify")

    if (playPauseBtn) {
      playPauseBtn.addEventListener("click", () => this.togglePlayPause())
    }

    if (closePlayer) {
      closePlayer.addEventListener("click", () => this.closePlayer())
    }

    if (progressBar) {
      progressBar.addEventListener("click", (e) => this.seekAudio(e))
    }

    if (openSpotify) {
      openSpotify.addEventListener("click", () => this.showSpotifyModal())
    }

    const closeModal = document.getElementById("closeModal")
    const cancelModal = document.getElementById("cancelModal")
    const openInSpotify = document.getElementById("openInSpotify")

    if (closeModal) {
      closeModal.addEventListener("click", () => this.hideSpotifyModal())
    }

    if (cancelModal) {
      cancelModal.addEventListener("click", () => this.hideSpotifyModal())
    }

    if (openInSpotify) {
      openInSpotify.addEventListener("click", () => this.openInSpotify())
    }

    const retryBtn = document.getElementById("retryBtn")
    if (retryBtn) {
      retryBtn.addEventListener("click", () => this.retry())
    }

    const modal = document.getElementById("spotifyModal")
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.hideSpotifyModal()
      })
    }

    const closeSongModal = document.getElementById("closeSongModal")
    const playPreviewBtn = document.getElementById("playPreviewBtn")
    const openSpotifyBtn = document.getElementById("openSpotifyBtn")

    if (closeSongModal) {
      closeSongModal.addEventListener("click", () => this.hideSongActionModal())
    }

    if (playPreviewBtn) {
      playPreviewBtn.addEventListener("click", () => {
        if (this.currentActionTrack && this.currentActionTrack.preview_url) {
          this.hideSongActionModal()
          this.playTrack(this.currentActionTrack, null)
        } else {
          this.showNotification("No preview available for this track", "error")
        }
      })
    }

    if (openSpotifyBtn) {
      openSpotifyBtn.addEventListener("click", () => {
        if (this.currentActionTrack) {
          this.openTrackInSpotify(this.currentActionTrack)
          this.hideSongActionModal()
        }
      })
    }

    const songActionModal = document.getElementById("songActionModal")
    if (songActionModal) {
      songActionModal.addEventListener("click", (e) => {
        if (e.target === songActionModal) this.hideSongActionModal()
      })
    }
  }

  async getAccessToken() {
    console.log("Getting access token...")
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return
    }

    try {
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + btoa(this.clientId + ":" + this.clientSecret),
        },
        body: "grant_type=client_credentials",
      })

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000
      console.log("Access token obtained")
    } catch (error) {
      console.error("Token request failed:", error)
      throw error
    }
  }

  async makeSpotifyRequest(endpoint, params = {}) {
    await this.getAccessToken()

    const url = new URL(`https://api.spotify.com/v1/${endpoint}`)
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key])
      }
    })

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    return response.json()
  }

  async loadInitialContent() {
    console.log("Loading initial content...")
    try {
      const tracksData = await this.makeSpotifyRequest("search", {
        q: "year:2023-2024 genre:pop",
        type: "track",
        market: "US",
        limit: 50,
      })

      const tracksWithPreviews = tracksData.tracks.items.filter((track) => track.preview_url)
      this.renderTracks(tracksWithPreviews.slice(0, 12), "featuredTracks")

      const artistsData = await this.makeSpotifyRequest("search", {
        q: "genre:pop",
        type: "artist",
        market: "US",
        limit: 12,
      })
      this.renderArtists(artistsData.artists.items, "featuredArtists")

      const albumsData = await this.makeSpotifyRequest("browse/new-releases", {
        country: "US",
        limit: 12,
      })
      this.renderAlbums(albumsData.albums.items, "featuredAlbums")
    } catch (error) {
      console.error("Failed to load content:", error)
      throw error
    }
  }

  renderTracks(tracks, containerId) {
    const container = document.getElementById(containerId)
    if (!container || !tracks?.length) return

    container.innerHTML = ""

    tracks.forEach((track, index) => {
      if (!track) return

      const card = document.createElement("div")
      card.className = "music-card track-card"
      card.style.animationDelay = `${index * 0.1}s`

      const image = this.getImageUrl(track.album?.images) || this.createPlaceholderImage()
      const artists = track.artists?.map((a) => a.name).join(", ") || "Unknown Artist"
      const duration = this.formatDuration(track.duration_ms)

      const trackData = {
        id: track.id,
        name: track.name,
        artist: artists,
        image: image,
        preview_url: track.preview_url,
        external_urls: track.external_urls,
        uri: track.uri,
      }

      card.innerHTML = `
      <img src="${image}" alt="${this.escapeHtml(track.name)}" class="track-image" loading="lazy" onerror="this.src='${this.createPlaceholderImage()}'">
      <div class="track-info">
        <div class="track-title">${this.escapeHtml(track.name)}</div>
        <div class="track-artist">${this.escapeHtml(artists)}</div>
      </div>
      <div class="track-duration">${duration}</div>
      <div class="track-actions">
        <button class="play-button" title="Play Options">🎵</button>
        <button class="spotify-link-btn" title="Open in Spotify">🔗</button>
      </div>
    `

      const playBtn = card.querySelector(".play-button")
      const spotifyBtn = card.querySelector(".spotify-link-btn")

      if (playBtn) {
        playBtn.addEventListener("click", (e) => {
          e.stopPropagation()
          console.log("Play options clicked for:", track.name)
          this.showSongActionModal(trackData)
        })
      }

      if (spotifyBtn) {
        spotifyBtn.addEventListener("click", (e) => {
          e.stopPropagation()
          console.log("Spotify button clicked for:", track.name)
          this.openTrackInSpotify(trackData)
        })
      }

      card.addEventListener("click", () => {
        this.showSongActionModal(trackData)
      })

      container.appendChild(card)
    })
  }

  renderArtists(artists, containerId) {
    const container = document.getElementById(containerId)
    if (!container || !artists?.length) return

    container.innerHTML = ""

    artists.forEach((artist, index) => {
      if (!artist) return

      const card = document.createElement("div")
      card.className = "music-card artist-card"
      card.style.animationDelay = `${index * 0.1}s`

      const image = this.getImageUrl(artist.images) || this.createPlaceholderImage()
      const followers = this.formatNumber(artist.followers?.total || 0)

      card.innerHTML = `
        <img src="${image}" alt="${this.escapeHtml(artist.name)}" class="artist-image" loading="lazy" onerror="this.src='${this.createPlaceholderImage()}'">
        <div class="artist-name">${this.escapeHtml(artist.name)}</div>
        <div class="artist-followers">${followers} followers</div>
      `

      // Add click to open in Spotify
      card.addEventListener("click", () => {
        if (artist.external_urls?.spotify) {
          window.open(artist.external_urls.spotify, "_blank")
        }
      })

      container.appendChild(card)
    })
  }

  renderAlbums(albums, containerId) {
    const container = document.getElementById(containerId)
    if (!container || !albums?.length) return

    container.innerHTML = ""

    albums.forEach((album, index) => {
      if (!album) return

      const card = document.createElement("div")
      card.className = "music-card album-card"
      card.style.animationDelay = `${index * 0.1}s`

      const image = this.getImageUrl(album.images) || this.createPlaceholderImage()
      const artists = album.artists?.map((a) => a.name).join(", ") || "Unknown Artist"
      const year = album.release_date ? new Date(album.release_date).getFullYear() : ""

      card.innerHTML = `
        <img src="${image}" alt="${this.escapeHtml(album.name)}" class="album-image" loading="lazy" onerror="this.src='${this.createPlaceholderImage()}'">
        <div class="album-title">${this.escapeHtml(album.name)}</div>
        <div class="album-artist">${this.escapeHtml(artists)}</div>
        <div class="album-year">${year}</div>
      `

      // Add click to open in Spotify
      card.addEventListener("click", () => {
        if (album.external_urls?.spotify) {
          window.open(album.external_urls.spotify, "_blank")
        }
      })

      container.appendChild(card)
    })
  }

  handleSearchInput(query) {
    const clearBtn = document.getElementById("clearBtn")
    if (clearBtn) {
      clearBtn.style.display = query ? "block" : "none"
    }

    clearTimeout(this.searchTimeout)
    this.searchTimeout = setTimeout(() => {
      if (query.trim()) {
        this.performSearch(query.trim())
      } else {
        this.clearSearchResults()
      }
    }, 500)
  }

  async performSearch(query) {
    console.log(`Searching for: ${query}`)
    try {
      const data = await this.makeSpotifyRequest("search", {
        q: query,
        type: this.currentFilter,
        market: "US",
        limit: 50, 
      })

      if (this.currentFilter === "track" && data.tracks?.items) {
        const tracksWithPreviews = data.tracks.items.filter((track) => track.preview_url)
        const tracksWithoutPreviews = data.tracks.items.filter((track) => !track.preview_url)

        data.tracks.items = [...tracksWithPreviews, ...tracksWithoutPreviews].slice(0, 20)
      }

      this.displaySearchResults(data, query)
    } catch (error) {
      console.error("Search failed:", error)
    }
  }

  displaySearchResults(data, query) {
    const searchResults = document.getElementById("searchResults")
    const searchContent = document.getElementById("searchContent")
    const searchTitle = document.getElementById("searchTitle")

    if (!searchResults || !searchContent) return

    searchTitle.textContent = `Search results for "${query}"`
    searchResults.style.display = "block"

    document.querySelectorAll(".music-section:not(#searchResults)").forEach((section) => {
      section.style.display = "none"
    })
    switch (this.currentFilter) {
      case "track":
        this.renderTracks(data.tracks?.items || [], "searchContent")
        break
      case "artist":
        this.renderArtists(data.artists?.items || [], "searchContent")
        break
      case "album":
        this.renderAlbums(data.albums?.items || [], "searchContent")
        break
      case "playlist":
        this.renderPlaylists(data.playlists?.items || [], "searchContent")
        break
    }
  }

  renderPlaylists(playlists, containerId) {
    const container = document.getElementById(containerId)
    if (!container || !playlists?.length) return

    container.innerHTML = ""

    playlists.forEach((playlist, index) => {
      if (!playlist) return

      const card = document.createElement("div")
      card.className = "music-card playlist-card"
      card.style.animationDelay = `${index * 0.1}s`

      const image = this.getImageUrl(playlist.images) || this.createPlaceholderImage()
      const description = playlist.description || "No description available"
      const tracks = playlist.tracks?.total || 0

      card.innerHTML = `
        <img src="${image}" alt="${this.escapeHtml(playlist.name)}" class="album-image" loading="lazy" onerror="this.src='${this.createPlaceholderImage()}'">
        <div class="album-title">${this.escapeHtml(playlist.name)}</div>
        <div class="album-artist">${this.escapeHtml(description)}</div>
        <div class="album-year">${tracks} tracks</div>
      `

      // Add click to open in Spotify
      card.addEventListener("click", () => {
        if (playlist.external_urls?.spotify) {
          window.open(playlist.external_urls.spotify, "_blank")
        }
      })

      container.appendChild(card)
    })
  }

  setFilter(type) {
    this.currentFilter = type
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === type)
    })

    const searchInput = document.getElementById("searchInput")
    if (searchInput?.value?.trim()) {
      this.performSearch(searchInput.value.trim())
    }
  }

  clearSearch() {
    const searchInput = document.getElementById("searchInput")
    const clearBtn = document.getElementById("clearBtn")

    if (searchInput) searchInput.value = ""
    if (clearBtn) clearBtn.style.display = "none"

    this.clearSearchResults()
  }

  clearSearchResults() {
    const searchResults = document.getElementById("searchResults")
    searchResults.style.display = "none"

    document.querySelectorAll(".music-section:not(#searchResults)").forEach((section) => {
      section.style.display = "block"
    })
  }

  playTrack(trackData, cardElement) {
    console.log("Playing track:", trackData.name)
    if (!trackData.preview_url) {
      console.log("No preview available for this track")
      this.showNotification("No preview available for this track", "error")
      return
    }

    if (this.currentPlayingCard) {
      this.currentPlayingCard.classList.remove("playing")
      const prevPlayBtn = this.currentPlayingCard.querySelector(".play-button")
      if (prevPlayBtn) prevPlayBtn.textContent = "🎵"
    }

    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }

    this.currentAudio = new Audio(trackData.preview_url)
    this.currentAudio.crossOrigin = "anonymous"
    this.currentAudio.volume = 0.7

    this.currentTrack = trackData
    this.currentPlayingCard = cardElement

    if (cardElement) {
      cardElement.classList.add("playing")
      const playBtn = cardElement.querySelector(".play-button")
      if (playBtn) playBtn.textContent = "⏸️"
    }

    this.updatePlayerUI(trackData)
    this.showPlayer()

    this.currentAudio.addEventListener("loadedmetadata", () => {
      console.log("Audio metadata loaded")
      this.updatePlayerTime()
    })

    this.currentAudio.addEventListener("timeupdate", () => {
      this.updateProgress()
    })

    this.currentAudio.addEventListener("ended", () => {
      console.log("Audio playback ended")
      this.stopPlayback()
    })

    this.currentAudio.addEventListener("error", (e) => {
      console.error("Audio error:", e)
      this.showNotification("Failed to play audio", "error")
      this.stopPlayback()
    })

    this.currentAudio
      .play()
      .then(() => {
        console.log("Audio playback started")
        this.isPlaying = true
        this.updatePlayButton()
        this.showNotification(`Now playing: ${trackData.name}`, "success")
      })
      .catch((error) => {
        console.error("Failed to play audio:", error)
        this.showNotification("Failed to start playback", "error")
        this.stopPlayback()
      })
  }

  updatePlayerUI(trackData) {
    const playerImage = document.getElementById("playerImage")
    const playerTitle = document.getElementById("playerTitle")
    const playerArtist = document.getElementById("playerArtist")

    if (playerImage) playerImage.src = trackData.image
    if (playerTitle) playerTitle.textContent = trackData.name
    if (playerArtist) playerArtist.textContent = trackData.artist
  }

  showPlayer() {
    const player = document.getElementById("audioPlayer")
    if (player) {
      player.style.display = "flex"
    }
  }

  closePlayer() {
    console.log("Closing player")
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }

    if (this.currentPlayingCard) {
      this.currentPlayingCard.classList.remove("playing")
      const playBtn = this.currentPlayingCard.querySelector(".play-button")
      if (playBtn) playBtn.textContent = "▶️"
      this.currentPlayingCard = null
    }

    const player = document.getElementById("audioPlayer")
    if (player) {
      player.style.display = "none"
    }

    this.isPlaying = false
    this.currentTrack = null
    this.updatePlayButton()
  }

  togglePlayPause() {
    console.log("Toggle play/pause")
    if (!this.currentAudio) return

    if (this.isPlaying) {
      this.currentAudio.pause()
      this.isPlaying = false
      console.log("⏸️ Audio paused")
    } else {
      this.currentAudio
        .play()
        .then(() => {
          this.isPlaying = true
          console.log("▶️ Audio resumed")
        })
        .catch((error) => {
          console.error("Failed to resume audio:", error)
        })
    }

    this.updatePlayButton()
    this.updateCardPlayButton()
  }

  updatePlayButton() {
    const playPauseBtn = document.getElementById("playPauseBtn")
    if (playPauseBtn) {
      playPauseBtn.textContent = this.isPlaying ? "⏸️" : "▶️"
    }
  }

  updateCardPlayButton() {
    if (this.currentPlayingCard) {
      const playBtn = this.currentPlayingCard.querySelector(".play-button")
      if (playBtn) {
        playBtn.textContent = this.isPlaying ? "⏸️" : "▶️"
      }
    }
  }

  updateProgress() {
    if (!this.currentAudio) return

    const progress = (this.currentAudio.currentTime / this.currentAudio.duration) * 100
    const progressFill = document.getElementById("progressFill")
    const currentTime = document.getElementById("currentTime")

    if (progressFill) {
      progressFill.style.width = `${progress}%`
    }

    if (currentTime) {
      currentTime.textContent = this.formatTime(this.currentAudio.currentTime)
    }
  }

  updatePlayerTime() {
    if (!this.currentAudio) return

    const totalTime = document.getElementById("totalTime")
    if (totalTime) {
      totalTime.textContent = this.formatTime(this.currentAudio.duration)
    }
  }

  seekAudio(event) {
    if (!this.currentAudio) return

    const progressBar = event.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    const seekTime = percent * this.currentAudio.duration

    this.currentAudio.currentTime = seekTime
    console.log("🎵 Seeked to:", this.formatTime(seekTime))
  }

  stopPlayback() {
    console.log("🎵 Stopping playback")
    this.isPlaying = false
    this.updatePlayButton()

    if (this.currentPlayingCard) {
      this.currentPlayingCard.classList.remove("playing")
      const playBtn = this.currentPlayingCard.querySelector(".play-button")
      if (playBtn) playBtn.textContent = "▶️"
    }

    const progressFill = document.getElementById("progressFill")
    if (progressFill) {
      progressFill.style.width = "0%"
    }

    const currentTime = document.getElementById("currentTime")
    if (currentTime) {
      currentTime.textContent = "0:00"
    }
  }

  showSpotifyModal(trackData = null) {
    const modal = document.getElementById("spotifyModal")
    const modalTrackImage = document.getElementById("modalTrackImage")
    const modalTrackTitle = document.getElementById("modalTrackTitle")
    const modalTrackArtist = document.getElementById("modalTrackArtist")

    const track = trackData || this.currentTrack
    if (!track) return

    if (modalTrackImage) modalTrackImage.src = track.image
    if (modalTrackTitle) modalTrackTitle.textContent = track.name
    if (modalTrackArtist) modalTrackArtist.textContent = track.artist

    this.modalTrack = track

    if (modal) {
      modal.style.display = "flex"
    }
  }

  hideSpotifyModal() {
    const modal = document.getElementById("spotifyModal")
    if (modal) {
      modal.style.display = "none"
    }
  }

  openInSpotify() {
    if (!this.modalTrack) return

    let spotifyUrl = null

    if (this.modalTrack.external_urls?.spotify) {
      spotifyUrl = this.modalTrack.external_urls.spotify
    } else if (this.modalTrack.uri) {
      spotifyUrl = `https://open.spotify.com/track/${this.modalTrack.uri.split(":")[2]}`
    } else if (this.modalTrack.id) {
      spotifyUrl = `https://open.spotify.com/track/${this.modalTrack.id}`
    }

    if (spotifyUrl) {
      console.log("🎵 Opening in Spotify:", spotifyUrl)
      window.open(spotifyUrl, "_blank")
    } else {
      const searchQuery = encodeURIComponent(`${this.modalTrack.name} ${this.modalTrack.artist}`)
      const searchUrl = `https://open.spotify.com/search/${searchQuery}`
      console.log("🎵 Opening Spotify search:", searchUrl)
      window.open(searchUrl, "_blank")
    }

    this.hideSpotifyModal()
  }

  showSongActionModal(trackData) {
    const modal = document.getElementById("songActionModal")
    const actionTrackImage = document.getElementById("actionTrackImage")
    const actionTrackTitle = document.getElementById("actionTrackTitle")
    const actionTrackArtist = document.getElementById("actionTrackArtist")

    if (!trackData) return

    if (actionTrackImage) actionTrackImage.src = trackData.image
    if (actionTrackTitle) actionTrackTitle.textContent = trackData.name
    if (actionTrackArtist) actionTrackArtist.textContent = trackData.artist

    this.currentActionTrack = trackData

    const playPreviewBtn = document.getElementById("playPreviewBtn")
    if (playPreviewBtn) {
      if (trackData.preview_url) {
        playPreviewBtn.disabled = false
        playPreviewBtn.style.opacity = "1"
        playPreviewBtn.style.cursor = "pointer"
        const btnSubtitle = playPreviewBtn.querySelector(".btn-subtitle")
        if (btnSubtitle) btnSubtitle.textContent = "30-second preview"
      } else {
        playPreviewBtn.disabled = true
        playPreviewBtn.style.opacity = "0.6"
        playPreviewBtn.style.cursor = "not-allowed"
        const btnSubtitle = playPreviewBtn.querySelector(".btn-subtitle")
        if (btnSubtitle) btnSubtitle.textContent = "No preview available"
      }
    }

    if (modal) {
      modal.style.display = "flex"
    }
  }

  hideSongActionModal() {
    const modal = document.getElementById("songActionModal")
    if (modal) {
      modal.style.display = "none"
    }
  }

  openTrackInSpotify(trackData) {
    let spotifyUrl = null

    if (trackData.external_urls?.spotify) {
      spotifyUrl = trackData.external_urls.spotify
    } else if (trackData.uri) {
      spotifyUrl = `https://open.spotify.com/track/${trackData.uri.split(":")[2]}`
    } else if (trackData.id) {
      spotifyUrl = `https://open.spotify.com/track/${trackData.id}`
    }

    if (spotifyUrl) {
      console.log("🎵 Opening in Spotify:", spotifyUrl)
      window.open(spotifyUrl, "_blank")
    } else {
      // Fallback: search for the track
      const searchQuery = encodeURIComponent(`${trackData.name} ${trackData.artist}`)
      const searchUrl = `https://open.spotify.com/search/${searchQuery}`
      console.log("🎵 Opening Spotify search:", searchUrl)
      window.open(searchUrl, "_blank")
    }
  }

  getImageUrl(images) {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return null
    }
    return images[0]?.url || null
  }

  createPlaceholderImage() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23333'/%3E%3Ctext x='150' y='160' text-anchor='middle' fill='%23fff' font-size='60'%3E♪%3C/text%3E%3C/svg%3E"
  }

  formatDuration(ms) {
    if (!ms) return "0:00"
    const minutes = Math.floor(ms / 60000)
    const seconds = ((ms % 60000) / 1000).toFixed(0)
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins + ":" + (secs < 10 ? "0" : "") + secs
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  escapeHtml(text) {
    if (!text) return ""
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  hideLoading() {
    const loadingState = document.getElementById("loadingState")
    if (loadingState) {
      loadingState.style.display = "none"
    }
  }

  showMainContent() {
    const mainContent = document.getElementById("mainContent")
    if (mainContent) {
      mainContent.style.display = "block"
    }
  }

  showError() {
    const loadingState = document.getElementById("loadingState")
    const errorState = document.getElementById("errorState")
    if (loadingState) loadingState.style.display = "none"
    if (errorState) errorState.style.display = "block"
  }

  retry() {
    const errorState = document.getElementById("errorState")
    const loadingState = document.getElementById("loadingState")
    if (errorState) errorState.style.display = "none"
    if (loadingState) loadingState.style.display = "block"
    this.init()
  }

  showNotification(message, type = "info") {
    const existingNotification = document.querySelector(".notification")
    if (existingNotification) {
      existingNotification.remove()
    }

    const notification = document.createElement("div")
    notification.className = `notification notification-${type}`
    notification.textContent = message

    document.body.appendChild(notification)
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 3000)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, starting Spotify Music App...")
  setTimeout(() => {
    try {
      new SpotifyMusicApp()
    } catch (error) {
      console.error("Failed to initialize app:", error)
    }
  }, 100)
})

console.log("Spotify Music loaded")
