/**
 * Representa un Cliente tal como viene de la base de datos Supabase.
 * Usado para: Listados, Detalles, Perfiles.
 */
//interface para equivalencias
export interface Equivalencia {
    id: string;
    nombre_unidad: string;
    conversion_factores: number;
    precio_mayor: number;
    id_producto: string;

}
export interface Producto {
    id: string;
    codigo_producto: string;
    nombre_producto: string;
    estado: string; //si esta vigente o no
    precio_base_venta: number;
    unidad_base_venta: string;

    //inventario
    stock_min: number;
    stock_max: number;
    stock_actual: number;

    //datos 
    observacion?: string;
    extra_1?: string;
    tipo?: string;
    peso_bruto?: number;
    kg_unidad?: number; //falta
    comision?: number;
    comision2?: number;
    activo: boolean;

    //descuentos
    descuento_volumen?: boolean;
    descuento_temporada?: boolean;
    precios_volumen?: boolean;

    //foreign keys
    id_categoria: string;
    proveedor_id: string;

}
