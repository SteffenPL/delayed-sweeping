#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { SimulationFactory } from '../simulation/SimulationFactory';
import { tomlToConfig } from '../utils/toml';
import type { SimulationConfig } from '../types/config';

/**
 * CLI for running simulations from TOML configuration files
 */

function printUsage() {
  console.log(`
Delayed Sweeping Simulator CLI

Usage:
  npm run simulate -- <config.toml> [options]

Options:
  -o, --output <file>    Output file (default: results.tsv)
  -f, --format <format>  Output format: tsv, json (default: tsv)
  -v, --verbose          Verbose output
  -h, --help             Show this help

Example:
  npm run simulate -- config/example.toml -o output/results.tsv

The config file should be in TOML format with sections:
  [simulation]    - T, h, epsilon, xPastExpression, yPastExpression, infiniteMode
  [constraint]    - expression, R, r, a, b
  [trajectory]    - xExpression, yExpression, alphaExpression
  [metadata]      - (optional) name, description, author
`);
}

interface CLIOptions {
  configFile: string;
  outputFile: string;
  format: 'tsv' | 'json';
  verbose: boolean;
}

function parseArgs(): CLIOptions | null {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    return null;
  }

  const options: CLIOptions = {
    configFile: args[0],
    outputFile: 'results.tsv',
    format: 'tsv',
    verbose: false,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-o' || arg === '--output') {
      options.outputFile = args[++i];
    } else if (arg === '-f' || arg === '--format') {
      const format = args[++i];
      if (format !== 'tsv' && format !== 'json') {
        console.error(`Invalid format: ${format}`);
        return null;
      }
      options.format = format;
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
    }
  }

  return options;
}

function loadConfig(configPath: string): SimulationConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const tomlContent = fs.readFileSync(configPath, 'utf-8');
  return tomlToConfig(tomlContent);
}

function exportTSV(results: any, outputPath: string) {
  const { delayed, classical } = results;

  // Build TSV with time, positions, and metrics
  const lines: string[] = [];

  // Header
  lines.push([
    'time',
    'delayed_x',
    'delayed_y',
    'delayed_xBar',
    'delayed_yBar',
    'delayed_projDist',
    'delayed_gradNorm',
    'classical_x',
    'classical_y',
    'classical_gradNorm',
  ].join('\t'));

  // Data rows
  const n = delayed.trajectory.length;
  for (let i = 0; i < n; i++) {
    const t = i * 0.01; // TODO: get h from config

    lines.push([
      t.toFixed(6),
      delayed.trajectory[i].x.toFixed(6),
      delayed.trajectory[i].y.toFixed(6),
      delayed.preProjection[i].x.toFixed(6),
      delayed.preProjection[i].y.toFixed(6),
      delayed.projectionDistances[i].toFixed(6),
      delayed.gradientNorms[i].toFixed(6),
      classical.trajectory[i]?.x.toFixed(6) || '',
      classical.trajectory[i]?.y.toFixed(6) || '',
      classical.gradientNorms[i]?.toFixed(6) || '',
    ].join('\t'));
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

function exportJSON(results: any, outputPath: string) {
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
}

async function main() {
  try {
    const options = parseArgs();
    if (!options) {
      process.exit(1);
    }

    if (options.verbose) {
      console.log('Loading configuration from:', options.configFile);
    }

    const config = loadConfig(options.configFile);

    if (options.verbose) {
      console.log('Configuration loaded:');
      console.log('  T =', config.simulation.T);
      console.log('  h =', config.simulation.h);
      console.log('  ε =', config.simulation.epsilon);
      console.log('  Constraint:', config.constraint.expression);
      console.log('  Trajectory: x(t) =', config.trajectory.xExpression);
      console.log('               y(t) =', config.trajectory.yExpression);
      console.log('               α(t) =', config.trajectory.alphaExpression);
      console.log('');
      console.log('Running simulation...');
    }

    const results = await SimulationFactory.runSimulation(config);

    if (options.verbose) {
      console.log(`Simulation complete: ${results.delayed.trajectory.length} steps`);
      console.log('Writing output to:', options.outputFile);
    }

    // Export results
    const outputDir = path.dirname(options.outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (options.format === 'tsv') {
      exportTSV(results, options.outputFile);
    } else {
      exportJSON(results, options.outputFile);
    }

    if (options.verbose) {
      console.log('Done!');
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
