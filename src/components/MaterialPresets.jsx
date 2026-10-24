import React, { useState } from 'react';
import { X } from 'lucide-react';
import { builtInMaterialPresets, snapshotMaterial } from '../material-presets.js';
import { defaults } from '../defaults.js';

export default function MaterialPresets({ settings, onApply, presets, onChange }) {
  const [name, setName] = useState('');
  const update = items => {
    onChange(items);
  };
  const save = event => {
    event.preventDefault();
    if (!name.trim()) return;
    update([...presets, { id: crypto.randomUUID(), name: name.trim(), material: snapshotMaterial(settings) }]);
    setName('');
  };
  return <div className="templates-panel">
    <div className="material-preset-columns"><section className="material-preset-group" aria-label="Мои пресеты">
    <form className="material-preset-form" onSubmit={save}>
      <label htmlFor="material-preset-name">Название пресета<input id="material-preset-name" type="text" placeholder="Мой материал" maxLength={60} value={name} onChange={event => setName(event.target.value)}/></label>
      <button className="secondary" type="submit" disabled={!name.trim()}>Сохранить пресет</button>
    </form>
    <h2>Мои пресеты</h2>
    {presets.length ? <div className="presets material-presets">{presets.map(preset => <div className="material-preset-card" key={preset.id}>
      <button className="preset-glass material-preset-apply" onClick={() => onApply(preset.material)} aria-label={`Применить материал ${preset.name}`} title={preset.name}><i style={{ '--preset': preset.material.color }}/><span>{preset.name}</span></button>
      <button className="material-preset-delete" onClick={() => update(presets.filter(item => item.id !== preset.id))} aria-label={`Удалить материал ${preset.name}`} title="Удалить пресет"><X size={13}/></button>
    </div>)}</div> : <p className="material-presets-empty">Настройте краску и сохраните её под своим названием.</p>}
    </section><section className="material-preset-group material-preset-group-ready" aria-label="Готовые материалы"><h2>Готовые материалы</h2>
    <div className="presets">{builtInMaterialPresets.map(preset => <button key={preset.name} onClick={() => onApply(snapshotMaterial({ ...defaults, ...preset }))}><i style={{ '--preset': preset.color }}/>{preset.name}</button>)}</div></section></div>
  </div>;
}
