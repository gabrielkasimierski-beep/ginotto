# QA — Ginotto Burger (rama `motor/portada-integrada`)

> Control de calidad del Motor (`00-Motor/control-calidad.md`) medido sobre el sitio local a 390 px, con
> `herramientas-lab/pruebas/control-calidad.mjs` (y `portada-integrada.mjs` para película, carta y pedido).
> Fecha: 12-oct-2026. ✅ cumple · ⚠️ cumple a medias o depende de otra persona · ❌ falta.

## 1. Contenido
- ✅ Un solo `h1`, dice qué es y dónde: "Las mejores que vas a probar · Hamburguesería · Villa Urquiza".
- ✅ Cero datos inventados: precios de `menu-data.js` (el del cierre se lee de ahí), teléfono, horarios y
  dirección de la propia página/brief. Los hechos de JSON-LD son esos mismos.
- ⚠️ `{completar}`: dominio real del sitio (para `og:image`, `og:url`, `sitemap.xml`); fotos reales del local.
- ⚠️ Humor de los textos de las bandas: propuestas en `docs/copy-propuestas.md` (rama de Jules), sin aprobar.

## 2. Que funcione
- ✅ Cero enlaces a `#` y cero anclas rotas. Cero errores de consola en celu, tablet, cuadrada, escritorio y
  "reducir movimiento".
- ✅ Pedido de punta a punta: agregar → botón "Ver pedido" con total → cajón. (No se envía un pedido real en
  las pruebas.)
- ⚠️ WhatsApp: el botón abre `wa.me/541178872874` sin mensaje prellenado.
- ❌ Formulario sin honeypot anti-spam (el pedido propio no lo tiene). Pendiente con Gaby.

## 3. Mobile (390 px)
- ✅ Sin scroll horizontal. Tablet 768 y escritorio 1280 revisados, más una ventana casi cuadrada.
- ✅ Tocables ≥ 44 px: barra de categorías, "Agregar" (también en listas), enlace de fu.do, pie.
- ⚠️ Texto menor a 16 px: solo la letra chica del pie (©). Es letra legal; se deja.

## 4. Velocidad
- ✅ Ninguna imagen individual pesa más de 300 KB; todas con `width`/`height`; 22 de 27 con `loading="lazy"`.
- ✅ El visor 3D (≈ 1,2 MB entre librería y modelo) ya no carga al abrir: se pide al acercarse a la sección.
  Antes bajaba siempre. Librería con versión fija (`model-viewer@4.4.0`), no `latest`.
- ✅ Película con dos versiones: la completa (90 cuadros, ≈ 6 MB, ≈ 230 MB decodificada) y una **liviana**
  (45 cuadros de 432 px, ≈ 1,9 MB, ≈ 60 MB decodificada) que se elige sola con ahorro de datos, conexión
  2G/3G o equipo de 2 GB de RAM o menos (`?liviana` la fuerza). Con la liviana la home queda en ≈ 4,8 MB, de los
  cuales ≈ 2,9 MB son la carta y el resto de la página.
- ⚠️ Presupuesto de 2 MB de la home: en la versión completa lo excede la pieza firma, no la página. Safari no
  expone ahorro de datos ni RAM, así que los iPhone usan siempre la completa (se espera que aguanten; sin
  probar en aparato real).
- ✅ Tipografías con `display=swap`.

## 5. SEO
- ✅ `title`, `description` (128 car.), `lang="es-AR"`, `og:*` básicos, JSON-LD `Restaurant` con dirección,
  teléfono y horarios de la página. Todas las imágenes con `alt`.
- ⚠️ `og:image`, `og:url`, `canonical` y `sitemap.xml` esperan el dominio real ({completar}).
- ⚠️ `robots.txt` y página 404 propia: no están (los resuelve el hosting; a definir con Gaby).

## 6. Accesibilidad
- ✅ `prefers-reduced-motion`: la portada queda en un cuadro quieto con el título y el botón ya puestos.
- ✅ El cierre invisible no entra en el orden de tabulación. Botones con texto o `aria-label`.
- Contraste (calculado con la fórmula WCAG, no a ojo; AA pide 4,5:1 en texto normal y 3:1 en texto grande):
  - ✅ Violeta `#4B2E83` sobre crema `#F6EBD3`: 8,8:1. Tinta `#1d1428` sobre crema: 14,6:1.
  - ✅ Acento de los textos de la película (`#A84A06` sobre `#FBF3E1`): 5,2:1 (se oscureció del naranja de marca).
  - ❌ Blanco sobre naranja de marca `#F2791E` (botones "Pedir", "Agregar"): 2,8:1. Es la marca de la base; se
    sostiene con letra grande y contorno oscuro, pero no llega a AA. **Decisión de Gaby**: oscurecer el naranja
    de los botones (≈ `#BF5409` da 4,7:1) o aceptarlo.
  - ❌ Naranja `#F2791E` sobre crema como color de texto: 2,4:1. Solo se usa en títulos grandes con sombra oscura.

## 7. Legal y cierre
- ⚠️ Aviso de privacidad del formulario de pedido (Ley 25.326): hace falta el texto del cliente.
- ⚠️ Analítica: no instalada (pendiente de cuenta).
- ✅ Favicon puesto.
