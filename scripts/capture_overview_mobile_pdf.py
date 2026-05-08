import base64, json, shutil, subprocess, time, urllib.request
from pathlib import Path
import websocket

ACTIVE_PORT = 9222
PORT = 9777
URL = 'https://3000-icm09c6z6vb2n65bdvyk0-b24bbb75.us2.manus.computer/'
PROFILE = Path('/tmp/sixone-mobile-pdf-profile')
PDF = Path('/home/ubuntu/six-plus-one-challenge/handoff/overview-page-mobile-long-screenshot.pdf')
PNG = Path('/home/ubuntu/six-plus-one-challenge/handoff/overview-page-mobile-long-screenshot.png')
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
    last=None
    for _ in range(80):
        try: return get_json(port, '/json')
        except Exception as e: last=e; time.sleep(.25)
    raise RuntimeError(last)

def active_cookies():
    tabs = wait_tabs(ACTIVE_PORT)
    tab = next((t for t in tabs if '3000-icm09c6z6vb2n65' in t.get('url','')), next(t for t in tabs if t.get('type')=='page'))
    c = CDP(tab['webSocketDebuggerUrl'])
    try:
        c.call('Network.enable')
        return [x for x in c.call('Network.getAllCookies').get('cookies', []) if 'manus.computer' in x.get('domain','')]
    finally: c.close()

if PROFILE.exists(): shutil.rmtree(PROFILE)
PDF.parent.mkdir(parents=True, exist_ok=True)
proc = subprocess.Popen(['/usr/bin/chromium','--headless=new','--no-sandbox','--disable-dev-shm-usage',f'--remote-debugging-port={PORT}','--remote-allow-origins=*',f'--user-data-dir={PROFILE}',f'--window-size={WIDTH},{HEIGHT}','about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    tabs = wait_tabs(PORT)
    page = next(t for t in tabs if t.get('type')=='page')
    cdp = CDP(page['webSocketDebuggerUrl'])
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
        time.sleep(3)
        cdp.call('Runtime.evaluate', {'expression': """
          window.scrollTo(0,0);
          Array.from(document.querySelectorAll('*')).filter(el => (el.textContent||'').includes('Preview mode') && (el.textContent||'').includes('not live')).forEach(el => el.style.display='none');
          document.body.style.webkitPrintColorAdjust = 'exact';
          document.body.style.printColorAdjust = 'exact';
        """, 'awaitPromise': True})
        metrics = cdp.call('Page.getLayoutMetrics')
        w = int(metrics['contentSize']['width']) or 375
        h = int(metrics['contentSize']['height']) or HEIGHT
        pdf = cdp.call('Page.printToPDF', {
            'printBackground': True,
            'preferCSSPageSize': False,
            'paperWidth': w / 96,
            'paperHeight': h / 96,
            'marginTop': 0,
            'marginBottom': 0,
            'marginLeft': 0,
            'marginRight': 0,
            'scale': 1,
            'pageRanges': '1'
        })
        PDF.write_bytes(base64.b64decode(pdf['data']))
        print(f'PDF {w}x{h}: {PDF}')
    finally: cdp.close()
finally:
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
# Convert PDF page to a single PNG using pdftoppm.
subprocess.check_call(['pdftoppm', '-png', '-r', '144', '-singlefile', str(PDF), str(PNG.with_suffix(''))])
print(PNG)
