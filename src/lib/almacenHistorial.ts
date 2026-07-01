import { supabase } from './supabase'

export async function registrarEstadoPedido(
  pedidoId: string,
  estadoAnterior: string | null | undefined,
  estadoNuevo: string,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('almacen_pedido_estado_historial').insert({
      pedido_id: pedidoId,
      estado_anterior: estadoAnterior ?? null,
      estado_nuevo: estadoNuevo,
      usuario_email: user?.email ?? null,
      usuario_nombre: user?.user_metadata?.name ?? user?.email ?? null,
    })
  } catch {
    // never break the main action
  }
}
