# Órdenes Niu Foods (frontend)

Dashboard de órdenes conectado al backend Rails. Muestra las órdenes recibidas, contadores de total, pendientes, enviadas a tienda y con error, actualización manual y reintento manual de despacho.

## Requisitos

- Windows con PowerShell.
- Node.js 24.22.1 y npm 11.19.1.
- Angular CLI 21.2.28 (instalado como dependencia del proyecto).
- Backend Rails independiente en ejecución en `http://localhost:3000`, accesible desde Windows. El endpoint esperado es `GET /api/v1/orders`.

## Instalación e inicio

Desde la raíz del proyecto en PowerShell:

```powershell
npm.cmd ci
npm.cmd start
```

Abrir `http://localhost:4200/` en el navegador. Tras iniciar sesión con una cuenta autorizada, el dashboard consulta `GET /api/v1/orders` mediante el proxy de desarrollo de `npm.cmd start`. El proxy envía las rutas `/api` (incluidas las anidadas) al backend sin modificarlas; no configura el backend ni el build de producción.

El acceso requiere autenticación Bearer de Rails. La pestaña guarda solo el token y su vencimiento en `sessionStorage`; al recargar se comprueba la sesión con `/api/v1/auth/me` antes de consultar órdenes. La sesión vence a la hora indicada por Rails y no se renueva automáticamente. Cerrar sesión solicita revocar la sesión remota y siempre borra la sesión local; si la red falla, se avisa de que la revocación no pudo confirmarse. Cerrar la pestaña normalmente elimina `sessionStorage`, aunque la restauración del navegador puede conservarlo; ni cerrar la pestaña ni reiniciar Rails implica revocar la sesión guardada en PostgreSQL. `sessionStorage` no protege frente a XSS.

Los contadores se calculan a partir del listado completo recibido y mantienen el orden de la respuesta. Los totales se muestran en CLP sin dividir por 100; las fechas y la hora de actualización exitosa se muestran en horario `America/Santiago`, incluidos los cambios de horario. El botón **Actualizar** hace una consulta manual sin superponer solicitudes. Una carga inicial muestra un indicador y no presenta ceros hasta obtener datos; una respuesta vacía muestra ceros y un mensaje. Ante un error inicial se puede volver a intentar; si falla una actualización, permanecen los últimos datos y su hora con un aviso.

Una actualización manual exitosa muestra “Listado de órdenes actualizado” en verde; la carga inicial no muestra ese aviso. Los avisos de actualización fallida, despacho fallido o resultado de despacho no confirmado pueden cerrarse con la X o desaparecen tras cinco segundos con una transición suave. Ocultar un aviso de resultado no confirmado no habilita otro reintento de esa orden: primero hay que actualizar el listado con éxito.

El logo mostrado es el archivo original `public/images/niu-foods-logo.jpg`. No existe `public/images/niu-foods-logo.png` en este proyecto.

Las órdenes pendientes o con error tienen **Reintentar envío**. La acción envía `POST /api/v1/orders/:id/retry_dispatch` con cuerpo `{}`. Solo se permite un reintento en curso y se bloquean temporalmente las demás acciones. El estado de la fila y los contadores se actualizan según la respuesta, no solo por recibir HTTP 200; la hora de actualización del listado no cambia por el POST. Ante HTTP 409 se informa que la orden ya fue enviada y se vuelve a consultar el listado. Si esa sincronización falla, o si el resultado del POST no puede confirmarse, la fila conserva sus datos y queda bloqueada para otro reintento hasta consultar el listado con éxito. **Actualizar** sigue disponible después de esos errores; no hay reintentos automáticos.

Al pulsar el icono de ojo junto al número de una orden se abre un diálogo con el detalle consultado mediante `GET /api/v1/orders/:id`: cliente, productos y precios históricos y total persistido. Puede cerrarse incluso durante la carga con **Cerrar**, el botón superior o Escape; al cerrar se recuperan el foco y el desplazamiento del listado. Si falla la conexión, el diálogo ofrece **Volver a intentar** sin modificar el dashboard.

Este incremento no incluye edición ni creación de órdenes, filtros, búsqueda, paginación, rutas de detalle, actualización automática, exportación, ventas acumuladas ni autenticación.

## Estructura y convenciones

- `src/app/models/`: contratos de órdenes y restaurantes compartidos.
- `src/app/services/`: acceso HTTP y pruebas de servicios.
- `src/app/pages/orders/`: página del dashboard con plantilla, estilos y pruebas junto al componente.
- `src/app/`: componente raíz, configuración y rutas.

Las convenciones del proyecto están en `AGENTS.md` y en la skill local `.opencode/skills/angular-best-practices/SKILL.md`. El tipado estricto y las pruebas ayudan a detectar problemas, pero el build por sí solo no prohíbe `any` explícito; esta regla también requiere revisión del código.

## Verificar el proxy

Con el backend y el frontend en ejecución, en otra ventana de PowerShell:

```powershell
curl.exe -i http://localhost:4200/api/v1/orders
```

Debe devolver una respuesta HTTP 200 con `data` del backend; si falla, comprobar primero `http://localhost:3000/api/v1/orders` desde Windows. Para comprobar la interfaz, abrir la página tanto en escritorio como en un viewport móvil, revisar tarjetas y desplazamiento horizontal de la tabla y pulsar **Actualizar**.

Para comprobar el detalle sin modificar órdenes: pulsar el ojo junto a un número en el listado, revisar el contenido del diálogo y cerrarlo tanto con **Cerrar** como con Escape. Verificar en navegador que el foco regresa al ojo, que el fondo no se desplaza mientras está abierto y que el modal se adapta al móvil. El detalle también puede consultarse mediante `curl.exe -i http://localhost:3000/api/v1/orders/8` (GET solamente).

Para comprobar manualmente el reintento, usar **solo una orden de prueba autorizada** en estado pendiente o con error: pulsar **Reintentar envío** una vez y revisar el mensaje, estado y contadores. Un reintento puede despachar realmente la orden; las pruebas automatizadas usan `HttpTestingController` y no envían POST al backend. Para observar un 409 o un fallo de red sin afectar órdenes reales, usar un entorno de prueba controlado.

## Build y pruebas

```powershell
npm.cmd run build
npm.cmd test -- --watch=false
```
