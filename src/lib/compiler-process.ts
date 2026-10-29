import { spawn } from 'child_process';

export function runCompiler(executable: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; timeout: number; signal: AbortSignal }): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (options.signal.aborted) { reject(new Error('Compilation cancelled.')); return; }
    let stopped = false;
    let stdout = '', stderr = '', bytes = 0;
    const child = spawn(executable, args, { cwd: options.cwd, env: options.env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let startupError: Error | undefined;
    child.on('error', error => { startupError = error; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      options.signal.removeEventListener('abort', cancel);
      if (startupError || code !== 0 || stopped) reject(Object.assign(startupError || new Error(stopped ? 'Compilation stopped.' : 'Compiler process failed.'), { ...(!startupError ? { code } : {}), signal, stdout, stderr, killed: stopped, ...(options.signal.aborted ? { message: 'Compilation cancelled.', code: 'CANCELLED' } : {}) }));
      else resolve({ stdout, stderr });
    });
    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (!child.pid) return;
      if (process.platform === 'win32') {
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        killer.on('error', () => child.kill());
        killer.on('exit', code => { if (code) child.kill(); });
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }
    };
    const cancel = () => stop();
    const timer = setTimeout(stop, options.timeout);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { bytes += Buffer.byteLength(chunk); if (bytes > 4 * 1024 * 1024) stop(); else stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { bytes += Buffer.byteLength(chunk); if (bytes > 4 * 1024 * 1024) stop(); else stderr += chunk; });
    options.signal.addEventListener('abort', cancel, { once: true });
    if (options.signal.aborted) stop();
  });
}
