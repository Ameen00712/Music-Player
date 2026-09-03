const express = require('express');
const app = express();
app.use(express.json());

let tasks = [
  { id: 1, title: 'Build backend', completed: false },
  { id: 2, title: 'Test API', completed: true }
];

app.get('/api/tasks', (req, res) => res.json(tasks));
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});
app.post('/api/tasks', (req, res) => {
  const task = { id: Date.now(), title: String(req.body.title || 'Untitled task'), completed: false };
  tasks.push(task);
  res.status(201).json(task);
});
app.patch('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.body.title !== undefined) task.title = String(req.body.title);
  if (req.body.completed !== undefined) task.completed = Boolean(req.body.completed);
  res.json(task);
});
app.delete('/api/tasks/:id', (req, res) => {
  const before = tasks.length;
  tasks = tasks.filter(t => t.id !== Number(req.params.id));
  if (tasks.length === before) return res.status(404).json({ error: 'Task not found' });
  res.status(204).end();
});

app.listen(process.env.PORT || 3000, () => console.log('Task API running'));
