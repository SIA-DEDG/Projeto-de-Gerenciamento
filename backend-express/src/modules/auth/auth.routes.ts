import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './auth.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticação e gerenciamento de senha
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Token JWT + dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user_id: { type: string }
 *                 name: { type: string }
 *                 role: { type: string }
 *                 username: { type: string }
 *                 must_change_password: { type: boolean }
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', ctrl.login);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar novo usuário (requer autenticação)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, name]
 *             properties:
 *               username: { type: string }
 *               name: { type: string }
 *               role: { type: string, example: Funcionario }
 *     responses:
 *       201:
 *         description: Usuário criado com senha temporária
 *       409:
 *         description: Username já existe
 */
router.post('/register', authenticate, ctrl.register);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Alterar própria senha
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string }
 *               new_password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Senha alterada
 *       400:
 *         description: Senha atual incorreta
 */
router.put('/change-password', authenticate, ctrl.changePassword);

/**
 * @swagger
 * /auth/set-initial-password:
 *   put:
 *     tags: [Auth]
 *     summary: Definir senha no primeiro acesso (sem precisar da senha atual)
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
 *         description: Senha definida
 */
router.put('/set-initial-password', authenticate, ctrl.setInitialPassword);

export default router;
