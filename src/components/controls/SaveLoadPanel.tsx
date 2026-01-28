import { useRef } from 'react';
import { useSimulationStore } from '@/store';
import { downloadJSON, readJSONFile } from '@/utils';

export function SaveLoadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    exportToJSON,
    importFromJSON,
    saveToLocalStorage,
    loadFromLocalStorage,
  } = useSimulationStore();

  const handleExport = () => {
    const json = exportToJSON();
    downloadJSON(json, 'simulation_params.json');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const json = await readJSONFile(file);
      const success = importFromJSON(json);
      if (!success) {
        alert('Failed to import parameters. Check file format.');
      }
    } catch (err) {
      alert('Failed to read file.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="save-load-panel">
      <h3>Save / Load</h3>

      <div className="button-row">
        <button className="btn btn-small" onClick={handleExport}>
          Export JSON
        </button>
        <button
          className="btn btn-small"
          onClick={() => fileInputRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </div>

      <div className="button-row">
        <button className="btn btn-small" onClick={saveToLocalStorage}>
          Save to Browser
        </button>
        <button className="btn btn-small" onClick={loadFromLocalStorage}>
          Load from Browser
        </button>
      </div>
    </div>
  );
}
