export interface Categorias {
    id: string;
    empresa: string;
    nombre_categoria: string;
    linea: string;
    marca: string;
    created_at?: string;
}

export interface NuevaCategoria {
    empresa: string;
    nombre_categoria: string;
    linea: string;
    marca: string;
}
