# 💰 Sistema de Métodos de Pago y Cobranzas

## ✅ Implementación Completada

He implementado el sistema completo de métodos de pago y cobranzas según tus requerimientos.

---

## 📋 **Funcionalidades Implementadas:**

### **1. Método de Pago en Nuevo Pedido** (`/app/pedidos/NuevoPedido.tsx`)

#### **Selector de Método de Pago:**
- ✅ **Contado** (icono de efectivo 💵)
- ✅ **Crédito** (icono de tarjeta 💳)
- UI elegante con botones que cambian de color al seleccionar

#### **Lógica de Negocio:**

**Si seleccionas "Contado":**
- ✅ `tipo_pago = 'Contado'`
- ✅ `estado = 'Pagado'` → Se marca automáticamente como vendido/pagado
- ✅ `dias_plazo = 0`
- ❌ **NO aparece** en la hoja de cobranzas

**Si seleccionas "Crédito":**
- ✅ `tipo_pago = 'Crédito'`
- ✅ `estado = 'Pendiente'` → Queda pendiente de pago
- ✅ `dias_plazo = 30` (30 días de crédito)
- ✅ **SÍ aparece** en la hoja de cobranzas de los preventistas

---

### **2. Hoja de Cobranzas** (`/app/clients/Cobranzas.tsx`)

#### **Funcionalidades:**

**Para Preventistas:**
- ✅ Ven **solo SUS cobranzas** pendientes
- ✅ Solo pedidos con `estado = 'Pendiente'`
- ✅ Filtrados automáticamente por `empleado_id`

**Para Administradores:**
- ✅ Ven **TODAS las cobranzas** pendientes
- ✅ Pueden **filtrar por vendedor** específico
- ✅ Dropdown con lista de todos los empleados activos

#### **Tabla de Cobranzas muestra:**
| Columna   | Descripción                          |
|-----------|--------------------------------------|
| Fecha     | Fecha de creación del pedido        |
| Tipo      | VD (Venta Directa)                  |
| Cliente   | Nombre del cliente                  |
| Vendedor  | Nombre del empleado/preventista     |
| Total     | Monto total del pedido              |
| Cobrado   | Monto ya cobrado (por implementar)  |
| Saldo     | Monto pendiente de cobro            |

#### **Totales al Final:**
- ✅ Suma total de todos los pedidos
- ✅ Suma de lo cobrado
- ✅ Suma de saldos pendientes

---

## 🎨 **Experiencia de Usuario:**

### **Al Crear un Pedido:**

1. Vendedor selecciona productos normalmente
2. **Antes de confirmar**, elige el método de pago:
   - Botón **"Contado"** (verde cuando está activo)
   - Botón **"Crédito"** (verde cuando está activo)
3. Agrega observaciones si es necesario
4. Confirma el pedido

### **En la Hoja de Cobranzas:**

**Preventista:**
```
┌─────────────────────────────────────────────┐
│  Reporte de Cobranzas                       │
├─────────────────────────────────────────────┤
│  [Buscar]                                   │
├─────────────────────────────────────────────┤
│  Fecha │ Cliente │ Total │ Cobrado │ Saldo │
│  ─────────────────────────────────────────  │
│  13/01 │ Juan    │ 150  │ 0       │ 150   │
│  12/01 │ María   │ 200  │ 0       │ 200   │
├─────────────────────────────────────────────┤
│  TOTAL          │ 350  │ 0       │ 350   │
└─────────────────────────────────────────────┘
```

**Administrador:**
```
┌─────────────────────────────────────────────┐
│  Reporte de Cobranzas                       │
├─────────────────────────────────────────────┤
│  Vendedor: [Todos ▼]                        │
│  [Buscar]                                   │
├─────────────────────────────────────────────┤
│  Fecha │ Cliente │ Vendedor │ Total │ Saldo│
│  ─────────────────────────────────────────  │
│  13/01 │ Juan    │ Pedro    │ 150  │ 150  │
│  13/01 │ Ana     │ Carlos   │ 300  │ 300  │
│  12/01 │ María   │ Pedro    │ 200  │ 200  │
├─────────────────────────────────────────────┤
│  TOTAL                      │ 650  │ 650  │
└─────────────────────────────────────────────┘
```

---

## 🔧 **Campos de Base de Datos Utilizados:**

### **Tabla `pedidos`:**
```sql
- tipo_pago: 'Contado' | 'Crédito'
- estado: 'Pagado' | 'Pendiente'
- dias_plazo: 0 (contado) | 30 (crédito)
- total_venta: Monto total
- empleado_id: FK al preventista
- clients_id: FK al cliente
```

---

## 📱 **Cómo Acceder:**

### **Para usar Cobranzas:**

Agrega un botón en tu menú principal (por ejemplo en el home):

```typescript
<MenuButton 
  title="Cobranzas" 
  iconLib="Material CommunityIcons" 
  icon="cash-multiple"
  color="#EAB308" 
  themeColors={colors} 
  isDark={isDark} 
  onPress={() => router.push('/clients/Cobranzas')} 
/>
```

---

## 🚀 **Flujo Completo:**

### **Escenario 1: Venta al Contado**
1. Preventista crea pedido
2. Selecciona **"Contado"**
3. Confirma
4. ✅ Pedido se marca como `Pagado`
5. ❌ **NO aparece** en cobranzas

### **Escenario 2: Venta a Crédito**
1. Preventista crea pedido
2. Selecciona **"Crédito"**
3. Confirma
4. ✅ Pedido se marca como `Pendiente`
5. ✅ **SÍ aparece** en cobranzas del preventista
6. ✅ Admin puede verlo en su reporte global

---

## 📊 **Próximas Mejoras (Opcionales):**

1. **Registrar Pagos Parciales**
   - Crear tabla `pagos` para registrar cobros
   - Actualizar campo `cobrado` dinámicamente
   - Permitir múltiples pagos parciales

2. **Alertas de Vencimiento**
   - Calcular días de vencimiento basado en `dias_plazo`
   - Mostrar pedidos vencidos en rojo
   - Notificaciones push para preventistas

3. **Exportar Reporte**
   - Generar PDF de cobranzas
   - Enviar por WhatsApp/Email

4. **Integración con Pagos Digitales**
   - QR de pago
   - Link de pago online
   - Registro automático al recibir pago

---

## ✅ **Estado Actual:**

- ✅ Selector de método de pago implementado
- ✅ Lógica de contado/crédito funcionando
- ✅ Cobranzas filtrando correctamente
- ✅ Admin puede ver todas las cobranzas
- ✅ Preventistas ven solo las suyas
- ✅ Totales calculados correctamente

**¡El sistema está listo para usar!** 🎉
