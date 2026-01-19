/**
 * Representa un Cliente tal como viene de la base de datos Supabase.
 * Usado para: Listados, Detalles, Perfiles.
 */
export interface Client {
  id: string;              // UUID único generado por Postgres
  created_at: string;      // Fecha ISO
  updated_at?: string | null; // Última actualización
  
  // Identificación
  code: string;            // Código legacy (ej: 0-00003)
  legacy_id?: number | null;

  // Información Principal
  name: string;            // Nombre de la tienda
  business_name?: string | null; // Razón Social
  tax_id?: string | null;  // NIT o CI
  tax_id_complement?: string | null;
  doc_type?: string | null; // Nuevo: NIT, CI, Otro

  // Contacto
  address?: string | null;
  address_ref_1?: string | null; // Referencia de dirección 1
  address_ref_2?: string | null; // Referencia de dirección 2
  address_ref_3?: string | null; // Referencia de dirección 3
  phones?: string | null;
  fax?: string | null;      // Nuevo
  email?: string | null;    // Nuevo

  // Ubicación (PostGIS devuelve esto como string WKT o GeoJSON, o null)
  location?: string | any;
  // Opcionales por si tu backend los devuelve separados
  latitude?: number | null;
  longitude?: number | null;

  city?: string | null;
  zone_name?: string | null; // Nombre de la zona
  branch_name?: string | null; // Sucursal

  // Estado y Clasificación
  status: string;          // 'Vigente', 'Suspendido', 'No Vigente'
  category?: string | null;
  client_type?: string | null; // Nuevo: Minorista/Mayorista
  regime?: string | null;      // Nuevo: General/Simplificado

  // Vendedor (Relaciones)
  vendor_id: string;       // UUID del preventista asignado

  // ✅ PROPIEDAD CLAVE PARA EL JOIN (Soluciona el error rojo)
  vendor?: {
    full_name: string;
  };

  // Financiero
  credit_limit: number;
  credit_days?: number | null;
  current_balance: number; // Saldo actual (Deuda)
  initial_balance?: number | null;
  payment_method?: string | null; // Efectivo, Cheque
  payment_term?: string | null;   // Contado, Crédito
  currency?: string | null;       // Bs, $us
  guarantee?: string | null;      // Sin Garantía, Letra, etc.

  // Contabilidad y Extras
  accounting_account?: string | null; // Dep. Contable
  notes?: string | null;              // Observaciones
}

/**
 * DTO (Data Transfer Object) para la creación/edición de un cliente.
 * Estos son los datos que enviamos desde el formulario hacia el servicio.
 */
export interface CreateClientDTO {
  // Obligatorios
  code: string;
  name: string;
  vendor_id?: string; // Opcional aquí porque puede ser undefined al inicio

  // Identificación
  business_name?: string;
  tax_id?: string;
  doc_type?: string;

  // Contacto y Ubicación
  address?: string;
  phones?: string;
  fax?: string;
  email?: string;
  city?: string;
  zone_name?: string;
  branch_name?: string;

  // Coordenadas GPS
  latitude?: number | null;
  longitude?: number | null;

  // Financiero
  credit_limit?: number;
  credit_days?: number;
  initial_balance?: number;
  payment_method?: string;
  payment_term?: string;
  currency?: string;
  guarantee?: string;

  // Configuración
  status?: string;
  client_type?: string;
  category?: string;
  regime?: string;
  accounting_account?: string;
  notes?: string;
}
