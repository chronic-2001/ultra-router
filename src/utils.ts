import { escapeRegExp } from 'lodash';

export function getUrlPattern(url: string) {
  url = escapeRegExp(url);
  return new RegExp(url.replace(/(https?):\/\/.*:(\d+)/, (url, scheme, port) => {
    if (scheme === 'http' && port === '80' || scheme === 'https' && port === '443') {
      url = url.replace(new RegExp(':' + port), '($&)?');
    }
    return url;
  }), 'g');
}

export function isTextContent(contentType: string) {
  return /^text\/|application\/(html|xml|javascript|json)/.test(contentType);
}

export function getEncoding(contentType: string) {
  return (contentType.match(/charset\s*=\s*([\w-]+)\b/) || [])[1] || 'utf8';
}