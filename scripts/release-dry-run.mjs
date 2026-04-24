#!/usr/bin/env node

import { spawn } from 'node:child_process';

const rootDir = process.cwd();

const steps = [
  { name: 'Validate production env files', command: 'node', args: ['scripts/validate-production-env.mjs'], cwd: rootDir },
  { name: 'Build backend', command: 'npm', args: ['run', 'build'], cwd: `${rootDir}/backend` },
  { name: 'Build admin_backend', command: 'npm', args: ['run', 'build'], cwd: `${rootDir}/admin_backend` },
  { name: 'Build frontend', command: 'npm', args: ['run', 'build'], cwd: `${rootDir}/frontend` },
  { name: 'Build admin_frontend', command: 'npm', args: ['run', 'build'], cwd: `${rootDir}/admin_frontend` },
  { name: 'Run deployment smoke', command: 'node', args: ['scripts/deployment-smoke.mjs'], cwd: rootDir },
];

const runStep = (step) =>
  new Promise((resolve, reject) => {
    console.log(`\n== ${step.name} ==`);
    const child = spawn(step.command, step.args, {
      cwd: step.cwd,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${step.name} failed with exit code ${code ?? 'unknown'}.`));
    });

    child.on('error', reject);
  });

for (const step of steps) {
  await runStep(step);
}

console.log('\nRelease dry run completed successfully.');
