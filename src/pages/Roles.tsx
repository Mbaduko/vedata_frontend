import { Shield, Stethoscope, Wrench, Settings } from 'lucide-react';

const roles = [
  {
    id: 'superadmin',
    name: 'Superadmin',
    description: 'Full system access — manages zones, roles, users, and configuration',
    icon: Shield,
    permissions: [
      'zone.create', 'zone.edit', 'zone.move', 'zone.archive',
      'role.manage', 'user.invite', 'user.assign',
      'animal.create', 'animal.edit', 'animal.delete',
      'vaccination.record', 'vaccination.edit',
      'disease.manage', 'vaccine.manage', 'species.manage',
      'report.view', 'report.view_subzones', 'report.export',
      'audit.view', 'technician.hire',
    ],
  },
  {
    id: 'vet',
    name: 'Veterinarian',
    description: 'Manages animals, vaccinations, and technicians within assigned zone(s)',
    icon: Stethoscope,
    permissions: [
      'animal.create', 'animal.edit', 'animal.delete',
      'vaccination.record', 'vaccination.edit',
      'technician.hire', 'team.view', 'team.manage',
      'report.view', 'report.view_subzones', 'report.export',
      'health_status.deceased',
    ],
  },
  {
    id: 'technician',
    name: 'Technician',
    description: 'Registers animals and records vaccinations within assigned zone; limited edit window',
    icon: Wrench,
    permissions: [
      'animal.create', 'animal.edit_own_grace',
      'vaccination.record', 'vaccination.edit_own_grace',
    ],
  },
];

export default function Roles() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink">Roles & Permissions</h1>
        <p className="text-sm text-ink-secondary mt-1">Manage role definitions and permission mappings</p>
      </div>

      <div className="space-y-4">
        {roles.map(role => {
          const Icon = role.icon;
          return (
            <div key={role.id} className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center shrink-0">
                  <Icon size={24} className="text-brand-text" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-display font-semibold text-ink">{role.name}</h2>
                  <p className="text-sm text-ink-secondary mt-1">{role.description}</p>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide mb-2">
                      Permissions ({role.permissions.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map(perm => (
                        <span
                          key={perm}
                          className="text-xs bg-bg text-ink-secondary px-2 py-1 rounded border border-border"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings size={20} className="text-ink-secondary" />
          <h2 className="text-lg font-display font-semibold text-ink">Extensible RBAC</h2>
        </div>
        <p className="text-sm text-ink-secondary">
          Roles are defined as named sets of permissions. New roles can be created through admin UI configuration
          without code changes. User-role assignments are zone-scoped, allowing the same person to have different
          roles in different zones. The role-permission mapping is many-to-many and editable at runtime.
        </p>
      </div>
    </div>
  );
}
