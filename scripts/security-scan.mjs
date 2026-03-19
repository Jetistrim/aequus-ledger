import { spawn } from 'node:child_process';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Falha ao executar: ${command} ${args.join(' ')} (codigo ${code})`));
    });

    child.on('error', reject);
  });
}

async function main() {
  const workspacePath = process.cwd().replace(/\\/g, '/');

  console.log('Executando Trivy filesystem scan...');

  await run('docker', [
    'run', '--rm',
    '-v', '/var/run/docker.sock:/var/run/docker.sock',
    '-v', `${workspacePath}:/workspace`,
    'aquasec/trivy:0.64.1',
    'fs',
    '--scanners', 'vuln',
    '--severity', 'HIGH,CRITICAL',
    '--ignore-unfixed',
    '/workspace',
  ]);

  console.log('Scan finalizado.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
