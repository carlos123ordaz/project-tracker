export const PROJECT_COLORS: Record<string, string> = {
  'Sunflower Yellow': '#FFC107',
  'Crimson Red': '#DC2626',
  'Dodger Blue': '#3B82F6',
  'Turquoise': '#06B6D4',
  'Royal Purple': '#7C3AED',
  'Emerald Green': '#10B981',
  'Caribbean Green': '#059669',
  'Cyan': '#00BCD4',
  'Slate Gray': '#64748B',
  'Amber': '#F59E0B',
  'Wild Strawberry': '#EC4899',
}

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'No Iniciado': { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  'En Progreso': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Retrasado': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  'Completado': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
}

export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  'Crítica': { bg: 'bg-red-50', text: 'text-red-700' },
  'Alta': { bg: 'bg-orange-50', text: 'text-orange-700' },
  'Media': { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  'Baja': { bg: 'bg-gray-50', text: 'text-gray-600' },
}

export const TASK_TYPES = [
  'Venta de Equipos',
  'Diseño',
  'Compras y Logistica',
  'Ejecución',
  'Prueba',
  'Ingeniería',
  'Gestión',
  'Supervisión',
  'Otro',
]
