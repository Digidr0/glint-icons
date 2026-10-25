// Average PNG weights supplied for the four supported export resolutions.
export function estimatePNGBytes(size, count = 1) {
  return 256 * 1024 * (size / 512) ** 2 * count;
}

export function formatFileSize(bytes) {
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 1
    ? `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(megabytes)} МБ`
    : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(bytes / 1024)} КБ`;
}
