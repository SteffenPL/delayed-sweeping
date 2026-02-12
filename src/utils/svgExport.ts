export function exportSVG(svgElement: SVGSVGElement, filename = 'simulation.svg') {
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  // Add XML declaration and namespace if missing
  if (!source.includes('xmlns=')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!source.startsWith('<?xml')) {
    source = '<?xml version="1.0" encoding="UTF-8"?>\n' + source;
  }

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
