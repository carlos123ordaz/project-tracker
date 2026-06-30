-- ============================================================
-- SEED DE DATOS DE EJEMPLO — MÓDULO ALMACÉN
-- Ejecutar DESPUÉS de supabase_almacen.sql
-- ============================================================

-- ── 1. EQUIPOS / MATERIALES ───────────────────────────────────

INSERT INTO almacen_equipos (id, codigo, nombre, descripcion, categoria, marca, modelo, serie, estado, ubicacion, stock_actual, stock_minimo, unidad, precio_unitario, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'HER-001', 'Taladro percutor 1/2"',        'Taladro percutor con mandril 1/2", 750W',         'Herramienta',      'Bosch',     'GSB 19-2',     'SN-20231101', 'Activo',        'Almacén A / Estante 1',  4,  2, 'UND', 420.00,  0),
  ('10000000-0000-0000-0000-000000000002', 'HER-002', 'Amoladora angular 7"',          'Amoladora 7", 2200W, disco incluido',             'Herramienta',      'Dewalt',    'DWE4559',      'SN-20231102', 'Activo',        'Almacén A / Estante 1',  3,  2, 'UND', 380.00,  1),
  ('10000000-0000-0000-0000-000000000003', 'HER-003', 'Multímetro digital',            'Multímetro true RMS, categoría CAT III',          'Equipo Eléctrico', 'Fluke',     '117',          'SN-20231103', 'Activo',        'Almacén A / Estante 2',  5,  2, 'UND', 550.00,  2),
  ('10000000-0000-0000-0000-000000000004', 'HER-004', 'Llave stilson 18"',             'Llave stilson de 18 pulgadas, acero forjado',     'Herramienta',      'Stanley',   'SW-18',        NULL,          'Activo',        'Almacén A / Estante 1',  6,  3, 'UND',  85.00,  3),
  ('10000000-0000-0000-0000-000000000005', 'HER-005', 'Nivel digital',                 'Nivel digital con burbuja, 60cm, precisión 0.1°', 'Herramienta',      'Stabila',   'TECH-60',      NULL,          'Activo',        'Almacén A / Estante 2',  2,  1, 'UND', 280.00,  4),
  ('10000000-0000-0000-0000-000000000006', 'HER-006', 'Cinta métrica 50m',             'Cinta de fibra de vidrio 50m, con funda',         'Herramienta',      'Stanley',   'FatMax 50m',   NULL,          'Activo',        'Almacén A / Estante 2',  3,  2, 'UND',  95.00,  5),
  ('10000000-0000-0000-0000-000000000007', 'HER-007', 'Extensión eléctrica 25m',       'Extensión 3x2.5mm2, 25m, con interruptor',       'Herramienta',      'General',   'EXT-25',       NULL,          'Activo',        'Almacén A / Estante 3',  4,  2, 'UND', 120.00,  6),
  ('10000000-0000-0000-0000-000000000008', 'HER-008', 'Taladro percutor 3/4"',        'En mantenimiento preventivo',                      'Herramienta',      'Bosch',     'GSB 21-2',     'SN-20220305', 'En Reparación', 'Taller',                  0,  0, 'UND', 680.00,  7),

  ('10000000-0000-0000-0000-000000000009', 'EPP-001', 'Casco de seguridad',            'Casco HDPE clase E, suspensión en Y',             'EPP',              'MSA',       'V-Gard',       NULL,          'Activo',        'Almacén B / Estante 1', 18, 10, 'UND',  35.00,  8),
  ('10000000-0000-0000-0000-000000000010', 'EPP-002', 'Arnés de seguridad',            'Arnés de cuerpo completo 4 argollas, talla M',   'EPP',              '3M',        'DBI-SALA',     NULL,          'Activo',        'Almacén B / Estante 1',  7,  5, 'UND', 220.00,  9),
  ('10000000-0000-0000-0000-000000000011', 'EPP-003', 'Guantes de nitrilo',            'Caja x100 unidades, talla M',                    'EPP',              'Ansell',    'TouchNTuff',   NULL,          'Activo',        'Almacén B / Estante 2',  3,  5, 'CJA',  48.00, 10),
  ('10000000-0000-0000-0000-000000000012', 'EPP-004', 'Lentes de seguridad',           'Lentes policarbonato, anti-rayaduras, claro',     'EPP',              'Uvex',      'Skyper',       NULL,          'Activo',        'Almacén B / Estante 2', 12,  8, 'UND',  18.00, 11),
  ('10000000-0000-0000-0000-000000000013', 'EPP-005', 'Botas de seguridad punta acero','Bota dieléctrica, talla 42',                     'EPP',              'Caterpillar','Foundation',  NULL,          'Activo',        'Almacén B / Estante 3',  4,  4, 'PAR', 185.00, 12),

  ('10000000-0000-0000-0000-000000000014', 'ELE-001', 'Cable vulcanizado 16mm2',       'Cable NLT 3x16mm2, rollo 100m',                  'Equipo Eléctrico', 'INDECO',    'NLT 3x16',    NULL,          'Activo',        'Almacén C',               3,  2, 'ROL', 890.00, 13),
  ('10000000-0000-0000-0000-000000000015', 'ELE-002', 'Interruptor termomagnético 20A','Interruptor bipolar 20A, 230V',                  'Equipo Eléctrico', 'Schneider', 'iC60N',        NULL,          'Activo',        'Almacén C',               8,  4, 'UND',  62.00, 14),
  ('10000000-0000-0000-0000-000000000016', 'ELE-003', 'Canaleta ranurada 40x25mm',     'Canaleta PVC ranurada, barra 2m',                'Equipo Eléctrico', 'Legrand',   'DLP 40x25',   NULL,          'Activo',        'Almacén C',              15, 10, 'UND',  22.00, 15),
  ('10000000-0000-0000-0000-000000000017', 'ELE-004', 'Prensaestopa M20',              'Prensaestopa plástico M20, IP68',                'Equipo Eléctrico', 'Roxtec',    'RM M20',       NULL,          'Activo',        'Almacén C',              30, 15, 'UND',   8.50, 16),

  ('10000000-0000-0000-0000-000000000018', 'CON-001', 'Disco de corte 7" metal',       'Disco de corte para metal 7"x1.6mm (caja x25)',  'Consumible',       'Norton',    'BDO',          NULL,          'Activo',        'Almacén A / Estante 3',  2,  3, 'CJA',  68.00, 17),
  ('10000000-0000-0000-0000-000000000019', 'CON-002', 'Broca HSS 12mm',                'Broca para metal HSS 12mm (juego x10)',           'Consumible',       'Bosch',     'PointTeQ',    NULL,          'Activo',        'Almacén A / Estante 3',  5,  3, 'JGO',  45.00, 18),
  ('10000000-0000-0000-0000-000000000020', 'CON-003', 'Soldadura cellocord 3/32"',     'Electrodo cellocord AP 3/32", lata x5kg',        'Consumible',       'OERLIKON',  'CELLOCORD AP', NULL,          'Activo',        'Almacén C',               6,  4, 'LTA', 115.00, 19);

-- ── 2. KARDEX — movimientos históricos ───────────────────────

INSERT INTO almacen_kardex (equipo_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, referencia_tipo, fecha) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Entrada', 5, 0, 5, 'Stock inicial',        'manual', NOW() - INTERVAL '60 days'),
  ('10000000-0000-0000-0000-000000000001', 'Salida',  1, 5, 4, 'Uso en Proyecto 101', 'manual', NOW() - INTERVAL '30 days'),

  ('10000000-0000-0000-0000-000000000002', 'Entrada', 3, 0, 3, 'Stock inicial',        'manual', NOW() - INTERVAL '60 days'),

  ('10000000-0000-0000-0000-000000000003', 'Entrada', 6, 0, 6, 'Stock inicial',        'manual', NOW() - INTERVAL '60 days'),
  ('10000000-0000-0000-0000-000000000003', 'Salida',  1, 6, 5, 'Préstamo proyecto',   'manual', NOW() - INTERVAL '15 days'),

  ('10000000-0000-0000-0000-000000000009', 'Entrada', 20, 0,  20, 'Stock inicial',     'manual', NOW() - INTERVAL '60 days'),
  ('10000000-0000-0000-0000-000000000009', 'Salida',   2, 20, 18, 'Dotación equipo',   'manual', NOW() - INTERVAL '20 days'),

  ('10000000-0000-0000-0000-000000000010', 'Entrada', 8, 0, 8, 'Stock inicial',        'manual', NOW() - INTERVAL '60 days'),
  ('10000000-0000-0000-0000-000000000010', 'Salida',  1, 8, 7, 'Dotación técnico',    'manual', NOW() - INTERVAL '10 days'),

  ('10000000-0000-0000-0000-000000000011', 'Entrada', 5, 0, 5, 'Stock inicial',        'manual', NOW() - INTERVAL '60 days'),
  ('10000000-0000-0000-0000-000000000011', 'Salida',  2, 5, 3, 'Uso en campo',         'manual', NOW() - INTERVAL '7 days'),

  ('10000000-0000-0000-0000-000000000018', 'Entrada', 4, 0, 4, 'Stock inicial',        'manual', NOW() - INTERVAL '45 days'),
  ('10000000-0000-0000-0000-000000000018', 'Salida',  2, 4, 2, 'Uso en cortes',        'manual', NOW() - INTERVAL '5 days');

-- ── 3. PEDIDOS ────────────────────────────────────────────────

INSERT INTO almacen_pedidos (id, solicitado_por, proveedor_sugerido, estado, fecha_pedido, fecha_requerida, observaciones, sort_order) VALUES
  ('20000000-0000-0000-0000-000000000001',
   'Carlos Mendoza', 'Distribuidora Eléctrica SAC',
   'Completado',
   CURRENT_DATE - 20, CURRENT_DATE - 10,
   'Urgente para proyecto eléctrico Planta Norte', 0),

  ('20000000-0000-0000-0000-000000000002',
   'Ana Torres', 'Ferretería Industrial Lima',
   'Aprobado',
   CURRENT_DATE - 5, CURRENT_DATE + 3,
   'Reposición EPP campaña mensual', 1),

  ('20000000-0000-0000-0000-000000000003',
   'Roberto Sánchez', NULL,
   'Pendiente',
   CURRENT_DATE - 2, CURRENT_DATE + 7,
   'Consumibles para mantenimiento preventivo Q3', 2),

  ('20000000-0000-0000-0000-000000000004',
   'Lucía Paredes', 'OERLIKON Perú',
   'Borrador',
   CURRENT_DATE, NULL,
   NULL, 3);

-- ── 4. ÍTEMS DE PEDIDO ────────────────────────────────────────

INSERT INTO almacen_pedido_items (pedido_id, equipo_id, descripcion, cantidad, cantidad_aprobada, unidad, precio_unitario, sort_order) VALUES
  -- Pedido 1 (Completado)
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000015', 'Interruptor termomagnético 20A', 10, 10, 'UND',  62.00, 0),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000016', 'Canaleta ranurada 40x25mm',      20, 20, 'UND',  22.00, 1),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000017', 'Prensaestopa M20',               50, 50, 'UND',   8.50, 2),

  -- Pedido 2 (Aprobado)
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000011', 'Guantes de nitrilo caja x100',  10, 10, 'CJA',  48.00, 0),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000012', 'Lentes de seguridad',           20, 20, 'UND',  18.00, 1),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', 'Casco de seguridad',            15, 15, 'UND',  35.00, 2),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000013', 'Botas de seguridad punta acero', 5,  5, 'PAR', 185.00, 3),

  -- Pedido 3 (Pendiente)
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000018', 'Disco de corte 7" metal',        5, NULL, 'CJA',  68.00, 0),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000019', 'Broca HSS 12mm (juego x10)',     4, NULL, 'JGO',  45.00, 1),

  -- Pedido 4 (Borrador)
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000020', 'Soldadura cellocord 3/32"',     10, NULL, 'LTA', 115.00, 0);

-- ── 5. RECEPCIONES ────────────────────────────────────────────

INSERT INTO almacen_recepciones (id, pedido_id, proveedor, nro_factura, guia_remision, fecha_recepcion, estado, observaciones, sort_order) VALUES
  ('30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'Distribuidora Eléctrica SAC', 'F001-00345', 'T001-00892',
   CURRENT_DATE - 10, 'Completada',
   'Recibido conforme, sin observaciones', 0),

  ('30000000-0000-0000-0000-000000000002',
   NULL,
   'Ferretería Central', 'F002-01122', 'T002-00441',
   CURRENT_DATE - 3, 'Completada',
   'Compra directa — herramientas varias', 1),

  ('30000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000002',
   'Ferretería Industrial Lima', NULL, NULL,
   CURRENT_DATE, 'Borrador',
   'Pendiente de llegada del proveedor', 2);

-- ── 6. ÍTEMS DE RECEPCIÓN ─────────────────────────────────────

INSERT INTO almacen_recepcion_items (recepcion_id, equipo_id, descripcion, cantidad, unidad, precio_unitario, sort_order) VALUES
  -- Recepción 1 (Completada)
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000015', 'Interruptor termomagnético 20A', 10, 'UND',  62.00, 0),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000016', 'Canaleta ranurada 40x25mm',      20, 'UND',  22.00, 1),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000017', 'Prensaestopa M20',               50, 'UND',   8.50, 2),

  -- Recepción 2 (Completada — compra directa)
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'Llave stilson 18"',        3, 'UND',  85.00, 0),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'Cinta métrica 50m',        2, 'UND',  95.00, 1),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007', 'Extensión eléctrica 25m',  2, 'UND', 120.00, 2),

  -- Recepción 3 (Borrador — sin completar)
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000011', 'Guantes de nitrilo caja x100', 10, 'CJA',  48.00, 0),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000012', 'Lentes de seguridad',          20, 'UND',  18.00, 1),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000009', 'Casco de seguridad',           15, 'UND',  35.00, 2);

-- ── 7. DESPACHOS ──────────────────────────────────────────────

INSERT INTO almacen_despachos (id, destinatario, direccion, movilidad, conductor, placa, guia_remision, fecha_despacho, estado, observaciones, sort_order) VALUES
  ('40000000-0000-0000-0000-000000000001',
   'Proyecto Planta Norte — Equipo Eléctrico',
   'Av. Industrial 1450, Ate, Lima',
   'Camión 3.5T', 'Miguel Quispe', 'ANF-492', 'T003-00101',
   CURRENT_DATE - 8, 'Entregado',
   'Entregado al ing. responsable con firma de conformidad', 0),

  ('40000000-0000-0000-0000-000000000002',
   'Proyecto Subestación Sur — Cuadrilla 2',
   'Carretera Panamericana Sur km 35',
   'Furgón', 'Pedro Huamán', 'CDE-871', 'T003-00118',
   CURRENT_DATE - 1, 'Despachado',
   'Salió a las 7:30am con guía firmada', 1),

  ('40000000-0000-0000-0000-000000000003',
   'Almacén Temporal Obra — Callao',
   'Jr. Los Ficus 230, Callao',
   'Moto mensajería', 'Luis Vera', NULL, NULL,
   CURRENT_DATE, 'Borrador',
   'Pendiente de confirmar vehículo', 2);

-- ── 8. ÍTEMS DE DESPACHO ──────────────────────────────────────

INSERT INTO almacen_despacho_items (despacho_id, equipo_id, descripcion, cantidad, unidad, sort_order) VALUES
  -- Despacho 1 (Entregado)
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000015', 'Interruptor termomagnético 20A',  8, 'UND', 0),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000016', 'Canaleta ranurada 40x25mm',      15, 'UND', 1),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Multímetro digital',              1, 'UND', 2),

  -- Despacho 2 (Despachado)
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Taladro percutor 1/2"',  2, 'UND', 0),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Amoladora angular 7"',   1, 'UND', 1),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000009', 'Casco de seguridad',     4, 'UND', 2),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000010', 'Arnés de seguridad',     2, 'UND', 3),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000018', 'Disco de corte 7" metal',1, 'CJA', 4),

  -- Despacho 3 (Borrador)
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000019', 'Broca HSS 12mm (juego)', 2, 'JGO', 0),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000020', 'Soldadura cellocord',    2, 'LTA', 1);

-- ============================================================
-- FIN DEL SEED
-- ============================================================
