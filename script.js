const slideDuration = 6000;
const image = document.querySelector("#slide-photo");
const backdrop = document.querySelector(".photo-backdrop");
const slideDate = document.querySelector("#slide-date");
const slideMonth = document.querySelector("#slide-month");
const photoCaption = document.querySelector("#photo-caption");
const currentNumber = document.querySelector("#current-number");
const totalNumber = document.querySelector("#total-number");
const playStatus = document.querySelector("#play-status");
const progressTrack = document.querySelector("#progress-track");
const progressFill = document.querySelector("#progress-fill");
const timeline = document.querySelector("#timeline");
const lightbox = document.querySelector("#lightbox");
const lightboxPhoto = document.querySelector("#lightbox-photo");
const lightboxDate = document.querySelector("#lightbox-date");
const root = document.querySelector(".slideshow");
const songPlayer = document.querySelector("#song-player");
let photos = window.anniversaryPhotos ?? [];
let cards = [];
let currentIndex = 0;
let isPlaying = false;
let isMusicPlaying = false;
let timer;
let syncTimer;
let touchStartX = 0;

const monthFormatter = new Intl.DateTimeFormat("af-ZA", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("af-ZA", { day: "numeric", month: "long", year: "numeric" });

function photoDate(photo) {
  const [year, month, day] = photo.date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formattedDate(photo) {
  return dateFormatter.format(photoDate(photo));
}

function renderTimeline() {
  const fragment = document.createDocumentFragment();
  photos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.className = "memory-card";
    button.type = "button";
    button.setAttribute("aria-label", `Wys foto ${index + 1}: ${formattedDate(photo)}`);

    const imageWrap = document.createElement("span");
    imageWrap.className = "memory-card-image";
    const thumb = document.createElement("img");
    thumb.src = photo.src;
    thumb.alt = "";
    thumb.loading = "lazy";
    thumb.decoding = "async";
    imageWrap.append(thumb);

    const date = document.createElement("span");
    date.className = "memory-card-date";
    date.textContent = formattedDate(photo);
    const label = document.createElement("span");
    label.className = "memory-card-label";
    label.textContent = "’n dag van ons";

    button.append(imageWrap, date, label);
    button.addEventListener("click", () => goToPhoto(index));
    fragment.append(button);
  });
  timeline.replaceChildren(fragment);
  cards = [...timeline.children];
}

function resetProgress() {
  progressFill.classList.remove("is-playing");
  progressFill.style.animation = "none";
  void progressFill.offsetWidth;
  progressFill.style.animation = "";
  progressTrack.setAttribute("aria-valuenow", "0");
  progressFill.classList.toggle("is-synced", isMusicPlaying);
  progressFill.style.width = isMusicPlaying ? `${getSongProgress() * 100}%` : "";
  if (isPlaying && !isMusicPlaying) progressFill.classList.add("is-playing");
}

function getSongProgress() {
  return Number.isFinite(songPlayer.duration) && songPlayer.duration > 0
    ? Math.min(1, songPlayer.currentTime / songPlayer.duration)
    : 0;
}

function showPhoto(index) {
  if (!photos.length) return;
  currentIndex = (index + photos.length) % photos.length;
  const photo = photos[currentIndex];
  image.classList.remove("is-visible", "is-changing");
  image.src = photo.src;
  image.alt = `Memory van ons, ${formattedDate(photo)}`;
  image.onload = () => {
    image.classList.add("is-visible", "is-changing");
    backdrop.style.backgroundImage = `url("${photo.src}")`;
  };
  if (image.complete && image.naturalWidth) image.onload();
  slideDate.textContent = formattedDate(photo);
  slideMonth.textContent = monthFormatter.format(photoDate(photo));
  photoCaption.textContent = "’n memory van ons";
  currentNumber.textContent = String(currentIndex + 1).padStart(2, "0");
  totalNumber.textContent = String(photos.length).padStart(2, "0");
  cards.forEach((card, cardIndex) => {
    card.classList.toggle("is-current", cardIndex === currentIndex);
    if (cardIndex === currentIndex) card.setAttribute("aria-current", "true");
    else card.removeAttribute("aria-current");
  });
  resetProgress();
  clearTimeout(timer);
  if (isPlaying && !isMusicPlaying) timer = setTimeout(() => showPhoto(currentIndex + 1), slideDuration);
}

function goToPhoto(index) {
  const nextIndex = (index + photos.length) % photos.length;
  if (isMusicPlaying && Number.isFinite(songPlayer.duration) && songPlayer.duration > 0) {
    songPlayer.currentTime = (nextIndex / photos.length) * songPlayer.duration;
  }
  showPhoto(nextIndex);
}

function syncSongPosition() {
  if (!isMusicPlaying || !Number.isFinite(songPlayer.duration) || songPlayer.duration <= 0) return;
  const songProgress = Math.min(1, songPlayer.currentTime / songPlayer.duration);
  const photoIndex = Math.min(photos.length - 1, Math.floor(songProgress * photos.length));
  progressFill.style.width = `${songProgress * 100}%`;
  progressTrack.setAttribute("aria-valuenow", String(Math.round(songProgress * 100)));
  if (photoIndex !== currentIndex) showPhoto(photoIndex);
}

function updatePlaybackState(playing, musicPlaying = false) {
  isPlaying = playing;
  isMusicPlaying = musicPlaying;
  root.classList.toggle("is-paused", !playing);
  const playButton = document.querySelector("#play-button");
  playButton.setAttribute("aria-label", playing ? "Pouseer song en slideshow" : "Speel song en slideshow");
  playButton.title = playing ? "Pouseer (spasie)" : "Speel (spasie)";
  playStatus.textContent = musicPlaying
    ? "foto’s speel saam met die song"
    : playing ? "slideshow speel sonder die song"
      : songPlayer.currentTime > 0 ? "die song is gepouse" : "druk play vir ons song";
  clearTimeout(timer);
  clearInterval(syncTimer);
  resetProgress();
  if (musicPlaying) {
    syncSongPosition();
    syncTimer = setInterval(syncSongPosition, 200);
  } else if (playing) {
    timer = setTimeout(() => showPhoto(currentIndex + 1), slideDuration);
  }
}

function togglePlayback() {
  if (songPlayer.paused) {
    songPlayer.play().catch((error) => {
      console.error("Kon nie die MP3 speel nie:", error);
      updatePlaybackState(false);
      playStatus.textContent = "die song kon nie speel nie — kyk of die MP3-lêer langs die webblad is";
    });
  } else {
    songPlayer.pause();
  }
}

function setLightbox(open) {
  lightbox.classList.toggle("is-open", open);
  lightbox.setAttribute("aria-hidden", String(!open));
  document.body.style.overflow = open ? "hidden" : "";
  if (open) {
    const photo = photos[currentIndex];
    lightboxPhoto.src = photo.src;
    lightboxPhoto.alt = image.alt;
    lightboxDate.textContent = formattedDate(photo);
    document.querySelector("#lightbox-close").focus();
  } else {
    document.querySelector("#expand-button").focus();
  }
}

function start() {
  try {
    if (!photos.length) throw new Error("Geen foto’s is beskikbaar vir die slideshow nie.");
    photos.sort((a, b) => a.date.localeCompare(b.date) || a.src.localeCompare(b.src));
    renderTimeline();
    root.classList.add("is-paused");
    showPhoto(0);
    songPlayer.addEventListener("play", () => {
      updatePlaybackState(true, true);
    });
    songPlayer.addEventListener("pause", () => {
      if (songPlayer.ended) return;
      updatePlaybackState(false);
    });
    songPlayer.addEventListener("ended", () => {
      updatePlaybackState(false);
      progressFill.classList.remove("is-synced");
      progressFill.style.width = "100%";
      progressTrack.setAttribute("aria-valuenow", "100");
      playStatus.textContent = "die song is klaar — druk play om weer te begin";
    });
    songPlayer.addEventListener("timeupdate", syncSongPosition);
    songPlayer.addEventListener("error", () => {
      updatePlaybackState(false);
      playStatus.textContent = "die song kon nie laai nie — kyk of die MP3-lêer langs die webblad is";
    });
    document.querySelector("#next-button").addEventListener("click", () => goToPhoto(currentIndex + 1));
    document.querySelector("#previous-button").addEventListener("click", () => goToPhoto(currentIndex - 1));
    document.querySelector("#play-button").addEventListener("click", togglePlayback);
    document.querySelector("#expand-button").addEventListener("click", () => setLightbox(true));
    document.querySelector("#lightbox-close").addEventListener("click", () => setLightbox(false));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) setLightbox(false);
    });
    document.addEventListener("keydown", (event) => {
      if (lightbox.classList.contains("is-open")) {
        if (event.key === "Escape") setLightbox(false);
        return;
      }
      if (event.key === "ArrowRight") goToPhoto(currentIndex + 1);
      if (event.key === "ArrowLeft") goToPhoto(currentIndex - 1);
      if (event.code === "Space" && !["BUTTON", "A"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        togglePlayback();
      }
    });
    document.querySelector("#stage").addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });
    document.querySelector("#stage").addEventListener("touchend", (event) => {
      const distance = event.changedTouches[0].screenX - touchStartX;
      if (Math.abs(distance) > 45) goToPhoto(currentIndex + (distance < 0 ? 1 : -1));
    }, { passive: true });
    progressFill.addEventListener("animationend", () => {
      progressTrack.setAttribute("aria-valuenow", "100");
    });
  } catch (error) {
    console.error(error);
    playStatus.textContent = "foto’s kon nie laai nie";
    photoCaption.textContent = error.message;
    updatePlaybackState(false);
  }
}

start();
