import rp from 'request-promise';

async function waitForServerToBoot(): Promise<any> {
  return rp('http://localhost:1234/api/queue/health')
    .catch(() => new Promise((resolve: Function) => waitForServerToBoot().then(() => resolve())));
}

describe('Server', () => {
  it('should respond to /', async () => {
    await waitForServerToBoot();
  });
});
