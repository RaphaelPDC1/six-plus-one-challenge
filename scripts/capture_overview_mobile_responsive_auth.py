import base64
import json
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path

import websocket

URL = 'https://3000-icm09c6z6vb2n65bdvyk0-b24bbb75.us2.manus.computer/'
OUT = Path('/home/ubuntu/six-plus-one-challenge/handoff/overview-page-mobile-long-screenshot.png')
PROFILE = Path('/tmp/sixone-overview-mobile-responsive-profile')
PORT = 9555
WIDTH = 390
HEIGHT = 844
LOCAL_STORAGE = {
    'sixone-life-loss-alert-seen-30001': 'true',
    'manus-runtime-user-info': json.dumps({
        'id': 150014,
        'openId': 'nWt84jhFC6TvU2pjjTVzEf',
        'name': 'Raphael Togbe',
        'email': 'raphael@platinumdigiconsult.com',
        'loginMethod': 'google',
        'role': 'admin',
        'createdAt': '2026-05-06T08:00:20.000Z',
        'updatedAt': '2026-05-08T12:13:07.000Z',
        'lastSignedIn': '2026-05-08T12:13:08.000Z',
    }, separators=(',', ':')),
}
SESSION_STORAGE = {'sixone-entry-seen': 'true'}

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


def wait_json(path, timeout=15):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{PORT}{path}', timeout=2) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as exc:
            last = exc
            time.sleep(0.25)
    raise RuntimeError(f'Timed out waiting for CDP endpoint {path}: {last}')


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if PROFILE.exists():
        shutil.rmtree(PROFILE)
    cmd = [
        '/usr/bin/chromium',
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--hide-scrollbars',
        f'--remote-debugging-port={PORT}',
        '--remote-allow-origins=*',
        f'--user-data-dir={PROFILE}',
        f'--window-size={WIDTH},{HEIGHT}',
        'about:blank',
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        wait_json('/json/version')
        tabs = wait_json('/json')
        cdp = CDP(tabs[0]['webSocketDebuggerUrl'])
        try:
            cdp.call('Page.enable')
            cdp.call('Runtime.enable')
            cdp.call('Emulation.setDeviceMetricsOverride', {
                'width': WIDTH,
                'height': HEIGHT,
                'deviceScaleFactor': 1,
                'mobile': False,
            })
            cdp.call('Page.navigate', {'url': URL})
            time.sleep(2.5)
            local_script = '\n'.join([f"localStorage.setItem({json.dumps(k)}, {json.dumps(v)});" for k, v in LOCAL_STORAGE.items()])
            session_script = '\n'.join([f"sessionStorage.setItem({json.dumps(k)}, {json.dumps(v)});" for k, v in SESSION_STORAGE.items()])
            cdp.call('Runtime.evaluate', {'expression': local_script + '\n' + session_script, 'awaitPromise': True})
            cdp.call('Page.reload', {'ignoreCache': True})
            time.sleep(4)
            cdp.call('Runtime.evaluate', {
                'expression': """
                    Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toUpperCase()==='OVERVIEW')?.click();
                    window.scrollTo(0, 0);
                    Array.from(document.querySelectorAll('*'))
                      .filter(el => (el.textContent||'').includes('Preview mode') && (el.textContent||'').includes('not live'))
                      .forEach(el => el.style.display='none');
                    document.documentElement.style.scrollBehavior='auto';
                    document.body.style.scrollBehavior='auto';
                """,
                'awaitPromise': True,
            })
            time.sleep(1)
            metrics = cdp.call('Page.getLayoutMetrics')
            full_height = max(HEIGHT, int(metrics['contentSize']['height']))
            cdp.call('Emulation.setDeviceMetricsOverride', {
                'width': WIDTH,
                'height': full_height,
                'deviceScaleFactor': 1,
                'mobile': False,
            })
            time.sleep(0.5)
            shot = cdp.call('Page.captureScreenshot', {
                'format': 'png',
                'fromSurface': True,
                'captureBeyondViewport': True,
                'clip': {'x': 0, 'y': 0, 'width': WIDTH, 'height': full_height, 'scale': 1},
            })
            OUT.write_bytes(base64.b64decode(shot['data']))
            print(str(OUT))
            print(f'{WIDTH}x{full_height}')
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
