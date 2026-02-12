import { useSimulationStore } from '@/store';

export function TimelineSlider() {
  const { trajectory, viewStep, setViewStep, params } = useSimulationStore();

  const maxStep = trajectory.length;
  if (maxStep === 0) return null;

  const t = (viewStep * params.h).toFixed(3);

  return (
    <div className="timeline-slider" style={{ width: '100%', padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
        <label style={{ whiteSpace: 'nowrap' }}>t = {t}</label>
        <input
          type="range"
          min={0}
          max={maxStep}
          value={viewStep}
          onChange={(e) => setViewStep(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <input
          type="number"
          min={0}
          max={maxStep}
          value={viewStep}
          onChange={(e) => {
            const v = Math.max(0, Math.min(maxStep, Number(e.target.value)));
            setViewStep(v);
          }}
          style={{ width: '64px', fontSize: '13px' }}
        />
      </div>
    </div>
  );
}
