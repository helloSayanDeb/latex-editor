export function compilerFailure(error: unknown, stage: string, executable: string): string {
  const detail = error as { code?: string | number; killed?: boolean; message?: string; signal?: string };
  const numeric = typeof detail.code === 'number' ? detail.code >>> 0 : undefined;
  let advice = '';
  if (detail.code === 'CANCELLED') return `Compilation cancelled during ${stage}.\nExecutable: ${executable}`;
  if (numeric === 0xc0000135) advice = 'The compiler could not start because a required Windows DLL is missing. Repair the selected TeX distribution and its runtime dependencies, then verify the engine in Lemmata setup. Installing a document package cannot repair this startup failure.';
  else if (numeric === 0xc000007b) advice = 'Windows could not load this executable or one of its dependencies. Check the CPU architecture and repair the selected TeX distribution.';
  else if (detail.code === 'ENOENT') advice = 'The executable is missing. Check the selected distribution in Lemmata setup.';
  else if (detail.code === 'EACCES') advice = 'The executable could not be started because access was denied. Check its permissions.';
  else if (detail.killed) advice = 'The build exceeded its execution or output limit. Check the complete log and verify the engine in Lemmata setup.';
  return [`Failed stage: ${stage}`, `Executable: ${executable}`, detail.code !== undefined ? `Exit code: ${detail.code}${numeric !== undefined ? ` (0x${numeric.toString(16).toUpperCase()})` : ''}` : '', detail.signal ? `Signal: ${detail.signal}` : '', advice].filter(Boolean).join('\n');
}
