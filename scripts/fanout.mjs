// Fan-out probe: N WebSocket clients subscribe to a session channel; a
// broadcast triggered from the app is timed until the LAST socket receives it.
// Usage: node scripts/fanout.mjs <code> [count] [key]
import { WebSocket } from 'ws';

const [code, countArg, keyArg] = process.argv.slice(2);
const COUNT = parseInt(countArg ?? '50', 10);
const KEY = keyArg ?? 'groupify-prod-key';
const BASE = process.env.BASE ?? 'http://localhost:8081';

const url = `${BASE.replace('http', 'ws')}/app/${KEY}?protocol=7&client=js&version=8.3.0&flash=false`;
const sockets = [];
let subscribed = 0;
let triggered = 0;
let t0 = 0;
let maxDelta = 0;
const deltas = [];

for (let i = 0; i < COUNT; i++) {
    const ws = new WebSocket(url);
    sockets.push(ws);
    ws.on('open', () => {
        ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `session.${code}` } }));
    });
    ws.on('message', (d) => {
        const m = JSON.parse(d.toString());
        if (m.event === 'pusher:ping') { ws.send(JSON.stringify({ event: 'pusher:pong' })); return; }
        if (m.event === 'pusher_internal:subscription_succeeded') {
            subscribed++;
            if (subscribed === COUNT) {
                console.log(`all ${COUNT} subscribed`);
                process.stdout.write('READY\n');
            }
            return;
        }
        if (m.event !== 'pusher_internal:subscription_error' && !m.event.startsWith('pusher')) {
            if (!triggered) return; // wait for the trigger
            const delta = Date.now() - t0;
            deltas.push(delta);
            maxDelta = Math.max(maxDelta, delta);
            if (deltas.length === COUNT) {
                deltas.sort((a, b) => a - b);
                console.log(`fan-out: p50=${deltas[Math.floor(COUNT * 0.5)]}ms p95=${deltas[Math.floor(COUNT * 0.95)]}ms last=${maxDelta}ms (${COUNT} sockets)`);
                process.exit(0);
            }
        }
    });
}

// Trigger coordination: the wrapper writes /tmp/fanout-ts (epoch ms) right
// before broadcasting from the app; we start the clock from that timestamp.
import { existsSync, readFileSync } from 'node:fs';
const poll = setInterval(() => {
    if (existsSync('/tmp/fanout-ts')) {
        const v = parseInt(readFileSync('/tmp/fanout-ts', 'utf8').trim(), 10);
        if (!Number.isNaN(v) && v > 1e12) {
            t0 = v;
            triggered = 1;
            clearInterval(poll);
        }
    }
}, 100);

setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 60000);
