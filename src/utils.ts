import { escapeRegExp } from 'lodash';
import * as zlib from 'zlib';

export function getUrlPattern(url: string) {
  url = escapeRegExp(url);
  return new RegExp(url.replace(/(https?):\/\/.*:(\d+)/, (match, scheme, port) => {
    if (scheme === 'http' && port === '80' || scheme === 'https' && port === '443') {
      match = match.replace(new RegExp(':' + port), '($&)?');
    }
    return match;
  }), 'g');
}

export function isTextContent(contentType: string) {
  return /^text\/(?!csv)|application\/(html|xml|(x-)?javascript|json)/.test(contentType);
}

export function getEncoding(contentType: string) {
  return (contentType.match(/charset\s*=\s*([\w-]+)\b/) || [])[1] || 'utf8';
}

export function zipWrapper(process: (input: string) => string) {
  return (input: string) => zlib.gzipSync(process(zlib.gunzipSync(input).toString())).toString();
}