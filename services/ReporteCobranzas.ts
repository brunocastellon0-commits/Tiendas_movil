import { supabase } from '../lib/supabase';
import { CuentaPendiente, Deuda } from '../types/Cobranza.interface';

export const reporteService = {
    /**
     * Obtiene todas las cuentas pendientes de la tabla cuentas_pendientes.
     * La vista es de sólo lectura: se muestran los créditos sin saldar,
     * sin posibilidad de registrar pagos desde la app.
     */
    async getHojaCobranza(): Promise<Deuda[]> {
        try {
            // Consultamos directamente la tabla cuentas_pendientes
            // Solo traemos filas con saldo_pendiente > 0 y ordenamos por fecha_venta
            const { data, error } = await supabase
                .from('cuentas_pendientes')
                .select(`
                    id,
                    legacy_id_venta,
                    numero_documento,
                    fecha_venta,
                    client_id,
                    nombre_cliente,
                    monto_total,
                    monto_pagado,
                    saldo_pendiente
                `)
                .gt('saldo_pendiente', 0)          // Solo cuentas con deuda real
                .order('fecha_venta', { ascending: true }); // Las más antiguas primero

            if (error) throw error;
            if (!data) return [];

            const hoy = new Date();

            const deudas: Deuda[] = (data as CuentaPendiente[]).map((item) => {
                // Calcular días de mora desde la fecha de la venta
                const fechaVenta = item.fecha_venta ? new Date(item.fecha_venta) : hoy;
                const diferenciaTiempo = Math.abs(hoy.getTime() - fechaVenta.getTime());
                const diasMora = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

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
                        telefono: '',
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
     */
    async getTotalCartera(): Promise<number> {
        try {
            const { data, error } = await supabase
                .from('cuentas_pendientes')
                .select('saldo_pendiente')
                .gt('saldo_pendiente', 0);

            if (error) throw error;
            if (!data) return 0;

            return (data as Pick<CuentaPendiente, 'saldo_pendiente'>[])
                .reduce((acc, row) => acc + (row.saldo_pendiente || 0), 0);
        } catch (error) {
            console.error('Error calculando total cartera:', error);
            return 0;
        }
    },
};