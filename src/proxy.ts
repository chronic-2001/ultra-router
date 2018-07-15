import { Request, Response, RequestHandler } from 'express';
import { ClientRequest, IncomingMessage, ServerResponse, RequestOptions, request as http } from 'http';
import { request as https } from 'https';
import { pick, clone, forEach, noop } from 'lodash';
import { parse } from 'url';

interface IOptions {
  target: string;
  timeout?: number; // timeout for this proxy in ms
  filters?: RequestHandler[];
  onRequest?: (proxyReq: ClientRequest, req: IncomingMessage) => void;
  onResponse?: (proxyRes: IncomingMessage, res: ServerResponse) => void | Promise<void>;
}

export default function proxy({ target, timeout, filters = [], onRequest = noop, onResponse = noop }: IOptions) {
  return [...filters, (req: Request, res: Response) => {
    const targetUrl = parse(target);
    const options: RequestOptions = pick(targetUrl, ['protocol', 'hostname', 'port']);
    options.path = req.originalUrl;
    options.method = req.method;
    options.headers = clone(req.headers);

    const proxyReq = (options.protocol === 'https:' ? https : http)(options);

    if (timeout) {
      proxyReq.setTimeout(timeout, () => proxyReq.abort());
    }
    // Ensure we abort proxy if request is aborted
    req.on('aborted', function () {
      proxyReq.abort();
    });

    proxyReq.on('socket', () => {
      onRequest(proxyReq, req);
    });

    req.pipe(proxyReq);

    proxyReq.on('response', async proxyRes => {
      forEach(proxyRes.headers, (value, key) => {
        res.setHeader(key, value);
      });
      res.statusCode = proxyRes.statusCode;
      res.statusMessage = proxyRes.statusMessage;

      await onResponse(proxyRes, res);
      proxyRes.pipe(res);
    });
  }];
}