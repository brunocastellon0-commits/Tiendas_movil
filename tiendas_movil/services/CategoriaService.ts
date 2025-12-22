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
export const obtenerCategoria = async () => {
    const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nombre_categoria', { ascending: true });

    if (error) {
        throw error;
    }
    return data;
};