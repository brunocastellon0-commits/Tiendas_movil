import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Manejo de 'Preflight' 
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Crear Cliente Supabase con Permisos de ADMIN (Service Role)
 
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Leer los datos que nos envía la App
    const { email, password, full_name, job_title, phone } = await req.json()

    if (!email || !password) {
      throw new Error("Faltan datos obligatorios (email o password)")
    }

    // Determinar el role basado en job_title
    // Si el job_title es "Administrador", el role también es "Administrador"
    const role = job_title === 'Administrador' ? 'Administrador' : job_title;

    // 4. Crear el usuario en auth.users (Admin API)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Evitamos verificación de correo
      user_metadata: {
        full_name,
        job_title,
        phone,
        role // Agregamos el campo role para determinar permisos
      }
    })

    if (createError) throw createError
    if (!userData.user) throw new Error("No se pudo crear el usuario")

    // 5. Insertar en la tabla employees
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .upsert({
        id: userData.user.id, // Usar id en lugar de user_uuid
        full_name: full_name,
        email: email,
        phone: phone,
        role: role,
        job_title: job_title || 'Preventista',
        status: 'Habilitado', 
        created_at: new Date().toISOString(),

      })

    if (employeeError) {
      // Si falla la inserción en employees, eliminar el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw new Error(`Error al crear empleado: ${employeeError.message}`)
    }

    // 6. Responder con éxito
    return new Response(
      JSON.stringify({ 
        user: userData.user, 
        message: "Usuario y empleado creados con éxito" 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
});
