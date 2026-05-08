import base64
import json
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path

import websocket

ACTIVE_PORT = 9222
HEADLESS_PORT = 9444
URL = 'https://3000-icm09c6z6vb2n65bdvyk0-b24bbb75.us2.manus.computer/'
OUT = Path('/home/ubuntu/six-plus-one-challenge/handoff/overview-page-mobile-long-screenshot.png')
PROFILE = Path('/tmp/sixone-overview-mobile-profile')
WIDTH = 390
HEIGHT = 844
DEVICE_SCALE = 1
USER_AGENT = (
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) '
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
)

class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=20, suppress_origin=True)
        self.next_id = 1

    def call(self, method, params=None):
        msg_id = self.next_id
        self.next_id += 1
        self.ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params or {}}))
        while True:
            data = json.loads(self.ws.recv())
            if data.get('id') == msg_id:
                if 'error' in data:
                    raise RuntimeError(f'{method}: {data["error"]}')
                return data.get('result', {})

    def close(self):
        self.ws.close()


def get_json(port, path, timeout=5):
    with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))


def wait_json(port, path, timeout=15):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            return get_json(port, path, timeout=2)
        except Exception as exc:
            last = exc
            time.sleep(0.25)
    raise RuntimeError(f'Timed out waiting for CDP {port}{path}: {last}')


def first_page_ws(port):
    tabs = wait_json(port, '/json')
    pages = [t for t in tabs if t.get('type') == 'page']
    if not pages:
        raise RuntimeError(f'No page tabs on port {port}.')
    return pages[0]['webSocketDebuggerUrl']


def extract_active_cookies():
    tabs = wait_json(ACTIVE_PORT, '/json')
    chosen = None
    for tab in tabs:
        if tab.get('type') == 'page' and '3000-icm09c6z6vb2n65' in tab.get('url', ''):
            chosen = tab
            break
    if chosen is None:
        chosen = next(t for t in tabs if t.get('type') == 'page')
    cdp = CDP(chosen['webSocketDebuggerUrl'])
    try:
        cdp.call('Network.enable')
        all_cookies = cdp.call('Network.getAllCookies').get('cookies', [])
        return [c for c in all_cookies if 'manus.computer' in c.get('domain', '') or '3000-icm09c6z6vb2n65' in c.get('domain', '')]
    finally:
        cdp.close()


def wait_for_text(cdp, keyword='BUILD THE RHYTHM', timeout=18):
    deadline = time.time() + timeout
    last_text = ''
    while time.time() < deadline:
        result = cdp.call('Runtime.evaluate', {
            'expression': "document.body ? document.body.innerText : ''",
            'returnByValue': True,
        })
        last_text = result.get('result', {}).get('value', '') or ''
        if keyword in last_text:
            return last_text
        time.sleep(0.5)
    raise RuntimeError(f'Expected text not found. Last body text started: {last_text[:500]!r}')


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    cookies = extract_active_cookies()
    if PROFILE.exists():
        shutil.rmtree(PROFILE)
    cmd = [
        '/usr/bin/chromium',
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--hide-scrollbars',
        f'--remote-debugging-port={HEADLESS_PORT}',
        '--remote-allow-origins=*',
        f'--user-data-dir={PROFILE}',
        f'--window-size={WIDTH},{HEIGHT}',
        'about:blank',
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        wait_json(HEADLESS_PORT, '/json/version')
        cdp = CDP(first_page_ws(HEADLESS_PORT))
        try:
            cdp.call('Page.enable')
            cdp.call('Runtime.enable')
            cdp.call('Network.enable')
            cdp.call('Emulation.setUserAgentOverride', {'userAgent': USER_AGENT, 'platform': 'iPhone'})
            cdp.call('Emulation.setDeviceMetricsOverride', {
                'width': WIDTH,
                'height': HEIGHT,
                'deviceScaleFactor': DEVICE_SCALE,
                'mobile': False,
                'screenWidth': WIDTH,
                'screenHeight': HEIGHT,
            })
            if cookies:
                cdp.call('Network.setCookies', {'cookies': cookies})
            cdp.call('Page.navigate', {'url': URL})
            time.sleep(2.5)
            cdp.call('Runtime.evaluate', {
                'expression': """
                    localStorage.setItem('sixone-life-loss-alert-seen-30001', 'true');
                    sessionStorage.setItem('sixone-entry-seen', 'true');
                    Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toUpperCase()==='OVERVIEW')?.click();
                """,
                'awaitPromise': True,
            })
            wait_for_text(cdp)
            cdp.call('Runtime.evaluate', {
                'expression': """
                    window.scrollTo(0, 0);
                    Array.from(document.querySelectorAll('*'))
                      .filter(el => (el.textContent||'').includes('Preview mode') && (el.textContent||'').includes('not live'))
                      .forEach(el => el.style.display='none');
                    document.documentElement.style.scrollBehavior='auto';
                    document.body.style.scrollBehavior='auto';
                """,
                'awaitPromise': True,
            })
            time.sleep(0.8)
            metrics = cdp.call('Page.getLayoutMetrics')
            content = metrics['contentSize']
            full_height = max(int(content['height']), HEIGHT)
            shot = cdp.call('Page.captureScreenshot', {
                'format': 'png',
                'fromSurface': True,
                'captureBeyondViewport': True,
                'clip': {'x': 0, 'y': 0, 'width': WIDTH, 'height': full_height, 'scale': 1},
            })
            OUT.write_bytes(base64.b64decode(shot['data']))
            print(str(OUT))
            print(f'{WIDTH}x{full_height} css pixels @ dpr {DEVICE_SCALE}; copied {len(cookies)} cookies; responsive mobile-width viewport')
        finally:
            cdp.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()

if __name__ == '__main__':
    main()
