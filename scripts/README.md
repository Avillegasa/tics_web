# Scripts de Procesamiento de Datos

## Amazon Dataset Cleaner

Scripts para limpiar, normalizar e importar el dataset de productos de Amazon a la base de datos de TICS Store.

### Archivos

- `clean_amazon_dataset.js` - Limpia y normaliza el dataset original
- `import_amazon_products.js` - Importa los productos limpios a la base de datos
- `README.md` - Esta documentación

### Uso

#### 1. Limpiar Dataset

```bash
# Procesar dataset original y generar archivo limpio
node scripts/clean_amazon_dataset.js
```

**Entrada:** `datasets/amazon.csv`
**Salida:** `datasets/amazon_cleaned.csv`

**Transformaciones aplicadas:**
- Normalización de precios (remover símbolos ₹ y comas)
- Validación y limpieza de ratings (0-5)
- Normalización de categorías
- Generación de SKUs únicos (formato: AMZ-{product_id})
- Limpieza de descripciones (remover pipes, normalizar espacios)
- Extracción de imagen principal válida
- Eliminación de duplicados
- Generación de stock aleatorio (1-100)

#### 2. Importar a Base de Datos

```bash
# Importar productos limpios a PostgreSQL
node scripts/import_amazon_products.js

# Limpiar productos importados (para testing)
node scripts/import_amazon_products.js --cleanup
```

**Características:**
- Inserción en lotes de 50 productos
- Verificación de SKUs duplicados
- Transacciones seguras con rollback
- Mapeo completo a esquema de productos
- Atributos adicionales (fuente, fecha de importación)

### Esquema de Mapeo

| Campo Original | Campo DB | Transformación |
|----------------|----------|----------------|
| product_name | title | Limpieza de texto, máx 200 chars |
| about_product | description | Limpieza de texto, máx 1000 chars |
| discounted_price | price | Conversión numérica, remover ₹ |
| actual_price | sale_price | Solo si es diferente al precio |
| product_id | sku | Formato AMZ-{id} |
| category | category | Normalización de categorías |
| rating | rating | Validación 0-5 |
| rating_count | - | Se usa para validación |
| img_link | images | Array JSON con imagen principal |
| product_link | attributes | Guardado en atributos |

### Categorías Normalizadas

- `Computers&Accessories` → `Electronics`
- `Home&Kitchen` → `Home & Kitchen`
- `OfficeProducts` → `OfficeProducts`
- `MusicalInstruments` → `MusicalInstruments`
- etc.

### Estadísticas del Último Procesamiento

- **Total de líneas procesadas:** 1,466
- **Productos válidos:** 1,351
- **Líneas omitidas:** 114
- **Categorías encontradas:** 8

#### Distribución por Categorías:
- Electronics: 865 productos (64%)
- Home & Kitchen: 448 productos (33%)
- OfficeProducts: 31 productos (2%)
- Otros: 7 productos (1%)

### Validaciones Aplicadas

1. **Campos obligatorios:** nombre de producto y precio válido
2. **Precios:** mayor que 0, formato numérico
3. **Ratings:** entre 0 y 5
4. **SKUs:** únicos, formato consistente
5. **Duplicados:** eliminación por product_id
6. **URLs:** validación de imágenes de Amazon

### Estructura del CSV Limpio

```csv
sku,title,description,price,sale_price,category,rating,rating_count,stock,image_url,product_url,is_active
AMZ-B07JW9H4J1,"Wayona Nylon Braided USB...",399,1099,Electronics,4.2,24269,12,https://...,https://...,true
```

### Errores Comunes

- **Líneas omitidas:** Productos sin nombre o precio inválido
- **SKUs duplicados:** Se mantiene solo la primera ocurrencia
- **Imágenes inválidas:** URLs que no apuntan a Amazon

### Requisitos

- Node.js 18+
- PostgreSQL
- Conexión configurada en `.env`
- Dataset original en `datasets/amazon.csv`