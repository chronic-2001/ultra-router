import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

export = async function setXHeaders(req: Request, res: Response, next: NextFunction) {
  const config = await import('../config');
  const headers = req.headers;
  headers['x-forwarded-proto'] = config.protocol;
  // strip the ::ffff: prefix of the converted ipv6 address, e.g. ::ffff:127.0.0.1
  headers['x-forwarded-for'] = headers['x-real-ip'] = req.socket.remoteAddress.replace(/^.*:/, '');
  headers['x-forwarded-host'] = headers['host'] = headers['host'] || config.hostname + ':' + config.port;

  if (config.protocol === 'https') {
    headers['x-blackboard-requestid'] = crypto.randomBytes(16).toString('hex');
  }

  next();
}