const mongoose = require('mongoose');
const app = require('../index');
const Task = require('../models/Task');

const request = (method, path, body) => {
  const http = require('http');
  const server = app.listen(0);
  const { address, port } = server.address();
  const options = {
    hostname: '127.0.0.1',
    port,
    path,
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        server.close();
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

beforeAll(async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taskmanager_test';
  await mongoose.connect(MONGO_URI);
  await Task.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Task API', () => {

  test('POST /tasks - crea una nueva tarea', async () => {
    const res = await request('POST', '/tasks', { title: 'Test task', description: 'A description' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test task');
    expect(res.body.description).toBe('A description');
    expect(res.body.completed).toBe(false);
  });

  test('POST /tasks - rechaza tarea sin titulo', async () => {
    const res = await request('POST', '/tasks', { description: 'No title' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });

  test('GET /tasks - lista todas las tareas', async () => {
    await request('POST', '/tasks', { title: 'Task A' });
    await request('POST', '/tasks', { title: 'Task B' });
    const res = await request('GET', '/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('DELETE /tasks/:id - elimina una tarea existente', async () => {
    const created = await request('POST', '/tasks', { title: 'To delete' });
    const res = await request('DELETE', `/tasks/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task deleted');
  });

  test('DELETE /tasks/:id - devuelve 404 para tarea inexistente', async () => {
    const res = await request('DELETE', '/tasks/000000000000000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  test('PUT /tasks/:id - actualiza una tarea existente', async () => {
    const created = await request('POST', '/tasks', { title: 'Original', description: 'Before' });
    const res = await request('PUT', `/tasks/${created.body._id}`, { title: 'Updated', completed: true });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.completed).toBe(true);
  });

  test('PUT /tasks/:id - devuelve 404 para tarea inexistente', async () => {
    const res = await request('PUT', '/tasks/000000000000000000000000', { title: 'Nope' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

});
