# Panel de órdenes Niu Foods

Esta es la página web para consultar las órdenes de Niu Foods. Permite iniciar sesión, ver el estado de las órdenes, abrir sus detalles y actualizar la lista. También permite volver a intentar el envío de una orden pendiente o fallida.

## Antes de empezar

Para ver órdenes reales necesitas **dos proyectos funcionando al mismo tiempo**: esta página web y el [servidor de Niu Foods](https://github.com/jmanuelbello30/niufoods-orders-bk) (el *backend*). El servidor es otro proyecto: no está incluido aquí. el usuario y contraseña autorizados para iniciar sesión se encuentran explicados en el ReadMe de backend.


**Importante: Sin el servidor, la página puede abrirse, pero no podrás iniciar sesión ni ver órdenes**.

## Abrir el proyecto en tu computadora

### 1. Instala las herramientas necesarias

Necesitas **Node.js 24** y **Git**. Node.js incluye `npm`, que se encarga de preparar lo necesario para esta página. No tienes que instalar Angular por separado. Elige **solo las instrucciones de tu sistema operativo**:

**Windows**

1. Entra en [la página de Node.js](https://nodejs.org/es/download), selecciona la versión 24 para Windows y descarga el instalador. Ábrelo y sigue las indicaciones en pantalla.
2. Entra en [la página de Git para Windows](https://git-scm.com/download/win), descarga el instalador y sigue las indicaciones en pantalla.
3. Abre PowerShell desde el menú Inicio. Si ya estaba abierto antes de instalar los programas, ciérralo y vuelve a abrirlo.

**macOS**

1. Entra en [la página de Node.js](https://nodejs.org/es/download), selecciona la versión 24 para macOS y descarga el instalador `.pkg`. Ábrelo y sigue las indicaciones en pantalla.
2. Abre la aplicación **Terminal** (puedes buscarla con Spotlight).
3. Para instalar Git, escribe el siguiente comando y pulsa Enter. Si macOS te pide instalar las herramientas de línea de comandos, acepta y espera a que termine:

   ```sh
   xcode-select --install
   ```

**Ubuntu**

Abre la aplicación **Terminal**. Ejecuta **un comando por vez** y espera a que termine antes de escribir el siguiente. Si te pide tu contraseña al usar `sudo`, escríbela y pulsa Enter: no verás los caracteres mientras escribes.

1. Actualiza la lista de programas disponibles:

   ```sh
   sudo apt update
   ```

2. Instala Git y la herramienta necesaria para descargar Node.js:

   ```sh
   sudo apt install git curl
   ```

3. Descarga las instrucciones de instalación de Node.js 24 de [NodeSource](https://github.com/nodesource/distributions):

   ```sh
   curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh
   ```

4. Prepara Ubuntu para instalar esa versión de Node.js:

   ```sh
   sudo bash nodesource_setup.sh
   ```

5. Instala Node.js (incluye `npm`):

   ```sh
   sudo apt install nodejs
   ```

Este proyecto se verificó con Node.js 24.22.1 y npm 11.19.1; no necesitas exactamente esos números.

Comprueba que Node.js quedó instalado. Escribe este comando y pulsa Enter:

```sh
node --version
```

Comprueba que `npm` quedó instalado:

```sh
npm --version
```

Comprueba que Git quedó instalado:

```sh
git --version
```

Si alguno de estos comandos no muestra un número de versión, revisa su instalación antes de continuar.

### 2. Descarga esta página web

En la terminal, escribe el siguiente comando y pulsa Enter. Se creará una carpeta llamada `niufoods-orders-ft`:

```sh
git clone https://github.com/jmanuelbello30/niufoods-orders-ft.git
```

Entra en esa carpeta con este otro comando:

```sh
cd niufoods-orders-ft
```

Si ya descargaste el proyecto, no necesitas repetir la descarga: abre una terminal dentro de su carpeta y continúa con el siguiente paso.

### 3. Descarga y prepara el servidor de Niu Foods

Abre **otra terminal**, fuera de la carpeta `niufoods-orders-ft`: necesitarás una para el servidor y otra para esta página. Por ejemplo, puedes abrir una terminal nueva desde el menú de aplicaciones. En ella, descarga el servidor:

```sh
git clone https://github.com/jmanuelbello30/niufoods-orders-bk.git
```

Entra en la carpeta recién descargada:

```sh
cd niufoods-orders-bk
```

Si ya descargaste el servidor, abre una terminal dentro de `niufoods-orders-bk` y no repitas la descarga. Sigue **paso por paso el [README del servidor](https://github.com/jmanuelbello30/niufoods-orders-bk#readme)**. Son instrucciones de otro proyecto y pueden requerir instalar programas adicionales, preparar la base de datos y crear el usuario con el que entrarás a la página.

Cuando termines, deja ese servidor funcionando en `http://localhost:3000` y mantén abierta su terminal. Si quieres comprobar un envío exitoso, consulta también en el README del servidor cómo iniciar el receptor de tienda simulada. Si el receptor está apagado, la orden se conserva, pero el envío puede marcarse como fallido.

### 4. Prepara esta página web

De vuelta en la terminal abierta **dentro de `niufoods-orders-ft`**, escribe este comando y espera a que termine. Descargará lo necesario para ejecutar la página; hazlo la primera vez y cuando cambien sus dependencias:

```sh
npm ci
```

### 5. Enciende la página

En esa misma terminal, escribe:

```sh
npm start
```

Déjala abierta mientras uses la página. Abre el navegador y visita **http://localhost:4200/**. Inicia sesión con el usuario y contraseña autorizados que te hayan facilitado.

La próxima vez, si ya preparaste ambos proyectos, solo necesitas encender primero el servidor Rails y después abrir la terminal en `niufoods-orders-ft` y ejecutar `npm start`.

## Qué puedes hacer en la página

- Consultar las órdenes y sus contadores: total, pendientes, enviadas y con error.
- Pulsar **Actualizar** para volver a consultar la lista y el icono de ojo para ver los detalles de una orden.
- Usar **Reintentar envío** en órdenes pendientes o fallidas. **Esta acción puede realizar un envío real:** úsala solo con órdenes de prueba autorizadas. Si no queda claro si el envío funcionó, pulsa **Actualizar** antes de volver a intentarlo.
- Cerrar sesión cuando termines. Si hay un problema de conexión, la página te ofrecerá volver a intentarlo o regresar al inicio de sesión.

## Si algo no funciona

- **La página abre, pero no puedes iniciar sesión o ver órdenes:** comprueba que el servidor Rails siga encendido en `http://localhost:3000` y que tienes un usuario autorizado.
- **La terminal de Windows no permite ejecutar `npm`:** si PowerShell muestra un error relacionado con `npm.ps1`, usa `npm.cmd ci` en lugar de `npm ci`, o `npm.cmd start` en lugar de `npm start`.
- **Cerraste alguna terminal:** vuelve a encender el servidor Rails siguiendo sus instrucciones y luego ejecuta `npm start` dentro de la carpeta de esta página.

## Decisiones técnicas relevantes

- **Aplicaciones independientes:** el frontend y el backend se mantienen
  en repositorios separados, con sus propias dependencias y pruebas.
  La integración se realiza mediante una API HTTP.

- **Estructura y tipado:** se utilizan componentes standalone y tipado
  estricto, sin `any` en el código propio. Los servicios centralizan las
  solicitudes HTTP, los modelos definen los contratos y los componentes
  gestionan la presentación y la interacción.

- **Estado y comunicación:** se emplean propiedades normales, Observables
  de RxJS y Zone.js, sin incorporar signals ni una biblioteca de estado global.

- **Autenticación:** el token Bearer se conserva en `sessionStorage` para
  mantener la sesión al recargar. Antes de mostrar las órdenes, la sesión
  recuperada se valida con Rails. No se almacenan contraseñas.
  Los guards controlan la navegación y el interceptor envía el token
  únicamente a la API propia; Rails valida cada solicitud protegida.

- **Interfaz:** Bootstrap y SCSS permiten mantener un diseño responsive. Al seleccionar una orden,
  El detalle utiliza un diálogo nativo para conservar el contexto del listado,
  sin agregar una biblioteca de modales.

- **Operación explícita:** el listado se actualiza manualmente y los
  despachos se reintentan por acción del usuario. Se bloquean solicitudes
  simultáneas y, ante un resultado de envío incierto, se exige consultar
  el estado antes de permitir otro intento.

- **Manejo de fallos:** si falla una actualización, se conservan los últimos
  datos disponibles. Los errores de conexión no se interpretan como
  credenciales inválidas.

- **Pruebas:** se utilizó Vitest y las herramientas de pruebas HTTP de Angular para verificar
  autenticación, navegación y operaciones de órdenes con respuestas simuladas,
  sin ejecutar envíos reales.
