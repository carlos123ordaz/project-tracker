-- ============================================================
-- RESET + SEED COMPLETO — MÓDULO ALMACÉN (con WMS)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── 1. BORRAR TODA LA DATA (orden inverso de FK) ──────────────

TRUNCATE TABLE
  almacen_stock_ubicacion,
  almacen_kardex,
  almacen_despacho_items,
  almacen_despachos,
  almacen_recepcion_items,
  almacen_recepciones,
  almacen_pedido_items,
  almacen_pedidos,
  almacen_equipos,
  almacen_ubicaciones
CASCADE;

-- ── 2. UBICACIONES ───────────────────────────────────────────

INSERT INTO almacen_ubicaciones (id, codigo, nombre, descripcion, tipo, activa, sort_order) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'ALM-01', 'Almacén Central',    'Almacén principal de la empresa',      'Almacén', true, 0),
  ('a0000001-0000-4000-8000-000000000002', 'ALM-02', 'Almacén Secundario', 'Almacén de desborde o cuarentena',     'Almacén', true, 1),
  ('a0000001-0000-4000-8000-000000000003', 'OBR-01', 'Obra Norte',         'Ubicación en obra - zona norte',       'Obra',    true, 2),
  ('a0000001-0000-4000-8000-000000000004', 'OBR-02', 'Obra Sur',           'Ubicación en obra - zona sur',         'Obra',    true, 3),
  ('a0000001-0000-4000-8000-000000000005', 'TAL-01', 'Taller',             'Taller de mantenimiento y reparación', 'Taller',  true, 4),
  ('a0000001-0000-4000-8000-000000000006', 'EST-01', 'Estante A1',         'Estante A, fila 1',                    'Estante', true, 5),
  ('a0000001-0000-4000-8000-000000000007', 'EST-02', 'Estante A2',         'Estante A, fila 2',                    'Estante', true, 6);

-- ── 3. EQUIPOS / MATERIALES (mínimo para probar) ─────────────

INSERT INTO almacen_equipos (id, codigo, nombre, categoria, estado, ubicacion, stock_actual, stock_minimo, unidad, precio_unitario, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'HER-001', 'Taladro percutor 1/2"',  'Herramienta', 'Activo', 'Almacén Central',    5, 2, 'UND', 420.00, 0),
  ('10000000-0000-0000-0000-000000000002', 'EPP-001', 'Casco de seguridad',      'EPP',         'Activo', 'Almacén Central',   10, 5, 'UND',  35.00, 1),
  ('10000000-0000-0000-0000-000000000003', 'ELE-001', 'Interruptor 20A',         'Eléctrico',   'Activo', 'Almacén Secundario', 8, 4, 'UND',  62.00, 2);

-- ── 4. STOCK POR UBICACIÓN ────────────────────────────────────

INSERT INTO almacen_stock_ubicacion (equipo_id, ubicacion_id, stock_actual) VALUES
  -- Taladro: 3 en Almacén Central, 2 en Obra Norte
  ('10000000-0000-0000-0000-000000000001', 'a0000001-0000-4000-8000-000000000001', 3),
  ('10000000-0000-0000-0000-000000000001', 'a0000001-0000-4000-8000-000000000003', 2),
  -- Casco: 10 en Almacén Central
  ('10000000-0000-0000-0000-000000000002', 'a0000001-0000-4000-8000-000000000001', 10),
  -- Interruptor: 8 en Almacén Secundario
  ('10000000-0000-0000-0000-000000000003', 'a0000001-0000-4000-8000-000000000002', 8);

-- ── 5. KARDEX ────────────────────────────────────────────────

INSERT INTO almacen_kardex (equipo_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_tipo, ubicacion_destino_id, fecha) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Entrada', 5,  0, 5, 'Stock inicial', 'manual', 'a0000001-0000-4000-8000-000000000001', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000002', 'Entrada', 10, 0,10, 'Stock inicial', 'manual', 'a0000001-0000-4000-8000-000000000001', NOW() - INTERVAL '30 days'),
  ('10000000-0000-0000-0000-000000000003', 'Entrada', 8,  0, 8, 'Stock inicial', 'manual', 'a0000001-0000-4000-8000-000000000002', NOW() - INTERVAL '30 days');

-- ── 6. PEDIDO DE EJEMPLO ─────────────────────────────────────

INSERT INTO almacen_pedidos (id, solicitado_por, estado, fecha_pedido, fecha_requerida, observaciones, sort_order) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Usuario prueba', 'Pendiente', CURRENT_DATE, CURRENT_DATE + 7, 'Pedido de prueba', 0);

INSERT INTO almacen_pedido_items (pedido_id, equipo_id, descripcion, cantidad, unidad, precio_unitario, sort_order) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Taladro percutor 1/2"', 2, 'UND', 420.00, 0),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Casco de seguridad',    5, 'UND',  35.00, 1);

-- ============================================================
-- FIN DEL RESET SEED
-- ============================================================
