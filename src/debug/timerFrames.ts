/**
 * Development only: open the page with `?timer-frames` to drive animation
 * frames with timers.
 * Browsers don't fire animation frames in windows that are hidden or
 * minimized, which stops the 3D scene from being drawn. This lets automated
 * checks render the tray in such a window.
 * Has to be imported before anything that asks for an animation frame.
 */
if (import.meta.env.DEV && location.search.includes("timer-frames")) {
  window.requestAnimationFrame = (callback) =>
    window.setTimeout(() => callback(performance.now()), 16);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
}

export {};
