import { supabase } from "../lib/supabase";
import { Zona, NuevaZona, Vendedor } from "../types/Zonas.interface";

export const zonaService = {
    //Listamos zonas 
    getZonas: async (busqueda: string = '') => {
        let query = supabase
            .from('zonas')
            .select(`*, employees:vendedor_id(id, full_name)`)
            .order('codigo_zona', { ascending: true });

        if (busqueda) {
            query = query.or(`codigo_zona.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data as Zona[];
    },
    //listar a los vendedores 
    getVendedores: async () => {
        const { data, error } = await supabase
            .from('employees')
            .select('id, full_name')
            .order('full_name', { ascending: true });

        if (error) throw error;
        return data as Vendedor[];
    },
    //obtener zonas
    getZonaById: async (id: string) => {
        const { data, error } = await supabase
            .from('zonas')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data as Zona;
    },

    createZona: async (zona: NuevaZona) => {
        const { data, error } = await supabase
            .from('zonas')
            .insert(zona)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    //editar zona
    updateZona: async (id: string, updates: Partial<NuevaZona>) => {
        const { data, error } = await supabase
            .from('zonas')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error;
        return data;
    },
    //eliminar zona
    deleteZona: async (id: string) => {
        const { error } = await supabase
            .from('zonas')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};