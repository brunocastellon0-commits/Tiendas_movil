import { supabase } from '../lib/supabase';
import { CuentaPendiente, Deuda } from '../types/Cobranza.interface';

export const reporteService = {
    /**
     * Obtiene todas las cuentas pendientes de la tabla cuentas_pendientes.
     *
     * La columna empleado_id en cuentas_pendientes puede ser NULL porque la
     * sincronización desde SQL Server no la popula. En ese caso filtramos las
     * cobranzas del vendedor a través de la cadena:
     *   cuentas_pendientes.client_id → clients → zones.vendedor_id = empleadoId
     *
     * Para admin: devuelve todas las cuentas sin filtro.
     */
    async getHojaCobranza(empleadoId?: string, isAdmin?: boolean): Promise<Deuda[]> {
        try {
            // ── Paso 1: si es vendedor, obtener los client_ids de sus zonas ──
            let clientIdFilter: string[] | null = null;

            if (!isAdmin && empleadoId) {
                // Opción A: hay registros con empleado_id → usarlo directamente
                // Opción B: empleado_id es NULL → filtrar por clientes de sus zonas
                // Intentamos primero si hay algún registro con su empleado_id
                const { data: withEmpId } = await supabase
                    .from('cuentas_pendientes')
                    .select('id')
                    .eq('empleado_id', empleadoId)
                    .gt('saldo_pendiente', 0)
                    .limit(1);

                if (!withEmpId || withEmpId.length === 0) {
                    // NO hay registros con ese empleado_id → fallback por zonas
                    const { data: zonas } = await supabase
                        .from('zones')
                        .select('id')
                        .eq('vendedor_id', empleadoId);

                    if (zonas && zonas.length > 0) {
                        const zonaIds = zonas.map((z: any) => z.id);

                        // Obtener los client_ids cuya zona_name (campo text) pertenece a esas zonas
                        // La tabla clients tiene zone_name (texto) — hacemos join por código de zona
                        const { data: clientsEnZona } = await supabase
                            .from('clients')
                            .select('id, zone_name')
                            .in('zone_name', zonaIds)  // intentar con id de zona primero
                            .eq('status', 'Vigente');

                        if (clientsEnZona && clientsEnZona.length > 0) {
                            clientIdFilter = clientsEnZona.map((c: any) => c.id);
                        } else {
                            // En muchos esquemas zone_name es el código texto, no el UUID
                            // Buscar zonas por código y luego clientes que tengan ese zone_name
                            const { data: zonasConCodigo } = await supabase
                                .from('zones')
                                .select('id, codigo_zona, name')
                                .eq('vendedor_id', empleadoId);

                            if (zonasConCodigo && zonasConCodigo.length > 0) {
                                const codigos = zonasConCodigo.flatMap((z: any) =>
                                    [z.codigo_zona, z.name, z.id].filter(Boolean)
                                );

                                const { data: clientsPorCodigo } = await supabase
                                    .from('clients')
                                    .select('id')
                                    .in('zone_name', codigos)
                                    .eq('status', 'Vigente');

                                if (clientsPorCodigo && clientsPorCodigo.length > 0) {
                                    clientIdFilter = clientsPorCodigo.map((c: any) => c.id);
                                }
                            }
                        }
                    }
                }
            }

            // ── Paso 2: construir la query de cuentas_pendientes ──
            let query = supabase
                .from('cuentas_pendientes')
                .select(`
                    id,
                    legacy_id_venta,
                    numero_documento,
                    fecha_venta,
                    client_id,
                    empleado_id,
                    nombre_cliente,
                    monto_total,
                    monto_pagado,
                    saldo_pendiente,
                    clients:client_id (
                        name,
                        business_name,
                        tax_id,
                        address,
                        phones,
                        code,
                        credit_days
                    )
                `)
                .gt('saldo_pendiente', 0)
                .order('fecha_venta', { ascending: true });

            if (!isAdmin && empleadoId) {
                if (clientIdFilter !== null) {
                    // Fallback: filtrar por clientes de las zonas del vendedor
                    if (clientIdFilter.length === 0) {
                        // El vendedor no tiene zonas con clientes → lista vacía
                        return [];
                    }
                    query = query.in('client_id', clientIdFilter);
                } else {
                    // Hay registros con empleado_id válido → filtrar directamente
                    query = query.eq('empleado_id', empleadoId);
                }
            }

            const { data, error } = await query;

            if (error) throw error;
            if (!data) return [];

            const hoy = new Date();

            const deudas: Deuda[] = (data as any[]).map((item) => {
                // El join nos puede traer un arreglo o un objeto según Supabase, normalizamos
                const clientData = Array.isArray(item.clients) ? item.clients[0] : item.clients;

                const fechaVenta = item.fecha_venta ? new Date(item.fecha_venta) : hoy;

                // Calcular días de mora considerando los días de crédito del cliente
                const creditDays = clientData?.credit_days || 0;
                // Fecha de vencimiento real = fecha venta + dias de crédito
                const fechaVencimiento = new Date(fechaVenta);
                fechaVencimiento.setDate(fechaVencimiento.getDate() + creditDays);

                let diasMora = 0;
                if (hoy > fechaVencimiento) {
                    const diffTime = Math.abs(hoy.getTime() - fechaVencimiento.getTime());
                    diasMora = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                // Determinamos la Razón Social: primero 'business_name', luego 'tax_id', si no 'nombre_cliente'
                const razonSocial = clientData?.business_name || clientData?.tax_id || item.nombre_cliente || 'Sin Razón Social';

                return {
                    id: item.id,
                    fecha: fechaVenta.toLocaleDateString('es-BO'),
                    nro_doc: item.numero_documento || `#${item.legacy_id_venta}`,
                    monto_total: item.monto_total,
                    monto_pagado: item.monto_pagado,
                    saldo: item.saldo_pendiente,
                    dias_mora: diasMora,
                    cliente: {
                        nombre: item.nombre_cliente || 'Cliente Desconocido',
                        codigo: clientData?.code || 'Sin código',
                        razon_social: razonSocial,
                        direccion: clientData?.address || 'Sin dirección',
                        telefono: clientData?.phones || 'Sin teléfono',
                    },
                };
            });

            return deudas;
        } catch (error) {
            console.error('Error obteniendo cobranza desde cuentas_pendientes:', error);
            return [];
        }
    },

    /**
     * Calcula el total de cartera (suma de todos los saldos pendientes).
     * Usa la misma lógica de fallback por zonas cuando empleado_id es NULL.
     */
    async getTotalCartera(empleadoId?: string, isAdmin?: boolean): Promise<number> {
        try {
            const deudas = await this.getHojaCobranza(empleadoId, isAdmin);
            return deudas.reduce((acc, d) => acc + (d.saldo || 0), 0);
        } catch (error) {
            console.error('Error calculando total cartera:', error);
            return 0;
        }
    },
};