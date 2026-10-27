import { requireAdminRole } from "#lib/server/guards/require-admin-role.js"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = ({ locals }) => {
  requireAdminRole(locals.user)
}
