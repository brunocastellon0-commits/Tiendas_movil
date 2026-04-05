// Representa una fila de la tabla cuentas_pendientes en Supabase
export interface CuentaPendiente {
    id: string;
    legacy_id_venta: number;
    numero_documento: string | null;
    fecha_venta: string | null;
    client_id: string | null;
    nombre_cliente: string | null;
    monto_total: number;
    monto_pagado: number;
    saldo_pendiente: number;
    created_at: string;
    updated_at: string;
}

// Interfaz de presentación usada en la vista HojaCobranza
export interface Deuda {
    id: string;
    fecha: string;
    nro_doc: string;
    monto_total: number;
    monto_pagado: number;
    saldo: number;
    dias_mora: number;
    cliente: {
        nombre: string;
        telefono: string;
    };
}

// Mantener compatibilidad con código existente
export interface PedidoCobranza {
    id: string;
    fecha_pedido: string;
    numero_documento: string;
    total_venta: number;
    tipo_pago?: string;
    estado?: string;
    clients: {
        name: string;
        address: string;
        zone_name: string;
        phones: string;
    }[] | null;
}