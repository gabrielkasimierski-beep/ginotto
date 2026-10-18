# Reglas del negocio — Ginotto Burger

> Datos duros y límites de **este** negocio. Todo verificado con el cliente; lo que no, `{completar}`.

| | |
|---|---|
| **Horarios / zonas / condiciones públicas** | Lunes y martes: mediodía 11:30–14:30 · Miércoles a sábado: mediodía 11:30–14:30 y noche 19:30–23:00 · Domingo: solo noche 19:30–23:00. Retiro y delivery. {completar: zona y costo de delivery} |
| **Precios que se pueden publicar** | Los de `menu-data.js` (vienen de la carta en PDF del cliente). Cambiar un precio requiere el OK de Gaby. Pedidos propios y fu.do conviven: los precios tienen que coincidir. |
| **Qué NO se puede decir o prometer** | No inventar datos (años, premios, reseñas). No prometer tiempos de entrega. No publicitar fu.do al pie. {completar: reglas sanitarias o de marca que diga el cliente} |
| **Facturación / condición fiscal** | {completar} |
| **Quién aprueba del lado del cliente** | {completar: dueño o encargado de Ginotto}. Del lado del estudio: Gaby. |
| **Material que ya existe (fotos, logo, tarifas)** | Logo jirafa y carta en PDF; fotos de las burgas (fu.do, fondo negro) y sus recortes en `assets/`; modelo 3D `assets/gino-doble.glb`. Fotos y videos generados con IA en estudio oscuro en `material-previo/` (no oficiales). {completar: fotos reales del local y de las burgas} |

## Cómo se recibe un pedido hoy

El repo trae su propio sistema de pedidos (`serve.js`, `cart.js`, `panel/`, `qr/`): carrito, envío del pedido y panel
del local para cambiar estados y disponibilidad. **No se rompe**: los enganches `data-add`, `data-item`,
`data-open-checkout` y los ids `#cart-fab`, `#drawer`, `#closed-banner` se mantienen siempre.
