import React, { memo, useEffect, useState } from 'react';
import GradientASCII from './GradientASCII.jsx';

const mobileQuery = '(max-width: 600px)';
const colors = ['#7c2d12', '#fc7703', '#fdba74', '#fff3e8'];

export default memo(function ResponsiveBackground({ lightMode }) {
  const [mobile, setMobile] = useState(() => window.matchMedia(mobileQuery).matches);
  useEffect(() => {
    const media = window.matchMedia(mobileQuery);
    const update = () => setMobile(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Do not mount the WebGL background at all on mobile, rather than hiding
  // its canvas while leaving its rendering loop and GPU resources active.
  if (mobile) return <div className="main-ascii-background mobile-gradient-background" aria-hidden="true"/>;
  return <GradientASCII className="main-ascii-background" aria-hidden="true" colors={colors} shape="rise" scale={0.75} characters=" ·•●" cellSize={22} density={.8} glyphOpacity={.4} gradientOpacity={.65} glow={.15} grain={.1} variation={7} speed={.5} mouseInteraction={false} clickEffect="none" lightMode={lightMode} dpr={1}/>;
});
