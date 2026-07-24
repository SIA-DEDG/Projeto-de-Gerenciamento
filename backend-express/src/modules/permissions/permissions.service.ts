import { prisma } from '../../lib/prisma';
import { isValidRole, ROLE_HIERARCHY } from '../../lib/roles';
import {
  PERMISSION_CATALOG,
  defaultPermissionsForRole,
  normalizePermissions,
  type PermissionState,
} from '../../lib/permissions';

export async function permissionsForRole(role: string): Promise<PermissionState> {
  if (!isValidRole(role)) return {};
  const preset = await prisma.permissionPreset.findUnique({ where: { role } });
  return preset ? normalizePermissions(preset.permissions) : defaultPermissionsForRole(role);
}

export async function getConfig() {
  const customPresets = await prisma.permissionPreset.findMany();
  const byRole = new Map(customPresets.map((preset) => [preset.role, normalizePermissions(preset.permissions)]));
  const presets = Object.fromEntries(
    ROLE_HIERARCHY.map((role) => [role, byRole.get(role) ?? defaultPermissionsForRole(role)]),
  );
  return { catalog: PERMISSION_CATALOG, roles: ROLE_HIERARCHY, presets };
}

export async function updatePreset(role: string, permissions: unknown) {
  if (!isValidRole(role)) throw Object.assign(new Error('Role invalida'), { status: 400 });
  const normalized = normalizePermissions(permissions);
  await prisma.permissionPreset.upsert({
    where: { role },
    create: { role, permissions: normalized },
    update: { permissions: normalized },
  });
  return { role, permissions: normalized };
}