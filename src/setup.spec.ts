import rp from 'request-promise';
import { Env } from './test-env';

async function waitForServerToBoot(): Promise<any> {
  return rp(`http://localhost:${Env.PORT}/api/queue/health`)
    // eslint-disable-next-line promise/no-nesting
    .catch(() => new Promise((resolve: Function) => waitForServerToBoot().then(() => resolve())));
}

describe('Server', () => {
  it('should respond to /', async () => {
    await waitForServerToBoot();
  });
});
