import { supabase } from '../lib/supabase';
import { Deuda, PedidoCobranza } from '../types/Cobranza.interface';

export const reporteService = {
    async getHojaCobranza(vendedorId: string) {
        try {
            // 1. Buscamos pedidos a CRÉDITO que estén PENDIENTES
            const { data, error } = await supabase
                .from('pedidos')
                .select(`
                    id,
                    fecha_pedido,
                    numero_documento,
                    total_venta,
                    clients (
                        name,
                        address,
                        zone_name,
                        phones
                    )`)
                .eq('empleado_id', vendedorId) // Solo de este vendedor
                .eq('tipo_pago', 'Crédito')    // Solo créditos
                .neq('estado', 'Pagado')       // Que deban dinero
                .order('fecha_pedido', { ascending: true }); // Los más antiguos primero

            if (error) throw error;
            if (!data) return [];

            // 2. Procesamos los datos para calcular la mora
            const deudas: Deuda[] = data.map((item: PedidoCobranza) => {
                // Calcular días de mora
                const fechaPedido = new Date(item.fecha_pedido);
                const hoy = new Date();
                const diferenciaTiempo = Math.abs(hoy.getTime() - fechaPedido.getTime());
                const diasMora = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

                // Extraer información del cliente de forma segura
                const clienteData = item.clients && item.clients.length > 0 ? item.clients[0] : null;

                return {
                    id: item.id,
                    fecha: new Date(item.fecha_pedido).toLocaleDateString(),
                    nro_doc: item.numero_documento,
                    total: item.total_venta,
                    // Si tuvieras pagos parciales, aquí restarías lo pagado. 
                    // Por ahora asumimos que debe todo el total.
                    saldo: item.total_venta,
                    dias_mora: diasMora,
                    cliente: {
                        nombre: clienteData?.name || 'Cliente Desconocido',
                        direccion: clienteData?.address || 'Sin dirección',
                        zona: clienteData?.zone_name || 'General',
                        telefono: clienteData?.phones || ''
                    }
                };
            });

            return deudas;
        } catch (error) {
            console.error('Error obteniendo cobranza:', error);
            return [];
        }
    }
};