import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as spdy from 'spdy';
import { parse } from 'url';
import proxy from './proxy';

(async function start() {
  const config = await import('./config');
  const app = express();

  const filterDir = path.join(__dirname, 'filters');
  fs.readdirSync(filterDir).filter(file => file.endsWith('.js')).sort().forEach(file => {
    app.use(require(path.join(filterDir, file)));
  });

  config.routes.forEach(conf => {
    app.use(conf.path, proxy(conf.options));
  });

  (config.protocol === 'https' ? spdy.createServer(config.https, app) : app).listen(config.port);
})();