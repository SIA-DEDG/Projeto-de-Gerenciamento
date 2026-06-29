import { Router } from 'express';
import { authenticate, requireAdmin, requireManager } from '../../middleware/auth.middleware';
import * as usersController from './users.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestão de usuários
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Listar todos os usuários
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
router.get('/', authenticate, usersController.listUsers);

/**
 * @swagger
 * /users/all:
 *   get:
 *     tags: [Users]
 *     summary: Listar todos os usuários de todas as diretorias (para seletores cross-diretoria)
 *     responses:
 *       200:
 *         description: Lista completa de usuários
 */
router.get('/all', authenticate, usersController.listAllUsers);

/**
 * @swagger
 * /users/me:
 *   put:
 *     tags: [Users]
 *     summary: Atualizar próprio nome
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Usuário atualizado
 */
router.put('/me', authenticate, usersController.updateMe);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deletar usuário (Admin / Diretor / Gerente)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deletado
 *       400:
 *         description: Não pode deletar a si mesmo
 */
router.delete('/:id', authenticate, requireManager, usersController.deleteUser);

/**
 * @swagger
 * /users/{id}/role:
 *   put:
 *     tags: [Users]
 *     summary: Alterar role do usuário (Admin / Diretor / Gerente)
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
 *             required: [role]
 *             properties:
 *               role: { type: string }
 *     responses:
 *       200:
 *         description: Role atualizado
 */
router.put('/:id/role', authenticate, requireManager, usersController.updateRole);

/**
 * @swagger
 * /users/{id}/password:
 *   put:
 *     tags: [Users]
 *     summary: Admin redefine senha de outro usuário
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
 *             required: [new_password]
 *             properties:
 *               new_password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Senha redefinida
 */
router.put('/:id/password', authenticate, requireManager, usersController.adminResetPassword);

export default router;
