import { Request, Response, RequestHandler } from 'express';
import { ClientRequest, IncomingMessage, ServerResponse, RequestOptions, request as http } from 'http';
import { request as https } from 'https';
import { isFunction, pick, clone, forEach, noop } from 'lodash';
import { parse } from 'url';

interface IOptions {
  target: string;
  filters?: RequestHandler[];
  onRequest?: (proxyReq: ClientRequest, req: IncomingMessage) => void;
  onResponse?: (proxyRes: IncomingMessage, res: ServerResponse) => void;
}

export default function proxy({ target, filters = [], onRequest = noop, onResponse }: IOptions) {
  return [...filters, (req: Request, res: Response) => {
    const targetUrl = parse(target);
    const options: RequestOptions = pick(targetUrl, ['protocol', 'hostname', 'port']);
    options.path = req.originalUrl;
    options.method = req.method;
    options.headers = clone(req.headers);

    const proxyReq = (options.protocol === 'https' ? https : http)(options);

    // Ensure we abort proxy if request is aborted
    req.on('aborted', function () {
      proxyReq.abort();
    });

    proxyReq.on('socket', () => {
      onRequest(proxyReq, req);
    });

    req.pipe(proxyReq);

    proxyReq.on('response', proxyRes => {
      forEach(proxyRes.headers, (value, key) => {
        res.setHeader(key, value);
      });
      res.statusCode = proxyRes.statusCode;
      res.statusMessage = proxyRes.statusMessage;

      if (onResponse) {
        onResponse(proxyRes, res);
      } else {
        proxyRes.pipe(res);
      }
    });
  }];
}