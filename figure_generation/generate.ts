import { trajectory, convergence, parameterScan } from './lib';

async function main() {
  console.log('=== Figure Generation ===\n');

  const hValues = Array.from({ length: 7 }, (_, i) => 2 ** -(i + 2));
  const hRef = 2 ** -10;

  // Figure 1: trajectory — circle, long memory (ε = 2.5)
  // Show constraint outlines and projection arrows at t = 1, 3, 6
  await trajectory('fig1', 'base/circle_long_memory.toml', {}, { snapshotTimes: [1, 3, 6] });

  // Figure 2a: trajectory — lissajous
  await trajectory('fig2a', 'base/lissajous.toml');

  // Figure 2b: KKT term max over h (log-log)
  await parameterScan(
    'kkt_max_h',
    'base/lissajous.toml',
    {},
    {
      formula:
        '-dot(lambda[n]*G[n] - lambda[n-1]*G[n-1], z[n] - z[n-1])/norm(z[n] - z[n-1])',
      aggregation: 'max',
      paramValues: hValues,
      paramOverride: (h) => ({ simulation: { h } }),
      paramLabel: 'h',
      valueLabel: 'max KKT',
      refSlopes: [1, 2],
    },
  );

  // Figure 3: convergence study — lissajous
  await convergence('conv_L2', 'base/lissajous.toml', {}, { hValues, hRef });

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
