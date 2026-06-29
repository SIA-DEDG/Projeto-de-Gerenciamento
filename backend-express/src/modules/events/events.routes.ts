import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

const requireFuncionario = requireRole('Admin', 'Diretor', 'Gerente', 'Coordenador', 'Tecnico', 'Funcionario');
import * as eventsController from './events.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Gerenciamento de eventos
 */

/**
 * @swagger
 * /events:
 *   get:
 *     tags: [Events]
 *     summary: Listar eventos ativos
 *     responses:
 *       200:
 *         description: Lista de eventos
 *   post:
 *     tags: [Events]
 *     summary: Criar evento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, eventType, startDate, endDate]
 *             properties:
 *               name: { type: string }
 *               eventType: { type: string }
 *               attendees: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               startTime: { type: string }
 *               responsibleIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       201:
 *         description: Evento criado
 */
router.get('/', authenticate, eventsController.listEvents);
router.post('/', authenticate, requireFuncionario, eventsController.createEvent);

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     tags: [Events]
 *     summary: Atualizar evento
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Evento atualizado
 *   delete:
 *     tags: [Events]
 *     summary: Deletar evento
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deletado
 */
router.put('/:id', authenticate, requireFuncionario, eventsController.updateEvent);
router.delete('/:id', authenticate, requireFuncionario, eventsController.deleteEvent);

/**
 * @swagger
 * /events/{id}/minutes:
 *   put:
 *     tags: [Events]
 *     summary: Anexar ata de reunião
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [minutes_file_name, minutes_file_data]
 *             properties:
 *               minutes_file_name: { type: string }
 *               minutes_file_data: { type: string }
 *     responses:
 *       200:
 *         description: Ata anexada
 *   delete:
 *     tags: [Events]
 *     summary: Remover ata de reunião
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ata removida
 */
router.put('/:id/minutes', authenticate, eventsController.setMinutes);
router.delete('/:id/minutes', authenticate, eventsController.removeMinutes);

/**
 * @swagger
 * /events/{id}/minutes/url:
 *   get:
 *     tags: [Events]
 *     summary: Obter URL de download da ata
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: URL pré-assinada da ata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 */
router.get('/:id/minutes/url', authenticate, eventsController.getMinutesUrl);

export default router;
