//ESTRUCTURA DE VENDEDOR OBTENIDA DE EMPLEADOS
export interface Vendedor {
    id: string;
    full_name: string;
}

export interface Zona {
    id: string;
    created_at: string;
    codigo_zona: string;
    descripcion?: string;
    territorio?: string;
    estado: string;
    color_marcador?: string;
    vendedor_id: string;

    //para el inner join
    employees?: Vendedor;
}

export type NuevaZona = Omit<Zona, 'id' | 'created_at' | 'employees'>;