// Docker Desktop sometimes wedges on macOS (after sleep, an update or a full disk): `docker info` and every
// `supabase stack` command then hang with no output, and an agent waits forever. Ask it with a timeout first.
import { spawnSync } from 'node:child_process';

export const DOCKER_RECOVERY = [
  'Docker is not answering (`docker info` timed out or failed). Recover it, then run the command again:',
  '  1. osascript -e \'quit app "Docker"\'   (if it is still running after ~20 s: pkill -f "Docker Desktop")',
  '  2. open -a Docker, and wait until `docker info` answers (about a minute)',
  '  3. if it hangs again: Docker Desktop → Troubleshoot → Restart; check that the disk has 10 GB free',
].join('\n');

/** Throws with the recovery steps when the Docker daemon doesn't answer within `timeoutMs`. */
export function assertDockerResponsive(timeoutMs = 20_000) {
  const r = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8', timeout: timeoutMs });
  if (r.error || r.status !== 0) throw new Error(DOCKER_RECOVERY);
}
