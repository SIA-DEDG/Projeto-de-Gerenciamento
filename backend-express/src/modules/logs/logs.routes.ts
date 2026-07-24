import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import * as ctrl from './logs.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Histórico de atividades
 */

/**
 * @swagger
 * /logs:
 *   get:
 *     tags: [Logs]
 *     summary: Listar todos os logs de atividade
 *     responses:
 *       200:
 *         description: Lista de logs
 *   delete:
 *     tags: [Logs]
 *     summary: Limpar todos os logs (Admin)
 *     responses:
 *       204:
 *         description: Logs apagados
 */
router.get('/', authenticate, requirePermission('logs.view'), ctrl.listLogs);
router.delete('/', authenticate, requirePermission('logs.clear'), ctrl.clearLogs);

export default router;
