import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateRouter } from './routes/generate.js';
import { imagesRouter } from './routes/images.js';
import { webhooksRouter } from './routes/webhooks.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', generateRouter);
app.use('/api', imagesRouter);
app.use('/webhooks', webhooksRouter);

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});


