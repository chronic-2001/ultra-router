import { Monitor } from 'forever-monitor';
import { join } from 'path';

new Monitor(join(__dirname, 'server.js'), {
  silent: true,
  args: []
}).start();
