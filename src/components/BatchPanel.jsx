import React, { useRef } from 'react';
import { ImagePlus, X, ArrowRight, Aperture, Sun, Sparkles, Trash2, Check } from 'lucide-react';

function Arrow({ label, final = false }) {
  return <div className={`batch-arrow${final ? ' batch-arrow-final' : ''}`} aria-hidden="true"><span>{label}</span><ArrowRight size={24}/></div>;
}
function PresetStep({ title, icon: Icon, options, selected, onSelect }) {
  return <section className="batch-step preset-glass"><Icon size={25}/><h2>{title}</h2><select aria-label={`Пакетная обработка · ${title}`} value={selected?.id || ''} onChange={event => { const preset = options.find(item => item.id === event.target.value); if (preset) onSelect(preset); }}>
    {!selected && <option value="">Текущие настройки</option>}{options.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
  </select><small>{selected ? 'Сохранённый пресет' : 'При запуске будут сохранены в новый пресет'}</small></section>;
}
export default function BatchPanel({ batch, cameras, environments, materials, camera, environment, material, onCamera, onEnvironment, onMaterial, activeLogoId, onLogoSelect }) {
  const input = useRef(null);
  const busy = batch.phase === 'running';
  const clearFiles = () => {
    if (window.confirm(`Очистить список логотипов (${batch.files.length})? Пакетный логотип будет убран с модели. Файлы на диске не изменятся.`)) batch.clearFiles();
  };
  return <div className="batch-panel">
    <div className="batch-flow">
      <section className={`batch-step batch-files preset-glass ${batch.files.length ? 'has-files' : ''}`} aria-label="Файлы пакета">
        {!!batch.files.length && <div className="batch-files-header"><h2>Логотипы <span>{batch.files.length}</span></h2><div className="batch-files-actions"><button type="button" disabled={busy} title="Добавить логотипы" aria-label="Добавить логотипы" onClick={() => input.current.click()}><ImagePlus size={16}/></button><button type="button" className="batch-clear-files" disabled={busy} title="Очистить все файлы" aria-label="Очистить все файлы" onClick={clearFiles}><Trash2 size={14}/><span>Очистить</span></button></div></div>}
        {!batch.files.length && <button className="batch-file-select" disabled={busy} onClick={() => input.current.click()}><ImagePlus size={28}/><strong>Выберите изображения</strong><small>PNG, JPEG, WebP · до 100 файлов</small></button>}
        <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="Логотипы для пакетной обработки" hidden onChange={event => { batch.addFiles(event.target.files); event.target.value = ''; }}/>
        {!!batch.files.length && <><div className="batch-file-previews" role="region" aria-label="Выбранные логотипы" tabIndex={0}>{batch.files.map((file, index) => <div className={`batch-file-preview ${activeLogoId === file.id ? 'selected' : ''}`} key={file.id}><button type="button" className="batch-file-pick" disabled={busy} aria-label={`Показать логотип ${file.name}`} aria-pressed={activeLogoId === file.id} title={file.name} onClick={() => onLogoSelect(file)}><img src={file.url} alt="" loading="lazy" decoding="async"/></button><span className="batch-file-index" aria-hidden="true">{index + 1}</span>{activeLogoId === file.id && <Check className="batch-file-selected" size={18} aria-hidden="true"/>}<button type="button" className="batch-file-remove" disabled={busy} aria-label={`Убрать логотип ${file.name}`} onClick={() => batch.removeFile(file.id)}><X size={12}/></button></div>)}</div><small className="batch-files-caption">PNG, JPEG, WebP · до 100 файлов</small></>}
      </section>
      <Arrow label="Камера"/><PresetStep title="Камера" icon={Aperture} options={cameras} selected={camera} onSelect={onCamera}/>
      <Arrow label="HDRI"/><PresetStep title="HDRI" icon={Sun} options={environments} selected={environment} onSelect={onEnvironment}/>
      <Arrow label="Материал"/><PresetStep title="Материал" icon={Sparkles} options={materials} selected={material} onSelect={onMaterial}/>
      <Arrow label="Экспорт" final/>
    </div>
    <p className="batch-hint">Выберите картинку, чтобы показать её на модели. Активный логотип сохраняется во всех вкладках. В экспорт попадут все файлы пакета.</p>
    {batch.notice && <p className="batch-notice" role="status">{batch.notice}</p>}
  </div>;
}
