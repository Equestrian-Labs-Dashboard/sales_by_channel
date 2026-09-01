# Ventas por canal — Corro & Cavali

Dashboard estático (GitHub Pages) para el reporte de ventas por canal, tal como se acordó en la reunión: tabla completa con share, Gross Sales, Net Sales y Gross Margin 1/2/3, filtrable por período.

## Estructura

```
sales-per-channel/
├── index.html
├── styles.css
├── app.js
├── data/
│   └── sales-channels.json     ← datos de muestra, reemplazar por el ETL real
└── .github/workflows/
    └── update-data.yml         ← stub para automatizar el refresh (Shopify + QBO)
```

No hay build step: es HTML/CSS/JS vanilla, igual que el dashboard de AP y el de suscripciones. Para publicarlo en GitHub Pages, sube esta carpeta a un repo y activa Pages apuntando a `main` / `root`.

## Estado del draft del viernes

- ✅ Share, Gross Sales, Net Sales, Margin 1 y Margin 2 por canal.
- ⏳ Margin 3: implementado en el esquema (`margin3_pct`, `margin3_pending`), pero marcado como "pendiente" para los canales físicos (HITS/Trailer, Wellington, Nueva York/Silo) porque todavía no hay costo de shipping que jalar de QBO para esos canales. Escalar cuando esos datos estén listos — no hay que tocar el HTML/JS, solo llenar el campo en el JSON.
- Los 8 canales están cargados en el orden de volumen que se acordó: E-Commerce, Concierge, HITS/Trailer, Wellington, Nueva York (Silo), Cavalli, Brothery, Others. La tabla siempre reordena por Gross Sales real, así que si el volumen cambia de mes a mes el orden se ajusta solo.
- Filtro de período: bloques de Q1/Q2/Q3 2026 y "Últimos 3 meses" como botones rápidos, más un rango de fechas abierto (`dateFrom`/`dateTo`) ya cableado en el HTML para conectarlo a una consulta por fecha cuando el pipeline lo soporte.
- Decisión de ubicación: quedó armado como reportecito aparte (según la alternativa que se mencionó). Si prefieren integrarlo dentro del modelo actual cerca de "Growth and Margin Engine" / "Stock Sharing", la tabla (`renderTable` en `app.js`) se puede montar como una sección más de esa página sin cambios de lógica.

## Cómo alimentar `data/sales-channels.json` con datos reales

El JSON está pensado para que el ETL solo tenga que sobrescribir el array `channels[periodo]`. Cada canal necesita:

| Campo | Fuente | Detalle |
|---|---|---|
| `gross_sales` | Shopify Admin API — `orders` | Suma de `total_price` (o `current_subtotal_price` si se excluyen impuestos) por canal/ubicación de venta, en el rango de fechas. |
| `discounts` | Shopify Admin API — `discount_applications` en cada orden | Para llegar a Net Sales = `gross_sales - discounts`. Es el punto clave para Concierge, que históricamente descuenta mucho más que Wellington. |
| `orders` | Shopify Admin API — conteo de `orders` | Volumen de órdenes por canal. |
| `margin1_pct`, `margin2_pct`, `margin3_pct` | QuickBooks Online API | COGS por clase/canal contable para Margin 1; sumar gastos operativos directos del canal para Margin 2; sumar shipping/fulfillment para Margin 3. |
| `margin3_pending` | — | `true` mientras el canal no tenga costo de shipping cargado en QBO (típicamente canales físicos). |

Esto sigue el mismo patrón que ya está en uso:
- Autenticación OAuth2 a QBO con rotación de refresh tokens → igual que en el dashboard de AP.
- Extracción de Shopify vía GitHub Actions con export/upsert → igual que en el pipeline de suscripciones (Smartrr).

`update-data.yml` es un stub con la forma del job (cron diario, checkout, run del script Python de ETL, commit del JSON actualizado). Falta:
1. El script real de extracción (`scripts/fetch_sales_by_channel.py`), que junte Shopify + QBO y escriba `data/sales-channels.json`.
2. Los secrets del repo: credenciales de Shopify y el token/refresh token de QBO (reutilizables desde el dashboard de AP si ya están guardados como secrets).

## Tema

Blanco y negro puro, con un toggle sol/luna (☀ / ☾) que cambia entre modo claro y oscuro. La preferencia se guarda en `localStorage` del navegador de quien lo mira, así que no requiere backend.
