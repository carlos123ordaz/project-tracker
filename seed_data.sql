-- ============================================================
-- SEED DATA: Project Tracker - CORSUSA
-- Generado desde: COR-FPRY-Project Tracker - CORSUSA.xlsx
-- Proyectos: 19 | Tareas: 66
-- ============================================================

-- OPCIONAL: Limpiar datos existentes antes de insertar
-- TRUNCATE tasks, projects RESTART IDENTITY CASCADE;

-- ============================================================
-- PROYECTOS (19)
-- ============================================================
INSERT INTO projects (id, name, focus_area, initiative, leader, start_date, end_date, color) VALUES
  ('312fdfa2-0058-4c4f-a0f3-468b5af2219f', 'Construcción de 22 Tableros', 'Proyectos', 'Yanacocha', 'Juan Jimenez', '2026-01-12', '2026-06-02', 'Sunflower Yellow'),
  ('06efbf9b-9375-4e07-bfce-3987aa757831', 'Armado de Mesas para Servicios', 'Ingeniería', 'San Pedrito', 'Juan Jimenez', '2026-03-16', '2026-04-22', 'Crimson Red'),
  ('be1168b6-681f-41be-8fd8-a0136349f37f', 'Planos As Built y Permisos Municipales', 'Ingeniería', 'San Pedrito', 'Jhunior Contreras', '2026-03-23', '2026-05-20', 'Dodger Blue'),
  ('7acdef11-0aff-4eb3-9694-84dee74fa763', 'Planos Preliminares - Ing. Básica', 'Ingeniería', 'Difusores', 'Juan Jimenez', '2026-03-02', '2027-01-27', 'Turquoise'),
  ('f7d8fa71-e5d5-4e67-86e9-37429a8e61eb', 'Fabricación de Cajas de Paso', 'Proyectos', 'MMG Las Bambas', 'Juan Jimenez', '2026-01-12', '2026-06-02', 'Royal Purple'),
  ('93ad0df9-b58d-45d4-b022-87c022cf3721', 'Mantenimiento de Serpentin', 'Proyectos', 'Pepsico', 'Brandon Coronado', '2026-03-31', '2026-05-30', 'Emerald Green'),
  ('2f3f76c3-a781-416b-9923-9fed7cbf080b', 'Armado de Tableros CCTV 39 Und', 'Proyectos', 'COMM', 'Richard Samayani', '2025-09-26', '2026-05-30', 'Caribbean Green'),
  ('a69f0a12-7d61-4cb3-926f-bab98a36773b', 'Armado de Tableros CCTV 03 Und Adicionales', 'Proyectos', 'COMM', 'Richard Samayani', '2026-03-26', '2026-05-26', 'Cyan'),
  ('7f4f47be-d3fb-418c-aa6d-977993718966', 'Armado de Tablero de SMC', 'Proyectos', 'Construplant', 'Juan Jimenez', '2026-02-16', '2026-05-02', 'Slate Gray'),
  ('8ead1283-e7de-49f5-b3d8-461d095efbcf', 'Construcción de Mesas Pesadas SP', 'Proyectos', 'San Pedrito', 'Juan Jimenez', '2026-04-08', '2026-05-26', 'Emerald Green'),
  ('d31ee9b3-ab93-4fb6-b975-3684f7af81bc', 'Drenaje para Sala de Calibración, Rugosidad y Extractor en SP', 'Proyectos', 'San Pedrito', 'Juan Jimenez', '2026-05-07', '2026-05-19', 'Sunflower Yellow'),
  ('4126f3d8-1576-4468-81e5-17148aaf6232', 'Actualización de Planos y As Built, Mejora en las Instalaciones de Piuray Cloración', 'Ingeniería', 'Sedacusco Piuray Cloración', 'Jhunior Contreras', NULL, NULL, 'Crimson Red'),
  ('26c32505-0c84-4fcb-b292-e4add8883519', 'Cotización Tc Boost Fase 1 y Fase 2, Actualización Estructural,', 'Proyectos', 'Pepsico', 'Brandon Coronado', NULL, NULL, 'Amber'),
  ('8b20ff6e-86bb-469d-82d0-97ae5792aecb', 'Ingeniería, Suministro y Supervision de TIF HMT - Repsol Pampilla', 'Proyectos', 'Repsol Pampilla', 'Paolo Marcas', '2025-10-20', '2026-05-21', 'Dodger Blue'),
  ('66b177e3-886a-4516-a2be-386b473330d3', 'Cotización Difusores', 'Proyectos', 'Sedapal Santa Clara', 'Paolo Marcas', NULL, NULL, 'Wild Strawberry'),
  ('9539b0e5-9152-4cf2-8c18-d0c65da91cb6', 'Instalación de Intercambiador de Calor', 'Proyectos', 'Pepsico', 'Brandon Coronado', NULL, NULL, 'Caribbean Green'),
  ('95b53ad3-49e6-4c57-a566-112d7b9b0d0d', 'Construcción de Contenedor de Cloro', 'Proyectos', 'Southern', 'Fredy Huaman', NULL, NULL, 'Cyan'),
  ('58038d81-55bf-45cb-b4b3-22fac141fb36', 'Instalación Ductos y Extractores', 'Proyectos', 'San Pedrito', 'Juan Jimenez', NULL, NULL, 'Crimson Red'),
  ('e89112fd-c6a9-42a9-994d-a1a418894548', 'Apoyo mecánico desmontaje y montaje de Valvulas', 'Proyectos', 'El Brocal', 'Marco Reyna', NULL, NULL, 'Amber');

-- ============================================================
-- TAREAS (66)
-- ============================================================
INSERT INTO tasks (id, project_id, number, type, name, status, priority, start_date, end_date, assigned_to, budget, actual_cost, progress, label, notes) VALUES
  ('e00399a2-748b-4ec9-abe4-3618ade46e65', '312fdfa2-0058-4c4f-a0f3-468b5af2219f', 1, 'Venta de Equipos', 'Llegada de Equipamientos', 'Retrasado', 'Crítica', '2026-01-12', '2026-03-29', 'Marco Alvitez', 0, 0, 0.35, NULL, NULL),
  ('6277c0e1-5643-4bb4-be17-57d30aa6cace', '312fdfa2-0058-4c4f-a0f3-468b5af2219f', 2, 'Diseño', 'Aprobación de Planos', 'En Progreso', 'Crítica', '2026-03-26', '2026-03-30', 'Jhunior Contreras', 350.0, 0, 0.65, NULL, NULL),
  ('2afaacc8-8e54-4a10-b1f6-d22dfef970ae', '312fdfa2-0058-4c4f-a0f3-468b5af2219f', 3, 'Compras y Logistica', 'Compra de Prensaestopa, rieles y accesorios', 'No Iniciado', 'Alta', '2026-03-31', '2026-04-06', 'Fiorella Rojas', 350.0, 0, 0, NULL, NULL),
  ('ac4be9f9-7e72-4a5f-9684-49612eb2804a', '312fdfa2-0058-4c4f-a0f3-468b5af2219f', 4, 'Ejecución', 'Construcción de Gabinetes', 'Retrasado', 'Crítica', '2026-04-07', '2026-05-27', 'Juan Jimenez', 4500.0, 0, 0, NULL, NULL),
  ('7ce7f62e-c5fb-4066-b136-514cb2fa02d3', '312fdfa2-0058-4c4f-a0f3-468b5af2219f', 5, 'Prueba', 'Pruebas de Gabinetes fabricados', 'Retrasado', 'Crítica', '2026-05-28', '2026-05-30', 'Juan Jimenez', 1000.0, 0, 0, NULL, NULL),
  ('f712609d-d252-45e2-9e20-786182e56639', '312fdfa2-0058-4c4f-a0f3-468b5af2219f', 6, 'Diseño', 'Aprobación de Planos As Built', 'No Iniciado', 'Alta', '2026-05-31', '2026-06-02', 'Juan Jimenez', 550.0, 0, 0, NULL, NULL),
  ('fb4954bd-a37d-4933-a642-93679fc616b0', '06efbf9b-9375-4e07-bfce-3987aa757831', 1, 'Diseño', 'Aprobación de Planos', 'En Progreso', 'Media', '2026-03-16', '2026-03-31', 'Dustin Gomez', 350.0, 0, 0, NULL, NULL),
  ('db8b4590-8ad3-4d88-85be-af52556242cd', '06efbf9b-9375-4e07-bfce-3987aa757831', 2, 'Compras y Logistica', 'Compra de Suministro y accesorios', 'No Iniciado', 'Media', '2026-04-01', '2026-04-13', 'Fiorella Rojas', 1000.0, 0, 0, NULL, NULL),
  ('09f2a6d9-12f8-4959-a253-3ed436d4745d', '06efbf9b-9375-4e07-bfce-3987aa757831', 3, 'Ejecución', 'Construccion y armado', 'No Iniciado', 'Media', '2026-04-14', '2026-04-17', 'Fiorella Rojas', 350.0, 0, 0, NULL, NULL),
  ('5ca5f425-80c7-4115-9479-26ce1f7169df', '06efbf9b-9375-4e07-bfce-3987aa757831', 4, 'Prueba', 'Pruebas In Situ', 'No Iniciado', 'Media', '2026-04-18', '2026-04-20', 'Fiorella Rojas', 300.0, 0, 0, NULL, NULL),
  ('5ce71274-a5ae-46e0-aa6e-59f5b8668df9', '06efbf9b-9375-4e07-bfce-3987aa757831', 5, 'Diseño', 'Aprobación de Planos As Built', 'No Iniciado', 'Media', '2026-04-21', '2026-04-22', 'Fiorella Rojas', 150.0, 0, 0, NULL, NULL),
  ('4b994bf2-8d2f-4b1b-a0ea-1bbdd0a3d675', 'be1168b6-681f-41be-8fd8-a0136349f37f', 1, 'Diseño', 'Aprobación de Planos', 'En Progreso', 'Baja', '2026-03-23', '2026-05-20', 'Jhunior Contreras', 600.0, 350.0, 0.7, NULL, NULL),
  ('87b336aa-a637-4d17-bf81-07f887f52865', 'be1168b6-681f-41be-8fd8-a0136349f37f', 2, 'Diseño', 'Tramite de Permisos', 'En Progreso', 'Media', '2026-03-23', '2026-05-20', 'Jhunior Contreras', 1500.0, 1200.0, 0.3, NULL, NULL),
  ('182f4bf6-e12a-4ad1-a2cf-c2b5600da06f', '7acdef11-0aff-4eb3-9694-84dee74fa763', 1, 'Diseño', 'Desarrollo de Ing. Básica para Licitación', 'En Progreso', 'Crítica', '2026-03-02', '2026-04-04', NULL, 0, 0, 0, NULL, NULL),
  ('5db576cb-8410-4d66-8eb6-39e7b87f6a03', '7acdef11-0aff-4eb3-9694-84dee74fa763', 2, 'Compras y Logistica', 'Cotización de Suministros', 'Retrasado', 'Crítica', '2026-03-02', '2026-05-01', NULL, 0, 0, 0, NULL, NULL),
  ('3e97ae82-a6b2-4b35-bff4-acf969c6f0b8', '7acdef11-0aff-4eb3-9694-84dee74fa763', 3, 'Comercial', 'Desarrollo de Propuesta Técnica y Económica', 'Retrasado', 'Media', '2026-05-06', '2026-05-20', NULL, 0, 0, 0, NULL, NULL),
  ('e3a843bf-ba4e-4ec1-a0c0-2b4aab1a6a8e', '7acdef11-0aff-4eb3-9694-84dee74fa763', 4, 'Compras y Logistica', 'Compra de Suministro y accesorios', 'Retrasado', 'Alta', '2026-05-23', '2026-05-30', NULL, 0, 0, 0, NULL, NULL),
  ('f9850b01-aeca-4c04-9d08-7626fb34e3eb', '7acdef11-0aff-4eb3-9694-84dee74fa763', 5, 'Ejecución', 'Construccion y armado', 'No Iniciado', 'Baja', '2026-05-31', '2026-11-27', NULL, 0, 0, 0, NULL, NULL),
  ('dbaaecdd-50e8-456c-863f-60c10bcd198d', '7acdef11-0aff-4eb3-9694-84dee74fa763', 6, 'Prueba', 'Pruebas In Situ', 'No Iniciado', 'Baja', '2026-12-27', '2027-01-11', NULL, 0, 0, 0, NULL, NULL),
  ('c846e41e-0344-445c-ae5e-2992ae766883', '7acdef11-0aff-4eb3-9694-84dee74fa763', 7, 'Diseño', 'Aprobación de Planos As Built', 'No Iniciado', 'Baja', '2027-01-12', '2027-01-27', NULL, 0, 0, 0, NULL, NULL),
  ('9848062e-9821-4261-a3ae-8bb677f2203b', 'f7d8fa71-e5d5-4e67-86e9-37429a8e61eb', 1, 'Venta de Equipos', 'Llegada de Equipamientos', 'Retrasado', 'Crítica', '2026-01-12', '2026-03-29', 'Jean Lucero', 0, 0, 0.35, NULL, 'Hasta la fecha del 07.05 no define esto ventas o no se tiene respuesta si se va realizar'),
  ('bbf0f020-3df5-4941-8fc9-8d5885f86633', 'f7d8fa71-e5d5-4e67-86e9-37429a8e61eb', 2, 'Diseño', 'Aprobación de Planos', 'En Progreso', 'Crítica', '2026-03-26', '2026-03-30', 'Jhunior Contreras', 350.0, 0, 0.65, NULL, NULL),
  ('f3bfa848-86ff-4419-9e89-6e0f27977bf9', 'f7d8fa71-e5d5-4e67-86e9-37429a8e61eb', 3, 'Compras y Logistica', 'Compra de Prensaestopa, rieles y accesorios', 'No Iniciado', 'Alta', '2026-03-31', '2026-04-06', 'Fiorella Rojas', 350.0, 0, 0, NULL, NULL),
  ('7c864a1b-efe9-4024-8b09-9a543ed1448e', 'f7d8fa71-e5d5-4e67-86e9-37429a8e61eb', 4, 'Ejecución', 'Construcción de Gabinetes', 'No Iniciado', 'Alta', '2026-04-07', '2026-04-22', 'Juan Jimenez', 4500.0, 0, 0, NULL, NULL),
  ('244fd9bf-5f28-40cc-9cc9-3dd08f612f62', 'f7d8fa71-e5d5-4e67-86e9-37429a8e61eb', 5, 'Prueba', 'Pruebas de Gabinetes fabricados', 'No Iniciado', 'Alta', '2026-04-23', '2026-05-30', 'Juan Jimenez', 1000.0, 0, 0, NULL, NULL),
  ('b0267797-461b-4a75-90fb-679868e42ffb', 'f7d8fa71-e5d5-4e67-86e9-37429a8e61eb', 6, 'Diseño', 'Aprobación de Planos As Built', 'No Iniciado', 'Alta', '2026-05-31', '2026-06-02', 'Juan Jimenez', 550.0, 0, 0, NULL, NULL),
  ('9634a5bf-d842-4900-b783-ae3fb6ac034e', '93ad0df9-b58d-45d4-b022-87c022cf3721', 1, 'Diseño', 'Elaboración de Planos', 'No Iniciado', 'Crítica', '2026-04-13', '2026-04-23', 'Jhunior Contreras', 350.0, 0, 1.0, NULL, NULL),
  ('5695515b-4ed7-4f1c-bb8e-2da390235c7a', '93ad0df9-b58d-45d4-b022-87c022cf3721', 2, 'Compras y Logistica', 'Compra de Suministros y accesorios', 'No Iniciado', 'Crítica', '2026-03-31', '2026-04-06', 'Fiorella Rojas', 2000.0, 1500.0, 1.0, NULL, NULL),
  ('29f7aa03-dee2-4df2-bb50-7bf8f5657b97', '93ad0df9-b58d-45d4-b022-87c022cf3721', 3, 'Ejecución', 'Montaje', 'No Iniciado', 'Alta', '2026-04-07', '2026-04-15', 'Juan Jimenez', 8500.0, 6500.0, 1.0, NULL, NULL),
  ('76b76b00-2778-4e9c-b78c-b0a9ae2bdcd9', '93ad0df9-b58d-45d4-b022-87c022cf3721', 4, 'Prueba', 'Pruebas Finales', 'No Iniciado', 'Alta', '2026-04-16', '2026-04-09', 'Juan Jimenez', 1000.0, 850.0, 1.0, NULL, NULL),
  ('f9510fe0-7820-4bf6-8a25-8866d500489e', '93ad0df9-b58d-45d4-b022-87c022cf3721', 5, 'Diseño', 'Aprobación de Planos As Built', 'No Iniciado', 'Alta', '2026-04-10', '2026-05-30', 'Juan Jimenez', 550.0, 490.0, 1.0, NULL, NULL),
  ('8183c943-5cf7-4362-b9ac-b338160d9824', '2f3f76c3-a781-416b-9923-9fed7cbf080b', 1, 'Diseño', 'Aprobación de Planos y documentación de Ingeniería', 'En Progreso', 'Crítica', '2025-09-26', '2026-03-30', 'Jhunior Contreras', 3250.0, 4800.0, 0.8, NULL, 'No se cuenta con información de COMM sobre el Status de Documentación o si fue cargado en el Aconex'),
  ('0f8a7867-c3f0-48fc-83d5-bf7b8c381ec8', '2f3f76c3-a781-416b-9923-9fed7cbf080b', 2, 'Compras y Logistica', 'Compra de Suministros y accesorios', 'Completado', 'Crítica', '2026-03-31', '2026-04-06', 'Fiorella Rojas', 3500.0, 1500.0, 0.9, NULL, 'No se cuenta con el suministro solicitado por RS'),
  ('5b682b2c-1723-4220-872e-382a640fc596', '2f3f76c3-a781-416b-9923-9fed7cbf080b', 3, 'Ejecución', 'Montaje', 'Retrasado', 'Alta', '2026-04-07', '2026-04-15', 'Juan Jimenez', 20500.0, 10000.0, 0.9, NULL, 'Dado a que COMM no suministra los componentes faltantes, no se puede culminar el montaje de los tableros'),
  ('b431c69f-4888-41a8-8bf0-3b00e1ce9831', '2f3f76c3-a781-416b-9923-9fed7cbf080b', 4, 'Prueba', 'Pruebas Finales', 'Retrasado', 'Alta', '2026-04-16', '2026-04-09', 'Juan Jimenez', 4250.0, 2000.0, 0.9, NULL, 'Retrasado por falta de información de COMM se ha reportado por correo hasta la fecha 06.05 no se cuenta con respuesta del cliente'),
  ('bc04b1ad-c71c-40c7-9b61-78278e822849', '2f3f76c3-a781-416b-9923-9fed7cbf080b', 5, 'Diseño', 'Aprobación de Planos As Built', 'Retrasado', 'Alta', '2026-04-10', '2026-05-30', 'Juan Jimenez', 1500.0, 2000.0, 0.8, NULL, NULL),
  ('8ed1ac5c-7a01-4094-a1f0-edea49d4a034', 'a69f0a12-7d61-4cb3-926f-bab98a36773b', 1, 'Diseño', 'Elaboración de Planos', 'En Progreso', 'Crítica', '2026-03-26', '2026-03-30', 'Jhunior Contreras', 650.0, 600.0, 0, NULL, 'No se cuenta con información de COMM sobre el Status de Documentación o si fue cargado en el Aconex'),
  ('22ee525f-ae68-43c9-b46a-73ae3fed1b98', 'a69f0a12-7d61-4cb3-926f-bab98a36773b', 2, 'Compras y Logistica', 'Compra de Suministros y accesorios', 'Completado', 'Crítica', '2026-03-31', '2026-04-06', 'Fiorella Rojas', 600.0, 350.0, 0, NULL, 'No se cuenta con el suministro solicitado por RS'),
  ('c98b27d0-8316-4bae-9bff-927c3a316b20', 'a69f0a12-7d61-4cb3-926f-bab98a36773b', 3, 'Ejecución', 'Montaje', 'Retrasado', 'Alta', '2026-04-07', '2026-05-15', 'Richard Samayani', 4500.0, 0, 0, NULL, 'Dado a que COMM no suministra los componentes faltantes, no se puede culminar el montaje de los tableros'),
  ('27cdc07f-f754-4265-8859-5fbfcf389556', 'a69f0a12-7d61-4cb3-926f-bab98a36773b', 4, 'Prueba', 'Pruebas Finales', 'Retrasado', 'Alta', '2026-05-16', '2026-05-23', 'Richard Samayani', 2500.0, 0, 0, NULL, 'Retrasado por falta de información de COMM se ha reportado por correo hasta la fecha 06.05 no se cuenta con respuesta del cliente'),
  ('e7102038-e876-4da1-870f-9a0b0feb631d', 'a69f0a12-7d61-4cb3-926f-bab98a36773b', 5, 'Diseño', 'Desarrollo de Planos As Built', 'Retrasado', 'Alta', '2026-05-24', '2026-05-26', 'Richard Samayani', 550.0, 0, 0, NULL, NULL),
  ('4f0f4493-4052-4311-9940-3dcd189ce700', '7f4f47be-d3fb-418c-aa6d-977993718966', 1, 'Diseño', 'Elaboración de Planos', 'Completado', 'Media', '2026-02-16', '2026-02-23', 'Jhunior Contreras', 0, 600.0, 1.0, NULL, NULL),
  ('93b648b7-9056-4313-be47-2fb099c6c5de', '7f4f47be-d3fb-418c-aa6d-977993718966', 2, 'Compras y Logistica', 'Compra de Suministros y accesorios', 'Completado', 'Crítica', '2026-02-24', '2026-03-03', 'Fiorella Rojas', 0, 350.0, 1.0, NULL, NULL),
  ('0a49f201-f48c-4c21-bac0-b7778cebef32', '7f4f47be-d3fb-418c-aa6d-977993718966', 3, 'Ejecución', 'Montaje', 'Completado', 'Alta', '2026-03-03', '2026-04-02', 'Paolo Marcas', 0, 0, 1.0, NULL, NULL),
  ('f8b00b67-2aff-40bd-90eb-65f1dd693123', '7f4f47be-d3fb-418c-aa6d-977993718966', 4, 'Prueba', 'Pruebas Finales', 'Retrasado', 'Crítica', '2026-04-03', '2026-04-13', 'Marco Reyna', 0, 0, 1.0, NULL, 'Retrasado por un demora en diseño y actualización por parte de SMC'),
  ('1b2b3a1e-fa0a-4774-9259-a785346ed45f', '7f4f47be-d3fb-418c-aa6d-977993718966', 5, 'Diseño', 'Desarrollo de Planos As Built', 'En Progreso', 'Alta', '2026-04-14', '2026-04-21', 'Jhunior Contreras', 0, 0, 0.8, NULL, NULL),
  ('96a9093a-c970-4dd6-a7b8-28afbd02554b', '7f4f47be-d3fb-418c-aa6d-977993718966', 6, 'Compras y Logistica', 'Envío al Cliente', 'Retrasado', 'Crítica', '2026-04-22', '2026-05-02', 'Sabino Vicuña', 0, 0, 0, NULL, NULL),
  ('bd7065e7-ee5f-47b7-92b5-ffd524a921cf', '8ead1283-e7de-49f5-b3d8-461d095efbcf', 1, 'Diseño', 'Elaboración de Planos', 'En Progreso', 'Media', '2026-04-08', '2026-05-03', 'Jhunior Contreras', 0, 0, 0.7, NULL, NULL),
  ('30157200-48f3-4757-ab22-31d528afd1d0', '8ead1283-e7de-49f5-b3d8-461d095efbcf', 2, 'Compras y Logistica', 'Compra de Suministros y accesorios', 'En Progreso', 'Crítica', '2026-05-04', '2026-05-11', 'Fiorella Rojas', 0, 0, 0, NULL, NULL),
  ('dd7c5e26-5e51-4f8c-8fb8-334cca14cc7b', '8ead1283-e7de-49f5-b3d8-461d095efbcf', 3, 'Ejecución', 'Fabricación', 'No Iniciado', 'Crítica', '2026-05-11', '2026-05-21', 'Juan Jimenez', 0, 0, 0, NULL, NULL),
  ('81162727-3ec6-4819-8947-55ab066e55e6', '8ead1283-e7de-49f5-b3d8-461d095efbcf', 4, 'Prueba', 'Pruebas Finales', 'No Iniciado', 'Alta', '2026-05-22', '2026-05-24', 'Jhunior Contreras', 0, 0, 0, NULL, NULL),
  ('69ef1c94-c3ab-4b94-a664-62fcdde94fdd', '8ead1283-e7de-49f5-b3d8-461d095efbcf', 5, 'Diseño', 'Desarrollo de Planos As Built', 'No Iniciado', 'Media', '2026-05-25', '2026-05-26', 'Jhunior Contreras', 0, 0, 0, NULL, NULL),
  ('bbdb4289-5cbc-472c-ab0b-9925879f906b', 'd31ee9b3-ab93-4fb6-b975-3684f7af81bc', 1, 'Compras y Logistica', 'Compra de Suministros y accesorios', 'En Progreso', 'Crítica', '2026-05-07', '2026-05-11', 'Fiorella Rojas', 0, 0, 0.05, NULL, NULL),
  ('e5aaa4a0-a60f-4ed5-a9ce-5b3ef05d32e6', 'd31ee9b3-ab93-4fb6-b975-3684f7af81bc', 2, 'Ejecución', 'Mejoras, Instalación y Montajes', 'No Iniciado', 'Crítica', '2026-05-11', '2026-05-15', 'Juan Jimenez', 0, 0, 0.05, NULL, NULL),
  ('8ecf4a3b-b429-4ecb-8eca-1d7e88cb7ea2', 'd31ee9b3-ab93-4fb6-b975-3684f7af81bc', 3, 'Prueba', 'Pruebas Finales', 'No Iniciado', 'Alta', '2026-05-16', '2026-05-17', 'Jhunior Contreras', 0, 0, 0, NULL, NULL),
  ('37847336-8965-4119-bda7-9ff93f654d95', 'd31ee9b3-ab93-4fb6-b975-3684f7af81bc', 4, 'Diseño', 'Desarrollo de Planos As Built', 'No Iniciado', 'Media', '2026-05-18', '2026-05-19', 'Jhunior Contreras', 0, 0, 0, NULL, NULL),
  ('6838aeea-cfa6-4aef-adab-1622fe12d3bb', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 1, 'Gerencia', 'Firma de Contrato, Gestiones administrativas', 'Completado', 'Media', '2025-10-20', '2025-11-03', 'Francisco Gonzales', 0, 600.0, 1.0, NULL, NULL),
  ('a85c57c9-16ae-4446-a54c-4e81e0026798', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 2, 'Comercial', 'KOM', 'Completado', 'Alta', '2025-11-05', '2025-11-08', 'Juan Jimenez', 0, 600.0, 1.0, NULL, NULL),
  ('ad3a6a45-020b-4820-ab3f-521244b03837', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 3, 'Diseño', 'Elaboración de Planos HMT', 'Completado', 'Alta', '2025-11-14', '2026-01-13', 'Fabricante', 0, 600.0, 1.0, NULL, NULL),
  ('9ef3ec76-1991-4881-b429-af82215ffd96', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 4, 'E-Mail', 'Aprobación de Planos para Fabricación', 'Completado', 'Crítica', '2026-01-14', '2026-01-15', 'Juan Jimenez', 0, 350.0, 1.0, NULL, NULL),
  ('0d611ab3-7ccc-4367-99a2-5d44c0067ce0', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 5, 'Ejecución', 'Fabricación de TIF', 'Completado', 'Alta', '2026-01-15', '2026-03-20', 'Fabricante', 0, 350.0, 1.0, NULL, NULL),
  ('d42d16e9-7465-4c9e-9a38-75d342427618', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 6, 'Compras y Logistica', 'Transporte Logístico Corsusa', 'Retrasado', 'Crítica', '2026-03-21', '2026-05-04', 'Sabino Vicuña', 0, 350.0, 1.0, NULL, NULL),
  ('a0967816-a984-4acd-8592-16c242ce1ddd', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 7, 'Documentación', 'Desarrollo de Dossier de Fabricación', 'Retrasado', 'Alta', '2026-02-14', '2026-04-30', 'Fabricante', 0, 350.0, 0, NULL, NULL),
  ('fc65dfcf-5be8-4191-9aa7-cb3dd5971bc7', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 8, 'Documentación', 'Gestión y Habilitación Personal', 'Retrasado', 'Baja', '2026-03-26', '2026-05-05', 'Mariate Rios', 0, 350.0, 0.8, NULL, NULL),
  ('fe0a6ed5-eff1-45b4-8ca9-454150b30ef7', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 9, 'Ejecución', 'Supervisión de Montaje', 'Retrasado', 'Crítica', '2026-05-06', '2026-05-13', 'Brandon Coronado', 0, 350.0, 0.8, NULL, NULL),
  ('267b8533-f54f-4887-88d1-cfe2ebc3b603', '8b20ff6e-86bb-469d-82d0-97ae5792aecb', 10, 'Documentación', 'Elaboración de Informe Final', 'Retrasado', 'Media', '2026-05-14', '2026-05-21', 'Brandon Coronado', 0, 350.0, 0, NULL, NULL);