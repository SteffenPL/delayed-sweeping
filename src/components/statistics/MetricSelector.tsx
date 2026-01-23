interface Metric {
  id: string;
  label: string;
  color: string;
}

interface MetricSelectorProps {
  metrics: Metric[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MetricSelector({ metrics, selected, onChange }: MetricSelectorProps) {
  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((m) => m !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  // Split metrics into delayed and classical
  const delayedMetrics = metrics.filter(m => !m.id.startsWith('classical'));
  const classicalMetrics = metrics.filter(m => m.id.startsWith('classical'));

  return (
    <div className="metric-selector-container">
      <div className="metric-selector">
        <div className="metric-row-label">Delayed Sweeping:</div>
        {delayedMetrics.map((metric) => (
          <label key={metric.id} className="metric-checkbox">
            <input
              type="checkbox"
              checked={selected.includes(metric.id)}
              onChange={() => handleToggle(metric.id)}
            />
            <span
              className="metric-label"
              style={{ borderColor: metric.color }}
            >
              {metric.label}
            </span>
          </label>
        ))}
      </div>
      {classicalMetrics.length > 0 && (
        <div className="metric-selector">
          <div className="metric-row-label">Classical Sweeping:</div>
          {classicalMetrics.map((metric) => (
            <label key={metric.id} className="metric-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(metric.id)}
                onChange={() => handleToggle(metric.id)}
              />
              <span
                className="metric-label"
                style={{ borderColor: metric.color }}
              >
                {metric.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
