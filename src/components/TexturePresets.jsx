import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Ban, Plus, Search, Check, X } from 'lucide-react';

const images = import.meta.glob('../assets/textures/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}', { eager: true, query: '?url', import: 'default' });
const thumbnails = import.meta.glob('../assets/texture-previews/*.webp', { eager: true, query: '?url', import: 'default' });
const presets = Object.entries(images).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })).map(([path, url]) => ({
  id: path, url, thumbnail: thumbnails[`../assets/texture-previews/${path.split('/').pop()}.webp`], name: path.split('/').pop().replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
}));

const TexturePresetTile = memo(function TexturePresetTile({ preset, index, selected, onSelect }) {
  return <button className={`texture-tile ${selected ? 'selected' : ''}`} title={preset.name} aria-pressed={selected} onClick={() => onSelect(preset)}>{preset.thumbnail ? <img src={preset.thumbnail} alt="" loading="lazy" decoding="async"/> : <ImagePlus size={22} aria-hidden="true"/>}<span>{preset.name}</span><small aria-hidden="true">{index}</small>{selected && <Check className="texture-selected-mark" size={14} aria-hidden="true"/>}</button>;
});
const indexedPresets = presets.map((preset, i) => ({ preset, index: i + 2 }));

export default memo(function TexturePresets({ asset, customFile, onFile, onPreset, onClear }) {
  const input = useRef();
  const [preview, setPreview] = useState('');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => indexedPresets.filter(({ preset }) => preset.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [query]);
  useEffect(() => {
    if (!customFile) { setPreview(''); return; }
    const url = URL.createObjectURL(customFile); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [customFile]);
  return <>
    <div className="texture-library-toolbar">
      <label className="texture-search"><Search size={14} aria-hidden="true"/><span className="texture-sr-only">Поиск паттернов</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Найти паттерн…"/>{query && <button type="button" aria-label="Очистить поиск" onClick={()=>setQuery('')}><X size={14}/></button>}</label>
      <span className="texture-count" role="status">{filtered.length} / {presets.length}</span>
    </div>
    <div className="texture-gallery-scroll" role="region" aria-label="Библиотека паттернов" tabIndex={0}>
    <div className="texture-presets" role="group" aria-label="Текстуры">
    <div className="texture-custom">
      <button className={`texture-tile ${asset && !asset.presetId ? 'selected' : ''}`} aria-pressed={!!asset && !asset.presetId} title={customFile?.name || 'Загрузить свою текстуру'} onClick={() => customFile ? onFile(customFile) : input.current.click()}>
        {preview ? <img src={preview} alt=""/> : <ImagePlus size={22} aria-hidden="true"/>}
        <span>Своя текстура</span><small aria-hidden="true">0</small>{asset && !asset.presetId && <Check className="texture-selected-mark" size={14} aria-hidden="true"/>}
      </button>
      {customFile && <button className="texture-replace" title="Заменить свою текстуру" aria-label="Заменить свою текстуру" onClick={() => input.current.click()}><ImagePlus size={13}/></button>}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ''; }}/>
    </div>
    <button className={`texture-tile ${!asset ? 'selected' : ''}`} aria-pressed={!asset} onClick={onClear}><Ban size={22} aria-hidden="true"/><span>Без текстуры</span><small aria-hidden="true">1</small>{!asset && <Check className="texture-selected-mark" size={14} aria-hidden="true"/>}</button>
    {filtered.map(({ preset, index }) => <TexturePresetTile key={preset.id} preset={preset} index={index} selected={asset?.presetId === preset.id} onSelect={onPreset}/>)}
    {Array.from({ length: Math.max(0, 4 - presets.length) }, (_, i) => <button key={`empty-${i}`} className="texture-tile" disabled title="Добавьте изображение в src/assets/textures"><Plus size={22}/><span>Шаблон</span><small>{presets.length + i + 2}</small></button>)}
    </div>
    {query.trim() && !filtered.length && <p className="texture-empty">Паттерны не найдены. Измените запрос или очистите поиск.</p>}
    </div>
    <div className="texture-current"><span>Выбрано</span><strong title={asset?.name}>{asset?.name || 'Без текстуры'}</strong></div>
  </>;
});
