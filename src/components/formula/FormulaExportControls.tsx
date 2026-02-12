import type { RefObject } from 'react';

interface FormulaExportControlsProps {
  data: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
  chartRef: RefObject<HTMLDivElement | null>;
}

export function FormulaExportControls({
  data,
  xLabel,
  yLabel,
  chartRef,
}: FormulaExportControlsProps) {
  const exportTSV = () => {
    if (data.length === 0) return;
    const header = `${xLabel}\t${yLabel}`;
    const rows = data.map((d) => `${d.x.toFixed(6)}\t${d.y.toFixed(6)}`);
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formula_plot.tsv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportSVG = () => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formula_plot.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="formula-export-controls">
      <button className="btn btn-small" onClick={exportTSV} disabled={data.length === 0}>
        Export TSV
      </button>
      <button className="btn btn-small" onClick={exportSVG}>
        Export SVG
      </button>
    </div>
  );
}
