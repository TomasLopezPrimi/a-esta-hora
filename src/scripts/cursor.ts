export function initCursor() {
  const enabled = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const cursor = document.createElement('div');
  cursor.className = 'experience-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-dot"></span><span class="cursor-ring"><span class="cursor-symbol"></span></span>';
  document.body.append(cursor);
  const dot = cursor.querySelector<HTMLElement>('.cursor-dot')!;
  const ring = cursor.querySelector<HTMLElement>('.cursor-ring')!;
  let x = 0, y = 0, ringX = 0, ringY = 0;
  let frame = 0;
  let visible = false;
  let target: Element | null = null;

  function hide() {
    visible = false;
    cursor.classList.remove('is-visible');
    document.documentElement.classList.remove('custom-cursor');
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function refresh() {
    const action = target?.closest('a, button');
    const native = target?.closest('input, textarea, select, [contenteditable], [data-native-cursor]');
    if (!enabled.matches || !target || native || action?.matches(':disabled')) {
      hide();
      return;
    }
    cursor.classList.toggle('is-light', Boolean(target.closest('.music-section, .meaning-section, .audio-player')));
    cursor.classList.toggle('is-link', Boolean(action));
    const playback = action?.matches('[data-play], .player-toggle');
    cursor.classList.toggle('is-playback', Boolean(playback));
    cursor.classList.toggle('is-paused-symbol', Boolean(playback && (action?.classList.contains('is-playing') || action?.getAttribute('aria-label') === 'Pausar')));
    if (!visible) {
      ringX = x;
      ringY = y;
      ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    visible = true;
    cursor.classList.add('is-visible');
    document.documentElement.classList.add('custom-cursor');
  }

  function render() {
    ringX += (x - ringX) * 0.2;
    ringY += (y - ringY) * 0.2;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    frame = Math.abs(x - ringX) + Math.abs(y - ringY) > 0.1
      ? requestAnimationFrame(render) : 0;
  }

  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') { hide(); return; }
    x = event.clientX;
    y = event.clientY;
    target = event.target instanceof Element ? event.target : null;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    refresh();
    if (visible && !frame) frame = requestAnimationFrame(render);
  }, { passive: true });
  document.addEventListener('scroll', () => {
    if (!visible) return;
    target = document.elementFromPoint(x, y);
    refresh();
  }, { passive: true, capture: true });
  document.documentElement.addEventListener('pointerleave', hide);
  document.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') hide(); });
  document.addEventListener('keydown', event => { if (event.key === 'Tab') hide(); });
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  enabled.addEventListener('change', hide);

  // Playback can change while the mouse stays still.
  return () => { if (visible) refresh(); };
}
