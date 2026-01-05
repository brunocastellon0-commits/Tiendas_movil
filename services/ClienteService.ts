import { supabase } from '../lib/supabase';
import { Client, CreateClientDTO } from '../types/Cliente.interface';

export const clientService = {
  async createClient(data: CreateClientDTO) {
    // 1. Convertir coordenadas a formato PostGIS (WKT)
    // Formato: POINT(LONGITUD LATITUD) -> Ojo: Longitud va primero
    let locationVal = null;
    if (data.latitude && data.longitude) {
      locationVal = `SRID=4326;POINT(${data.longitude} ${data.latitude})`;
    }

    // 2. Preparar payload para Supabase
    const payload = {
      code: data.code,
      name: data.name,
      business_name: data.business_name,
      tax_id: data.tax_id,
      address: data.address,
      phones: data.phones,
      location: locationVal, // Campo geográfico
      credit_limit: data.credit_limit || 0,
      vendor_id: data.vendor_id,
      status: 'Vigente', // Default
      initial_balance: 0,
      current_balance: 0
    };

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return newClient;
  },
  
  async getClients(search: string = ''): Promise<Client[]> {
    try {
      let query = supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true }); // Orden alfabético

      if (search) {
        // Busca si el texto coincide con el Nombre O el Código
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Client[];
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      throw new Error('Error al cargar clientes');
    }
  },

  async getClientById(id: string): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          vendor:employees!vendor_id(full_name) 
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Client;
    } catch (error) {
      console.error('Error fetching client details:', error);
      return null;
    }
  },

  async updateClient(id: string, data: Partial<CreateClientDTO>) {
    // Convertir coordenadas a PostGIS si están presentes
    let locationVal = undefined;
    if (data.latitude && data.longitude) {
      locationVal = `SRID=4326;POINT(${data.longitude} ${data.latitude})`;
    }

    const payload: any = {
      code: data.code,
      name: data.name,
      business_name: data.business_name,
      tax_id: data.tax_id,
      address: data.address,
      phones: data.phones,
      credit_limit: data.credit_limit || 0,
    };

    if (locationVal) {
      payload.location = locationVal;
    }

    const { data: updatedClient, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return updatedClient;
  },

  async deleteClient(id: string) {
    try {
      // Borrado lógico: cambiamos el status a "Inactivo"
      const { data, error } = await supabase
        .from('clients')
        .update({ status: 'Inactivo' })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error en deleteClient:', error);
        throw new Error(`Error al suspender cliente: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No se pudo actualizar el cliente');
      }

      console.log('Cliente suspendido exitosamente:', data);
      return true;
    } catch (error: any) {
      console.error('Error capturado en deleteClient:', error);
      throw error;
    }
  }
};

