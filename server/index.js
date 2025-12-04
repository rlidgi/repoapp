import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateRouter } from './routes/generate.js';
import { imagesRouter } from './routes/images.js';
import { webhooksRouter } from './routes/webhooks.js';
import { usersRouter } from './routes/users.js';
import { adminRouter } from './routes/admin.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', generateRouter);
app.use('/api', imagesRouter);
app.use('/webhooks', webhooksRouter);
app.use('/api', usersRouter);
app.use('/api', adminRouter);

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});


