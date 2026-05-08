import base64
import hashlib
import hmac
import json
import os
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path

import websocket

URL = 'http://localhost:3000/'
OUT = Path('/home/ubuntu/six-plus-one-challenge/handoff/overview-page-mobile-long-screenshot.png')
PROFILE = Path('/tmp/sixone-overview-mobile-local-auth-profile')
PORT = 9666
WIDTH = 390
HEIGHT = 844
OPEN_ID = 'nWt84jhFC6TvU2pjjTVzEf'
NAME = 'Raphael Togbe'
COOKIE_NAME = 'app_session_id'


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def mint_jwt() -> str:
    secret = os.environ['JWT_SECRET'].encode('utf-8')
    app_id = os.environ['VITE_APP_ID']
    header = {'alg': 'HS256', 'typ': 'JWT'}
    payload = {
        'openId': OPEN_ID,
        'appId': app_id,
        'name': NAME,
        'exp': int(time.time()) + 365 * 24 * 60 * 60,
    }
    signing_input = f"{b64url(json.dumps(header, separators=(',', ':')).encode())}.{b64url(json.dumps(payload, separators=(',', ':')).encode())}"
    sig = hmac.new(secret, signing_input.encode('ascii'), hashlib.sha256).digest()
    return f'{signing_input}.{b64url(sig)}'


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


def wait_for_content(cdp):
    deadline = time.time() + 20
    expr = "document.body && document.body.innerText || ''"
    while time.time() < deadline:
        result = cdp.call('Runtime.evaluate', {'expression': expr, 'returnByValue': True})
        text = result.get('result', {}).get('value', '')
        if 'OVERVIEW' in text.upper() and ('RIVAL' in text.upper() or 'PRESSURE' in text.upper()):
            return text
        time.sleep(0.5)
    return text


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if PROFILE.exists():
        shutil.rmtree(PROFILE)
    proc = subprocess.Popen([
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
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        wait_json('/json/version')
        tabs = wait_json('/json')
        cdp = CDP(tabs[0]['webSocketDebuggerUrl'])
        try:
            cdp.call('Page.enable')
            cdp.call('Runtime.enable')
            cdp.call('Network.enable')
            cdp.call('Emulation.setDeviceMetricsOverride', {
                'width': WIDTH,
                'height': HEIGHT,
                'deviceScaleFactor': 1,
                'mobile': False,
            })
            token = mint_jwt()
            ok = cdp.call('Network.setCookie', {
                'name': COOKIE_NAME,
                'value': token,
                'url': URL,
                'path': '/',
                'httpOnly': True,
                'sameSite': 'Lax',
                'secure': False,
            })
            if not ok.get('success'):
                raise RuntimeError(f'Could not set cookie: {ok}')
            cdp.call('Page.navigate', {'url': URL})
            time.sleep(4)
            cdp.call('Runtime.evaluate', {
                'expression': """
                    localStorage.setItem('sixone-life-loss-alert-seen-30001', 'true');
                    sessionStorage.setItem('sixone-entry-seen', 'true');
                    Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toUpperCase()==='OVERVIEW')?.click();
                    window.scrollTo(0, 0);
                    document.documentElement.style.scrollBehavior='auto';
                    document.body.style.scrollBehavior='auto';
                    document.body.style.background = getComputedStyle(document.documentElement).getPropertyValue('--background') || '#050505';
                """,
                'awaitPromise': True,
            })
            time.sleep(2)
            cdp.call('Runtime.evaluate', {
                'expression': """
                    Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toLowerCase()==='close alert')?.click();
                    const overlay = document.querySelector('[data-testid=\"life-loss-alert-overlay\"]');
                    if (overlay) overlay.style.display = 'none';
                    window.scrollTo(0, 0);
                """,
                'awaitPromise': True,
            })
            time.sleep(0.5)
            text = wait_for_content(cdp)
            print(text[:500].replace('\n', ' | '))
            metrics = cdp.call('Page.getLayoutMetrics')
            full_height = max(HEIGHT, int(metrics['contentSize']['height']))
            cdp.call('Emulation.setDeviceMetricsOverride', {
                'width': WIDTH,
                'height': full_height,
                'deviceScaleFactor': 1,
                'mobile': False,
            })
            cdp.call('Runtime.evaluate', {'expression': 'window.scrollTo(0,0)', 'awaitPromise': True})
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
