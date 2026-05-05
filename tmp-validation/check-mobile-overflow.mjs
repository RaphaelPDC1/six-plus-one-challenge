import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const url = process.argv[2];
const port = 9333;
const chrome = spawn('/usr/bin/chromium', [
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  `--remote-debugging-port=${port}`,
  '--window-size=390,844',
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

try {
  let pageTarget;
  for (let i = 0; i < 60; i += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      pageTarget = targets.find((target) => target.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) break;
    } catch {}
    await delay(100);
  }
  if (!pageTarget?.webSocketDebuggerUrl) throw new Error('Chrome page debugging endpoint did not start');

  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    pageWs.addEventListener('open', resolve, { once: true });
    pageWs.addEventListener('error', reject, { once: true });
  });

  let pageId = 0;
  const pageCallbacks = new Map();
  pageWs.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pageCallbacks.has(msg.id)) {
      const { resolve, reject } = pageCallbacks.get(msg.id);
      pageCallbacks.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  function pageSend(method, params = {}) {
    const messageId = ++pageId;
    pageWs.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolve, reject) => pageCallbacks.set(messageId, { resolve, reject }));
  }

  await pageSend('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pageSend('Page.enable');
  await pageSend('Runtime.enable');
  await pageSend('Page.navigate', { url });
  await delay(2500);

  const result = await pageSend('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('body *'));
      const viewport = document.documentElement.clientWidth;
      const overflow = all.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 180),
          text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      }).filter((item) => item.right > viewport + 1 || item.left < -1).slice(0, 40);
      const hero = Array.from(document.querySelectorAll('p')).find((el) => el.textContent.includes('Remember'));
      const navText = Array.from(document.querySelectorAll('p')).find((el) => el.textContent.includes('4 Lives. 50 days'));
      const pick = (el) => el ? (() => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { text: el.textContent, className: el.className, left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, whiteSpace: cs.whiteSpace, overflowWrap: cs.overflowWrap, wordBreak: cs.wordBreak, fontSize: cs.fontSize }; })() : null;
      return {
        viewport,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        hero: pick(hero),
        navText: pick(navText),
        overflow,
      };
    })()`
  });

  console.log(JSON.stringify(result.result.value, null, 2));
  pageWs.close();
} finally {
  chrome.kill('SIGTERM');
}
