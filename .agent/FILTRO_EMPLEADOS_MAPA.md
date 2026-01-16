# 🎯 Filtro de Empleados en el Mapa

## ✅ Funcionalidad Implementada

He agregado un **filtro dropdown para que los administradores puedan ver pedidos por empleado** en el mapa.

### 📱 **Cómo Funciona:**

#### **Para Administradores:**
1. Al abrir el mapa, verán un **nuevo botón debajo de la barra de búsqueda**
2. El botón muestra: 
   - 👥 Icono de personas
   - Texto: "Todos los empleados" (o el nombre del empleado seleccionado)
   - Flecha hacia abajo/arriba

3. **Al tocar el botón**, se despliega una lista con:
   - Opción **"Todos los empleados"** (predeterminada)
   - Lista de **todos los empleados activos**

4. **Al seleccionar un empleado:**
   - El mapa se recarga automáticamente
   - Muestra SOLO los pedidos/visitas de ese empleado
   - El botón ahora muestra el nombre del empleado seleccionado

5. **Para volver a ver todos:**
   - Toca el botón y selecciona "Todos los empleados"

#### **Para Vendedores:**
- ❌ No ven el filtro
- Siguen viendo solo sus propios datos

### 🔧 **Implementación Técnica:**

#### **1. Estados Agregados:**
```typescript
const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
const [employees, setEmployees] = useState<any[]>([]);
const [showEmployeeFilter, setShowEmployeeFilter] = useState(false);
```

#### **2. Carga de Empleados:**
```typescript
useEffect(() => {
  if (isAdmin) {
    // Cargar lista de empleados activos
    const { data } = await supabase
      .from('employees')
      .select('id, full_name, role, job_title')
      .eq('status', 'active')
      .order('full_name');
  }
}, [isAdmin]);
```

#### **3. Filtrado de Pedidos:**
```typescript
if (!isAdmin) {
  // Vendedor: solo sus pedidos
  ordersQuery = ordersQuery.eq('empleado_id', session.session.user.id);
} else {
  // Admin: si seleccionó empleado, filtrar por ese empleado
  if (selectedEmployeeId) {
    ordersQuery = ordersQuery.eq('empleado_id', selectedEmployeeId);
  }
  // Si no seleccionó, muestra TODOS
}
```

#### **4. Recarga Automática:**
```typescript
useEffect(() => {
  // Se ejecuta cuando cambia selectedEmployeeId
  // Recarga pedidos y visitas del filtro seleccionado
}, [selectedEmployeeId]);
```

### 🎨 **Diseño UI:**

**Botón del Filtro:**
- 📍 Posición: Debajo de la barra de búsqueda (top: 130px)
- 🎨 Fondo blanco con sombra elegante
- 🔵 Bordes redondeados (12px)
- ✨ Efecto de elevación (elevation: 8)

**Lista Desplegable:**
- 📋 Altura máxima: 300px (scrolleable)
- ✅ Checkmark verde en el empleado seleccionado
- 🟢 Fondo verde claro para la opción seleccionada
- 👤 Icono de persona para cada empleado
- 💼 Muestra nombre y rol del empleado

### 📊 **Flujo de Datos:**

```
Usuario Admin toca filtro
    ↓
Se despliega lista de empleados
    ↓
Selecciona un empleado
    ↓
selectedEmployeeId cambia
    ↓
useEffect detecta el cambio
    ↓
Recarga pedidos filtrados
    ↓
Mapa se actualiza con pedidos del empleado
```

### 🧪 **Cómo Probar:**

1. **Inicia sesión como Admin**
2. **Ve al tab Mapa**
3. **Deberías ver:**
   - Barra de búsqueda arriba
   - **Botón "Todos los empleados"** debajo
   - Toggle de ubicación más abajo

4. **Toca el botón del filtro**
5. **Selecciona un empleado**
6. **El mapa debería:**
   - Recargar automáticamente
   - Mostrar solo los pedidos de ese empleado
   - El botón ahora muestra el nombre del empleado

7. **Para ver todos de nuevo:**
   - Toca el filtro
   - Selecciona "Todos los empleados"

### ⚠️ **Requisitos Previos:**

Para que funcione correctamente, necesitas:

1. ✅ **Ejecutar el SQL de RLS** en Supabase:
   ```sql
   CREATE POLICY "Admins can view all visits" ON visits...
   CREATE POLICY "Admins can view all orders" ON pedidos...
   CREATE POLICY "Admins can view all employees" ON employees...
   ```

2. ✅ **Tener empleados activos** en la base de datos
3. ✅ **Pedidos con ubicación GPS** guardada

### 🐛 **Posibles Problemas:**

**Si no ves el filtro:**
- Verifica que estás logueado como admin (`role = 'Administrador'`)
- Verifica que hay empleados activos en la BD

**Si el filtro aparece vacío:**
- No hay empleados con `status = 'active'`
- Problema de permisos RLS en tabla employees

**Si al seleccionar no se filtran los pedidos:**
- Ejecuta el SQL de RLS para permitir al admin ver todos los datos
- Verifica los logs en consola para ver errores

### 📝 **Logs de Debug:**

El código imprime logs útiles:

```
👨‍💼 ADMIN: Cargando pedidos del empleado: [id]
📦 Pedidos cargados: {count: X, ...}
```

Revisa estos logs para entender qué está pasando.

---

## 🎉 **Resultado Final:**

**El administrador ahora puede:**
- 👀 Ver todos los pedidos de todos los empleados (predeterminado)
- 🎯 Filtrar por empleado específico para monitorear su actividad
- 🗺️ Analizar la distribución geográfica de pedidos por vendedor
- 📊 Tomar decisiones basadas en la ubicación y rendimiento

