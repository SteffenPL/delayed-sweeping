import { parse, stringify } from 'smol-toml';
import type { SimulationConfig } from '@/types/config';

/**
 * Export simulation configuration to TOML string
 */
export function configToTOML(config: SimulationConfig): string {
  // Add timestamp if not present
  const configWithMeta = {
    ...config,
    metadata: {
      ...config.metadata,
      created: config.metadata?.created || new Date().toISOString(),
    },
  };

  return stringify(configWithMeta);
}

/**
 * Parse TOML string to simulation configuration
 */
export function tomlToConfig(toml: string): SimulationConfig {
  const parsed = parse(toml);

  // Validate required fields
  if (!parsed.simulation || !parsed.constraint || !parsed.trajectory) {
    throw new Error('Invalid TOML: missing required sections (simulation, constraint, trajectory)');
  }

  return parsed as unknown as SimulationConfig;
}

/**
 * Download TOML configuration as file
 */
export function downloadTOML(config: SimulationConfig, filename: string = 'simulation-config.toml') {
  const toml = configToTOML(config);
  const blob = new Blob([toml], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Read TOML file from user input
 */
export function readTOMLFile(file: File): Promise<SimulationConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const toml = e.target?.result as string;
        const config = tomlToConfig(toml);
        resolve(config);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Trigger file input to load TOML
 */
export function loadTOMLFile(): Promise<SimulationConfig> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.toml';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const config = await readTOMLFile(file);
        resolve(config);
      } catch (error) {
        reject(error);
      }
    };

    input.click();
  });
}
