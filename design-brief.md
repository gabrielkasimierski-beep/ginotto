# Ginotto Burger — Brief de diseño (v1 localhost)

Cliente de **Comilona** (motor Carta Viva aplicado a marca del local). Primera versión para localhost, sin dominio todavía.

## Qué es esta web
NO reemplaza fu.do. Es la **cara de marca** que fu.do no puede ser. fu.do sigue siendo el motor de pedido; cada CTA "PEDIR" cae en `https://menu.fu.do/ginotto`. Nosotros aportamos lo que fu.do no tiene: identidad, deseo, historia, SEO, dominio propio (a futuro).

## Diagnóstico de fu.do (por qué existimos)
- **Fuerte (reusamos):** checkout que funciona (delivery/retiro, horarios, carrito, pago), fotos con apetito, responsive.
- **Débil (atacamos):** plantilla genérica idéntica a miles de locales, marca Ginotto casi ausente, publicita a fu.do al pie, no cuenta historia, sin dominio ni SEO, fotos en fondo negro peleadas con la identidad crema/street.

## Identidad de marca
- **Mascota:** jirafa con gorra violeta (logo). Es el activo más fuerte — usarla como recurso recurrente.
- **Paleta:** violeta `#4B2E83` + naranja `#F2791E` sobre **fondo papel crema** con textura. Negro para contraste puntual.
- **Gráfica:** graffiti urbano — splatter/chorreado de spray, rayos, coronas, trazo marcador. Tal cual el PDF de la carta.
- **Tipografía:** display tipo graffiti/street para títulos (emular la del logo "GINOTTO"); sans legible para cuerpo y precios.

## Dirección de arte (DECIDIDA)
**Crema/street manda.** Fondo papel crema + graffiti violeta/naranja como el PDF. A las burgers (fotos de fu.do, fondo negro) se les **saca el fondo** (remove background) y flotan sobre la marca, con sombra. Un **color de acento por plato**. Foto protagonista **grande**, no thumbnail. Jirafa rondando. Máxima identidad, se despega de fu.do.

## Estructura (one-page, mobile-first)
1. **Hero** — logo jirafa, nombre, tagline "LAS MEJORES QUE VAS A PROBAR", fondo crema + splatter, CTA grande `PEDIR AHORA` → fu.do. Botón secundario "Ver la carta".
2. **Carta visual** por categorías: Burgas · Veggie · Nuggets · Acompañamiento · Extra · Combos · Bebidas. Cada burger con foto recortada grande + nombre + ingredientes + precio + color de acento.
3. **Botón flotante fijo** "Pedí acá 🍔" siempre visible (clave en celu) → fu.do.
4. **El local** — dirección + mapa embebido, horarios, WhatsApp, Instagram.
5. **Footer** de marca (sin publicitar a fu.do).

## Datos del local (verificados en fu.do)
- Dirección: **Av. Monroe 3582**, CABA (Villa Urquiza)
- Horarios: Lun–Sáb mediodía 11:30–14:30 · Mié–Dom noche 19:30–23:00 (Dom solo noche, Lun solo mediodía)
- WhatsApp: **11 7887 2874**
- Mail: ginottoburger@gmail.com
- Instagram + WhatsApp linkeados en fu.do (extraer URLs reales del sitio)

## Carta completa con precios

### Burgas
- Cheeseburger Simple — Carne, cheddar, ketchup, mostaza, cebolla y pepinillos — **$13.000**
- Cheeseburger Doble — Doble carne, cheddar, ketchup, mostaza, cebolla y pepinillos — **$16.000**
- Gino Simple — Carne, cheddar, bacon y salsa Gino — **$15.000**
- Gino Doble — Doble carne, cheddar, bacon y salsa Gino — **$18.000**
- Otto Simple — Carne, cheddar, lechuga, tomate y salsa Gino — **$13.000**
- Otto Doble — Doble carne, cheddar, lechuga, tomate y salsa Gino — **$16.000**

### Veggie
- Otto Veggie — Medallón NotBurger, cheddar, lechuga, tomate y salsa Gino — **$16.000**
- Cheese Veggie — Medallón NotBurger, cheddar, ketchup, mostaza, cebolla y pepinillos — **$16.000**

### Nuggets
- Nuggets x6 con salsita — **$6.500**

### Acompañamientos
- Papas Fritas — **$5.000**
- Aros de Cebolla — **$6.000**

### Extra
- Carne con cheddar — **$4.500**

### Bebidas
- Línea Coca Cola — **$4.000**
- Agua 500 ml — **$3.500**
- Lata Cerveza — **$6.000**

### Combos (todos incluyen papas + gaseosa)
- #1 Cheeseburger simple — **$20.500**
- #2 Cheeseburger doble — **$23.500**
- #3 Gino simple — **$22.500**
- #4 Gino Doble — **$25.500**
- #5 Otto simple — **$20.500**
- #6 Otto Doble — **$23.500**
- **COMBO GINOTTO** — Cheeseburger Simple + Gino Simple + Otto Simple + papas + bebida — **$38.000**

## Notas
- Typo del PDF "CHEESEBURGUER" → se escribe correcto **CHEESEBURGER** en la web (el estilo está en la tipografía, no en el error).
- Stack: HTML/CSS/JS estático, mobile-first, corre en localhost. Sin build pesado.
- Assets a conseguir: fotos de burgers desde fu.do (recortar fondo), logo jirafa (desde fu.do/PDF en alta).
