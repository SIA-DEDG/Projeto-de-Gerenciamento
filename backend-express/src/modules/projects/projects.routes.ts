import { Router } from 'express';
import { authenticate, requireRole, requirePermission } from '../../middleware/auth.middleware';

// Estagiário pode visualizar mas não criar/editar/excluir projetos
const requireFuncionario = requireRole('Admin', 'Diretor', 'Gerente', 'Coordenador', 'Tecnico', 'Funcionario');
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
router.get('/', authenticate, requirePermission('projects.view'), ctrl.listProjects);
router.post('/', authenticate, requirePermission('projects.create'), requireFuncionario, ctrl.createProject);

/**
 * @swagger
 * /projects/import-template:
 *   get:
 *     tags: [Projects]
 *     summary: URL de download do modelo padrão de planilha de importação de projetos
 *     responses:
 *       200:
 *         description: URL pré-assinada do modelo
 * /projects/batch:
 *   post:
 *     tags: [Projects]
 *     summary: Importar projetos em lote
 *     responses:
 *       201:
 *         description: Projetos criados
 */
// IMPORTANTE: rotas estáticas ANTES de "/:id" (senão o Express casa "batch"/"import-template" como id).
router.get('/import-template', authenticate, requirePermission('projects.import'), ctrl.getImportTemplateUrl);
router.post('/batch', authenticate, requirePermission('projects.import'), requireFuncionario, ctrl.createBatch);

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
router.get('/:id', authenticate, requirePermission('projects.view'), ctrl.getProject);
// Permissão fina (dono/responsável/estagiário/Admin/Diretor) é resolvida no controller.
router.put('/:id', authenticate, requirePermission('projects.edit'), ctrl.updateProject);
router.delete('/:id', authenticate, requirePermission('projects.delete'), ctrl.deleteProject);

/**
 * @swagger
 * /projects/{id}/attachments:
 *   post:
 *     tags: [Projects]
 *     summary: Adicionar anexo (arquivo ou link) ao projeto
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Anexo adicionado
 * /projects/{id}/attachments/{idx}:
 *   delete:
 *     tags: [Projects]
 *     summary: Remover anexo do projeto
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
 * /projects/{id}/attachments/{idx}/url:
 *   get:
 *     tags: [Projects]
 *     summary: Obter URL de download do anexo do projeto
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
 */
router.post('/:id/attachments',         authenticate, requirePermission('projects.edit'), ctrl.addAttachment);
router.delete('/:id/attachments/:idx',  authenticate, requirePermission('projects.edit'), ctrl.removeAttachment);
router.get('/:id/attachments/:idx/url', authenticate, requirePermission('projects.view'), ctrl.getAttachmentUrl);

export default router;
