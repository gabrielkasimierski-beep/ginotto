# Ginotto Burger

> Proyecto de cliente del **Motor Cliente nuevo**. Creado el 2026-10-12.
> **Esta carpeta es la identidad de Ginotto Burger.** Nada de lo que hay acá se usa en otro cliente,
> y nada de otro cliente se usa acá. Los permisos de este proyecto lo bloquean.

## El Motor (método, skills y reglas compartidas)

@C:/Claude/Motor/MOTOR.md

## Quién es

- **Rubro:** Gastronomía (hamburguesería), Villa Urquiza, CABA
- **Estado del proyecto:** en mejora. Ya tiene web propia con carta y pedidos (el repo); se **parte de esa base**
  (`design-brief.md`: crema/street, violeta y naranja, jirafa) y se mejora con el Motor.
- **Qué hace / a quién le vende / cómo capta hoy:** ver `identidad/marca.md`
- **Contacto del lado del cliente (quién decide):** {completar}
- **Repo del cliente:** `github.com/gabrielkasimierski-beep/ginotto` (rama `master` = la base original; el
  trabajo va en ramas y Pull Request, nunca directo a `master`).
- **Cómo se levanta:** `node serve.js` → http://localhost:8080 (carta, pedidos, `panel/`, `qr/`).

## Su identidad (siempre cargada)

@identidad/marca.md
@identidad/voz.md
@identidad/visual.md
@identidad/reglas-del-negocio.md

## Cómo se trabaja acá

- Se arranca con la skill `cliente-nuevo` (*"tengo un cliente nuevo"*): deja `analisis.md` y propone
  el **primer prototipo** para mostrar. Después se profundiza.
- Los archivos del cliente viven en la **raíz de esta carpeta**: `analisis.md`, `brief.md`,
  `propuesta.md`, `decisiones.md`, `sitio/` o `app/`, `qa.md`, `entrega.md`.
- Los tokens y accesos **de este cliente** van en `.env` (no se sube a git y nunca se escribe en un
  `.md` ni en el chat). Los del estudio están inventariados en `C:/Claude/Motor/04-Accesos/`.
- Si de este trabajo sale un aprendizaje que le sirva a otros clientes, va al Motor
  (`C:/Claude/Motor/01-Capacidades/`) **sin datos de este cliente**.
