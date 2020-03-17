import * as express from 'express';

const router = express.Router();

router.post('/*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ message: 'Api only supported for master node.' });
});

export { router };
