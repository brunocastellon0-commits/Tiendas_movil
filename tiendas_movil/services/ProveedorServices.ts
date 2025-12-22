import { supabase } from "../lib/supabase";
import { Proveedor } from "../types/Proveedores.interface";

export const proveedorService = {
    //lista de proveedores
    getProveedores: async (busqueda: string = '') => {
        let query = supabase
            .from('proveedores') //tabla
            .select('*') //columnas
            .order('nombre', { ascending: true }) //ordena

        if (busqueda) {
            query = query.or(`nombre.ilike.%${busqueda}%, 'razon_social.ilike.%${busqueda}%`);
        }

        const { data, error } = await query;
        if (error) {
            throw error;
        }
        return data || [];
    },
    //obtener proveedor por id
    getProveedorById: async (id: string) => {
        const { data, error } = await supabase
            .from('proveedores')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }
        return data;
    },
    //crear proveedor
    createProveedor: async (proveedor: Omit<Proveedor, 'id' | 'created_At'>) => {
        const { data, error } = await supabase
            .from('proveedores')
            .insert(proveedor)
            .select()
            .single();

        if (error) {
            throw error;
        }
        return data;
    },
    //actualizar proveedor
    updateProveedor: async (id: string, updates: Partial<Proveedor>) => {
        const { data, error } = await supabase
            .from('proveedores')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }
        return data;
    },
    //eliminar proveedor
    deleteProveedor: async (id: string) => {
        const { data, error } = await supabase
            .from('proveedores')
            .update({ estado: 'Inactivo' })
            .eq('id', id);

        if (error) {
            throw error;
        }
        return true;
    }
};