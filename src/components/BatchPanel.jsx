import React, { useRef } from 'react';
import { ImagePlus, X, ArrowRight, Aperture, Sun, Sparkles } from 'lucide-react';

function Arrow({ label, final = false }) {
  return <div className={`batch-arrow${final ? ' batch-arrow-final' : ''}`} aria-hidden="true"><span>{label}</span><ArrowRight size={24}/></div>;
}
function PresetStep({ title, icon: Icon, options, selected, onSelect }) {
  return <section className="batch-step preset-glass"><Icon size={25}/><h2>{title}</h2><select aria-label={`Пакетная обработка · ${title}`} value={selected?.id || ''} onChange={event => { const preset = options.find(item => item.id === event.target.value); if (preset) onSelect(preset); }}>
    {!selected && <option value="">Текущие настройки</option>}{options.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
  </select><small>{selected ? 'Сохранённый пресет' : 'При запуске будут сохранены в новый пресет'}</small></section>;
}
export default function BatchPanel({ batch, cameras, environments, materials, camera, environment, material, onCamera, onEnvironment, onMaterial }) {
  const input = useRef(null);
  return <div className="batch-panel">
    <div className="batch-flow">
      <section className="batch-step batch-files preset-glass">
        <button className="batch-file-select" onClick={() => input.current.click()}><ImagePlus size={28}/><strong>{batch.files.length ? `Логотипы · ${batch.files.length}` : 'Выберите изображения'}</strong><small>PNG, JPEG, WebP · до 100 файлов</small></button>
        <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="Логотипы для пакетной обработки" hidden onChange={event => { batch.addFiles(event.target.files); event.target.value = ''; }}/>
        {!!batch.files.length && <div className="batch-file-previews">{batch.files.map(file => <div className="batch-file-preview" key={file.id}><img src={file.url} alt={file.name} title={file.name}/><button aria-label={`Убрать логотип ${file.name}`} onClick={() => batch.removeFile(file.id)}><X size={11}/></button></div>)}</div>}
      </section>
      <Arrow label="Камера"/><PresetStep title="Камера" icon={Aperture} options={cameras} selected={camera} onSelect={onCamera}/>
      <Arrow label="HDRI"/><PresetStep title="HDRI" icon={Sun} options={environments} selected={environment} onSelect={onEnvironment}/>
      <Arrow label="Материал"/><PresetStep title="Материал" icon={Sparkles} options={materials} selected={material} onSelect={onMaterial}/>
      <Arrow label="Экспорт" final/>
    </div>
    <p className="batch-hint">Один логотип — один PNG. Размер и прозрачность задаются в панели экспорта. Исходный логотип восстановится после обработки.</p>
    {batch.notice && <p className="batch-notice" role="status">{batch.notice}</p>}
  </div>;
}
