import { Router } from 'express';
import { authenticate, requireAdmin, requireManager } from '../../middleware/auth.middleware';
import * as directoriasController from './diretorias.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Diretorias
 *   description: Gestão de diretorias e membros
 */

/**
 * @swagger
 * /diretorias:
 *   get:
 *     tags: [Diretorias]
 *     summary: Listar todas as diretorias
 *     responses:
 *       200:
 *         description: Lista de diretorias
 *   post:
 *     tags: [Diretorias]
 *     summary: Criar diretoria (Admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Diretoria criada
 */
router.get('/', authenticate, directoriasController.listDiretorias);
router.post('/', authenticate, requireAdmin, directoriasController.createDirectoria);

/**
 * @swagger
 * /diretorias/{id}:
 *   get:
 *     tags: [Diretorias]
 *     summary: Buscar diretoria por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Diretoria encontrada
 *   put:
 *     tags: [Diretorias]
 *     summary: Atualizar diretoria (Admin)
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
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Diretoria atualizada
 *   delete:
 *     tags: [Diretorias]
 *     summary: Deletar diretoria (Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deletada
 */
router.get('/:id', authenticate, directoriasController.getDirectoria);
router.put('/:id', authenticate, requireAdmin, directoriasController.updateDirectoria);
router.delete('/:id', authenticate, requireAdmin, directoriasController.deleteDirectoria);

/**
 * @swagger
 * /diretorias/{id}/members:
 *   get:
 *     tags: [Diretorias]
 *     summary: Listar membros da diretoria
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de membros
 */
router.get('/:id/members', authenticate, directoriasController.listMembers);

/**
 * @swagger
 * /diretorias/{id}/active:
 *   patch:
 *     tags: [Diretorias]
 *     summary: Ativar / desativar diretoria (Admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status atualizado
 */
router.patch('/:id/active', authenticate, requireAdmin, directoriasController.toggleActive);

/**
 * @swagger
 * /diretorias/{id}/auto-archive:
 *   patch:
 *     tags: [Diretorias]
 *     summary: Definir prazo de auto-arquivamento (Gerente/Diretor/Admin)
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
 *             required: [autoArchiveDays]
 *             properties:
 *               autoArchiveDays: { type: integer, example: 2 }
 *     responses:
 *       200:
 *         description: Prazo atualizado
 */
router.patch('/:id/auto-archive', authenticate, requireManager, directoriasController.setAutoArchive);

/**
 * @swagger
 * /diretorias/{id}/member:
 *   put:
 *     tags: [Diretorias]
 *     summary: Mover membro para esta diretoria (Admin)
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
 *             required: [userId]
 *             properties:
 *               userId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Membro movido
 */
router.put('/:id/member', authenticate, requireAdmin, directoriasController.moveMember);

/**
 * @swagger
 * /diretorias/member/{userId}:
 *   delete:
 *     tags: [Diretorias]
 *     summary: Remover membro de sua diretoria (Admin)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Membro removido
 */
router.delete('/member/:userId', authenticate, requireAdmin, directoriasController.removeMember);

export default router;
