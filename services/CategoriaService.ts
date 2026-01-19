import { supabase } from '../lib/supabase';
import { NuevaCategoria } from '../types/Categorias.inteface';

export const crearCategoria = async (categoria: NuevaCategoria) => {
    //INSERCION
    const { data, error } = await supabase
        .from('categorias')
        .insert({
            empresa: categoria.empresa,
            nombre_categoria: categoria.nombre_categoria,
            linea: categoria.linea,
            marca: categoria.marca,
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
};
export const obtenerCategoria = async (busqueda: string = '') => {
    let query = supabase
        .from('categorias')
        .select('*')
        .order('nombre_categoria', { ascending: true });

    if (busqueda) {
        query = query.or(`nombre_categoria.ilike.%${busqueda}%,marca.ilike.%${busqueda}%,linea.ilike.%${busqueda}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

//OBTENCION DE CATEGORIA PARA EDITAR
export const getCategoriaId = async (id: string) => {
    const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

//ACTUALIZAR CATEGORIA
export const updateCategoria = async (id: string, updates: Partial<NuevaCategoria>) => {
    const { data, error } = await supabase
        .from('categorias')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

//ELIMINAR CATEGORIA
export const deleteCategoria = async (id: string) => {
    const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};
