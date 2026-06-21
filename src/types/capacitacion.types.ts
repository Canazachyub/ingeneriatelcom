export interface Capacitacion {
  id: string;
  titulo: string;
  descripcion: string;
  material_url?: string;
  categoria: string;
  num_preguntas: number;
  nota_minima: number;
  tiempo_limite_min: number;
  foto_intervalo_seg: number;
  estado: 'activo' | 'borrador' | 'cerrado';
  fecha_creacion?: string;
}

export interface Pregunta {
  id: string;
  capacitacion_id: string;
  pregunta: string;
  tipo: 'multiple' | 'llenado';
  opcion_a?: string;
  opcion_b?: string;
  opcion_c?: string;
  opcion_d?: string;
  respuesta_correcta?: string;
  justificacion?: string;
  dificultad: 'facil' | 'media' | 'dificil';
  puntaje: number;
  estado: 'activa' | 'inactiva';
}

export interface OpcionExamen {
  key: string;
  texto: string;
}

export interface PreguntaExamen {
  id: string;
  pregunta: string;
  tipo: 'multiple' | 'llenado';
  opciones: OpcionExamen[];
  puntaje: number;
}

export interface IniciarEvaluacionConfig {
  tiempo_limite_min: number;
  foto_intervalo_seg: number;
  nota_minima: number;
  titulo: string;
}

export interface IniciarEvaluacionResponse {
  evaluacion_id: string;
  preguntas: PreguntaExamen[];
  config: IniciarEvaluacionConfig;
}

export interface Evaluacion {
  id: string;
  capacitacion_id: string;
  dni: string;
  nombres: string;
  email: string;
  preguntas_asignadas?: string;
  respuestas?: string;
  puntaje_auto?: number;
  salidas_pestana?: number;
  fotos_url?: string;
  hora_inicio?: string;
  hora_fin?: string;
  duracion_seg?: number;
  estado: 'en_curso' | 'pendiente_revision' | 'aprobado' | 'observado' | 'abandonado';
  nota_final?: number;
  retroalimentacion?: string;
  revisado_por?: string;
  fecha_revision?: string;
}

export interface EvalLog {
  id: string;
  evaluacion_id: string;
  tipo_evento: string;
  detalle?: string;
  timestamp: string;
}

export interface EvalFoto {
  id: string;
  evaluacion_id: string;
  foto_url: string;
  timestamp: string;
  orden: number;
}
