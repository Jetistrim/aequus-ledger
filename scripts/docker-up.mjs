import { spawn } from 'node:child_process';

const profile = process.argv[2] || 'dev';
const validProfiles = new Set(['dev', 'prod']);

if (!validProfiles.has(profile)) {
  console.error(`Perfil invalido: ${profile}. Use dev ou prod.`);
  process.exit(1);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Comando falhou com codigo ${code}: ${command} ${args.join(' ')}`));
    });

    child.on('error', reject);
  });
}

async function main() {
  console.log(`Subindo ambiente Docker no profile ${profile}...`);

  await runCommand('docker', ['compose', '--profile', profile, 'up', '-d', '--build', '--remove-orphans']);

  console.log('Containers iniciados. Aguardando healthcheck da aplicacao...');

  const healthcheckEnv = {
    ...process.env,
    HEALTHCHECK_BACKEND_URL: profile === 'prod'
      ? 'https://localhost:5173/api/health'
      : 'http://localhost:3001/api/health',
    HEALTHCHECK_FRONTEND_URL: profile === 'prod'
      ? 'https://localhost:5173'
      : 'http://localhost:5173',
    HEALTHCHECK_INSECURE_TLS: profile === 'prod' ? 'true' : 'false',
  };

  await runCommand('node', ['scripts/healthcheck.mjs'], { env: healthcheckEnv });

  const baseUrl = profile === 'prod' ? 'https://localhost:5173' : 'http://localhost:5173';
  console.log(`Ambiente ${profile} pronto em ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
