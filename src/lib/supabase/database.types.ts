export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      viajes: {
        Row: {
          id: string
          user_id: string | null
          destino: string
          destino_id: string | null
          pais_codigo: string | null
          tipo: "individual" | "circuito"
          etapas: Json
          viajeros_ids: string[]
          fecha_salida: string | null
          fecha_regreso: string | null
          modo_planificacion: string | null
          investigacion: Json | null
          contexto: Json
          transporte: Json
          actividades: Json
          alojamiento_id: string | null
          souvenirs: Json
          compartido: Json
          recuerdos: Json
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          destino: string
          destino_id?: string | null
          pais_codigo?: string | null
          tipo?: "individual" | "circuito"
          etapas?: Json
          viajeros_ids?: string[]
          fecha_salida?: string | null
          fecha_regreso?: string | null
          modo_planificacion?: string | null
          investigacion?: Json | null
          contexto?: Json
          transporte?: Json
          actividades?: Json
          alojamiento_id?: string | null
          souvenirs?: Json
          compartido?: Json
          recuerdos?: Json
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          destino?: string
          destino_id?: string | null
          pais_codigo?: string | null
          tipo?: "individual" | "circuito"
          etapas?: Json
          viajeros_ids?: string[]
          fecha_salida?: string | null
          fecha_regreso?: string | null
          modo_planificacion?: string | null
          investigacion?: Json | null
          contexto?: Json
          transporte?: Json
          actividades?: Json
          alojamiento_id?: string | null
          souvenirs?: Json
          compartido?: Json
          recuerdos?: Json
          creado_en?: string
          actualizado_en?: string
        }
      }
      viajeros: {
        Row: {
          id: string
          user_id: string | null
          nombre: string
          rol: "viajero" | "acompañante" | "mascota"
          edad: number | null
          nacionalidad: string | null
          pasaporte: string | null
          discapacidades: Json | null
          documentos: Json
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          nombre: string
          rol?: "viajero" | "acompañante" | "mascota"
          edad?: number | null
          nacionalidad?: string | null
          pasaporte?: string | null
          discapacidades?: Json | null
          documentos?: Json
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          nombre?: string
          rol?: "viajero" | "acompañante" | "mascota"
          edad?: number | null
          nacionalidad?: string | null
          pasaporte?: string | null
          discapacidades?: Json | null
          documentos?: Json
          creado_en?: string
          actualizado_en?: string
        }
      }
      documentos: {
        Row: {
          id: string
          viaje_id: string
          nombre: string
          categoria: string
          contenido: string
          tipo_mime: string
          tamaño: number
          url_almacenado: string | null
          creado_en: string
        }
        Insert: {
          id?: string
          viaje_id: string
          nombre: string
          categoria: string
          contenido: string
          tipo_mime: string
          tamaño: number
          url_almacenado?: string | null
          creado_en?: string
        }
        Update: {
          id?: string
          viaje_id?: string
          nombre?: string
          categoria?: string
          contenido?: string
          tipo_mime?: string
          tamaño?: number
          url_almacenado?: string | null
          creado_en?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
