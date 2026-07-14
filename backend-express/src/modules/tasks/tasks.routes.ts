import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as tasksController from './tasks.controller';

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
router.get('/', authenticate, tasksController.listTasks);
router.post('/', authenticate, tasksController.createTask);

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
router.post('/batch', authenticate, tasksController.createBatch);

/**
 * @swagger
 * /tasks/import-template:
 *   get:
 *     tags: [Tasks]
 *     summary: URL de download do modelo padrão de planilha de importação
 *     responses:
 *       200:
 *         description: URL pré-assinada do modelo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 */
router.get('/import-template', authenticate, tasksController.getImportTemplateUrl);

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
router.get('/archived', authenticate, tasksController.listArchived);

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
router.get('/:id', authenticate, tasksController.getTask);
router.put('/:id', authenticate, tasksController.updateTask);
router.delete('/:id', authenticate, tasksController.deleteTask);

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
router.put('/:id/archive',   authenticate, tasksController.archiveTask);
router.put('/:id/unarchive', authenticate, tasksController.unarchiveTask);

/**
 * @swagger
 * /tasks/{id}/pin:
 *   put:
 *     tags: [Tasks]
 *     summary: Fixar atividade (pin do usuário logado)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Atividade fixada
 *   delete:
 *     tags: [Tasks]
 *     summary: Desafixar atividade (pin do usuário logado)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Atividade desafixada
 */
router.put('/:id/pin',    authenticate, tasksController.pinTask);
router.delete('/:id/pin', authenticate, tasksController.unpinTask);

/**
 * @swagger
 * /tasks/{id}/attachments:
 *   post:
 *     tags: [Tasks]
 *     summary: Adicionar anexo à tarefa
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
 *             required: [fileName, fileData]
 *             properties:
 *               fileName: { type: string }
 *               fileData: { type: string, description: Base64 do arquivo }
 *     responses:
 *       200:
 *         description: Anexo adicionado
 * /tasks/{id}/attachments/{idx}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Remover anexo da tarefa
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: idx
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Anexo removido
 * /tasks/{id}/attachments/{idx}/url:
 *   get:
 *     tags: [Tasks]
 *     summary: Obter URL de download do anexo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: idx
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: URL pré-assinada do anexo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 */
router.post('/:id/attachments',              authenticate, tasksController.addAttachment);
router.delete('/:id/attachments/:idx',       authenticate, tasksController.removeAttachment);
router.get('/:id/attachments/:idx/url',      authenticate, tasksController.getAttachmentUrl);

export default router;
