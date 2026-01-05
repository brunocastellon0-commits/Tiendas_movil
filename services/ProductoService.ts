import { supabase } from "../lib/supabase";
import { Producto, Equivalencia } from "../types/Producto.interface";

export const productoService = {
    //obtiene los productos
    getProductos: async (busqueda: string = '') => {
        let query = supabase
            .from('productos')
            .select('*')
            .order('nombre_producto', { ascending: true });  //ordenamos

        if (busqueda) {
            //ilike indiferente con mayusculas o minusculas
            query = query.or(`nombre_producto.ilike.%${busqueda}%, codigo_producto.ilike.%${busqueda}%`);
        }
        const { data, error } = await query.returns<Producto[]>();

        if (error) {
            throw error;
        }
        return data || [];
    },

    //crear productos
    createProducto: async (producto: Producto, equivalencias: Equivalencia[]) => {
        // Construimos el objeto solo con los campos que existen en la BD
        const productoBase = {
            codigo_producto: producto.codigo_producto,
            nombre_producto: producto.nombre_producto,
            estado: producto.estado,
            precio_base_venta: producto.precio_base_venta,
            unidad_base_venta: producto.unidad_base_venta,
            stock_min: producto.stock_min,
            stock_max: producto.stock_max,
            stock_actual: producto.stock_actual,
            observacion: producto.observacion || null,
            extra_1: producto.extra_1 || null,
            tipo: producto.tipo || null,
            peso_bruto: producto.peso_bruto || null,
            kg_unidad: producto.kg_unidad || null,
            comision: producto.comision || null,
            comision2: producto.comision2 || null,
            activo: producto.activo,
            categoria_id: producto.id_categoria,
            proveedor_id: producto.proveedor_id || null,
            // Campos de descuentos (confirmado que existen en BD)
            descuento_volumen: producto.descuento_volumen || false,
            descuento_temporada: producto.descuento_temporada || false,
            precios_volumen: producto.precios_volumen || false,
        };

        //guardamos producto
        const { data, error } = await supabase
            .from('productos')
            .insert(productoBase)
            .select()
            .single();

        if (error) {
            console.error("Error al crear el producto", error);
            throw new Error("No se pudo guardar el producto: " + error.message);
        }
        if (!data) {
            throw new Error("Supabase no encontró el producto creado");
        }

        //EQUIVALENCIAS
        const nuevoProducto = data;
        const nuevoId = nuevoProducto.id;

        //guardar equivalencias
        if (equivalencias.length > 0) {
            //asignacion de ids
            const listaGuardar = equivalencias.map(eq => ({
                nombre_unidad: eq.nombre_unidad,
                factor_conversion: eq.conversion_factores,
                precio_mayor: eq.precio_mayor,
                producto_id: nuevoId
            }));
            const { error: errorhijos } = await supabase
                .from('equivalencias')
                .insert(listaGuardar);
            if (errorhijos) {
                console.error("Error guardando equivalencias", errorhijos);
            }
        }
        return nuevoProducto;
    },
    //obtencio de equivalencias
    getEquivalenciaProducto: async (idProducto: string) => {
        const { data, error } = await supabase
            .from('equivalencias')
            .select('*')
            .eq('producto_id', idProducto);

        if (error) throw error;
        return data || [];
    },
    //obtener producto por ID
    getProductoById: async (id: string) => {
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Producto;
    },
    //actualizar producto
    updateProducto: async (id: string, producto: Producto, equivalencias: Equivalencia[]) => {
        // Construimos el objeto de actualización
        const productoUpdate = {
            codigo_producto: producto.codigo_producto,
            nombre_producto: producto.nombre_producto,
            estado: producto.estado,
            precio_base_venta: producto.precio_base_venta,
            unidad_base_venta: producto.unidad_base_venta,
            stock_min: producto.stock_min,
            stock_max: producto.stock_max,
            stock_actual: producto.stock_actual,
            observacion: producto.observacion || null,
            extra_1: producto.extra_1 || null,
            tipo: producto.tipo || null,
            peso_bruto: producto.peso_bruto || null,
            kg_unidad: producto.kg_unidad || null,
            comision: producto.comision || null,
            comision2: producto.comision2 || null,
            activo: producto.activo,
            categoria_id: producto.id_categoria,
            proveedor_id: producto.proveedor_id || null,
            descuento_volumen: producto.descuento_volumen || false,
            descuento_temporada: producto.descuento_temporada || false,
            precios_volumen: producto.precios_volumen || false,
        };

        // Actualizar producto
        const { data, error } = await supabase
            .from('productos')
            .update(productoUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error("Error al actualizar el producto", error);
            throw new Error("No se pudo actualizar el producto: " + error.message);
        }

        // Actualizar equivalencias: borrar las viejas e insertar las nuevas
        // Primero eliminamos las equivalencias existentes
        await supabase
            .from('equivalencias')
            .delete()
            .eq('producto_id', id);

        // Guardar nuevas equivalencias
        if (equivalencias.length > 0) {
            const listaGuardar = equivalencias.map(eq => ({
                nombre_unidad: eq.nombre_unidad,
                factor_conversion: eq.conversion_factores,
                precio_mayor: eq.precio_mayor,
                producto_id: id
            }));
            const { error: errorEquiv } = await supabase
                .from('equivalencias')
                .insert(listaGuardar);
            if (errorEquiv) {
                console.error("Error guardando equivalencias", errorEquiv);
            }
        }
        return data;
    },
    //stock
    registroStock: async (idProducto: string, cantidadEntrante: number, factor: number, nuevoPrecioBase?: number) => {
        //calcular 
        const cantidadReal = cantidadEntrante * factor;
        //leemos el stock que se tiene
        const { data: ProductoActual, error: errorleer } = await supabase
            .from('productos')
            .select('stock_actual')
            .eq('id', idProducto)
            .single();

        if (errorleer) throw new Error("No se pudo leer el stock actual");

        //sumamos
        const stockActual = ProductoActual.stock_actual || 0;
        const stockFinal = stockActual + cantidadReal;
        //actualizacion en tabla
        const updates: any = { stock_actual: stockFinal };
        if (nuevoPrecioBase && nuevoPrecioBase > 0) {
            updates.precio_base_venta = nuevoPrecioBase;
        }
        //guardar cambios
        const { error: errorUpdate } = await supabase
            .from('productos')
            .update(updates)
            .eq('id', idProducto);

        if (errorUpdate) throw errorUpdate;
        return stockFinal;
    },
    //eliminar producto
    deleteProducto: async (id: string) => {
        //borrado analogico, solo se desactivo
        const { error } = await supabase
            .from('productos')
            .update({ activo: false })
            .eq('id', id);

        if (error) throw error;
    }
};