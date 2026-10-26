// Vercel entry point: wraps the compiled Express app (run `npm run build` first).
import { createApp } from '../dist/app.js';
import { connectDatabase } from '../dist/config/db.js';
import { syncSuperAdmins } from '../dist/modules/auth/super-admins.js';

const app = createApp();
let ready;

export default async function handler(req, res) {
  // Connect once per warm instance and reuse the connection for later requests.
  ready ??= connectDatabase()
    .then(syncSuperAdmins)
    .catch((err) => {
      ready = undefined;
      throw err;
    });
  await ready;
  return app(req, res);
}
