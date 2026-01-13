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
  legacy_id?: number | null; // ID numérico del sistema antiguo
  
  // Información Principal
  name: string;            // Nombre de la tienda (ej: "Tienda El Progreso")
  business_name?: string | null; // Razón Social (ej: "Juan Perez S.A.")
  tax_id?: string | null;  // NIT o CI
  tax_id_complement?: string | null;
  
  // Contacto
  address?: string | null;
  address_ref_1?: string | null; // Referencia de dirección 1
  address_ref_2?: string | null; // Referencia de dirección 2
  address_ref_3?: string | null; // Referencia de dirección 3
  phones?: string | null;
  fax?: string | null;
  
  // Ubicación (PostGIS devuelve esto como string WKT o GeoJSON, o null)
  location?: string | any; 
  
  // Estado y Clasificación
  status: string;          // 'Vigente', 'Suspendido'
  city?: string | null;
  category?: string | null;
  branch_name?: string | null;
  zone_name?: string | null;
  vendor_id: string;       // UUID del preventista asignado
  
  // Representante Legal
  representative?: string | null;
  representative_ci?: string | null;

  // Financiero
  credit_limit: number;
  credit_days?: number;
  current_balance: number; // Saldo actual (Deuda)
  initial_balance?: number;
  accounting_account?: string | null; // Cuenta contable
  
  // Tipos de cliente y documento
  client_type?: string | null; // Tipo de cliente
  document_type?: string | null; // Tipo de documento
  payment_method?: string | null; // Método de pago preferido
}

/**
 * DTO (Data Transfer Object) para la creación de un cliente.
 * Estos son los datos que recolectamos del formulario en la UI.
 */
export interface CreateClientDTO {
  code: string;
  name: string;
  vendor_id: string; // Obligatorio: vincula al usuario logueado
  
  // Opcionales del formulario
  business_name?: string;
  tax_id?: string;
  address?: string;
  phones?: string;
  credit_limit?: number;
  
  // Coordenadas GPS (Las manejamos separadas en el DTO para facilitar el uso en React Native)
  latitude?: number | null;
  longitude?: number | null;
}