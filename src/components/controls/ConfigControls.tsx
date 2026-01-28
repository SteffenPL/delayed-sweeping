import { useSimulationStore } from '@/store';
import { configToTOML, downloadTOML, loadTOMLFile } from '@/utils/toml';
import type { SimulationConfig } from '@/types/config';

export function ConfigControls() {
  const {
    params,
    constraint,
    parametricTrajectory,
    setParams,
    setConstraint,
    setParametricTrajectory,
  } = useSimulationStore();

  const handleSave = () => {
    const config: SimulationConfig = {
      simulation: params,
      constraint,
      trajectory: parametricTrajectory,
      metadata: {
        name: 'Simulation Configuration',
        description: 'Delayed sweeping process simulation',
        created: new Date().toISOString(),
      },
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadTOML(config, `simulation-${timestamp}.toml`);
  };

  const handleLoad = async () => {
    try {
      const config = await loadTOMLFile();

      // Update store with loaded configuration
      setParams(config.simulation);
      setConstraint(config.constraint);
      setParametricTrajectory(config.trajectory);

      console.log('Configuration loaded successfully:', config.metadata?.name);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      alert('Failed to load configuration file. Please check the file format.');
    }
  };

  const handleExportPreview = () => {
    const config: SimulationConfig = {
      simulation: params,
      constraint,
      trajectory: parametricTrajectory,
    };

    const toml = configToTOML(config);
    console.log('Current configuration as TOML:\n', toml);

    // Show in a modal or copy to clipboard
    navigator.clipboard?.writeText(toml).then(() => {
      alert('Configuration copied to clipboard!');
    });
  };

  return (
    <div className="config-controls">
      <h3>Configuration</h3>
      <div className="button-group">
        <button className="btn" onClick={handleSave}>
          💾 Save Config
        </button>
        <button className="btn" onClick={handleLoad}>
          📂 Load Config
        </button>
        <button className="btn btn-small" onClick={handleExportPreview}>
          📋 Copy TOML
        </button>
      </div>
    </div>
  );
}
