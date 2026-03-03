import { trajectory, quantities, convergence } from './lib';

async function main() {
  console.log('=== Figure Generation ===\n');

  // Figure 2a: long memory (1/ε = 0.4 → ε = 2.5)
  await trajectory('cups_3', 'base/cups.toml', { simulation: { epsilon: 2.5 } });

  // Figure 1a & 2b: short memory (1/ε = 2 → ε = 0.5)
  await trajectory('cups_4', 'base/cups.toml', { simulation: { epsilon: 0.5 } });

  // Figure 1b: KKT quantity
  await quantities('cups_4_kkt', 'base/cups.toml', { simulation: { epsilon: 0.5 } });

  // Figure 3: convergence studies
  const hValues = Array.from({ length: 7 }, (_, i) => 2 ** -(i + 2));
  const hRef = 2 ** -10;

  // Compatible past (zero past, constraint centered at origin at t=0)
  await convergence('conv_L2', 'base/cups.toml', {}, { hValues, hRef });

  // Incompatible past (past = (5,5), clearly outside constraint)
  await convergence('conv_L2_degen', 'base/cups.toml',
    { simulation: { xPastExpression: '5', yPastExpression: '5' } },
    { hValues, hRef }
  );

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
