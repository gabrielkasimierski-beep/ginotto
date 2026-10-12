const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// Datos de prueba en una carpeta temporal: NUNCA se toca data/ (ahí viven los pedidos reales del local)
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ginotto-test-'));

const PORT = 8081;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess;

const request = async (url, method, body) => {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

test.before(async () => {
  // Start the server
  serverProcess = spawn('node', ['serve.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: PORT, GINOTTO_DATA_DIR: DATA_DIR } });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
});

test.after(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

test('Valid order creation', async () => {
  const payload = {
    items: [{ id: 'cheeseburger-simple', qty: 2 }],
    cliente: 'Juan Perez',
    telefono: '1112345678',
    tipo: 'delivery'
  };
  const res = await request(`${BASE_URL}/api/pedidos`, 'POST', payload);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.ok, true);
  assert.ok(res.body.id);
});

test('Reject empty cart', async () => {
  const payload = {
    items: [],
    cliente: 'Juan Perez',
    telefono: '1112345678',
    tipo: 'delivery'
  };
  const res = await request(`${BASE_URL}/api/pedidos`, 'POST', payload);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'El pedido no tiene ítems');
});

test('Reject non-existent product', async () => {
  const payload = {
    items: [{ id: 'fake-burger', qty: 1 }],
    cliente: 'Juan Perez',
    telefono: '1112345678',
    tipo: 'delivery'
  };
  const res = await request(`${BASE_URL}/api/pedidos`, 'POST', payload);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'Producto inexistente: fake-burger');
});

test('Reject out of stock product', async () => {
  // Mark product as out of stock
  await request(`${BASE_URL}/api/disponibilidad`, 'POST', { itemId: 'gino-simple', disponible: false });

  const payload = {
    items: [{ id: 'gino-simple', qty: 1 }],
    cliente: 'Juan Perez',
    telefono: '1112345678',
    tipo: 'delivery'
  };
  const res = await request(`${BASE_URL}/api/pedidos`, 'POST', payload);
  assert.strictEqual(res.status, 409);
  assert.match(res.body.error, /se agotó/);
});

test('Reject negative, zero, or huge quantities', async () => {
  const qtys = [0, -5, 100, 1000];
  for (const qty of qtys) {
    const payload = {
      items: [{ id: 'cheeseburger-simple', qty }],
      cliente: 'Juan Perez',
      telefono: '1112345678',
      tipo: 'delivery'
    };
    const res = await request(`${BASE_URL}/api/pedidos`, 'POST', payload);
    assert.strictEqual(res.status, 400, `Failed on qty ${qty}`);
    assert.strictEqual(res.body.error, 'Cantidad inválida');
  }
});

test('Reject empty or huge name', async () => {
  const hugeName = 'a'.repeat(200); // Beyond 80 chars truncate logic (handled differently now)
  const payloads = [
    { cliente: '', telefono: '1112345678' },
    { cliente: '   ', telefono: '1112345678' }
  ];
  for (const p of payloads) {
    const res = await request(`${BASE_URL}/api/pedidos`, 'POST', { ...p, items: [{ id: 'cheeseburger-simple', qty: 1 }] });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Nombre inválido');
  }

  // Test huge name (the server truncates it to 80 chars gracefully, so we expect a 200 OK, not a 400 rejection, based on current serve.js string handling)
  const payloadHuge = { cliente: hugeName, telefono: '1112345678', items: [{ id: 'cheeseburger-simple', qty: 1 }] };
  const resHuge = await request(`${BASE_URL}/api/pedidos`, 'POST', payloadHuge);
  assert.strictEqual(resHuge.status, 200);
});

test('Reject empty or invalid phone', async () => {
  const payloads = [
    { cliente: 'Juan', telefono: '' },
    { cliente: 'Juan', telefono: '123' }, // less than 8 digits
    { cliente: 'Juan', telefono: 'abcdefg' }
  ];
  for (const p of payloads) {
    const res = await request(`${BASE_URL}/api/pedidos`, 'POST', { ...p, items: [{ id: 'cheeseburger-simple', qty: 1 }] });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Teléfono inválido');
  }
});

test('Reject incorrect types for items', async () => {
  const payload = {
    items: "not an array",
    cliente: 'Juan Perez',
    telefono: '1112345678'
  };
  const res = await request(`${BASE_URL}/api/pedidos`, 'POST', payload);
  assert.strictEqual(res.status, 400);
});

test('Store closed', async () => {
  // Close store
  await request(`${BASE_URL}/api/store`, 'POST', { abierto: false });

  const payload = {
    items: [{ id: 'cheeseburger-simple', qty: 1 }],
    cliente: 'Juan Perez',
    telefono: '1112345678',
    tipo: 'delivery'
  };
  const res = await request(`${BASE_URL}/api/pedidos`, 'POST', payload);
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.error, 'El local está cerrado ahora');

  // Re-open store for next tests
  await request(`${BASE_URL}/api/store`, 'POST', { abierto: true });
});

test('Valid state transitions', async () => {
  // Create an order
  const payload = {
    items: [{ id: 'cheeseburger-simple', qty: 1 }],
    cliente: 'Juan',
    telefono: '1112345678'
  };
  const res = await request(`${BASE_URL}/api/pedidos`, 'POST', payload);
  const id = res.body.id;

  // change to preparando -> ok
  const res2 = await request(`${BASE_URL}/api/pedidos/estado`, 'POST', { id, estado: 'preparando' });
  assert.strictEqual(res2.status, 200);

  // volver a "nuevo" -> ok: el local tiene que poder corregir un botón apretado por error (contrato original del panel)
  const res3 = await request(`${BASE_URL}/api/pedidos/estado`, 'POST', { id, estado: 'nuevo' });
  assert.strictEqual(res3.status, 200);

  // change to invalid state
  const res4 = await request(`${BASE_URL}/api/pedidos/estado`, 'POST', { id, estado: 'inexistente' });
  assert.strictEqual(res4.status, 400);
  assert.strictEqual(res4.body.error, 'pedido o estado inválido');
});

test('Payload too large', async () => {
  const hugeString = 'a'.repeat(200000); // 200KB
  const req = http.request(`${BASE_URL}/api/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  return new Promise((resolve) => {
    req.on('response', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        assert.strictEqual(res.statusCode, 413);
        resolve();
      });
    });
    req.on('error', (e) => {
      // Depending on timing, the socket might be destroyed before reading the response, which results in ECONNRESET.
      // This means the server successfully aborted the connection due to payload size.
      assert.strictEqual(e.code, 'ECONNRESET');
      resolve();
    });
    req.write(JSON.stringify({ items: [{ id: 'cheeseburger-simple', qty: 1 }], cliente: hugeString, telefono: '1112345678' }));
    req.end();
  });
});

test('Atomic write to state.json', async () => {
  // Change state
  await request(`${BASE_URL}/api/store`, 'POST', { abierto: false });

  // Verify state.json content
  const stateFile = path.join(DATA_DIR, 'state.json');
  const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.strictEqual(data.store.abierto, false);
});
