import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Request, Response, NextFunction } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { getUrlPattern, isTextContent } from './utils';
import * as zlib from 'zlib';

const protocol = 'https';
const hostname = 'mylearn.int.bbpd.io';
const port = 7443;
const LEARN_CFG_FILE = '/Users/cwang/dev/dist/blackboard/config/bb-config.properties';
const CERT_DIR = path.join(__dirname, '..', 'certs');

// use export = so that I can await the exported object directly
export = (async function resolveConfig() {
  const learnConfig = await new Promise<{ [key: string]: string }>((resolve, reject) => {
    const config = Object.create(null);
    const rl = readline.createInterface({
      input: fs.createReadStream(LEARN_CFG_FILE)
    });

    rl.on('line', (line: string) => {
      if (line && !line.startsWith('#')) {
        const tokens = line.split('=');
        config[tokens[0]] = tokens[1];
      }
    });

    rl.on('close', () => resolve(config));
  });

  const frontendUrl = learnConfig['bbconfig.frontend.protocol'] + '://'
    + learnConfig['bbconfig.frontend.fullhostname'] + ':' + learnConfig['bbconfig.frontend.portnumber'];
  const routerUrl = protocol + '://' + hostname + ':' + port;

  return {
    protocol,
    hostname,
    port,
    https: {
      key: fs.readFileSync(path.join(CERT_DIR, 'star.int.bbpd.io.key')),
      cert: fs.readFileSync(path.join(CERT_DIR, 'star.int.bbpd.io.crt')),
    },
    timeout: 120000, // ms
    routes: [
      {
        // Ultra UI
        path: '/ultra',
        options: {
          target: `http://${hostname}:9900`
        }
      },
      {
        path: '/telemetry/api/v1',
        options: {
          target: '',
          filters: [(req: Request, res: Response) => res.sendStatus(204)]
        }
      },
      {
        // Learn, this one must come last because it intercepts all requests
        path: '/',
        options: {
          target: `http://${hostname}:8081`,
          filters: [(req: Request, res: Response, next: NextFunction) => {
            if (req.originalUrl.startsWith('/webapps/privacy-disclosure/execute/consent')) {
              // "/" is not escaped in the original url
              const escape = (url: string) => encodeURIComponent(url).replace(/%2F/g, '/');
              req.originalUrl = req.originalUrl.replace(escape(routerUrl), escape(frontendUrl));
            }

            req.headers['accept-encoding'] = 'gzip';
            req.headers['accept-charset'] = 'utf-8';
            next();
          }],
          onResponse: (proxyRes: IncomingMessage, res: ServerResponse) => {
            const urlPattern = getUrlPattern(frontendUrl);
            ['location', 'content-location'].forEach(name => {
              const location: string = <string>proxyRes.headers[name];
              if (location) {
                res.setHeader(name, location.replace(urlPattern, routerUrl));
              }
            });

            const contentType = proxyRes.headers["content-type"];
            if (isTextContent(contentType)) {
              return new Promise<void>(resolve => {
                const chunks: Buffer[] = [];
                proxyRes.on('data', (chunk: Buffer) => {
                  chunks.push(chunk);
                });
                proxyRes.on('end', () => {
                  let buffer = Buffer.concat(chunks);
                  const zipped = proxyRes.headers["content-encoding"] === 'gzip';
                  if (zipped) {
                    buffer = zlib.gunzipSync(buffer);
                  }
                  buffer = Buffer.from(buffer.toString().replace(urlPattern, routerUrl));
                  if (zipped) {
                    buffer = zlib.gzipSync(buffer);
                  }
                  res.removeHeader('content-length');
                  res.end(buffer);
                  resolve();
                });
              });
            }
          }
        }
      },
    ],
    learnConfig,
    frontendUrl,
    routerUrl,
  };
})();