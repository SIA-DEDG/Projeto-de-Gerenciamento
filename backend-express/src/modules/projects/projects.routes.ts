import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './projects.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Gerenciamento de projetos
 */

/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: Listar projetos
 *     responses:
 *       200:
 *         description: Lista de projetos
 *   post:
 *     tags: [Projects]
 *     summary: Criar projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               ownerId: { type: string, format: uuid }
 *               deadline: { type: string, format: date }
 *               executiveStatus: { type: string }
 *               objective: { type: string }
 *               scope: { type: string }
 *               summary: { type: string }
 *     responses:
 *       201:
 *         description: Projeto criado
 */
router.get('/', authenticate, ctrl.listProjects);
router.post('/', authenticate, ctrl.createProject);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Buscar projeto por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Projeto
 *   put:
 *     tags: [Projects]
 *     summary: Atualizar projeto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Projeto atualizado
 *   delete:
 *     tags: [Projects]
 *     summary: Deletar projeto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deletado
 */
router.get('/:id', authenticate, ctrl.getProject);
router.put('/:id', authenticate, ctrl.updateProject);
router.delete('/:id', authenticate, ctrl.deleteProject);

export default router;
