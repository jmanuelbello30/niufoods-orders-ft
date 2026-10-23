# Órdenes Niu Foods (frontend)

Dashboard de órdenes conectado al backend Rails. Muestra las órdenes recibidas, contadores de total, pendientes, enviadas a tienda y con error, junto con una actualización manual.

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

Abrir `http://localhost:4200/` en el navegador. La ruta inicial consulta `GET /api/v1/orders` mediante el proxy de desarrollo de `npm.cmd start`. El proxy envía las rutas `/api` (incluidas las anidadas) al backend sin modificarlas; no configura el backend ni el build de producción.

Los contadores se calculan a partir del listado completo recibido y mantienen el orden de la respuesta. Los totales se muestran en CLP sin dividir por 100; las fechas y la hora de actualización exitosa se muestran en horario `America/Santiago`, incluidos los cambios de horario. El botón **Actualizar** hace una consulta manual sin superponer solicitudes. Una carga inicial muestra un indicador y no presenta ceros hasta obtener datos; una respuesta vacía muestra ceros y un mensaje. Ante un error inicial se puede volver a intentar; si falla una actualización, permanecen los últimos datos y su hora con un aviso.

El logo mostrado es el archivo original `public/images/niu-foods-logo.jpg`. No existe `public/images/niu-foods-logo.png` en este proyecto.

Este incremento no incluye reintentos de despacho, acciones, filtros, búsqueda, paginación, exportación, ventas acumuladas ni autenticación.

## Verificar el proxy

Con el backend y el frontend en ejecución, en otra ventana de PowerShell:

```powershell
curl.exe -i http://localhost:4200/api/v1/orders
```

Debe devolver una respuesta HTTP 200 con `data` del backend; si falla, comprobar primero `http://localhost:3000/api/v1/orders` desde Windows. Para comprobar la interfaz, abrir la página tanto en escritorio como en un viewport móvil, revisar tarjetas y desplazamiento horizontal de la tabla y pulsar **Actualizar**.

## Build y pruebas

```powershell
npm.cmd run build
npm.cmd test -- --watch=false
```
