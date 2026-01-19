export interface Deuda {
    id: string;
    fecha: string;
    nro_doc: string;
    total: number;
    saldo: number;
    dias_mora: number;
    cliente: {
        nombre: string;
        direccion: string;
        zona: string;
        telefono: string;
    };
}

export interface PedidoCobranza {
    id: string;
    fecha_pedido: string;
    numero_documento: string;
    total_venta: number;
    tipo_pago?: string;  // Opcional - no siempre viene en el SELECT
    estado?: string;     // Opcional - no siempre viene en el SELECT
    clients: {
        name: string;
        address: string;
        zone_name: string;
        phones: string;
    }[] | null;  // Es un array y puede ser null
}