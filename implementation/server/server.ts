import * as express from 'express';

export default function getApp() {
  const app = express();

  app.get('/', function (req, res) {
    return res.json({"success": true});
  });

  return app;
}