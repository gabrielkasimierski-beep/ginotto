# Ginotto / Comilona — Panel completo (prototipo local)

Objetivo: convertir el sitio estático en un prototipo funcional tipo Carta Viva, con **backend liviano + persistencia en archivo**, que corre en localhost. Tres piezas: carta con pedido propio, panel del local (disponibilidad + pedidos), y QR. El 3D de la burga estrella se integra aparte.

## Principio
Gaby eligió "panel completo que reemplaza a fu.do": el pedido pasa a ser **propio** (carrito → comanda que el local ve en el panel). Sin pasarela de pago en el prototipo: el pago se coordina en el local / por WhatsApp. Se mantiene el link a fu.do como respaldo secundario (no como CTA principal).

## Backend (extender serve.js, o nuevo server Node sin frameworks pesados)
Persistencia en `data/state.json` (crear si no existe). Estructura:
```
{
  "store": { "abierto": true },
  "disponibilidad": { "<itemId>": true, ... },   // default true
  "pedidos": [ { "id", "nro", "items":[{"id","nombre","precio","qty"}], "total",
                "cliente", "telefono", "tipo":"retiro|delivery", "nota",
                "estado":"nuevo|preparando|listo|entregado", "ts" } ]
}
```
API JSON:
- `GET  /api/state` → { store, disponibilidad }
- `POST /api/disponibilidad` { itemId, disponible } → actualiza
- `POST /api/store` { abierto } → pausa/abre
- `GET  /api/pedidos` → lista (más nuevos primero)
- `POST /api/pedidos` { items, cliente, telefono, tipo, nota } → crea (asigna nro incremental, estado "nuevo", ts), devuelve { nro }
- `POST /api/pedidos/estado` { id, estado } → cambia estado
Escribir el JSON de forma atómica. CORS no hace falta (mismo origen). Mantener el servido estático actual.

## Los ítems del menú
Tomar la fuente de verdad de la carta que ya está en `app.js`. Cada ítem necesita un `id` estable (slug, ej. `gino-doble`, `papas-con-sazon`, `bebida-coca`). Si no existen, agregarlos. La disponibilidad se cruza por ese id.

## 1) Carta (cliente) — evolucionar la landing actual
- Al cargar, hace `GET /api/state`. Ítems marcados no disponibles: card atenuada, badge "Sin stock", botón Agregar deshabilitado. Si `store.abierto` es false: banner "Local cerrado ahora" y checkout bloqueado (se puede ver la carta).
- Cada ítem (burgas, veggie, acompañamiento, extra, bebidas, combos) suma un botón **Agregar** (+/−). Carrito flotante con contador y total.
- Checkout: panel/drawer con resumen, campos nombre, teléfono (wa), tipo retiro/delivery, nota. Botón "Enviar pedido" → `POST /api/pedidos`. Pantalla de confirmación con el número de pedido y aviso "te contactamos por WhatsApp para coordinar pago/entrega".
- El botón "PEDIR AHORA" del hero: ahora abre la carta/checkout propio. Dejar un link chico "o pedí por fu.do" → https://menu.fu.do/ginotto como respaldo.
- Mantener toda la estética de marca actual (crema/street, fotos, tipografía, acentos por categoría). El carrito y botones en la misma identidad.

## 2) Panel del local — nueva página `/panel`
- Acceso con PIN simple (hardcode para el prototipo, ej. 1234; es demo, no auth real). Guardar sesión en sessionStorage.
- **Pedidos**: lista en vivo (polling `GET /api/pedidos` cada ~5s). Cada pedido: nro, hora, ítems, total, cliente/tel, tipo, nota, y botones de estado (nuevo→preparando→listo→entregado). Alta de un pedido nuevo resalta (y opcional: un beep). Filtro por estado.
- **Disponibilidad**: grilla de todos los ítems con un toggle disponible/agotado (`POST /api/disponibilidad`). Cambios se reflejan en la carta del cliente.
- **Tienda**: switch "Abierto / Cerrado ahora" (`POST /api/store`).
- Estética de marca, pero sobria y legible (es herramienta de trabajo): fondo claro, violeta/naranja de acento, botones grandes (se usa en el local, quizá en celu/tablet).

## 3) QR — nueva página `/qr`
- Genera con una librería liviana (ej. `qrcode` por CDN) uno o más QR que apuntan a la URL de la carta. Para el prototipo usar una constante `CARTA_URL` arriba (hoy la IP/localhost; se cambia por el dominio al publicar) para no hardcodear localhost en todos lados.
- Diseño imprimible: logo Ginotto, el QR grande, texto "Escaneá y pedí", estética de marca. Botón "Imprimir" (`window.print()` con CSS print). Si es fácil, un segundo QR que apunte directo a `/panel` para el local.

## 3D (lo integra Opus aparte, dejar el gancho)
En la ficha/zona de la Gino Doble, dejar previsto un bloque para un `<model-viewer>` (visor 3D girable + botón AR). Opus proveerá `assets/gino-doble.glb`. No bloquees por esto; dejá el contenedor y un TODO.

## Verificación antes de cerrar
- `node serve.js` → localhost:8080. Probar en mobile 375px y desktop.
- Flujo cliente: agregar ítems, checkout, confirma, aparece en `/panel`.
- Panel: cambiar disponibilidad → la carta lo refleja (recargar o poll). Cambiar estados de pedido. Pausar tienda → banner en carta.
- Persistencia: reiniciar el server y que pedidos/disponibilidad sigan (están en data/state.json).
- Sin errores de consola, sin scroll horizontal en el body.
- Reportar: endpoints, páginas creadas, cómo se prueba el flujo completo, y pendientes.
