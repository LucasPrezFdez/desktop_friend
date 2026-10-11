// Controla la app en marcha a través del puerto de depuración de WebView2 (protocolo DevTools).
// Sirve para forzar actividades del perro y capturar lo que dibuja, sin tocar el ratón.
//
// La app debe haberse lanzado con:
//   $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9223"
//
// Uso (los pasos se ejecutan en orden):
//   node tools/verify/cdp.mjs --eval "pet.behavior.force('sit')" --wait 1500 --shot sentado.png
//   node tools/verify/cdp.mjs --bg ffffff --shot claro.png --bg 101418 --shot oscuro.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
let port = 9223;
const steps = [];
for (let i = 0; i < args.length; i += 2) {
  const [flag, value] = [args[i], args[i + 1]];
  if (flag === '--port') port = Number(value);
  else if (['--eval', '--wait', '--shot', '--bg'].includes(flag)) steps.push([flag.slice(2), value]);
  else throw new Error(`Opción desconocida: ${flag}`);
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find((target) => target.type === 'page');
if (!page) throw new Error('No hay ninguna página abierta en ese puerto');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, fail) => {
  socket.addEventListener('open', ok);
  socket.addEventListener('error', fail);
});

let nextId = 1;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.fail(new Error(message.error.message));
  else waiter.ok(message.result);
});
const send = (method, params = {}) =>
  new Promise((ok, fail) => {
    const id = nextId++;
    pending.set(id, { ok, fail });
    socket.send(JSON.stringify({ id, method, params }));
  });

for (const [kind, value] of steps) {
  if (kind === 'eval') {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression: value,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) {
      console.error(`ERROR en "${value}": ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
      process.exitCode = 1;
    } else {
      console.log(`${value} => ${JSON.stringify(result.value)}`);
    }
  } else if (kind === 'wait') {
    await new Promise((done) => setTimeout(done, Number(value)));
  } else if (kind === 'bg') {
    // Fondo sobre el que se captura: la ventana real es transparente. "none" lo quita.
    const background = value === 'none' ? '' : `#${value}`;
    await send('Runtime.evaluate', { expression: `document.documentElement.style.background = "${background}"` });
  } else if (kind === 'shot') {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const file = resolve(value);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`captura: ${file}`);
  }
}

// Sin esto el fondo forzado se quedaría puesto en la ventana real.
await send('Runtime.evaluate', { expression: 'document.documentElement.style.background = ""' });
socket.close();
