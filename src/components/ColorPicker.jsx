import React, { useState } from 'react';
import './ColorPicker.css';

export function hexToHsv(hex) {
  const [r, g, b] = hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}

export function hsvToHex({ h, s, v }) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + rgb.map(n => Math.round((n + m) * 255).toString(16).padStart(2, '0')).join('');
}

export default function ColorPicker({ value, onChange, label = 'Цвет основы' }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [previous, setPrevious] = useState(value);
  const [draft, setDraft] = useState(value.toUpperCase());
  if (value !== previous) {
    const next = hexToHsv(value);
    setPrevious(value);
    setDraft(value.toUpperCase());
    setHsv(old => ({ ...next, h: next.s === 0 ? old.h : next.h }));
  }
  const change = next => {
    const hex = hsvToHex(next);
    setHsv(next); setPrevious(hex); setDraft(hex.toUpperCase()); onChange(hex);
  };
  const point = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    change({ ...hsv, s: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), v: 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) });
  };
  const commit = () => {
    const text = draft.trim().replace(/^#/, '');
    if (/^[a-f\d]{3}$|^[a-f\d]{6}$/i.test(text)) {
      const hex = '#' + (text.length === 3 ? [...text].map(c => c + c).join('') : text).toLowerCase();
      const next = hexToHsv(hex);
      change({ ...next, h: next.s === 0 ? hsv.h : next.h });
    } else setDraft(value.toUpperCase());
  };
  return <div className="custom-color-picker" role="group" aria-label={label}>
    <div className="custom-color-hex"><span className="color-picker-swatch" aria-hidden="true" style={{ background: value }}/><input aria-label="Цвет HEX" type="text" spellCheck={false} maxLength={7} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setDraft(value.toUpperCase()); }}/><small>HEX</small></div>
    <label className="color-hue-label"><span>Оттенок <output>{Math.round(hsv.h)}°</output></span><input className="color-hue" aria-label="Оттенок" type="range" min="0" max="359" step="1" value={hsv.h} onChange={e => change({ ...hsv, h: Number(e.target.value) })}/></label>
    <div className="color-picker-panel">
    <div className="color-sv" style={{ '--hue': hsv.h }} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); point(event); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event); }}>
      <span className="color-sv-marker" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: value }}/>
    </div>
    <div className="color-sv-accessible"><label>Насыщенность<input aria-label="Насыщенность цвета" type="range" min="0" max="100" value={Math.round(hsv.s * 100)} onChange={e => change({ ...hsv, s: Number(e.target.value) / 100 })}/></label><label>Яркость<input aria-label="Яркость цвета" type="range" min="0" max="100" value={Math.round(hsv.v * 100)} onChange={e => change({ ...hsv, v: Number(e.target.value) / 100 })}/></label></div>
    </div>
  </div>;
}
