import katex from 'katex';
import { useSimulationStore } from '@/store';
import { useSimulationControls } from '@/hooks/SimulationContext';

const BASE = import.meta.env.BASE_URL;

const SHOWCASE = [
  {
    presetId: 'circle-long-memory',
    image: `${BASE}fig1.svg`,
    label: 'Circle — Disk',
  },
  {
    presetId: 'lissajous-disk',
    image: `${BASE}fig2a.svg`,
    label: 'Lissajous — Disk',
  },
  {
    presetId: 'lissajous-stadium',
    image: `${BASE}fig2b.svg`,
    label: 'Lissajous — Stadium',
  },
];

function tex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode });
  } catch {
    return latex;
  }
}

export function Header() {
  const loadPreset = useSimulationStore((s) => s.loadPreset);
  const { restart, start } = useSimulationControls();

  const handleLoadPreset = (presetId: string) => {
    loadPreset(presetId);
    restart();
    start();
  };

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-primary">
            Delayed Sweeping Simulator
          </h1>
        </div>

        {/* Abstract */}
        <div className="max-w-3xl mx-auto text-sm text-muted-foreground leading-relaxed mb-6">
          <p>
            Interactive simulator for the{' '}
            <em>delayed convex sweeping process</em>. Given a moving convex
            constraint{' '}
            <span dangerouslySetInnerHTML={{ __html: tex('C(t)') }} />, the
            solution{' '}
            <span dangerouslySetInnerHTML={{ __html: tex('X(t)') }} /> is
            determined by projecting a weighted average of past positions onto
            the current constraint:
          </p>
          <div
            className="my-3"
            dangerouslySetInnerHTML={{
              __html: tex(
                'X^n = P_{C^n}\\!\\Big(\\sum_{j \\geq 1} \\tilde{r}_j\\, X^{n-j}\\Big), \\qquad \\tilde{r}_j = \\frac{1}{\\mu_0}\\,\\frac{1}{h}\\,e^{-\\varepsilon j h}\\bigl(1 - e^{-\\varepsilon h}\\bigr)',
                true,
              ),
            }}
          />
          <p>
            where{' '}
            <span dangerouslySetInnerHTML={{ __html: tex('\\varepsilon') }} />{' '}
            controls the memory decay rate and{' '}
            <span dangerouslySetInnerHTML={{ __html: tex('h') }} /> is the
            time step. Select a preset below to explore different scenarios.
          </p>
        </div>

        {/* Showcase figures with load buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          {SHOWCASE.map(({ presetId, image, label }) => (
            <div
              key={presetId}
              className="flex flex-col items-center gap-2"
            >
              <img
                src={image}
                alt={label}
                className="w-40 h-40 object-contain rounded border bg-white"
              />
              <button
                onClick={() => handleLoadPreset(presetId)}
                className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Load "{label}"
              </button>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
