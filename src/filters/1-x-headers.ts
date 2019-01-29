import { Request, Response, NextFunction } from 'express';
import { parse } from 'url';
import * as crypto from 'crypto';

export = async function setXHeaders(req: Request, res: Response, next: NextFunction) {
  const config = await import('../config');
  const headers = req.headers;
  // The x-forwarded-proto header will be used by tomcat RemoteIpValve to change the protocol and port of the original request,
  // this is undesirable for this router, so do not set this header.
  // headers['x-forwarded-proto'] = config.protocol;

  // strip the ::ffff: prefix of the converted ipv6 address, e.g. ::ffff:127.0.0.1
  headers['x-forwarded-for'] = headers['x-real-ip'] = req.socket.remoteAddress.replace(/^.*:/, '');
  headers['x-forwarded-host'] = config.hostname + ':' + config.port;

  const url = parse(config.learnUrl);
  headers.host = url.host;
  // set the origin header to learn url if exists since it's checked by learn backend for same origin
  if (headers.origin) {
    headers.origin = url.href;
  }

  if (url.protocol === 'https:') {
    headers['x-blackboard-requestid'] = crypto.randomBytes(16).toString('hex');
  }

  next();
}