import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { CatalogoPDF, NuevoCatalogoPayload } from '../types/Catalogo.interface';

const BUCKET = 'catalogos';
const TABLE = 'catalogos_pdf';

export const catalogoService = {

    // ── Listar catálogos ─────────────────────────────────────────────────────
    /**
     * Admin → todos (activos e inactivos).
     * Vendedor → solo los activos (la RLS de Supabase también lo refuerza).
     */
    async listar(isAdmin: boolean): Promise<CatalogoPDF[]> {
        let query = supabase
            .from(TABLE)
            .select('id, titulo, archivo_url, storage_path, activo, created_at, subido_por')
            .order('created_at', { ascending: false });

        if (!isAdmin) {
            query = query.eq('activo', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as CatalogoPDF[];
    },

    // ── Subir PDF desde dispositivo ──────────────────────────────────────────
    /**
     * Abre el selector de archivos, sube a Supabase Storage y guarda la fila en la BD.
     * Devuelve true si tuvo éxito, false si el usuario canceló.
     * Lanza un error si algo falla.
     */
    async subirPDF(titulo: string): Promise<boolean> {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets?.[0]) return false;

        const asset = result.assets[0];
        const fileName = asset.name || `catalogo_${Date.now()}.pdf`;
        const storagePath = `catalogos/${Date.now()}_${fileName}`;

        // Leer como blob y subir
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false });

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();

        const payload: NuevoCatalogoPayload = {
            titulo: titulo.trim(),
            archivo_url: urlData.publicUrl,
            storage_path: storagePath,
            activo: true,
            subido_por: user?.id ?? null,
        };

        const { error: dbError } = await supabase.from(TABLE).insert(payload);
        if (dbError) throw dbError;

        return true;
    },

    // ── Guardar link externo ─────────────────────────────────────────────────
    async guardarLink(titulo: string, url: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        const payload: NuevoCatalogoPayload = {
            titulo: titulo.trim(),
            archivo_url: url.trim(),
            storage_path: '',           // sin path: no está en storage
            activo: true,
            subido_por: user?.id ?? null,
        };

        const { error } = await supabase.from(TABLE).insert(payload);
        if (error) throw error;
    },

    // ── Toggle activo / inactivo ─────────────────────────────────────────────
    async toggleActivo(id: string, estadoActual: boolean): Promise<void> {
        const { error } = await supabase
            .from(TABLE)
            .update({ activo: !estadoActual })
            .eq('id', id);
        if (error) throw error;
    },

    // ── Eliminar catálogo ───────────────────────────────────────────────────
    /**
     * Si el catálogo tiene storage_path, borra el archivo del bucket primero.
     * Luego elimina la fila de la BD.
     */
    async eliminar(catalogo: CatalogoPDF): Promise<void> {
        if (catalogo.storage_path) {
            const { error: storageError } = await supabase.storage
                .from(BUCKET)
                .remove([catalogo.storage_path]);
            if (storageError) throw storageError;
        }

        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', catalogo.id);
        if (error) throw error;
    },
};
