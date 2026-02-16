import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from '@/store';
import { configToTOML, downloadTOML, loadTOMLFile } from '@/utils/toml';
import { encodeShareState } from '@/utils/urlShare';
import type { SimulationConfig } from '@/types/config';

export function ConfigButtons() {
  const {
    params,
    constraint,
    parametricTrajectory,
    trajectoryMode,
    setParams,
    setConstraint,
    setParametricTrajectory,
    setTrajectoryMode,
  } = useSimulationStore();

  const [shareLabel, setShareLabel] = useState('Share');

  const handleSave = () => {
    const config: SimulationConfig = {
      simulation: params,
      constraint,
      trajectory: parametricTrajectory,
      trajectoryMode,
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
      if (config.trajectoryMode) {
        setTrajectoryMode(config.trajectoryMode);
      }
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
      trajectoryMode,
    };

    const toml = configToTOML(config);
    navigator.clipboard?.writeText(toml).then(() => {
      alert('Configuration copied to clipboard!');
    });
  };

  const handleShare = async () => {
    const state = useSimulationStore.getState();
    const data = {
      params: state.params,
      constraint: state.constraint,
      constraintAngle: state.constraintAngle,
      trajectoryMode: state.trajectoryMode,
      parametricTrajectory: state.parametricTrajectory,
      speed: state.speed,
      colorConfig: state.colorConfig,
      formula: state.formula,
      plotMode: state.plotMode,
      showPlot: state.showPlot,
      parameterStudyConfig: state.parameterStudyConfig,
      parameterStudyResults: state.parameterStudyResults,
    };

    try {
      const encoded = await encodeShareState(data);
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      await navigator.clipboard.writeText(url);
      setShareLabel('Copied!');
      setTimeout(() => setShareLabel('Share'), 2000);
    } catch (e) {
      console.error('Failed to create share URL:', e);
      alert('Failed to create share URL.');
    }
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
      <Button variant="ghost" size="sm" onClick={handleShare}>
        {shareLabel}
      </Button>
    </div>
  );
}
