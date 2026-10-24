import { useEffect, useRef, useState } from 'react';
import { Zip, ZipPassThrough } from 'fflate';
import { batchFileNames } from './batch.js';

export function useBatch({ engine, size, transparent, signature, prepare, onError }) {
  const [files, setFiles] = useState([]);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [archive, setArchive] = useState(null);
  const [notice, setNotice] = useState('');
  const urls = useRef(new Set()), archiveURL = useRef(null), running = useRef(false), alive = useRef(true);
  const reset = () => {
    if (archiveURL.current) URL.revokeObjectURL(archiveURL.current);
    archiveURL.current = null; setArchive(null); setPhase('idle'); setProgress(0);
  };
  useEffect(() => { reset(); }, [files, size, transparent, signature]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      urls.current.forEach(url => URL.revokeObjectURL(url));
      if (archiveURL.current) URL.revokeObjectURL(archiveURL.current);
    };
  }, []);
  const addFiles = input => {
    if (running.current) return;
    const next = [...input];
    if (files.length + next.length > 100) { onError('За один запуск можно обработать до 100 логотипов.'); return; }
    if (next.some(file => file.size > 20 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) {
      onError('Выберите PNG, JPEG или WebP, не более 20 МБ на файл.'); return;
    }
    const items = next.map(file => {
      const url = URL.createObjectURL(file); urls.current.add(url);
      return { id: crypto.randomUUID(), file, url, name: file.name };
    });
    setFiles(itemsBefore => [...itemsBefore, ...items]); setNotice('');
  };
  const removeFile = id => {
    if (running.current) return;
    const item = files.find(file => file.id === id);
    if (item) { URL.revokeObjectURL(item.url); urls.current.delete(item.url); }
    setFiles(items => items.filter(file => file.id !== id)); setNotice('');
  };
  const start = async () => {
    if (running.current || !files.length) return;
    running.current = true; setPhase('running'); setProgress(0); setNotice(''); onError('');
    engine.current.batchProcessing = true;
    let zip;
    try {
      const message = await prepare();
      if (!alive.current) return;
      setNotice(message);
      const chunks = []; let zipError;
      zip = new Zip((error, data) => { if (error) zipError = error; else chunks.push(data); });
      const names = batchFileNames(files);
      let bytes = 0;
      await engine.current.renderBatch(files, size, transparent, async (blob, index) => {
        if (!alive.current) throw new Error('Обработка остановлена.');
        bytes += blob.size;
        if (bytes > 512 * 1024 * 1024) throw new Error('Архив превышает 512 МБ. Уменьшите размер PNG или количество файлов.');
        const entry = new ZipPassThrough(names[index]);
        zip.add(entry); entry.push(new Uint8Array(await blob.arrayBuffer()), true);
        if (zipError) throw zipError;
        setProgress(index + 1);
        await new Promise(resolve => requestAnimationFrame(resolve));
      });
      zip.end();
      if (zipError) throw zipError;
      if (!alive.current) return;
      const blob = new Blob(chunks, { type: 'application/zip' });
      const url = URL.createObjectURL(blob); archiveURL.current = url;
      setArchive({ url, count: files.length, size: blob.size }); setPhase('ready');
    } catch (error) {
      zip?.terminate();
      if (alive.current) { setPhase('idle'); onError(`Пакетная обработка: ${error.message || 'не удалось создать архив.'}`); }
    } finally { running.current = false; if (engine.current) engine.current.batchProcessing = false; }
  };
  const download = () => {
    if (!archive) return;
    const a = document.createElement('a'); a.href = archive.url; a.download = 'glint-icons-batch.zip'; a.click();
  };
  return { files, phase, progress, archive, notice, addFiles, removeFile, start, download, reset };
}
