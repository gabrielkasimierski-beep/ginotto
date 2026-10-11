// Fuente de verdad de la carta (compartida por la carta, el panel y el carrito).
// Cada ítem tiene un id estable (slug): la disponibilidad se cruza por ese id.
const burgas = [
  { id: 'cheeseburger-simple', n: 'Cheeseburger Simple', d: 'Carne, cheddar, ketchup, mostaza, cebolla y pepinillos', p: 13000, img: 'cheese-simple-cream.webp', c: '#F2791E' },
  { id: 'cheeseburger-doble', n: 'Cheeseburger Doble', d: 'Doble carne, cheddar, ketchup, mostaza, cebolla y pepinillos', p: 16000, img: 'cheese-doble-cream.webp', c: '#F2791E' },
  { id: 'gino-simple', n: 'Gino Simple', d: 'Carne, cheddar, bacon Sugardale y aderezo Gino', p: 15000, img: 'gino-simple-cream.webp', c: '#4B2E83' },
  { id: 'gino-doble', n: 'Gino Doble', d: 'Doble carne, cheddar, bacon Sugardale y aderezo Gino', p: 18000, img: 'gino-doble-cream.webp', c: '#4B2E83' },
  { id: 'otto-simple', n: 'Otto Simple', d: 'Carne, cheddar, lechuga, tomate y aderezo Gino', p: 13000, img: 'otto-simple-cream.webp', c: '#2F9E5B' },
  { id: 'otto-doble', n: 'Otto Doble', d: 'Doble carne, cheddar, lechuga, tomate y aderezo Gino', p: 16000, img: 'otto-doble-cream.webp', c: '#2F9E5B' }
];
const veggie = [
  { id: 'otto-veggie', n: 'Otto Veggie', d: 'Medallón veggie, cheddar, lechuga, tomate, cebolla y aderezo Gino', p: 16000, img: 'otto-veggie-cream.webp', c: '#2F9E5B' },
  { id: 'cheese-veggie', n: 'Cheese Veggie', d: 'Medallón veggie, cheddar, ketchup, mostaza, cebolla y pepinillos', p: 16000, img: 'cheese-veggie-cream.webp', c: '#F2791E' }
];
const acomp = [
  { id: 'papas-con-sazon', n: 'Papas Fritas con sazón', p: 5000 },
  { id: 'papas-sin-sazon', n: 'Papas Fritas sin sazón', p: 5000 },
  { id: 'aros-con-sazon', n: 'Aros de cebolla con sazón', p: 6000 },
  { id: 'aros-sin-sazon', n: 'Aros de cebolla sin sazón', p: 6000 },
  { id: 'nuggets-x6', n: 'Nuggets x6', p: 6500 }
];
const extras = [{ id: 'extra-carne-cheddar', n: 'Carne con cheddar', p: 4500 }];
const combos = [
  { id: 'combo-cheeseburger-simple', n: 'Cheeseburger Simple', d: 'Cheeseburger Simple + papas + gaseosa', p: 20500, img: 'combo-cheese-simple-cream.webp', c: '#F2791E' },
  { id: 'combo-cheeseburger-doble', n: 'Cheeseburger Doble', d: 'Cheeseburger Doble + papas + gaseosa', p: 23500, img: 'combo-cheese-doble-cream.webp', c: '#F2791E' },
  { id: 'combo-gino-simple', n: 'Gino Simple', d: 'Gino Simple + papas + gaseosa', p: 22500, img: 'combo-gino-simple-cream.webp', c: '#4B2E83' },
  { id: 'combo-gino-doble', n: 'Gino Doble', d: 'Gino Doble + papas + gaseosa', p: 25500, img: 'combo-gino-doble-cream.webp', c: '#4B2E83' },
  { id: 'combo-otto-simple', n: 'Otto Simple', d: 'Otto Simple + papas + gaseosa', p: 20500, img: 'combo-otto-simple-cream.webp', c: '#2F9E5B' },
  { id: 'combo-otto-doble', n: 'Otto Doble', d: 'Otto Doble + papas + gaseosa', p: 23500, img: 'combo-otto-doble-cream.webp', c: '#2F9E5B' },
  { id: 'combo-ginotto', n: 'Combo GINOTTO', d: 'Una Cheese simple + una Gino simple + una Otto simple + papas + bebida', p: 38000, img: 'combo-cream.webp', c: '#4B2E83' }
];
const bebidas = [
  { id: 'bebida-coca', n: 'Coca-Cola', d: '375 cm³', p: 4000, img: 'bebida-cola-cream.webp', c: '#D62828' },
  { id: 'bebida-coca-zero', n: 'Coca-Cola Zero', d: '375 cm³', p: 4000, img: 'bebida-cola-cream.webp', c: '#1d1428' },
  { id: 'bebida-sprite', n: 'Sprite', d: '375 cm³', p: 4000, img: 'bebida-lima-cream.webp', c: '#2F9E5B' },
  { id: 'bebida-agua', n: 'Agua Mineral', d: '500 cm³', p: 3500, img: 'bebida-agua-cream.webp', c: '#2A7DE1' },
  { id: 'bebida-agua-gas', n: 'Agua mineral con gas', d: '', p: 3500, img: 'bebida-agua-gas-cream.webp', c: '#2A7DE1' },
  { id: 'bebida-cerveza', n: 'Cerveza', d: '', p: 6000, img: 'bebida-cerveza-cream.webp', c: '#F2A91E' }
];
// Lista plana para carrito y panel. nombre = lo que ve el local en la comanda.
const MENU = [].concat(
  burgas.map(i => ({ id: i.id, nombre: i.n, precio: i.p, cat: 'Burgas' })),
  veggie.map(i => ({ id: i.id, nombre: i.n, precio: i.p, cat: 'Veggie' })),
  acomp.map(i => ({ id: i.id, nombre: i.n, precio: i.p, cat: 'Acompañamiento' })),
  extras.map(i => ({ id: i.id, nombre: i.n, precio: i.p, cat: 'Extra' })),
  combos.map(i => ({ id: i.id, nombre: i.id === 'combo-ginotto' ? i.n : 'Combo ' + i.n, precio: i.p, cat: 'Combos' })),
  bebidas.map(i => ({ id: i.id, nombre: i.n, precio: i.p, cat: 'Bebidas' }))
);
