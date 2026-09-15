export {};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector<HTMLElement>('.hero');

// A single interpolated light source moves the beam, photograph and shadows.
if (hero && !reducedMotion.matches && window.matchMedia('(pointer: fine)').matches) {
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  let frame = 0;
  const renderLight = () => {
    currentX += (targetX - currentX) * 0.045;
    currentY += (targetY - currentY) * 0.045;
    hero.style.setProperty('--px', currentX.toFixed(4));
    hero.style.setProperty('--py', currentY.toFixed(4));
    hero.style.setProperty('--mx', `${50 + currentX * 22}%`);
    hero.style.setProperty('--my', `${45 + currentY * 20}%`);
    if (Math.abs(targetX-currentX) + Math.abs(targetY-currentY) > 0.001) frame = requestAnimationFrame(renderLight);
    else frame = 0;
  };
  hero.addEventListener('pointermove', event => {
    if(reducedMotion.matches) return;
    const bounds = hero.getBoundingClientRect();
    targetX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    targetY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
    if (!frame) frame = requestAnimationFrame(renderLight);
  });
  hero.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; if (!frame) frame = requestAnimationFrame(renderLight); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } });
  reducedMotion.addEventListener('change', () => { if(reducedMotion.matches) { cancelAnimationFrame(frame); frame = 0; hero.style.cssText = ''; } });
}

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('js-ready');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }, { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

const songs = [
  { title: 'Canción para un niño en la calle', src: '/audio/cancion-para-un-nino-en-la-calle.mp3' },
  { title: 'Desencuentro', src: '/audio/desencuentro.mp3' },
];
const audio = new Audio();
audio.preload = 'none';
const player = document.querySelector<HTMLElement>('.audio-player')!;
const toggle = document.querySelector<HTMLButtonElement>('.player-toggle')!;
const seek = document.querySelector<HTMLInputElement>('.player-seek')!;
const title = document.querySelector<HTMLElement>('.player-title')!;
const time = document.querySelector<HTMLElement>('.player-time')!;
const status = document.querySelector<HTMLElement>('.player-status')!;
const playButtons = document.querySelectorAll<HTMLButtonElement>('[data-play]');
let current = -1;
let request = 0;

function syncPlayback() {
  const playing = !audio.paused;
  toggle.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
  toggle.innerHTML = `<span class="${playing ? 'pause-symbol' : 'play-triangle'}" aria-hidden="true"></span>`;
  playButtons.forEach(button => {
    const index = Number(button.dataset.play);
    button.classList.toggle('is-playing', index === current && playing);
    button.setAttribute('aria-label', `${index === current && playing ? 'Pausar' : 'Escuchar'} ${songs[index].title}`);
  });
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
}

async function play(index: number) {
  const thisRequest = ++request;
  if (index === current && !audio.paused) { audio.pause(); return; }
  player.hidden = false;
  document.body.classList.add('audio-open');
  status.textContent = '';
  if (index !== current) {
    current = index;
    audio.src = songs[index].src;
    title.textContent = songs[index].title;
    seek.value = '0';
    time.textContent = '0:00';
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: songs[index].title, artist: 'A esta hora' });
  }
  try { await audio.play(); }
  catch (error) {
    if (thisRequest === request && !(error instanceof DOMException && error.name === 'AbortError')) status.textContent = 'No pudimos reproducir la canción. Volvé a tocar reproducir.';
  }
  syncPlayback();
}

playButtons.forEach(button => button.addEventListener('click', () => { void play(Number(button.dataset.play)); }));
toggle.addEventListener('click', () => { void play(Math.max(current, 0)); });
document.querySelector('.player-next')!.addEventListener('click', () => { void play((current + 1) % songs.length); });
document.querySelector('.player-close')!.addEventListener('click', () => {
  ++request;
  audio.pause();
  audio.currentTime = 0;
  player.hidden = true;
  document.body.classList.remove('audio-open');
  document.querySelector<HTMLButtonElement>(`.track[data-play="${current}"]`)?.focus({ preventScroll: true });
});
seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 100 * audio.duration; });
audio.addEventListener('timeupdate', () => {
  if (!Number.isFinite(audio.duration)) return;
  seek.value = String(audio.currentTime / audio.duration * 100);
  const minutes = Math.floor(audio.currentTime / 60);
  const seconds = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
  time.textContent = `${minutes}:${seconds}`;
  seek.setAttribute('aria-valuetext', `${minutes} minutos, ${seconds} segundos`);
});
audio.addEventListener('play', syncPlayback);
audio.addEventListener('pause', syncPlayback);
audio.addEventListener('ended', syncPlayback);
audio.addEventListener('waiting', () => { status.textContent = 'Cargando canción…'; });
audio.addEventListener('playing', () => { status.textContent = ''; });
audio.addEventListener('error', () => { status.textContent = 'No pudimos cargar la canción. Volvé a tocar reproducir.'; syncPlayback(); });
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => { if(audio.paused) void play(Math.max(current, 0)); });
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('nexttrack', () => { void play((current + 1) % songs.length); });
}
