import React, { memo, useEffect, useState } from 'react';

export default memo(function FpsCounter({ engine, ready }) {
  const [fps, setFps] = useState(null);
  useEffect(() => {
    if (!ready) return;
    let previous = null;
    const sample = () => {
      const scene = engine.current;
      if (!scene || scene.dead || scene.exporting || scene.batchProcessing || document.hidden) {
        previous = null; setFps(null); return;
      }
      const current = { time: performance.now(), frames: scene.previewFrames };
      if (previous) setFps(Math.max(0, Math.round((current.frames - previous.frames) * 1000 / (current.time - previous.time))));
      previous = current;
    };
    const reset = () => { previous = null; setFps(null); };
    sample();
    const timer = setInterval(sample, 500);
    document.addEventListener('visibilitychange', reset);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', reset); };
  }, [engine, ready]);
  return <div className="canvas-fps" aria-label={fps === null ? 'FPS: ожидание' : `FPS: ${fps}`}><span>FPS</span><strong>{fps ?? '—'}</strong></div>;
});
