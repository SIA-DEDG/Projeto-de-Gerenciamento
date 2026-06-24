import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './feedback.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: Fórum de feedback e sugestões
 */

/**
 * @swagger
 * /feedback:
 *   get:
 *     tags: [Feedback]
 *     summary: Listar feedbacks
 *     responses:
 *       200:
 *         description: Lista de feedbacks com contagem de upvotes e comentários
 *   post:
 *     tags: [Feedback]
 *     summary: Criar feedback
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipo, titulo, descricao]
 *             properties:
 *               tipo: { type: string }
 *               titulo: { type: string }
 *               descricao: { type: string }
 *               severidade: { type: string }
 *               imagens: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Feedback criado
 */
router.get('/', authenticate, ctrl.listFeedback);
router.post('/', authenticate, ctrl.createFeedback);

/**
 * @swagger
 * /feedback/{id}:
 *   put:
 *     tags: [Feedback]
 *     summary: Atualizar feedback
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Feedback atualizado
 *   delete:
 *     tags: [Feedback]
 *     summary: Deletar feedback (owner ou Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deletado
 */
router.put('/:id', authenticate, ctrl.updateFeedback);
router.delete('/:id', authenticate, ctrl.deleteFeedback);

/**
 * @swagger
 * /feedback/{id}/upvote:
 *   post:
 *     tags: [Feedback]
 *     summary: Dar / remover upvote (toggle)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Feedback com upvotes atualizados
 */
router.post('/:id/upvote', authenticate, ctrl.toggleUpvote);

/**
 * @swagger
 * /feedback/{id}/status:
 *   put:
 *     tags: [Feedback]
 *     summary: Alterar status do feedback (Admin)
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
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Status atualizado
 */
router.put('/:id/status', authenticate, ctrl.setStatus);

/**
 * @swagger
 * /feedback/{id}/resposta:
 *   put:
 *     tags: [Feedback]
 *     summary: Adicionar resposta oficial ao feedback (Admin)
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
 *             required: [resposta]
 *             properties:
 *               resposta: { type: string }
 *     responses:
 *       200:
 *         description: Resposta salva
 */
router.put('/:id/resposta', authenticate, ctrl.setResposta);

/**
 * @swagger
 * /feedback/{id}/comments:
 *   get:
 *     tags: [Feedback]
 *     summary: Listar comentários do feedback
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de comentários
 *   post:
 *     tags: [Feedback]
 *     summary: Comentar no feedback
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
 *             required: [conteudo]
 *             properties:
 *               conteudo: { type: string }
 *               parent_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Comentário criado
 */
router.get('/:id/comments', authenticate, ctrl.listComments);
router.post('/:id/comments', authenticate, ctrl.createComment);

/**
 * @swagger
 * /feedback/{id}/comments/{commentId}:
 *   delete:
 *     tags: [Feedback]
 *     summary: Deletar comentário (owner ou Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deletado
 */
router.delete('/:id/comments/:commentId', authenticate, ctrl.deleteComment);

export default router;
