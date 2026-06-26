import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './absences.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Absences
 *   description: Gestão de ausências
 */

/**
 * @swagger
 * /absences:
 *   get:
 *     tags: [Absences]
 *     summary: Listar ausências (managers veem todas, demais veem apenas as próprias)
 *     responses:
 *       200:
 *         description: Lista de ausências
 *   post:
 *     tags: [Absences]
 *     summary: Registrar ausência
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason, startDate, endDate]
 *             properties:
 *               reason: { type: string }
 *               justification: { type: string }
 *               fileName: { type: string }
 *               fileData: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Ausência criada
 */
router.get('/', authenticate, ctrl.listAbsences);
router.post('/', authenticate, ctrl.createAbsence);

/**
 * @swagger
 * /absences/{id}:
 *   put:
 *     tags: [Absences]
 *     summary: Atualizar ausência
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ausência atualizada
 *   delete:
 *     tags: [Absences]
 *     summary: Deletar ausência
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deletada
 */
router.put('/:id', authenticate, ctrl.updateAbsence);
router.delete('/:id', authenticate, ctrl.deleteAbsence);

/**
 * @swagger
 * /absences/{id}/approval:
 *   put:
 *     tags: [Absences]
 *     summary: Aprovar ou negar ausência
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
 *             required: [approval_status]
 *             properties:
 *               approval_status: { type: string, enum: [aprovado, negado, pendente] }
 *     responses:
 *       200:
 *         description: Status de aprovação atualizado
 */
router.put('/:id/approval', authenticate, ctrl.setApproval);

export default router;
