import base64
import json
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path
import websocket

ACTIVE_PORT = 9222
PORT = 9666
URL = 'https://3000-icm09c6z6vb2n65bdvyk0-b24bbb75.us2.manus.computer/'
PROFILE = Path('/tmp/sixone-mobile-verified-profile')
OUT = Path('/home/ubuntu/six-plus-one-challenge/handoff/overview-page-mobile-long-screenshot.png')
WIDTH = 390
HEIGHT = 844

class CDP:
    def __init__(self, ws):
        self.ws = websocket.create_connection(ws, timeout=20, suppress_origin=True)
        self.i = 1
    def call(self, method, params=None):
        mid = self.i; self.i += 1
        self.ws.send(json.dumps({'id': mid, 'method': method, 'params': params or {}}))
        while True:
            data = json.loads(self.ws.recv())
            if data.get('id') == mid:
                if 'error' in data: raise RuntimeError(f'{method}: {data["error"]}')
                return data.get('result', {})
    def close(self): self.ws.close()

def get_json(port, path):
    with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=5) as r:
        return json.loads(r.read().decode())

def wait_tabs(port):
    last = None
    for _ in range(80):
        try: return get_json(port, '/json')
        except Exception as e:
            last = e; time.sleep(.25)
    raise RuntimeError(last)

def page_ws(port):
    pages = [t for t in wait_tabs(port) if t.get('type') == 'page']
    return pages[0]['webSocketDebuggerUrl']

def active_cookies():
    tabs = wait_tabs(ACTIVE_PORT)
    tab = next((t for t in tabs if '3000-icm09c6z6vb2n65' in t.get('url','')), next(t for t in tabs if t.get('type')=='page'))
    cdp = CDP(tab['webSocketDebuggerUrl'])
    try:
        cdp.call('Network.enable')
        return [x for x in cdp.call('Network.getAllCookies').get('cookies', []) if 'manus.computer' in x.get('domain','')]
    finally: cdp.close()

if PROFILE.exists(): shutil.rmtree(PROFILE)
proc = subprocess.Popen(['/usr/bin/chromium','--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',f'--remote-debugging-port={PORT}','--remote-allow-origins=*',f'--user-data-dir={PROFILE}',f'--window-size={WIDTH},{HEIGHT}','about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    cdp = CDP(page_ws(PORT))
    try:
        cdp.call('Page.enable'); cdp.call('Runtime.enable'); cdp.call('Network.enable')
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': WIDTH, 'height': HEIGHT, 'deviceScaleFactor': 1, 'mobile': False})
        cdp.call('Network.setCookies', {'cookies': active_cookies()})
        cdp.call('Page.navigate', {'url': URL})
        time.sleep(3)
        cdp.call('Runtime.evaluate', {'expression': """
          localStorage.setItem('sixone-life-loss-alert-seen-30001','true');
          sessionStorage.setItem('sixone-entry-seen','true');
          Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toUpperCase()==='OVERVIEW')?.click();
        """, 'awaitPromise': True})
        deadline = time.time() + 15
        while time.time() < deadline:
            txt = cdp.call('Runtime.evaluate', {'expression': "document.body?.innerText || ''", 'returnByValue': True})['result'].get('value','')
            if 'BUILD THE RHYTHM' in txt and 'RIVAL PRESSURE' in txt:
                break
            time.sleep(.4)
        cdp.call('Runtime.evaluate', {'expression': """
          window.scrollTo(0,0);
          Array.from(document.querySelectorAll('*')).filter(el => (el.textContent||'').includes('Preview mode') && (el.textContent||'').includes('not live')).forEach(el => el.style.display='none');
        """, 'awaitPromise': True})
        time.sleep(1)
        metrics = cdp.call('Page.getLayoutMetrics')
        width = int(metrics['contentSize']['width'])
        height = int(metrics['contentSize']['height'])
        # Capture the whole rendered surface using the verified content size.
        shot = cdp.call('Page.captureScreenshot', {
            'format': 'png',
            'fromSurface': False,
            'captureBeyondViewport': True,
            'clip': {'x': 0, 'y': 0, 'width': width, 'height': height, 'scale': 1},
        })
        OUT.write_bytes(base64.b64decode(shot['data']))
        print(OUT)
        print(f'{width}x{height}')
    finally: cdp.close()
finally:
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
