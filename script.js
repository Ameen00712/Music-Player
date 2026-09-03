const songs = [
  { title: "Song 1", file: "songs/song1.mp3", cover: "images/cover1.jpg" },
  { title: "Song 2", file: "songs/song2.mp3", cover: "images/cover2.jpg" }
];

const JAMENDO_CLIENT_ID = "9344e04f";
let currentSong = 0;
let shuffleOn = false;
let repeatOn = false;
let liked = new Set();
let source = "local";
let youtubeId = null;
let youtubePlayer = null;
let youtubeReady = false;
let youtubeTimer = null;

const $ = id => document.getElementById(id);
const audio = $("audio");
const title = $("title");
const artist = $("artist");
const cover = $("cover");
const playBtn = $("play");
const prevBtn = $("prev");
const nextBtn = $("next");
const shuffleBtn = $("shuffle");
const repeatBtn = $("repeat");
const progress = $("progress");
const currentTime = $("currentTime");
const duration = $("duration");
const volume = $("volume");
const likeBtn = $("like");
const search = $("search");
const toast = $("toast");
const songCards = $("songCards");
const searchCards = $("searchCards");
const libraryGrid = $("libraryGrid");

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function toastMsg(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function syncFullPlayer() {
  const fullTitle = $("fullTitle");
  const fullArtist = $("fullArtist");
  const fullCover = $("fullCover");
  const fullPlay = $("fullPlay");
  const fullCurrent = $("fullCurrent");
  const fullDuration = $("fullDuration");
  const fullProgress = $("fullProgressInput");
  const fullVolume = $("fullVolume");

  if (fullTitle) fullTitle.textContent = title?.textContent || "Song";
  if (fullArtist) fullArtist.textContent = artist?.textContent || "";
  if (fullCover) fullCover.src = cover?.src || "";
  if (fullPlay) fullPlay.innerHTML = playBtn?.innerHTML || '<i class="fa-solid fa-play"></i>';
  if (fullCurrent) fullCurrent.textContent = currentTime?.textContent || "0:00";
  if (fullDuration) fullDuration.textContent = duration?.textContent || "0:00";
  if (fullProgress && progress) fullProgress.value = progress.value;
  if (fullVolume && volume) fullVolume.value = volume.value;

  const fullLike = $("fullLike");
  if (fullLike) {
    fullLike.innerHTML = liked.has(currentSong)
      ? '<i class="fa-solid fa-heart"></i>'
      : '<i class="fa-regular fa-heart"></i>';
  }
}

function updateLike() {
  if (likeBtn) {
    likeBtn.innerHTML = liked.has(currentSong)
      ? '<i class="fa-solid fa-heart"></i>'
      : '<i class="fa-regular fa-heart"></i>';
    likeBtn.classList.toggle("liked", liked.has(currentSong));
  }
  syncFullPlayer();
}

function openNowPlaying() {
  syncFullPlayer();
  $("nowPlayingPage")?.classList.remove("hidden");
}

function closeNowPlaying() {
  $("nowPlayingPage")?.classList.add("hidden");
}

function stopYoutube() {
  clearInterval(youtubeTimer);
  youtubeTimer = null;
  if (youtubePlayer && youtubeReady) {
    try { youtubePlayer.stopVideo(); } catch (_) {}
  }
}

function setLocalSong(index, autoplay = false) {
  stopYoutube();
  source = "local";
  youtubeId = null;
  currentSong = (index + songs.length) % songs.length;
  const song = songs[currentSong];

  audio.pause();
  audio.src = song.file;
  audio.load();
  title.textContent = song.title;
  artist.textContent = "My Songs";
  cover.src = song.cover;
  currentTime.textContent = "0:00";
  progress.value = 0;
  updateLike();

  if (autoplay) audio.play().catch(() => toastMsg("This local audio file could not be played"));
  playBtn.innerHTML = autoplay ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
  syncFullPlayer();
}

function playJamendo(track) {
  stopYoutube();
  source = "jamendo";
  youtubeId = null;
  audio.pause();
  audio.src = track.audio;
  audio.load();
  title.textContent = track.title;
  artist.textContent = `${track.artist} • Jamendo`;
  cover.src = track.cover || "";
  currentTime.textContent = "0:00";
  progress.value = 0;
  updateLike();
  audio.play().then(() => {
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    syncFullPlayer();
  }).catch(() => toastMsg("This Jamendo track could not be played"));
}

function playYoutube(video) {
  source = "youtube";
  youtubeId = video.id;
  audio.pause();
  title.textContent = video.title;
  artist.textContent = `YouTube • ${video.channel || "Video"}`;
  cover.src = video.cover || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  currentTime.textContent = "0:00";
  duration.textContent = "0:00";
  progress.value = 0;
  syncFullPlayer();

  if (youtubeReady && youtubePlayer) {
    youtubePlayer.loadVideoById(video.id);
  } else {
    toastMsg("YouTube player is still loading…");
  }
}

function onYouTubeIframeAPIReady() {
  const element = $("youtubePlayer");
  if (!element || typeof YT === "undefined") return;

  youtubePlayer = new YT.Player(element, {
    width: "1",
    height: "1",
    videoId: "",
    playerVars: { playsinline: 1, rel: 0 },
    events: {
      onReady: () => {
        youtubeReady = true;
        if (youtubeId && source === "youtube") youtubePlayer.loadVideoById(youtubeId);
      },
      onStateChange: event => {
        if (event.data === YT.PlayerState.PLAYING) {
          playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
          startYoutubeProgress();
          syncFullPlayer();
        } else if (event.data === YT.PlayerState.PAUSED) {
          playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          clearInterval(youtubeTimer);
          syncFullPlayer();
        } else if (event.data === YT.PlayerState.ENDED) {
          clearInterval(youtubeTimer);
          if (repeatOn) youtubePlayer.playVideo();
          else playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          syncFullPlayer();
        }
      }
    }
  });
}

function startYoutubeProgress() {
  clearInterval(youtubeTimer);
  youtubeTimer = setInterval(() => {
    if (!youtubePlayer || source !== "youtube") return;
    const total = youtubePlayer.getDuration();
    const now = youtubePlayer.getCurrentTime();
    currentTime.textContent = formatTime(now);
    duration.textContent = formatTime(total);
    progress.value = total ? (now / total) * 100 : 0;
    syncFullPlayer();
  }, 500);
}

function makeCard(song, index) {
  const card = document.createElement("article");
  card.className = "songCard";
  card.innerHTML = `<img src="${song.cover}" alt="${song.title}"><h3>${song.title}</h3><p>My Songs • Local track</p><button class="cardPlay" data-index="${index}" type="button"><i class="fa-solid fa-play"></i></button>`;
  return card;
}

function makeYoutubeCard(video) {
  const card = document.createElement("article");
  card.className = "songCard youtubeCard";
  card.innerHTML = `<img src="${video.cover}" alt=""><h3 title="${video.title}">${video.title}</h3><p>YouTube • ${video.channel || "Video"}</p><button class="cardPlay ytPlay" type="button"><i class="fa-solid fa-play"></i></button>`;
  card.querySelector(".ytPlay").addEventListener("click", event => {
    event.stopPropagation();
    playYoutube(video);
  });
  return card;
}

function makeJamendoCard(track) {
  const card = document.createElement("article");
  card.className = "songCard jamendoCard";
  card.innerHTML = `<img src="${track.cover || ""}" alt=""><h3 title="${track.title}">${track.title}</h3><p>${track.artist} • Jamendo</p><button class="cardPlay jamPlay" type="button"><i class="fa-solid fa-play"></i></button>`;
  card.querySelector(".jamPlay").addEventListener("click", event => {
    event.stopPropagation();
    playJamendo(track);
  });
  return card;
}

function renderLocalCards(target) {
  if (!target) return;
  target.innerHTML = "";
  songs.forEach((song, index) => target.appendChild(makeCard(song, index)));
}

function renderLibrary() {
  if (!libraryGrid) return;
  libraryGrid.innerHTML = "";
  songs.forEach((song, index) => {
    const row = document.createElement("div");
    row.className = "libraryRow";
    row.innerHTML = `<img src="${song.cover}" alt=""><div><h3>${song.title}</h3><p>Local track • ${liked.has(index) ? "Liked" : "In your library"}</p></div>`;
    row.addEventListener("click", () => setLocalSong(index, true));
    libraryGrid.appendChild(row);
  });
}

function showView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.add("hidden"));
  const view = $(name + "View");
  if (!view) return;
  view.classList.remove("hidden");
  document.querySelectorAll(".navItem").forEach(button => button.classList.toggle("active", button.dataset.view === name));
  if (name === "library") renderLibrary();
  if (name === "search") search?.focus();
}

function extractYoutubeId(text) {
  try {
    const url = new URL(text);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0];
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || url.pathname.split("/").pop();
  } catch (_) {}
  return null;
}

async function searchJamendo(query) {
  const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${encodeURIComponent(JAMENDO_CLIENT_ID)}&format=json&limit=12&type=single%20albumtrack&audioformat=mp32&search=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data?.headers?.status !== "success") throw new Error("Jamendo search failed");
  return (data.results || []).filter(track => track.audio).map(track => ({
    id: track.id,
    title: track.name,
    artist: track.artist_name || "Unknown artist",
    cover: track.image || track.album_image,
    audio: track.audio
  }));
}

async function searchYoutube(query) {
  const key = localStorage.getItem("youtubeApiKey");
  if (!key) return [];
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=12&q=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "YouTube API error");
  return (data.items || []).filter(item => item.id?.videoId).map(item => ({
    id: item.id.videoId,
    title: item.snippet.title.replace(/<[^>]*>/g, ""),
    channel: item.snippet.channelTitle,
    cover: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url
  }));
}

async function loadTrending() {
  if (!songCards) return;
  const key = localStorage.getItem("youtubeApiKey");
  if (!key) {
    renderLocalCards(songCards);
    return;
  }

  songCards.innerHTML = '<p class="empty">Loading India’s trending music…</p>';
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=IN&videoCategoryId=10&maxResults=12&key=${encodeURIComponent(key)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Trending request failed");
    songCards.innerHTML = "";
    (data.items || []).forEach(item => songCards.appendChild(makeYoutubeCard({
      id: item.id,
      title: item.snippet?.title?.replace(/<[^>]*>/g, "") || "Untitled",
      channel: item.snippet?.channelTitle || "YouTube Music",
      cover: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url
    })));
    if (!data.items?.length) renderLocalCards(songCards);
  } catch (_) {
    renderLocalCards(songCards);
    toastMsg("India trending unavailable — showing your local songs");
  }
}

async function searchAll(query) {
  showView("search");
  searchCards.innerHTML = '<p class="empty">Searching Jamendo and YouTube…</p>';
  const results = await Promise.allSettled([searchJamendo(query), searchYoutube(query)]);
  const jamendo = results[0].status === "fulfilled" ? results[0].value : [];
  const youtube = results[1].status === "fulfilled" ? results[1].value : [];
  searchCards.innerHTML = "";
  jamendo.forEach(track => searchCards.appendChild(makeJamendoCard(track)));
  youtube.forEach(video => searchCards.appendChild(makeYoutubeCard(video)));
  if (!jamendo.length && !youtube.length) searchCards.innerHTML = '<p class="empty">No results. Try another search.</p>';
}

function togglePlay() {
  if (source === "youtube") {
    if (!youtubeReady || !youtubePlayer) {
      toastMsg("YouTube player is still loading");
      return;
    }
    const state = youtubePlayer.getPlayerState();
    state === YT.PlayerState.PLAYING ? youtubePlayer.pauseVideo() : youtubePlayer.playVideo();
    return;
  }
  if (audio.paused) audio.play().catch(() => toastMsg("This audio file could not be played"));
  else audio.pause();
}

function nextTrack() {
  if (source !== "local") {
    toastMsg("Choose another result to change tracks");
    return;
  }
  let next = currentSong + 1;
  if (shuffleOn && songs.length > 1) {
    do next = Math.floor(Math.random() * songs.length); while (next === currentSong);
  }
  setLocalSong(next, true);
}

function prevTrack() {
  if (source !== "local") {
    toastMsg("Previous is available for your local queue");
    return;
  }
  if (audio.currentTime > 3) audio.currentTime = 0;
  else setLocalSong(currentSong - 1, true);
}

function init() {
  setLocalSong(0, false);
  renderLocalCards(songCards);
  renderLocalCards(searchCards);
  loadTrending();

  playBtn?.addEventListener("click", togglePlay);
  nextBtn?.addEventListener("click", nextTrack);
  prevBtn?.addEventListener("click", prevTrack);

  shuffleBtn?.addEventListener("click", () => {
    shuffleOn = !shuffleOn;
    shuffleBtn.classList.toggle("active", shuffleOn);
    $("fullShuffle")?.classList.toggle("active", shuffleOn);
  });

  repeatBtn?.addEventListener("click", () => {
    repeatOn = !repeatOn;
    repeatBtn.classList.toggle("active", repeatOn);
    $("fullRepeat")?.classList.toggle("active", repeatOn);
  });

  likeBtn?.addEventListener("click", event => {
    event.stopPropagation();
    liked.has(currentSong) ? liked.delete(currentSong) : liked.add(currentSong);
    updateLike();
    renderLibrary();
  });

  $("fullLike")?.addEventListener("click", () => {
    liked.has(currentSong) ? liked.delete(currentSong) : liked.add(currentSong);
    updateLike();
    renderLibrary();
  });

  progress?.addEventListener("input", () => {
    const percent = Number(progress.value) / 100;
    if (source === "youtube" && youtubeReady && youtubePlayer) youtubePlayer.seekTo(percent * youtubePlayer.getDuration(), true);
    else if (audio.duration) audio.currentTime = percent * audio.duration;
  });

  $("fullProgressInput")?.addEventListener("input", event => {
    progress.value = event.target.value;
    progress.dispatchEvent(new Event("input"));
  });

  volume?.addEventListener("input", () => {
    audio.volume = Number(volume.value);
    if (youtubeReady && youtubePlayer) youtubePlayer.setVolume(Number(volume.value) * 100);
    syncFullPlayer();
  });

  $("fullVolume")?.addEventListener("input", event => {
    volume.value = event.target.value;
    volume.dispatchEvent(new Event("input"));
  });

  $("fullPlay")?.addEventListener("click", togglePlay);
  $("fullNext")?.addEventListener("click", nextTrack);
  $("fullPrev")?.addEventListener("click", prevTrack);
  $("fullShuffle")?.addEventListener("click", () => shuffleBtn?.click());
  $("fullRepeat")?.addEventListener("click", () => repeatBtn?.click());
  $("closeNowPlaying")?.addEventListener("click", closeNowPlaying);

  $("nowPlayingTrack")?.addEventListener("click", event => {
    if (event.target.closest("button")) return;
    openNowPlaying();
  });

  document.addEventListener("click", event => {
    const button = event.target.closest(".cardPlay");
    if (button?.dataset.index !== undefined) setLocalSong(Number(button.dataset.index), true);
  });

  document.querySelectorAll(".navItem").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  $("refreshTrending")?.addEventListener("click", loadTrending);
  $("back")?.addEventListener("click", () => history.back());
  $("forward")?.addEventListener("click", () => history.forward());
  $("queue")?.addEventListener("click", () => toastMsg(`${songs.length} local songs in queue`));
  $("addPlaylist")?.addEventListener("click", () => toastMsg("Playlist creation coming soon"));

  $("ytKey")?.addEventListener("click", () => {
    const oldKey = localStorage.getItem("youtubeApiKey") || "";
    const key = prompt("Paste your YouTube Data API v3 key.", oldKey);
    if (key === null) return;
    if (key.trim()) localStorage.setItem("youtubeApiKey", key.trim());
    else localStorage.removeItem("youtubeApiKey");
    toastMsg(key.trim() ? "YouTube key saved" : "YouTube key removed");
    if (key.trim()) loadTrending();
  });

  search?.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    const query = search.value.trim();
    if (!query) return;
    const id = extractYoutubeId(query);
    if (id) playYoutube({ id, title: "YouTube video", channel: "YouTube" });
    else searchAll(query);
  });

  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(audio.duration);
    syncFullPlayer();
  });

  audio.addEventListener("timeupdate", () => {
    if (source !== "youtube") {
      currentTime.textContent = formatTime(audio.currentTime);
      progress.value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      syncFullPlayer();
    }
  });

  audio.addEventListener("play", () => {
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    syncFullPlayer();
  });

  audio.addEventListener("pause", () => {
    if (source !== "youtube") playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    syncFullPlayer();
  });

  audio.addEventListener("ended", () => {
    if (repeatOn) {
      audio.currentTime = 0;
      audio.play();
    } else if (source === "local") {
      nextTrack();
    } else {
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      syncFullPlayer();
    }
  });

  syncFullPlayer();
}

window.addEventListener("DOMContentLoaded", init);