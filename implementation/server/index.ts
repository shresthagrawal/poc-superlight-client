import * as dotenv from 'dotenv';
dotenv.config();

import * as http from 'http';
import getApp from './server';


const PORT = process.env.PORT || '3679';

function handleErrors() {
  process.on('uncaughtException', (err: Error) => {
    console.error('uncaughtException', process.pid, err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: any) => {
    console.error('unhandledRejection', process.pid, { reason, promise });
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log(`Process ${process.pid} exiting (SIGTERM)...`);
    process.exit();
  });

  process.on('SIGINT', () => {
    console.log(`Process ${process.pid} exiting (SIGINT)...`);
    process.exit();
  });
}

async function main() {
  handleErrors();

  const httpServer = http.createServer();

  httpServer.on('request', getApp());

  httpServer.listen(PORT, function () {
    console.log(`Server listening on port ${PORT}`);
  });
}

main();