/** Reads a browser's User-Agent into the few things worth counting: device, system and browser. Nothing here identifies a person. */
export function describeClient(userAgent: string): { device: string; os: string; browser: string } {
  const ua = userAgent || '';
  const device = /ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua)) ? 'Tablet' : /mobi|iphone|ipod|android/i.test(ua) ? 'Phone' : ua ? 'Computer' : 'Unknown';
  const os = /android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /mac os x|macintosh/i.test(ua) ? 'macOS' : /cros/i.test(ua) ? 'ChromeOS' : /linux/i.test(ua) ? 'Linux' : 'Other';
  const browser = /instagram/i.test(ua) ? 'Instagram app'
    : /fban|fbav|facebook/i.test(ua) ? 'Facebook app'
    : /musical_ly|bytedance|tiktok/i.test(ua) ? 'TikTok app'
    : /whatsapp/i.test(ua) ? 'WhatsApp app'
    : /snapchat/i.test(ua) ? 'Snapchat app'
    : /samsungbrowser/i.test(ua) ? 'Samsung Internet'
    : /edg(e|a|ios)?\//i.test(ua) ? 'Edge'
    : /opr\/|opera/i.test(ua) ? 'Opera'
    : /firefox|fxios/i.test(ua) ? 'Firefox'
    : /chrome|crios/i.test(ua) ? 'Chrome'
    : /safari/i.test(ua) ? 'Safari'
    : 'Other';
  return { device, os, browser };
}
