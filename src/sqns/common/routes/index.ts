import * as express from 'express';

function generateRoutes(): express.Router {
  const router = express.Router();

  router.get('/sqns/health', (request: express.Request, response: express.Response) => {
    response.send('success');
  });

  return router;
}

export { generateRoutes };
