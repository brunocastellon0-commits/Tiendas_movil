/**
 * Representa un Cliente tal como viene de la base de datos Supabase.
 * Usado para: Listados, Detalles, Perfiles.
 */

//regla para el precio de volumen tenemos en el sistema precio por temporada, por volumen, esta funcion es para manejar ello
export interface ReglaPrecioVolumen {
    cantidad_minima: number;
    precio_unitario: number;
    descripcion: string;
}

export interface Producto {
    id: string;
    codigo_producto: string;
    nombre_producto: string;
    estado: string; //si esta vigente o no
    precio_base_venta: number;
    unidad_base_venta: string;
    observacion: string | null;
    extra_1: string | null;
    stock_min: number;
    stock_max: number
    comision: number | null;
    comision2: number | null;
    tipo: string;   //tipo de producto por ejemplo producto comercial
    precios_volumen: ReglaPrecioVolumen[] | null;
    peso_bruto: number | null;
    stock_actual: number | null;
    activo: boolean | null; //producto inahibilitado o no
    categoria_id: string | null;
    proveedor_id: string | null;

    created_at: string;
}