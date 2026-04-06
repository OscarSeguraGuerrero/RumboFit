import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/ejercicios', async (req, res) => {
  try {
    const ejercicios = await prisma.ejercicio.findMany();
    res.json(ejercicios);
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', stack: 'Node.js Express Prisma PostgreSQL' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
