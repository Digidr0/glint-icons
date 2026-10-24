import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, ArrowDownToLine, RotateCcw, ImagePlus, X, MoveUpRight, Sparkles, Sun, Moon, Layers, Check, MousePointer2, Aperture, ChevronRight, Pause, Play } from 'lucide-react';
import { IconScene } from './scene.js';
import { defaults } from './defaults.js';
import { studioEnvironments } from './environments.js';
import GradientASCII from './components/GradientASCII.jsx';
import ColorPicker from './components/ColorPicker.jsx';
import MaterialPresets from './components/MaterialPresets.jsx';
import CameraAxes from './components/CameraAxes.jsx';
import BatchPanel from './components/BatchPanel.jsx';
import { useBatch } from './use-batch.js';
import { materialOptions, sameMaterial, sameCamera, sameEnvironment } from './batch.js';
import { builtInMaterialPresets, loadMaterialPresets, materialPresetsKey, snapshotMaterial } from './material-presets.js';
import defaultLogoURL from './assets/default-logo.svg';
import { cameraPresetsKey, loadCameraPresets } from './camera-presets.js';
import { initialEnvironmentPresets, loadEnvironmentPresets, saveEnvironmentPresets } from './environment-presets.js';
import './style.css';
import './theme.css';
import './batch.css';

const swatches = ['#a8c5fa', '#d1d5de', '#363e52', '#a7dfb6', '#d5b3ee', '#f0b9a5', '#e4d1a5'];
const defaultAssets = { logo: { url: defaultLogoURL, name: 'Куб · логотип по умолчанию' } };

function Slider({ label, value, onChange, min = 0, max = 1, step = .01, unit = '' }) {
  const id = React.useId();
  return <label className="slider" htmlFor={id}><span>{label}<span className="slider-value" aria-hidden="true">{step >= 1 ? Math.round(value) : Number(value).toFixed(2)}{unit}</span></span><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ '--fill': `${(value-min)/(max-min)*100}%` }}/></label>;
}
function Upload({ title, subtitle, asset, onFile, onClear }) {
  const input = useRef();
  return <div className="upload-wrap"><button className={`upload ${asset ? 'has-image' : ''}`} onClick={() => input.current.click()}>{asset ? <img src={asset.url} alt=""/> : <ImagePlus size={20}/>}<span><strong>{asset?.name || title}</strong><small>{asset ? 'Нажмите, чтобы заменить' : subtitle}</small></span><span className="upload-plus">+</span></button>{asset && <button className="remove" onClick={onClear} aria-label={`Удалить ${title}`}><X size={13}/></button>}<input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ''; }}/></div>;
}
function App() {
  const host = useRef(); const engine = useRef(); const [settings, setSettings] = useState(defaults);
  const [tab, setTab] = useState('paint');
  const [assets, setAssets] = useState(defaultAssets); const assetRefs = useRef(defaultAssets);
  const [cameraPose, setCameraPose] = useState(null);
  const [fov, setFov] = useState(32);
  const [cameraPresets, setCameraPresets] = useState(loadCameraPresets);
  const [materialPresets, setMaterialPresets] = useState(loadMaterialPresets);
  const [environments, setEnvironments] = useState(studioEnvironments);
  const [environmentId, setEnvironmentId] = useState('studio');
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [environmentPresets, setEnvironmentPresets] = useState(initialEnvironmentPresets);
  const [environmentPresetsLoaded, setEnvironmentPresetsLoaded] = useState(false);
  const environmentRequest = useRef(0);
  const environmentInput = useRef(); const environmentURLs = useRef([]);
  const environmentPicker = useRef();
  const activeEnvironment = environments.find(item => item.id === environmentId);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const [backgroundPaused, setBackgroundPaused] = useState(false);
  const [status, setStatus] = useState('Загрузка модели и студийного света…'); const [ready, setReady] = useState(false);
  const [error, setError] = useState(''); const [size, setSize] = useState(2048); const [transparent, setTransparent] = useState(true); const [exporting, setExporting] = useState(false); const [projection, setProjection] = useState('perspective');
  const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17181b' : '#f7f7f8');
    try { localStorage.setItem('icon-studio.theme', theme); } catch { /* Theme still works when storage is unavailable. */ }
  }, [theme]);
  useEffect(() => {
    let alive = true;
    try { const scene = new IconScene(host.current, pose => {
      const rounded = { azimuth: pose.azimuth.toFixed(1), elevation: pose.elevation.toFixed(1), distance: pose.distance.toFixed(2), distanceExact: pose.distance, zoom: pose.zoom, projection: pose.projection, orientation: pose.orientation.map(value=>value.toFixed(5)).join(',') };
      setCameraPose(previous => previous && Object.keys(rounded).every(key => previous[key] === rounded[key]) ? previous : rounded);
    }); engine.current = scene;
      Promise.all([scene.load(), scene.setImage('logo', defaultLogoURL)]).then(() => { if (alive) { setReady(true); setStatus('Модель готова · 2 UV-канала'); } }).catch(e => { if (alive) setError(`Не удалось загрузить сцену: ${e.message}`); });
    } catch(e) { setError(`WebGL недоступен: ${e.message}`); }
    return () => { alive = false; engine.current?.dispose(); Object.values(assetRefs.current).forEach(a => URL.revokeObjectURL(a.url)); environmentURLs.current.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  useEffect(() => { engine.current?.update(settings); }, [settings, ready]);
  useEffect(() => { engine.current?.setFov(fov); }, [fov, ready]);
  useEffect(() => {
    let alive = true;
    loadEnvironmentPresets().then(items => { if (alive) setEnvironmentPresets(items); })
      .catch(() => { if (alive) setError('Хранилище HDRI недоступно. Пресеты будут доступны только в текущей вкладке.'); })
      .finally(() => { if (alive) setEnvironmentPresetsLoaded(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!environmentPresetsLoaded) return;
    let alive = true;
    saveEnvironmentPresets(environmentPresets).catch(() => {
      if (alive) setError('Не удалось сохранить HDRI-пресеты. Возможно, в хранилище браузера недостаточно места. Пресеты остаются доступны в этой вкладке.');
    });
    return () => { alive = false; };
  }, [environmentPresets, environmentPresetsLoaded]);
  useEffect(() => {
    try { localStorage.setItem(cameraPresetsKey, JSON.stringify(cameraPresets)); }
    catch { setError('Не удалось сохранить пресеты камеры в браузере. Они доступны до перезагрузки.'); }
  }, [cameraPresets]);
  useEffect(() => {
    if (!ready && !error) return;
    let frame;
    const reveal = () => {
      if (getComputedStyle(document.documentElement).getPropertyValue('--ui-ready').trim() !== '1') {
        frame = requestAnimationFrame(reveal); return;
      }
      document.documentElement.removeAttribute('data-booting');
      document.getElementById('page-loader')?.remove();
    };
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(reveal); });
    return () => cancelAnimationFrame(frame);
  }, [ready, error]);
  useEffect(() => {
    const closeGallery = event => { if(!environmentPicker.current?.contains(event.target)) environmentPicker.current?.removeAttribute('open'); };
    document.addEventListener('pointerdown', closeGallery);
    return () => document.removeEventListener('pointerdown', closeGallery);
  }, []);
  const upload = async (slot, file) => {
    if(file.size > 20*1024*1024) { setError('Максимальный размер изображения — 20 МБ.'); return; }
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)) { setError('Выберите изображение PNG, JPEG или WebP.'); return; }
    const url = URL.createObjectURL(file);
    try { await engine.current.setImage(slot, url); const previous = assetRefs.current[slot]; if (previous) URL.revokeObjectURL(previous.url); const asset = {url, name: file.name}; assetRefs.current = {...assetRefs.current, [slot]: asset}; setAssets(assetRefs.current); setError(''); setStatus(`${file.name} загружен`); }
    catch(e) { URL.revokeObjectURL(url); setError(`Не удалось открыть изображение: ${e.message || 'файл повреждён или формат не поддерживается.'}`); }
  };
  const clear = slot => { engine.current?.clearImage(slot); if(assetRefs.current[slot]) URL.revokeObjectURL(assetRefs.current[slot].url); const next = {...assetRefs.current}; delete next[slot]; assetRefs.current = next; setAssets(next); };
  const exportPNG = async () => { setExporting(true); setError(''); try { await engine.current.exportPNG(size, transparent); setStatus(`PNG ${size} × ${size} сохранён`); } catch(e) { setError(`Ошибка экспорта: ${e.message}`); } finally { setExporting(false); } };
  const chooseProjection = name => { setProjection(name); engine.current?.setProjection(name); };
  const saveView = () => { try { engine.current.saveDefaultView(); setStatus('Ракурс по умолчанию сохранён в этом браузере'); } catch { setError('Браузер не разрешил сохранить ракурс. Проверьте доступ к локальному хранилищу.'); } };
  const addCameraPreset = () => {
    if (!ready || exporting) return;
    const preset = { id: crypto.randomUUID(), name: `Ракурс ${cameraPresets.filter(p => p.id !== 'default').length + 1}`, ...engine.current.getCameraPose(), fov };
    setCameraPresets(items => [...items, preset]);
  };
  const applyCameraPreset = preset => {
    engine.current.applyCameraPreset(preset); setFov(preset.fov); setProjection(preset.projection || 'perspective');
  };
  const chooseEnvironment = async item => {
    if (!item) { setError('HDRI не найдена. Загрузите файл повторно.'); return false; }
    const request = ++environmentRequest.current;
    environmentPicker.current?.removeAttribute('open');
    setEnvironmentLoading(true); setError('');
    try {
      if(!await engine.current.setEnvironment(item) || request !== environmentRequest.current) return false;
      setEnvironmentId(item.id); setStatus(`HDRI: ${item.name}`); return true;
    } catch(e) { if (request === environmentRequest.current) setError(`Не удалось открыть HDRI: ${e.message || 'файл повреждён или формат не поддерживается.'}`); return false; }
    finally { if (request === environmentRequest.current) setEnvironmentLoading(false); }
  };
  const uploadEnvironment = async file => {
    const type = file.name.split('.').pop().toLowerCase();
    if(!['hdr','exr'].includes(type)) { setError('Для окружения выберите панорамную HDRI в формате .hdr или .exr.'); return; }
    if(file.size > 64*1024*1024) { setError('Максимальный размер HDRI — 64 МБ. Для редактора рекомендуются версии 1K–4K.'); return; }
    const url = URL.createObjectURL(file), item = { id: `custom:${crypto.randomUUID()}`, url, file, type, name: file.name, detail: `Локальный файл · ${type.toUpperCase()}` };
    if(await chooseEnvironment(item)) { environmentURLs.current.push(url); setEnvironments(items => [...items, item]); }
    else URL.revokeObjectURL(url);
  };
  const addEnvironmentPreset = () => {
    if (!ready || environmentLoading || exporting || !environmentPresetsLoaded || !activeEnvironment) return;
    const { id, name, type = 'hdr', file } = activeEnvironment;
    const environment = { id, name, type, ...(file ? { file } : {}) };
    setEnvironmentPresets(items => [...items, {
      id: crypto.randomUUID(), name: `Свет ${Math.max(0, ...items.map(p => Number(p.name.match(/^Свет (\d+)$/)?.[1]) || 0)) + 1}`,
      environment, light: settings.light, lightRotation: settings.lightRotation, exposure: settings.exposure,
    }]);
  };
  const applyEnvironmentPreset = async preset => {
    let environment = environments.find(item => item.id === preset.environment.id);
    let createdURL;
    if (!environment && preset.environment.file instanceof Blob) {
      createdURL = URL.createObjectURL(preset.environment.file);
      environment = { ...preset.environment, url: createdURL, detail: `Сохранённый файл · ${preset.environment.type.toUpperCase()}` };
    }
    if (await chooseEnvironment(environment)) {
      if (createdURL) {
        environmentURLs.current.push(createdURL);
        setEnvironments(items => [...items, environment]);
      }
      setSettings(s => ({ ...s, light: preset.light, lightRotation: preset.lightRotation, exposure: preset.exposure }));
    } else if (createdURL) URL.revokeObjectURL(createdURL);
  };
  const updateMaterialPresets = items => {
    setMaterialPresets(items);
    try { localStorage.setItem(materialPresetsKey, JSON.stringify(items)); }
    catch { setError('Не удалось сохранить пресеты материалов в браузере. Они доступны до перезагрузки страницы.'); }
  };
  const materials = materialOptions(builtInMaterialPresets, materialPresets);
  const currentCamera = cameraPose && { azimuth: Number(cameraPose.azimuth), elevation: Number(cameraPose.elevation), distance: Number(cameraPose.distance), fov, projection, zoom: cameraPose.zoom };
  const selectedCamera = cameraPresets.find(preset => sameCamera(preset, currentCamera));
  const selectedEnvironment = environmentPresets.find(preset => sameEnvironment(preset, environmentId, settings));
  const selectedMaterial = materials.find(preset => sameMaterial(settings, preset.material));
  const prepareBatch = async () => {
    const created = [];
    const actualCamera = { ...engine.current.getCameraPose(), fov };
    if (!cameraPresets.some(preset => sameCamera(preset, actualCamera))) {
      const preset = { id: crypto.randomUUID(), name: `Камера ${cameraPresets.length + 1}`, ...actualCamera };
      const next = [...cameraPresets, preset];
      localStorage.setItem(cameraPresetsKey, JSON.stringify(next)); setCameraPresets(next); created.push(preset.name);
    }
    if (!selectedEnvironment) {
      if (!activeEnvironment) throw new Error('Не выбрана HDRI.');
      const { id, name, type = 'hdr', file } = activeEnvironment;
      const preset = { id: crypto.randomUUID(), name: `HDRI ${environmentPresets.length + 1}`, environment: { id, name, type, ...(file ? { file } : {}) }, light: settings.light, lightRotation: settings.lightRotation, exposure: settings.exposure };
      const next = [...environmentPresets, preset];
      await saveEnvironmentPresets(next); setEnvironmentPresets(next); created.push(preset.name);
    }
    if (!selectedMaterial) {
      const preset = { id: crypto.randomUUID(), name: `Материал ${materialPresets.length + 1}`, material: snapshotMaterial(settings) };
      const next = [...materialPresets, preset];
      localStorage.setItem(materialPresetsKey, JSON.stringify(next)); setMaterialPresets(next); created.push(preset.name);
    }
    return created.length ? `Автоматически сохранены пресеты: ${created.join(', ')}.` : 'Используются сохранённые пресеты.';
  };
  const batch = useBatch({ engine, size, transparent, signature: JSON.stringify({ settings, camera: currentCamera, cameraOrientation: cameraPose?.orientation, cameraDistance: cameraPose?.distanceExact, environmentId, pattern: assets.pattern?.url }), prepare: prepareBatch, onError: setError });
  const batchBusy = batch.phase === 'running';
  useEffect(() => {
    const sections = document.querySelectorAll('.app > header, .workspace, .editor-main');
    sections.forEach(section => { section.inert = batchBusy; });
    return () => sections.forEach(section => { section.inert = false; });
  }, [batchBusy]);
  return <div className="app" aria-busy={batchBusy}>
    <header><a className="brand" href="./"><span className="brand-mark"><Box size={21}/></span>icon<span className="brand-light">studio</span><span className="beta">BETA</span></a><span className="header-note">Маленькая форма. Большие возможности.</span><span className="local"><span/>Работает локально</span><button className="background-motion-toggle" aria-label={backgroundPaused ? 'Продолжить анимацию фона' : 'Приостановить анимацию фона'} title={backgroundPaused ? 'Продолжить анимацию фона' : 'Приостановить анимацию фона'} onClick={() => setBackgroundPaused(p => !p)}>{backgroundPaused ? <Play size={11}/> : <Pause size={11}/>}<span>ASCII</span></button><button className="theme-toggle" aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button></header>
    <main>
      <GradientASCII className="main-ascii-background" aria-hidden="true" colors={['#7c2d12','#fc7703','#fdba74','#fff3e8']} shape="rise" scale={0.75} characters=" =+xX0S8#@" cellSize={22} density={.8} glyphOpacity={.4} gradientOpacity={.65} glow={.15} grain={.1} variation={7} speed={.5} mouseInteraction={false} clickEffect="none" lightMode={theme === 'light'} dpr={1} paused={backgroundPaused}/>
      <section className="workspace" aria-label="Редактор 3D-иконки">
        <div className="workspace-heading"><div><div className="eyebrow">YOUR NEXT ICON</div><h1>Создайте свою форму.</h1><p>Материал, свет и немного вашей индивидуальности.</p></div></div>
        <div className="viewport"><div className="export-frame"><div className="export-canvas" ref={host} aria-label="3D-превью. Вращайте мышью, используйте колесо для приближения."/><span aria-hidden="true">PNG · 1:1</span><div className="canvas-hud"><CameraAxes orientation={cameraPose?.orientation}/><div className="viewport-bottom"><span><MousePointer2 size={13}/>Потяните для вращения <i/> Скролл для масштаба</span><span className="model-info">ICON.GLB <span> / </span> PBR MATERIAL</span></div></div></div></div>
        {!ready && !error && <div className="loading"><Aperture size={24}/><span>{status}</span></div>}
        <div className="environment-heading"><div className="eyebrow">LIGHT & REFLECTIONS</div><h2>Настройте освещение.</h2><p>Окружение, свет и характер отражений.</p></div>
        <div className="environment-dock">
          <section className="environment-panel" aria-label="Окружение HDRI" aria-busy={environmentLoading}>
            <h2 className="camera-panel-title"><Sun size={12}/>ОКРУЖЕНИЕ · HDRI</h2>
            <details className="environment-picker" ref={environmentPicker} onKeyDown={e => { if(e.key === 'Escape') { e.currentTarget.removeAttribute('open'); e.currentTarget.querySelector('summary')?.focus(); } }}>
              <summary aria-label="Выбрать HDRI по превью">{activeEnvironment?.thumbnail ? <img src={activeEnvironment.thumbnail} alt=""/> : <Sun size={25}/>}<span>Выбрать по превью<small>{activeEnvironment?.name || 'Окружения HDRI'}</small></span><ChevronRight size={13}/></summary>
              <div className="environment-gallery">
                <div className="gallery-title">ОКРУЖЕНИЯ · HDRI<a href="https://polyhaven.com/hdris/studio" target="_blank" rel="noreferrer" title="Источник встроенных HDRI — Poly Haven"><MoveUpRight size={12}/><span className="sr-only">Открыть Poly Haven</span></a></div>
                <div className="environment-thumbnails">{environments.map(item => <button key={item.id} aria-label={item.name} aria-pressed={environmentId === item.id} disabled={!ready || environmentLoading || exporting} onClick={() => chooseEnvironment(item)}>{item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy"/> : <Sun className="environment-thumbnail-fallback"/>}<span>{item.name.replace('Studio Small ', 'Studio ')}{environmentId === item.id && <Check size={11}/>}</span></button>)}</div>
              </div>
            </details>
            <button className="environment-upload" disabled={!ready || environmentLoading || exporting} onClick={() => environmentInput.current.click()}><ImagePlus size={13}/>{environmentLoading ? 'Загрузка окружения…' : 'Загрузить HDRI'}<span>.hdr / .exr</span></button>
            <input ref={environmentInput} type="file" accept=".hdr,.exr" hidden onChange={e => { const file = e.target.files?.[0]; if(file) uploadEnvironment(file); e.target.value = ''; }}/>
          </section>
          <section className="lighting-panel" aria-label="Свет и отражения">
            <h2 className="camera-panel-title"><Sun size={12}/>СВЕТ И ОТРАЖЕНИЯ</h2>
            <Slider label="Интенсивность HDRI" value={settings.light} min={0} max={4} onChange={v=>update('light',v)}/>
            <Slider label="Поворот окружения" value={settings.lightRotation} min={0} max={360} step={1} unit="°" onChange={v=>update('lightRotation',v)}/>
            <Slider label="Экспозиция" value={settings.exposure} min={.2} max={2.5} onChange={v=>update('exposure',v)}/>
          </section>
          <section className="camera-presets environment-presets" aria-label="Пресеты HDRI"><h2 className="camera-panel-title">ПРЕСЕТЫ HDRI</h2><div className="camera-presets-grid">
            {environmentPresets.map(preset => {
              const environment = studioEnvironments.find(item => item.id === preset.environment.id);
              return <div className="camera-preset-tile" key={preset.id}><button className="camera-preset-apply" disabled={!ready || environmentLoading || exporting} onClick={() => applyEnvironmentPreset(preset)} aria-label={`Применить HDRI-пресет ${preset.name}`} title={`${preset.environment.name} · ${preset.environment.type.toUpperCase()} · Свет ${preset.light} · Поворот ${preset.lightRotation}° · Экспозиция ${preset.exposure}`}>
                {environment?.thumbnail ? <img className="environment-preset-thumbnail" src={environment.thumbnail} alt=""/> : <Sun size={20}/>}
                <span>{preset.name}</span><small>{preset.environment.file ? 'ФАЙЛ · ' : ''}{preset.environment.type.toUpperCase()}</small></button><button className="camera-preset-delete" aria-label={`Удалить HDRI-пресет ${preset.name}`} disabled={!environmentPresetsLoaded} onClick={() => setEnvironmentPresets(items => items.filter(p => p.id !== preset.id))}><X size={11}/></button></div>;
            })}
            <button className="camera-preset-add" aria-label="Добавить пресет HDRI" title="Сохранить HDRI, интенсивность, поворот и экспозицию" disabled={!ready || environmentLoading || exporting || !environmentPresetsLoaded} onClick={addEnvironmentPreset}>+</button>
          </div></section>
        </div>
        <div className="scene-sidebar">
          <div className="viewport-tools"><div className="segmented">{[['perspective','Перспектива'],['orthographic','Ортографичная']].map(([id,label]) => <button key={id} className={projection===id?'active':''} aria-pressed={projection===id} disabled={!ready || exporting} onClick={() => chooseProjection(id)}>{label}</button>)}</div><button className="icon-button" title="Сбросить ракурс" aria-label="Сбросить ракурс" disabled={!ready || exporting} onClick={() => engine.current?.resetView()}><RotateCcw size={16}/></button></div>
          <div className="camera-fov"><Slider label="Поле зрения · FOV" value={fov} min={15} max={75} step={1} unit="°" onChange={setFov}/></div>
          {cameraPose && <div className="camera-panel" aria-label="Положение камеры"><div className="camera-panel-title"><Aperture size={12}/>КАМЕРА</div><div className="camera-readout"><span>Азимут<strong data-camera="azimuth">{cameraPose.azimuth}°</strong></span><span>Наклон<strong data-camera="elevation">{cameraPose.elevation}°</strong></span><span>Дистанция<strong data-camera="distance">{cameraPose.distance}</strong></span><span>FOV<strong data-camera="fov">{fov}°</strong></span></div><button disabled={!ready} onClick={saveView}>Сделать ракурсом по умолчанию <Check size={12}/></button></div>}
          <section className="camera-presets" aria-label="Пресеты камеры"><h2 className="camera-panel-title">ПРЕСЕТЫ КАМЕРЫ</h2><div className="camera-presets-grid">
            {cameraPresets.map(preset => <div className="camera-preset-tile" key={preset.id}><button className="camera-preset-apply" disabled={!ready || exporting} onClick={() => applyCameraPreset(preset)} aria-label={`Применить пресет ${preset.name}`} title={`${preset.name}: ${preset.azimuth.toFixed(1)}° / ${preset.elevation.toFixed(1)}° · FOV ${preset.fov}°`}><Aperture size={20}/><span>{preset.name}</span><small>{preset.fov}°</small></button><button className="camera-preset-delete" aria-label={`Удалить пресет ${preset.name}`} onClick={() => setCameraPresets(items => items.filter(p => p.id !== preset.id))}><X size={11}/></button></div>)}
            <button className="camera-preset-add" aria-label="Добавить пресет камеры" title="Сохранить текущий ракурс и FOV" disabled={!ready || exporting} onClick={addCameraPreset}>+</button>
          </div></section>
        </div>
      </section>
      <section className={`editor${tab==='batch' ? ' batch-mode' : ''}`} aria-label="Настройки иконки">
        <div className="editor-main"><div className="tabs">{[['paint',Sparkles,'Краска'],['images',Layers,'Изображения'],['batch',Layers,'Пакетная обработка'],['templates',Box,'Шаблоны']].map(([id,Icon,label])=><button key={id} className={tab===id?'selected':''} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}<button className="reset" onClick={()=>{setSettings({...defaults});setStatus('Настройки материала сброшены');}} title="Сбросить настройки"><RotateCcw size={14}/><span>Сбросить</span></button></div>
          {tab==='paint' && <div className="controls-grid"><div className="control-column"><h2>Цвет основы <span>01</span></h2><div className="swatches">{swatches.map(c=><button key={c} style={{background:c}} className={settings.color===c?'chosen':''} aria-label={`Цвет ${c}`} aria-pressed={settings.color===c} onClick={()=>update('color',c)}>{settings.color===c && <Check size={14}/>}</button>)}</div><ColorPicker value={settings.color} onChange={color=>update('color',color)}/></div><div className="control-column"><h2>Поверхность <span>02</span></h2><Slider label="Металличность" value={settings.metalness} onChange={v=>update('metalness',v)}/><Slider label="Шероховатость" value={settings.roughness} onChange={v=>update('roughness',v)} min={.04}/><Slider label="Металлические частицы" value={settings.flakes} onChange={v=>update('flakes',v)}/><Slider label="Микрорельеф · Normal.webp" value={settings.normalStrength} onChange={v=>update('normalStrength',v)}/></div><div className="control-column"><h2>Лак и перелив <span>03</span></h2><Slider label="Прозрачный лак" value={settings.clearcoat} onChange={v=>update('clearcoat',v)}/><Slider label="Шероховатость лака" value={settings.coatRoughness} onChange={v=>update('coatRoughness',v)} min={.01}/><Slider label="Перламутровый перелив" value={settings.iridescence} onChange={v=>update('iridescence',v)}/><div className="tip"><Sparkles size={15}/><span>Два слоя отражений.<br/>Тот самый car paint.</span></div></div></div>}
          {tab==='batch' && <BatchPanel batch={batch} cameras={cameraPresets} environments={environmentPresets} materials={materials} camera={selectedCamera} environment={selectedEnvironment} material={selectedMaterial} onCamera={applyCameraPreset} onEnvironment={applyEnvironmentPreset} onMaterial={preset=>setSettings(s=>({...s,...preset.material}))}/>}
          <div hidden={tab!=='templates'}><MaterialPresets settings={settings} presets={materialPresets} onChange={updateMaterialPresets} onApply={material=>setSettings(s=>({...s,...material}))}/></div>
          {tab==='images' && <div className="controls-grid images-grid">
            <div className="control-column">
              <h2>Логотип <span>UV 1</span></h2>
              <Upload title="Загрузить логотип" subtitle="PNG, WEBP, JPG · до 20 МБ" asset={assets.logo} onFile={f=>upload('logo',f)} onClear={()=>clear('logo')}/>
              <Slider label="Размер логотипа" value={settings.logoScale} min={.1} max={1.5} onChange={v=>update('logoScale',v)}/>
              <div className="mini-sliders"><Slider label="Сдвиг X" min={-.5} max={.5} value={settings.logoX} onChange={v=>update('logoX',v)}/><Slider label="Сдвиг Y" min={-.5} max={.5} value={settings.logoY} onChange={v=>update('logoY',v)}/></div>
              <label className="select-row">UV логотипа<select value={settings.logoUV} onChange={e=>update('logoUV',Number(e.target.value))}><option value={1}>UV1 · проекция</option><option value={0}>UV0 · атлас</option></select></label>
              <p className="muted">Изображения остаются в вашем браузере и не отправляются на сервер.</p>
            </div>
            <div className="control-column">
              <h2>Паттерн краски <span>UV 0</span></h2>
              <Upload title="Загрузить паттерн" subtitle="Общая текстура для всей модели" asset={assets.pattern} onFile={f=>upload('pattern',f)} onClear={()=>clear('pattern')}/>
              <Slider label="Выраженность" value={settings.patternStrength} onChange={v=>update('patternStrength',v)}/>
              <Slider label="Масштаб" value={settings.patternScale} min={.25} max={8} onChange={v=>update('patternScale',v)}/>
              <Slider label="Поворот" value={settings.patternRotation} min={0} max={360} step={1} unit="°" onChange={v=>update('patternRotation',v)}/>
              <div className="mini-sliders"><Slider label="Смещение X" min={-1} max={1} value={settings.patternX} onChange={v=>update('patternX',v)}/><Slider label="Смещение Y" min={-1} max={1} value={settings.patternY} onChange={v=>update('patternY',v)}/></div>
              <label className="select-row">Влияние<select value={settings.patternMode} onChange={e=>update('patternMode',e.target.value)}><option value="color">Цвет краски</option><option value="roughness">Шероховатость</option></select></label>
            </div>
          </div>}
        </div>
        <aside className="export-panel"><div className="export-title"><ArrowDownToLine size={18}/><h2>Забрать с собой</h2></div><p>{tab==='batch' ? 'Каждый логотип — отдельная иконка.' : 'Ваша иконка. Во всех деталях.'}</p><label className="export-label">Размер изображения<select disabled={batchBusy} value={size} onChange={e=>setSize(Number(e.target.value))}>{[512,1024,2048,4096].map(n=><option key={n} value={n}>{n} × {n} px</option>)}</select></label><label className="checkbox"><input type="checkbox" disabled={batchBusy} checked={transparent} onChange={e=>setTransparent(e.target.checked)}/><span className="checker"/>Прозрачный фон</label><button className="export-button" disabled={!ready || exporting || environmentLoading || batchBusy || (tab==='batch' && (!batch.files.length || !environmentPresetsLoaded))} onClick={tab==='batch' ? (batch.archive ? batch.download : batch.start) : exportPNG}><ArrowDownToLine size={17}/>{tab==='batch' ? (batchBusy ? `Обработка ${batch.progress}/${batch.files.length}` : batch.archive ? 'Скачать архив' : 'Начать пакетную обработку') : exporting ? 'Сохраняем…' : 'Скачать PNG'}<MoveUpRight size={16}/></button><small aria-live="polite">{tab==='batch' ? (batchBusy ? `${Math.round(batch.progress/Math.max(1,batch.files.length)*100)}% · PNG → ZIP` : batch.archive ? `ZIP · ${batch.archive.count} PNG · ${(batch.archive.size/1024/1024).toFixed(1)} МБ` : 'Локально · PNG в ZIP-архиве') : `PNG · ${size/1024 >= 1 ? `${size/1024}K` : `${size}px`} · без водяных знаков`}</small>{tab==='batch' && batch.archive && <button className="batch-repeat" onClick={batch.reset}>Обработать заново</button>}</aside>
      </section>
      {error && <div className="error" role="alert">{error}<button onClick={()=>setError('')} aria-label="Закрыть ошибку"><X size={16}/></button></div>}
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
