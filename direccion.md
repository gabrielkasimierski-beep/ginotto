# Dirección — Ginotto Burger

> Método: `motor:dirigir-sitio`. Parte de la **base original del repo** (`design-brief.md`: crema/street,
> violeta y naranja, jirafa, burgers flotando). No la reemplaza: la eleva. Estado: **borrador a aprobar**.

## 1. Concepto

**La burga se arma y se desarma sobre el papel de Ginotto.** La web ya tiene identidad (papel crema, graffiti,
jirafa); lo que le falta es *una* cosa que haga que alguien se quede mirando. Esa cosa es el plato estrella
desarmándose con el scroll, sobre el mismo papel crema con spray violeta y naranja del PDF de la carta.

## 2. Pieza firma (una sola)

**Película con scroll** (`motor:pelicula-con-scroll`): la Gino Doble gira y se desarma mientras se baja.

| | |
|---|---|
| Por qué | El producto es lo que se luce. Es el mecanismo que la tabla del motor indica para "un producto que se luce". |
| Recurso | 1 clip de ~6 s de un solo movimiento, vertical 9:16 primero (mobile primero) y 16:9 después. Se pasa a ~120 cuadros WebP. |
| Peso | 4–10 MB; llega después del botón de pedir. |
| Fondo | Papel crema con grano y spray violeta/naranja: el de la base, no uno nuevo. |
| Lo que NO es | Fondo negro, damero ni mostaza: eso es el Instagram, no la base (ver `identidad/visual.md`). |

## 3. Guion de bandas (de arriba a abajo)

| # | Banda | Qué hace | Movimiento |
|---|---|---|---|
| 1 | **Portada con película** | Título "Las mejores que vas a probar", la burga que se arma y se desarma; botón **Pedir ahora** siempre visible | **Pieza firma** (escenario fijo ~400 vh) |
| 2 | Descanso | Cinta de nombres de la carta sobre crema | Quieta |
| 3 | **Carta** (la de la base) | Burgas recortadas grandes con su color de acento, precio y Agregar | Entrada simple al scrollear |
| 4 | Combos y bebidas | Los de la base | Quieta |
| 5 | El local | Dirección, horarios, mapa, WhatsApp, Instagram | Quieta |
| 6 | Pie | Marca; sin publicitar fu.do | Quieta |

## 4. Reglas propias de este sitio

1. El botón **Pedir** responde antes de que cargue la escena (Norte 1 del Motor).
2. Si no hay película (red lenta, "reducir movimiento", error), se ve el **primer cuadro** y la página funciona igual.
3. El sistema de pedidos del repo no se toca: `data-add`, `data-item`, `data-open-checkout`, `#cart-fab`, `#drawer`.
4. Nada de datos inventados: lo que falta queda `{completar}`.
5. Una sola pieza firma: el visor 3D/AR de `assets/gino-doble.glb` **no compite** con la portada; baja a banda
   secundaria o se retira (a decidir con Gaby).

## 5. A decidir

- [ ] ¿La burga estrella es la **Gino Doble**? (es la más fotogénica y la de mayor ticket)
- [ ] ¿Se mantiene o se retira el visor 3D/AR?
- [ ] ¿Se aprueba el **humor** de los textos de las bandas? (propuestas en `docs/copy-propuestas.md` de la rama de Jules)
- [ ] Material real: ¿Gaby puede hacer un video corto real de la burga sobre una mesa? Reemplaza al generado con IA.

## 6. Estado (12-oct-2026)

Rama `motor/portada-integrada`: la portada con película ya está **dentro del `index.html` real**, reemplazando
al hero viejo; la carta, la barra de categorías y todo el sistema de pedidos quedan como en la base.
- Película: `assets/pelicula/toma-0001..0090.webp` + `poster.jpg`; kit del Motor en `kit/` (`motor-scroll.js`,
  `cuadros.js`). Sin dependencias.
- Celular: cuadros a pantalla completa. Escritorio (apaisado): película en columna derecha, texto a la izquierda.
- "Reducir movimiento": un cuadro quieto con el título y el cierre ya puestos, sin pista larga.
- El precio del cierre se lee de `menu-data.js`; no hay datos nuevos inventados.
- Probado a 390 y 1280 px con `herramientas-lab/pruebas/portada-integrada.mjs` (película, carta y pedido), sin
  errores de consola. Los cuadros son 9:16 generados con IA; no hay versión 16:9.

## 7. Cómo se construye

1. Recurso: clip 9:16 sobre crema → cuadros WebP (`herramientas/video-a-cuadros.js` del kit).
2. Maqueta **quieta** de la portada (kit: `tokens.css` con la paleta de `identidad/visual.md`).
3. Mover: `cuadros.js` + `motor-scroll.js` (`escenario`, `conScroll`, `capitulos`).
4. Revisar con `motor:revisar-sitio` y `00-Motor/control-calidad.md` a 390, 768 y 1280 px.
5. Mostrar en el laboratorio (`herramientas-lab/laboratorio.mjs`) y recién ahí pedir OK.
