import { Button } from '@/components/ui/button';
import { useSimulationStore } from '@/store';
import { configToTOML, downloadTOML, loadTOMLFile } from '@/utils/toml';
import type { SimulationConfig } from '@/types/config';

export function ConfigButtons() {
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
      setParams(config.simulation);
      setConstraint(config.constraint);
      setParametricTrajectory(config.trajectory);
      console.log('Configuration loaded successfully:', config.metadata?.name);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      alert('Failed to load configuration file. Please check the file format.');
    }
  };

  const handleCopyToml = () => {
    const config: SimulationConfig = {
      simulation: params,
      constraint,
      trajectory: parametricTrajectory,
    };

    const toml = configToTOML(config);
    navigator.clipboard?.writeText(toml).then(() => {
      alert('Configuration copied to clipboard!');
    });
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={handleLoad}>
        Load TOML
      </Button>
      <Button variant="outline" size="sm" onClick={handleSave}>
        Save TOML
      </Button>
      <Button variant="ghost" size="sm" onClick={handleCopyToml}>
        Copy
      </Button>
    </div>
  );
}
