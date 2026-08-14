// Raw WS probe: subscribe to the session channel and watch for MembershipChanged
import { WebSocket } from 'ws';

const BASE = process.env.BASE ?? 'http://localhost:8081';
const [code, key = 'groupify-prod-key'] = process.argv.slice(2);

const sub = await fetch(`${BASE}/broadcasting/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Token': token },
    body: JSON.stringify({ channel_name: `session.${code}` }),
}).catch(() => null);

const url = `${BASE.replace('http', 'ws')}/app/${key}?protocol=7&client=js&version=8.3.0&flash=false`;
const ws = new WebSocket(url);
let subscribed = false;
ws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.event === 'pusher:ping') { ws.send(JSON.stringify({ event: 'pusher:pong' })); return; }
    if (m.event === 'pusher:subscription_succeeded') subscribed = true;
    console.log('WS:', m.event, JSON.stringify(m.data ?? m.channel ?? ''));
});
await new Promise((r) => ws.on('open', r));
ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `session.${code}` } }));
await new Promise((r) => setTimeout(r, 2000));
console.log('subscribed:', subscribed);
await new Promise((r) => setTimeout(r, 5000));
ws.close();
process.exit(0);
