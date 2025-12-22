import { supabase } from "../lib/supabase";
import { Producto } from "../types/Producto.interface";

export const productoService = {
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
    createProducto: async (producto: Omit<Producto, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from('productos')
            .insert(producto)
            .select()
            .single(); //devuelve el producto creado

        if (error) throw error;
        return data;

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