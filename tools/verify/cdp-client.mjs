// Cliente mínimo del protocolo DevTools para hablar con la app en marcha (ver cdp.mjs).

/** La app tiene dos páginas: la ventana del perro ('main') y la de la cama ('bed'). */
export async function findPage(port = 9223, name = 'main') {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const isBed = (target) => new URL(target.url).pathname.endsWith('/bed.html');
  const page = targets.find((target) => target.type === 'page' && isBed(target) === (name === 'bed'));
  if (!page) throw new Error(`No hay ninguna página '${name}' abierta en ese puerto`);
  return page;
}

export async function connect(port = 9223, name = 'main') {
  const page = await findPage(port, name);

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

  /** Evalúa una expresión en la página y devuelve su valor. */
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) {
      throw new Error(`${expression}: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    }
    return result.value;
  };

  return { send, evaluate, close: () => socket.close() };
}
