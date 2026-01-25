import type { SimulationStatistics } from '@/types';

/**
 * Convert statistics to TSV format
 */
export function exportToTSV(statistics: SimulationStatistics): string {
  const headers = [
    'time',
    // Delayed sweeping process
    'projectionDistance',
    'positionX',
    'positionY',
    'velocity',
    'distanceFromOrigin',
    'lagrangeMultiplier',
    'lagrangeDotProduct',
    'totalEnergy',
    'gradientNorm',
    'lagrangeMultiplierValue',
    // Classical sweeping process
    'classicalProjectionDistance',
    'classicalPositionX',
    'classicalPositionY',
    'classicalVelocity',
    'classicalDistanceFromOrigin',
    'classicalLagrangeMultiplier',
    'classicalLagrangeDotProduct',
    'classicalTotalEnergy',
    'classicalGradientNorm',
    'classicalLagrangeMultiplierValue',
  ];
  const lines: string[] = [headers.join('\t')];

  for (let i = 0; i < statistics.time.length; i++) {
    const row = [
      statistics.time[i]?.toFixed(6) ?? '',
      // Delayed sweeping process
      statistics.projectionDistance[i]?.toFixed(6) ?? '',
      statistics.positionX[i]?.toFixed(6) ?? '',
      statistics.positionY[i]?.toFixed(6) ?? '',
      statistics.velocity[i]?.toFixed(6) ?? '',
      statistics.distanceFromOrigin[i]?.toFixed(6) ?? '',
      statistics.lagrangeMultiplier[i]?.toFixed(6) ?? '',
      statistics.lagrangeDotProduct[i]?.toFixed(6) ?? '',
      statistics.totalEnergy[i]?.toFixed(6) ?? '',
      statistics.gradientNorm[i]?.toFixed(6) ?? '',
      statistics.lagrangeMultiplierValue[i]?.toFixed(6) ?? '',
      // Classical sweeping process
      statistics.classicalProjectionDistance[i]?.toFixed(6) ?? '',
      statistics.classicalPositionX[i]?.toFixed(6) ?? '',
      statistics.classicalPositionY[i]?.toFixed(6) ?? '',
      statistics.classicalVelocity[i]?.toFixed(6) ?? '',
      statistics.classicalDistanceFromOrigin[i]?.toFixed(6) ?? '',
      statistics.classicalLagrangeMultiplier[i]?.toFixed(6) ?? '',
      statistics.classicalLagrangeDotProduct[i]?.toFixed(6) ?? '',
      statistics.classicalTotalEnergy[i]?.toFixed(6) ?? '',
      statistics.classicalGradientNorm[i]?.toFixed(6) ?? '',
      statistics.classicalLagrangeMultiplierValue[i]?.toFixed(6) ?? '',
    ];
    lines.push(row.join('\t'));
  }

  return lines.join('\n');
}

/**
 * Trigger download of TSV file
 */
export function downloadTSV(
  statistics: SimulationStatistics,
  filename: string = 'simulation_data.tsv'
): void {
  const content = exportToTSV(statistics);
  const blob = new Blob([content], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger download of JSON parameters
 */
export function downloadJSON(content: string, filename: string = 'simulation_params.json'): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read JSON file from file input
 */
export function readJSONFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
