import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Task from './tasks.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/todo-tasks';
if (dbUrl.startsWith('"')) {
    dbUrl = dbUrl.slice(1, -1);
}

async function connectDB() {
    try {
        await mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB:', dbUrl);
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

connectDB();

const app = express();

app.use(express.static(path.resolve(__dirname, '../build')));
app.use(express.json());

// Отримання всіх задач
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (error) {
        console.error('Error getting tasks:', error);
        res.status(500).json({ error: 'Помилка завантаження задач', details: error.message });
    }
});

// Додавання нової задачі
app.post('/tasks', async (req, res) => {
    console.log('POST /tasks, body:', req.body);
    try {
        const { name, text, completed } = req.body;
        if (!name || !text) {
            return res.status(400).json({ error: "Ім'я та текст обов'язкові" });
        }

        const newTask = new Task({ name, text, completed });
        const savedTask = await newTask.save();

        console.log('Task added:', savedTask);
        res.status(201).json(savedTask);
    } catch (error) {
        console.error('Помилка при додаванні задачі:', error);
        res.status(500).json({ error: 'Помилка сервера', details: error.message });
    }
});

// Видалення задачі
app.delete('/tasks/:id', async (req, res) => {
    console.log('DELETE /tasks/:id', req.params.id);
    try {
        const deletedTask = await Task.findByIdAndDelete(req.params.id);
        if (!deletedTask) {
            return res.status(404).json({ error: 'Задачу не знайдено' });
        }
        console.log('Task deleted:', deletedTask);
        res.json({ message: 'Задачу видалено', deletedTask });
    } catch (error) {
        console.error('Помилка при видаленні задачі:', error);
        res.status(500).json({ error: 'Помилка сервера', details: error.message });
    }
});

// Оновлення задачі (редагування тексту або відмітка виконаної)
app.put('/tasks/:id', async (req, res) => {
    console.log('PUT /tasks/:id', req.params.id, req.body);
    try {
        const { text, completed } = req.body;
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            { text, completed },
            { new: true } // Повертає оновлений об'єкт
        );

        if (!updatedTask) {
            return res.status(404).json({ error: 'Задачу не знайдено' });
        }

        console.log('Task updated:', updatedTask);
        res.json(updatedTask);
    } catch (error) {
        console.error('Помилка при оновленні задачі:', error);
        res.status(500).json({ error: 'Помилка сервера', details: error.message });
    }
});

const port = process.env.PORT || 4444;
const host = process.env.HOST || 'localhost';

app.listen(port, host, () => {
    console.log(`Server started at http://${host}:${port}`);
});