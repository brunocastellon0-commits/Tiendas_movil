export interface CatalogoPDF {
    id: string;
    titulo: string;
    archivo_url: string;       // URL pública del PDF o link externo
    storage_path: string;      // Ruta en el bucket (vacío si es link externo)
    activo: boolean;           // Solo los activos son visibles para vendedores
    created_at: string;
    subido_por: string | null;
}

// Payload para insertar un nuevo catálogo en la BD
export interface NuevoCatalogoPayload {
    titulo: string;
    archivo_url: string;
    storage_path: string;
    activo: boolean;
    subido_por: string | null;
}
