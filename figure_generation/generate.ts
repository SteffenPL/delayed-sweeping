import { trajectory, convergence, parameterScan } from './lib';

async function main() {
  console.log("=== Figure Generation ===\n");

  const hValues = Array.from({ length: 7 }, (_, i) => 2 ** -(i + 2));
  const hRef = 2 ** -10;

  // Figure 1: trajectory — circle, long memory (ε = 2.5)
  // Show constraint outlines and projection arrows at t = 1, 3, 6
  await trajectory(
    "fig1",
    "base/circle_long_memory.toml",
    {},
    { snapshotTimes: [1, 3, 6] },
  );

  // Figure 2a: trajectory — lissajous
  // Show constraint outlines and projection arrows at t = 5, 10, 15; include classical trajectory
  await trajectory(
    "fig2a",
    "base/lissajous.toml",
    {},
    { snapshotTimes: [4.5, 9], showClassical: true },
  );

  // Figure 2b: trajectory — rect
  await trajectory(
    "fig2b",
    "base/mean_traj.toml",
    {},
    { snapshotTimes: [0.75, 2.4, 4.2, 6.1], showClassical: true },
  );

  // Figure 3a.1: KKT term max over h (log-log)
  await parameterScan(
    "kkt_max_by_dtdt",
    "base/lissajous.toml",
    {},
    {
      formula:
        "dot(lambda[n]*G[n] - lambda[n-1]*G[n-1], c[n] - c[n-1])/(dt*dt)",
      aggregation: "max",
      paramValues: hValues,
      paramOverride: (h) => ({ simulation: { h } }),
      paramLabel: "h",
      valueLabel: "max KKT",
      refSlopes: [1, 2],
    },
  );

  // Figure 3a.2: trajectory — stadium
  await parameterScan(
    "kkt_max_by_dtdt_stadium",
    "base/mean_traj.toml",
    {},
    {
      formula:
        "dot(lambda[n]*G[n] - lambda[n-1]*G[n-1], z[n] - z[n-1])/(dt*dt)",
      aggregation: "max",
      paramValues: hValues,
      paramOverride: (h) => ({ simulation: { h } }),
      paramLabel: "h",
      valueLabel: "max KKT",
      refSlopes: [1, 2],
    },
  );

  // Figure 3b.1: KKT term max over h (log-log)
  await parameterScan(
    "kkt_by_dt_L2",
    "base/lissajous.toml",
    {},
    {
      formula:
        "dot(lambda[n]*G[n] - lambda[n-1]*G[n-1], c[n] - c[n-1])/(dt)",
      aggregation: "L2",
      paramValues: hValues,
      paramOverride: (h) => ({ simulation: { h } }),
      paramLabel: "h",
      valueLabel: "max KKT",
      refSlopes: [1, 2],
    },
  );

  // Figure 3b.2: trajectory — stadium
  await parameterScan(
    "kkt_by_dt_L2_stadium",
    "base/mean_traj.toml",
    {},
    {
      formula:
        "dot(lambda[n]*G[n] - lambda[n-1]*G[n-1], z[n] - z[n-1])/dt",
      aggregation: "L2",
      paramValues: hValues,
      paramOverride: (h) => ({ simulation: { h } }),
      paramLabel: "h",
      valueLabel: "max KKT",
      refSlopes: [1, 2],
    },
  );

  // Figure 3a: convergence study — lissajous (circular), compatible past
  await convergence("conv_L2", "base/lissajous.toml", {}, { hValues, hRef });

  // Figure 3a: convergence study — lissajous (circular), incompatible past
  await convergence("conv_L2_incompat", "base/lissajous.toml",
    { simulation: { xPastExpression: "2", yPastExpression: "0" } },
    { hValues, hRef });

  // Figure 3b: convergence study — stadium, compatible past
  await convergence("conv_L2_stadium", "base/mean_traj.toml", {}, { hValues, hRef });

  // Figure 3b: convergence study — stadium, incompatible past
  await convergence("conv_L2_stadium_incompat", "base/mean_traj.toml",
    { simulation: { xPastExpression: "2", yPastExpression: "0" } },
    { hValues, hRef });

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
