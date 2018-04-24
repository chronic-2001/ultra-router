import * as express from 'express';
import * as httpProxy from 'http-proxy';

const app = express();
app.get('/test', (req, res) => res.send('hello'));
app.listen(3001);

const server = express();
const proxy = httpProxy.createProxy();
server.all('/test', (req, res) => proxy.web(req, res, {target: 'http://localhost:3001'}));
server.listen(3000);