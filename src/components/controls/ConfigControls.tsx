import { useSimulationStore } from '@/store';
import { configToTOML, downloadTOML, loadTOMLFile } from '@/utils/toml';
import type { SimulationConfig } from '@/types/config';
import { Collapsible, Button } from '@/components/ui';
import { Save, FolderOpen, Copy } from 'lucide-react';

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
    <Collapsible title="Configuration" defaultOpen={false}>
      <div className="flex flex-col gap-2">
        <Button onClick={handleSave} variant="ghost" size="sm" className="gap-2 justify-start">
          <Save className="w-4 h-4" /> Save Config (TOML)
        </Button>
        <Button onClick={handleLoad} variant="ghost" size="sm" className="gap-2 justify-start">
          <FolderOpen className="w-4 h-4" /> Load Config (TOML)
        </Button>
        <Button onClick={handleExportPreview} variant="ghost" size="sm" className="gap-2 justify-start">
          <Copy className="w-4 h-4" /> Copy as TOML
        </Button>
      </div>
    </Collapsible>
  );
}
