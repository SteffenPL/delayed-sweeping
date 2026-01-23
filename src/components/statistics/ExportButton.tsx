import { downloadTSV } from '@/utils';
import type { SimulationStatistics } from '@/types';

interface ExportButtonProps {
  statistics: SimulationStatistics;
}

export function ExportButton({ statistics }: ExportButtonProps) {
  const handleExport = () => {
    if (statistics.time.length === 0) {
      alert('No data to export. Run the simulation first.');
      return;
    }
    downloadTSV(statistics, 'simulation_data.tsv');
  };

  return (
    <button className="btn btn-small" onClick={handleExport}>
      Export TSV
    </button>
  );
}
