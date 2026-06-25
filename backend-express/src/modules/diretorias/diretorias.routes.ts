import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import * as ctrl from './diretorias.controller';

const router = Router();

// Todas as rotas requerem autenticação + role Admin (Super-Admin)
router.get('/',           authenticate, requireAdmin, ctrl.listDiretorias);
router.post('/',          authenticate, requireAdmin, ctrl.createDirectoria);
router.get('/:id',        authenticate, requireAdmin, ctrl.getDirectoria);
router.get('/:id/members', authenticate, requireAdmin, ctrl.listMembers);
router.put('/:id',        authenticate, requireAdmin, ctrl.updateDirectoria);
router.patch('/:id/active', authenticate, requireAdmin, ctrl.toggleActive);
router.put('/:id/member', authenticate, requireAdmin, ctrl.moveMember);

export default router;
