#!/usr/bin/env node
const { spawn } = require('node:child_process');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', (code, signal) => {
      if (signal) {
        reject(new Error(`Process terminated with signal ${signal}`));
        return;
      }
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command '${command} ${args.join(' ')}' exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const filteredArgs = rawArgs.filter((arg) => arg !== '--watch=false' && arg !== '--watch');

  await run('node', ['tests/build-tests.js']);

  const hasExplicitPath = filteredArgs.some((arg) => !arg.startsWith('-'));
  const testArgs = ['--test', ...filteredArgs];
  if (!hasExplicitPath) {
    testArgs.push('tests');
  }

  await run('node', testArgs);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
