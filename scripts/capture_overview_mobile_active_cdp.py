import base64
import json
import time
import urllib.request
from pathlib import Path

import websocket

PORT = 9222
TARGET_URL_PART = '3000-icm09c6z6vb2n65bdvyk0-b24bbb75.us2.manus.computer'
OUT = Path('/home/ubuntu/six-plus-one-challenge/handoff/overview-page-mobile-long-screenshot.png')
WIDTH = 390
HEIGHT = 844
DEVICE_SCALE = 2
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
            raw = self.ws.recv()
            data = json.loads(raw)
            if data.get('id') == msg_id:
                if 'error' in data:
                    raise RuntimeError(f'{method}: {data["error"]}')
                return data.get('result', {})

    def close(self):
        self.ws.close()


def get_json(path):
    with urllib.request.urlopen(f'http://127.0.0.1:{PORT}{path}', timeout=5) as r:
        return json.loads(r.read().decode('utf-8'))


def find_tab():
    tabs = get_json('/json')
    for tab in tabs:
        if tab.get('type') == 'page' and TARGET_URL_PART in tab.get('url', ''):
            return tab
    pages = [tab for tab in tabs if tab.get('type') == 'page']
    if not pages:
        raise RuntimeError('No browser page tabs available through DevTools.')
    return pages[0]


def wait_for_overview(cdp):
    deadline = time.time() + 12
    while time.time() < deadline:
        result = cdp.call('Runtime.evaluate', {
            'expression': "Boolean(document.querySelector('[data-testid=overview-metrics-dashboard]'))",
            'returnByValue': True,
        })
        if result.get('result', {}).get('value'):
            return
        time.sleep(0.35)
    raise RuntimeError('Overview dashboard did not appear before timeout.')


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tab = find_tab()
    cdp = CDP(tab['webSocketDebuggerUrl'])
    try:
        cdp.call('Page.enable')
        cdp.call('Runtime.enable')
        cdp.call('Emulation.setUserAgentOverride', {
            'userAgent': USER_AGENT,
            'platform': 'iPhone',
        })
        cdp.call('Emulation.setDeviceMetricsOverride', {
            'width': WIDTH,
            'height': HEIGHT,
            'deviceScaleFactor': DEVICE_SCALE,
            'mobile': True,
            'screenWidth': WIDTH,
            'screenHeight': HEIGHT,
        })
        cdp.call('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5})
        time.sleep(0.5)
        cdp.call('Runtime.evaluate', {
            'expression': "Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().toUpperCase()==='OVERVIEW')?.click();",
            'awaitPromise': True,
        })
        wait_for_overview(cdp)
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
        full_height = int(content['height'])
        shot = cdp.call('Page.captureScreenshot', {
            'format': 'png',
            'fromSurface': True,
            'captureBeyondViewport': True,
            'clip': {
                'x': 0,
                'y': 0,
                'width': WIDTH,
                'height': full_height,
                'scale': 1,
            },
        })
        OUT.write_bytes(base64.b64decode(shot['data']))
        print(str(OUT))
        print(f'{WIDTH}x{full_height} css pixels @ deviceScaleFactor {DEVICE_SCALE}')
    finally:
        cdp.close()

if __name__ == '__main__':
    main()
