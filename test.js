const chokidar = require('chokidar');
const { spawn } = require('child_process');

let serverProcess;

function startServer() {
  const npmCommand = 'npm';

  serverProcess = spawn(npmCommand, ['run', 'start'], {
    stdio: 'inherit',
    shell: true,
  });
}

startServer();

chokidar.watch(['src/**/*.ts', '.env']).on('change', (path) => {
  console.log(`File changed: ${path}`);

  if (serverProcess) {
    serverProcess.kill();
  }

  startServer();
});

process.on('SIGINT', () => {
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  }
  process.exit(0);
});
