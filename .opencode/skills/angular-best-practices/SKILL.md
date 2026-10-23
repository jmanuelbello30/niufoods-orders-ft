---
name: angular-best-practices
description: Aplicar al crear, modificar, refactorizar o revisar código Angular de este frontend, incluyendo componentes, servicios, modelos, plantillas y pruebas.
---

# Buenas prácticas Angular del frontend

## Tipado
- No usar `any` explícito ni implícito en código propio o pruebas; tampoco `as any`, `$any()`, `@ts-ignore` ni `@ts-nocheck`.
- Usar `unknown` para valores desconocidos y acotarlos antes de utilizarlos. Definir interfaces o tipos concretos para contratos HTTP, estados, parámetros, respuestas y datos compartidos; usar uniones literales para valores limitados.
- Evitar aserciones de tipo y non-null assertions que oculten problemas. Permitir inferencia clara sin anotar cada variable.
- Mantener `strict`, `noImplicitAny` y `strictTemplates` activados: `noImplicitAny` no impide el `any` explícito. No debilitar configuración o pruebas para hacer pasar verificaciones ni modificar tipos de dependencias de terceros.

## Organización
- Centralizar servicios en `src/app/services/` e interfaces y tipos compartidos en `src/app/models/`.
- Ubicar páginas en `src/app/pages/<page-name>/` y componentes reutilizables en `src/app/components/<component-name>/` solo ante reutilización real o responsabilidad independiente.
- Mantener juntos TypeScript, HTML y SCSS de cada componente, y las pruebas junto al archivo probado. No crear carpetas vacías ni ejemplos innecesarios.
- No declarar contratos compartidos en componentes; permitir tipos estrictamente locales de presentación en su archivo. No crear barrels `index.ts` ni alias nuevos sin necesidad.

## Responsabilidades
- Cada componente inyecta los servicios que necesita. `HttpClient` y endpoints pertenecen a servicios, nunca a componentes; los servicios no manipulan DOM, estilos ni plantillas.
- Los componentes gestionan presentación, eventos y estado de interfaz. No trasladar por defecto todo el estado de pantalla a un servicio ni crear un servicio por componente o servicios base genéricos.
- Mantener transformaciones y reglas fuera de plantillas complejas; evitar abstracciones para usos hipotéticos.

## Angular y RxJS
- Mantener Angular 21, componentes standalone, Zone.js y Bootstrap; usar propiedades normales y Observables, sin signals ni NgModules.
- Evitar suscripciones anidadas; gestionar cancelación y limpieza cuando corresponda. Usar `finalize` cuando sea adecuado para restablecer estados de carga.
- Evitar solicitudes simultáneas o duplicadas no intencionadas. No ocultar errores HTTP como listas vacías. No agregar stores, dependencias ni estrategias de detección de cambios en este refactor.

## Interfaz y dominio
- Conservar diseño aprobado, accesibilidad y responsive. Mantener CLP sin dividir por 100 y fechas en `America/Santiago`.
- Usar errores comprensibles y no insertar contenido externo mediante HTML inseguro. Código en inglés; interfaz y documentación en español.

## Flujo
- Implementar solo el incremento solicitado. Revisar el diff y ejecutar build y pruebas relevantes.
- No hacer commits, push, cambios destructivos ni modificaciones al backend. Informar verificaciones realizadas y limitaciones reales.
