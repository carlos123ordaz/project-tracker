import { supabase } from './supabase'

export async function logAction(params: {
  action: string
  entityType: string
  entityId?: string
  entityName?: string
  details?: Record<string, unknown>
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('audit_logs').insert({
      user_email: user?.email ?? null,
      user_name:  user?.user_metadata?.name ?? user?.email ?? null,
      action:      params.action,
      entity_type: params.entityType,
      entity_id:   params.entityId   ?? null,
      entity_name: params.entityName ?? null,
      details:     params.details    ?? null,
    })
  } catch {
    // audit failures must never break the main action
  }
}
