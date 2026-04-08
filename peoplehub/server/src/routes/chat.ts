import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { sendMessage, getChatHistory, QUICK_TEMPLATES } from '../services/chatService';
import { MessageType } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

// GET /api/chat/templates — Получить шаблоны быстрых сообщений
router.get('/templates', (req: Request, res: Response) => {
  res.json(QUICK_TEMPLATES);
});

// GET /api/chat/:tripId — История чата поездки
router.get('/:tripId', async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '50'), 10);
  
  const messages = await getChatHistory(String(req.params.tripId), req.user!.id, page, limit);
  res.json(messages);
});

// POST /api/chat/:tripId — Отправить сообщение
const sendMessageSchema = z.object({
  type: z.enum(['TEXT', 'VOICE', 'LOCATION', 'TEMPLATE']),
  content: z.string().min(1).max(500),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

router.post('/:tripId', async (req: Request, res: Response) => {
  const data = sendMessageSchema.parse(req.body);
  
  const message = await sendMessage(
    String(req.params.tripId),
    req.user!.id,
    data.type as MessageType,
    data.content,
    data.lat && data.lng ? { lat: data.lat, lng: data.lng } : undefined
  );

  res.status(201).json(message);
});

export default router;
