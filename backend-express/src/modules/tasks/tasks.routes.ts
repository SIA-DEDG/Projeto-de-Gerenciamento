import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './tasks.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Gerenciamento de tarefas
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Listar tarefas ativas
 *     responses:
 *       200:
 *         description: Lista de tarefas não arquivadas
 *   post:
 *     tags: [Tasks]
 *     summary: Criar tarefa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, activity, status]
 *             properties:
 *               category: { type: string }
 *               activity: { type: string }
 *               status: { type: string }
 *               priority: { type: string, example: Média }
 *               responsibleId: { type: string, format: uuid }
 *               projectId: { type: string, format: uuid }
 *               description: { type: string }
 *               externalCollaborators: { type: string }
 *               deadline: { type: string, format: date }
 *               coResponsibleIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       201:
 *         description: Tarefa criada
 */
router.get('/', authenticate, ctrl.listTasks);
router.post('/', authenticate, ctrl.createTask);

/**
 * @swagger
 * /tasks/batch:
 *   post:
 *     tags: [Tasks]
 *     summary: Criar múltiplas tarefas em lote
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *     responses:
 *       201:
 *         description: Tarefas criadas
 */
router.post('/batch', authenticate, ctrl.createBatch);

/**
 * @swagger
 * /tasks/archived:
 *   get:
 *     tags: [Tasks]
 *     summary: Listar tarefas arquivadas
 *     responses:
 *       200:
 *         description: Lista de tarefas arquivadas
 */
router.get('/archived', authenticate, ctrl.listArchived);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Buscar tarefa por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Tarefa encontrada
 *   put:
 *     tags: [Tasks]
 *     summary: Atualizar tarefa
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Tarefa atualizada
 *   delete:
 *     tags: [Tasks]
 *     summary: Deletar tarefa
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deletada
 */
router.get('/:id', authenticate, ctrl.getTask);
router.put('/:id', authenticate, ctrl.updateTask);
router.delete('/:id', authenticate, ctrl.deleteTask);

/**
 * @swagger
 * /tasks/{id}/archive:
 *   put:
 *     tags: [Tasks]
 *     summary: Arquivar tarefa
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Tarefa arquivada
 * /tasks/{id}/unarchive:
 *   put:
 *     tags: [Tasks]
 *     summary: Desarquivar tarefa
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Tarefa desarquivada
 */
router.put('/:id/archive',   authenticate, ctrl.archiveTask);
router.put('/:id/unarchive', authenticate, ctrl.unarchiveTask);

// Anexos
router.post('/:id/attachments',              authenticate, ctrl.addAttachment);
router.delete('/:id/attachments/:idx',       authenticate, ctrl.removeAttachment);
router.get('/:id/attachments/:idx/url',      authenticate, ctrl.getAttachmentUrl);

export default router;
