import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDatabase(uri: string = env.MONGO_URI): Promise<void> {
  // Some routers/ISPs refuse the SRV lookups that `mongodb+srv://` needs.
  if (env.DNS_SERVERS.length > 0) {
    dns.setServers(env.DNS_SERVERS);
    dns.promises.setServers(env.DNS_SERVERS);
    logger.info({ servers: env.DNS_SERVERS }, 'Using custom DNS servers');
  }

  mongoose.set('strictQuery', true);
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info('MongoDB connected');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
