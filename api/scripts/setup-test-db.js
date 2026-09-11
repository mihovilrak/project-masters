/**
 * Start a dedicated test Postgres in Docker and run db/migrate.sh inside it.
 * Run from api/: yarn setup-test-db
 * Requires: Docker. No .env or existing Postgres needed.
 * Uses: container pm_test_db, port 5433, db pm_test, owner pm_user/pm_password,
 * app role pm_app/pm_app_password.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const CONTAINER = 'pm_test_db';
const IMAGE = 'postgres:18.1-alpine3.23';
const PORT = 5433;
const USER = 'pm_user';
const PASSWORD = 'pm_password';
const APP_USER = 'pm_app';
const APP_PASSWORD = 'pm_app_password';
const DB = 'pm_test';

const dbDir = path.join(__dirname, '..', '..', 'db');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);
  return r;
}

function runQuiet(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
  return r.status === 0;
}

function docker(args, opts = {}) {
  return run('docker', args, opts);
}

function main() {
  console.log('Setting up integration test DB (Docker)...');

  if (!runQuiet('docker', ['info'])) {
    console.error(
      'Docker is not running or not in PATH. Start Docker and try again.',
    );
    process.exit(1);
  }

  const inspect = spawnSync('docker', [
    'inspect',
    '-f',
    '{{.State.Running}}',
    CONTAINER
  ], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const running = inspect.status === 0 && inspect.stdout.trim() === 'true';

  if (!running) {
    const exists = spawnSync('docker', ['inspect', CONTAINER], {
      stdio: 'pipe',
    });
    if (exists.status === 0) {
      console.log('Starting existing container %s...', CONTAINER);
      docker(['start', CONTAINER]);
    } else {
      console.log('Creating container %s (port %d)...', CONTAINER, PORT);
      docker([
        'run', '-d', '--name', CONTAINER,
        '-e', 'POSTGRES_DB=' + DB,
        '-e', 'POSTGRES_USER=' + USER,
        '-e', 'POSTGRES_PASSWORD=' + PASSWORD,
        '-p', PORT + ':5432',
        IMAGE,
      ]);
    }
  } else {
    console.log('Container %s already running.', CONTAINER);
  }

  console.log('Waiting for Postgres...');
  for (let i = 0; i < 30; i++) {
    const ok = runQuiet('docker', [
      'exec', CONTAINER, 'pg_isready', '-U', USER, '-d', DB,
    ]);
    if (ok) break;
    if (i === 29) {
      console.error('Postgres did not become ready in time.');
      process.exit(1);
    }
    const until = Date.now() + 1000;
    while (Date.now() < until) {
      /* 1s busy wait for Postgres */
    }
  }

  // Same migration path as production: tracked db/init scripts plus the app role.
  console.log('Running db/migrate.sh...');
  docker(['exec', CONTAINER, 'rm', '-rf', '/tmp/db']);
  docker(['exec', CONTAINER, 'mkdir', '/tmp/db']);
  for (const entry of ['init', 'migrate.sh', 'pgpass.sh', 'app-role.sql', 'seed-admin.sh']) {
    docker(['cp', path.join(dbDir, entry), CONTAINER + ':/tmp/db/' + entry]);
  }
  docker([
    'exec',
    '-e', 'POSTGRES_HOST=127.0.0.1',
    '-e', 'POSTGRES_DB=' + DB,
    '-e', 'POSTGRES_USER=' + USER,
    '-e', 'POSTGRES_PASSWORD=' + PASSWORD,
    '-e', 'APP_DB_USER=' + APP_USER,
    '-e', 'APP_DB_PASSWORD=' + APP_PASSWORD,
    CONTAINER, 'sh', '/tmp/db/migrate.sh',
  ]);

  console.log('Done.');
  printNext();
}

function printNext() {
  const vars = {
    TEST_DB_HOST: 'localhost',
    TEST_DB_PORT: PORT,
    TEST_DB_NAME: DB,
    TEST_DB_USER: APP_USER,
    TEST_DB_PASSWORD: APP_PASSWORD,
    TEST_DB_ADMIN_USER: USER,
    TEST_DB_ADMIN_PASSWORD: PASSWORD,
    SESSION_SECRET: 'test',
  };
  const entries = Object.entries(vars);
  const cmd = entries.map(([k, v]) => `set ${k}=${v}&`).join(' ');
  const ps = entries.map(([k, v]) => `$env:${k}="${v}";`).join(' ');
  const sh = entries.map(([k, v]) => `${k}=${v}`).join(' ');
  console.log(`
    Run integration tests from api/ with:

    Windows (cmd):
      ${cmd} yarn test:integration

    Windows (PowerShell):
      ${ps} yarn test:integration

    Linux / macOS / Git Bash:
      ${sh} yarn test:integration

    Or put the same values in api/.env.test and run: yarn test:integration:local`
  );
}

main();
