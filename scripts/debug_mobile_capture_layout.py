import json
import subprocess
import shutil
import time
import urllib.request
from pathlib import Path
import websocket

PORT = 9555
URL = 'https://3000-icm09c6z6vb2n65bdvyk0-b24bbb75.us2.manus.computer/'
PROFILE = Path('/tmp/sixone-mobile-debug-profile')
WIDTH = 390
HEIGHT = 844
ACTIVE_PORT = 9222

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
                if 'error' in data: raise RuntimeError(data['error'])
                return data.get('result', {})
    def close(self): self.ws.close()

def get_json(port, path):
    with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=5) as r:
        return json.loads(r.read().decode())

def wait(port):
    for _ in range(60):
        try: return get_json(port, '/json')
        except Exception: time.sleep(.25)
    raise RuntimeError('no cdp')

def active_cookies():
    tabs = wait(ACTIVE_PORT)
    tab = next((t for t in tabs if '3000-icm09c6z6vb2n65' in t.get('url','')), tabs[0])
    c = CDP(tab['webSocketDebuggerUrl'])
    try:
        c.call('Network.enable')
        return [x for x in c.call('Network.getAllCookies').get('cookies', []) if 'manus.computer' in x.get('domain','')]
    finally: c.close()

if PROFILE.exists(): shutil.rmtree(PROFILE)
proc = subprocess.Popen(['/usr/bin/chromium','--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',f'--remote-debugging-port={PORT}','--remote-allow-origins=*',f'--user-data-dir={PROFILE}',f'--window-size={WIDTH},{HEIGHT}','about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    tabs = wait(PORT)
    cdp = CDP(tabs[0]['webSocketDebuggerUrl'])
    try:
        cdp.call('Page.enable'); cdp.call('Runtime.enable'); cdp.call('Network.enable')
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': WIDTH, 'height': HEIGHT, 'deviceScaleFactor': 1, 'mobile': False})
        cookies = active_cookies()
        cdp.call('Network.setCookies', {'cookies': cookies})
        cdp.call('Page.navigate', {'url': URL})
        time.sleep(3)
        cdp.call('Runtime.evaluate', {'expression': "Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toUpperCase()==='OVERVIEW')?.click();", 'awaitPromise': True})
        time.sleep(2)
        expr = r"""
        (() => {
          const b = document.body, h = document.documentElement, root = document.querySelector('#root');
          const r = root ? root.getBoundingClientRect() : null;
          const sample = document.elementFromPoint(20,20);
          return {
            title: document.title,
            url: location.href,
            textStart: b ? b.innerText.slice(0,300) : null,
            bodyBg: b ? getComputedStyle(b).backgroundColor : null,
            htmlBg: getComputedStyle(h).backgroundColor,
            rootRect: r ? {x:r.x,y:r.y,w:r.width,h:r.height} : null,
            bodyScroll: {w:b.scrollWidth,h:b.scrollHeight,cw:b.clientWidth,ch:b.clientHeight},
            docScroll: {w:h.scrollWidth,h:h.scrollHeight,cw:h.clientWidth,ch:h.clientHeight},
            visualViewport: window.visualViewport ? {w:visualViewport.width,h:visualViewport.height,scale:visualViewport.scale,offsetLeft:visualViewport.offsetLeft,offsetTop:visualViewport.offsetTop} : null,
            elementAt20: sample ? {tag:sample.tagName,text:(sample.innerText||sample.textContent||'').slice(0,100), bg:getComputedStyle(sample).backgroundColor, color:getComputedStyle(sample).color} : null,
          };
        })()
        """
        res = cdp.call('Runtime.evaluate', {'expression': expr, 'returnByValue': True})
        print(json.dumps(res['result']['value'], indent=2))
        print('metrics', json.dumps(cdp.call('Page.getLayoutMetrics'), indent=2)[:1000])
    finally: cdp.close()
finally:
    proc.terminate()
    try: proc.wait(timeout=3)
    except Exception: proc.kill()
