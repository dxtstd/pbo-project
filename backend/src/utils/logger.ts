import pino from 'pino';
import pretty from 'pino-pretty';

export default pino(
  {
    level: process.env.LOG_LEVEL || 'debug',
  },
  pretty({
    colorize: true,
  }),
) as pino.Logger;