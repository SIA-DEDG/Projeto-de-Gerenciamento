import { Router } from 'express';
import { authenticate, requireAdmin, requirePermission } from '../../middleware/auth.middleware';
import * as ctrl from './permissions.controller';

const router = Router();

router.get('/', authenticate, ctrl.getConfig);
router.put('/presets/:role', authenticate, requirePermission('settings.manage_permission_presets'), requireAdmin, (req, _res, next) => {
  req.body = { ...req.body, role: req.params.role };
  next();
}, ctrl.updatePreset);

export default router;