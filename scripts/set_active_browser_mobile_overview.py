import json
import time
import urllib.request
import websocket

PORT = 9222
WIDTH = 390
HEIGHT = 844
URL_PART = '3000-icm09c6z6vb2n65'

class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=20, suppress_origin=True)
        self.next_id = 1
    def call(self, method, params=None):
        msg_id = self.next_id
        self.next_id += 1
        self.ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get('id') == msg_id:
                if 'error' in msg:
                    raise RuntimeError(f'{method}: {msg["error"]}')
                return msg.get('result', {})
    def close(self):
        self.ws.close()

def get_tabs():
    with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json', timeout=5) as response:
        return json.loads(response.read().decode('utf-8'))

def main():
    tabs = get_tabs()
    target = next((tab for tab in tabs if tab.get('type') == 'page' and URL_PART in tab.get('url', '')), None)
    if target is None:
        target = next(tab for tab in tabs if tab.get('type') == 'page')
    cdp = CDP(target['webSocketDebuggerUrl'])
    try:
        cdp.call('Page.enable')
        cdp.call('Runtime.enable')
        cdp.call('Emulation.setDeviceMetricsOverride', {
            'width': WIDTH,
            'height': HEIGHT,
            'deviceScaleFactor': 1,
            'mobile': False,
            'screenWidth': WIDTH,
            'screenHeight': HEIGHT,
        })
        cdp.call('Runtime.evaluate', {
            'expression': """
                localStorage.setItem('sixone-life-loss-alert-seen-30001','true');
                sessionStorage.setItem('sixone-entry-seen','true');
                window.scrollTo(0, 0);
                const overview = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim().toUpperCase() === 'OVERVIEW');
                if (overview) overview.click();
            """,
            'awaitPromise': True,
        })
        time.sleep(1)
        cdp.call('Runtime.evaluate', {'expression': 'window.scrollTo(0,0)', 'awaitPromise': True})
        print('Active preview switched to responsive mobile width:', WIDTH, 'x', HEIGHT)
    finally:
        cdp.close()

if __name__ == '__main__':
    main()
