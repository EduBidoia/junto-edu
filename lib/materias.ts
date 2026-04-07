export const MATERIAS = [
  // Fundamental
  { value: 'matematica', label: 'Matemática' },
  { value: 'portugues', label: 'Português' },
  { value: 'ciencias', label: 'Ciências' },
  { value: 'historia', label: 'História' },
  { value: 'geografia', label: 'Geografia' },
  { value: 'ingles', label: 'Inglês' },
  { value: 'artes', label: 'Artes' },
  { value: 'educacao_fisica', label: 'Educação Física' },
  // Ensino Médio
  { value: 'fisica', label: 'Física' },
  { value: 'quimica', label: 'Química' },
  { value: 'biologia', label: 'Biologia' },
  { value: 'filosofia', label: 'Filosofia' },
  { value: 'sociologia', label: 'Sociologia' },
  { value: 'literatura', label: 'Literatura' },
  { value: 'redacao', label: 'Redação' },
  { value: 'atualidades', label: 'Atualidades' },
]

export const TOPICOS: Record<string, string[]> = {
  matematica: ['Frações', 'Equações', 'Geometria', 'Porcentagem', 'Funções', 'Trigonometria', 'Estatística'],
  portugues: ['Interpretação de texto', 'Gramática', 'Ortografia', 'Análise sintática', 'Figuras de linguagem'],
  ciencias: ['Sistema solar', 'Corpo humano', 'Ecossistemas', 'Química básica', 'Física básica'],
  historia: ['Brasil Colônia', 'Brasil Império', 'Brasil República', 'História Geral', 'Segunda Guerra'],
  geografia: ['Mapas', 'Clima', 'Relevo', 'População', 'Geopolítica'],
  fisica: ['Cinemática', 'Dinâmica', 'Eletricidade', 'Óptica', 'Termodinâmica'],
  quimica: ['Tabela periódica', 'Ligações químicas', 'Reações', 'Soluções', 'Eletroquímica'],
  biologia: ['Células', 'Genética', 'Evolução', 'Ecologia', 'Fisiologia'],
  ingles: ['Vocabulário', 'Gramática', 'Interpretação', 'Verbos', 'Phrasal verbs'],
  redacao: ['Dissertação argumentativa', 'ENEM', 'Introdução', 'Desenvolvimento', 'Conclusão'],
}

// ─── Matérias por série ────────────────────────────────────────────────────────

export const MATERIAS_POR_SERIE: Record<string, string[]> = {
  // Ensino Fundamental 1 (1º ao 5º ano)
  '1º ano EF': ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Educação Física'],
  '2º ano EF': ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Educação Física'],
  '3º ano EF': ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Educação Física'],
  '4º ano EF': ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Educação Física'],
  '5º ano EF': ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Artes', 'Educação Física', 'Inglês'],

  // Ensino Fundamental 2 (6º ao 9º ano)
  '6º ano EF': ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Inglês', 'Artes', 'Educação Física'],
  '7º ano EF': ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Inglês', 'Artes', 'Educação Física'],
  '8º ano EF': ['Português', 'Matemática', 'Ciências', 'História', 'Geografia', 'Inglês', 'Artes', 'Educação Física'],
  '9º ano EF': ['Português', 'Matemática', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês', 'Artes', 'Educação Física'],

  // Ensino Médio
  '1º ano EM': ['Português', 'Literatura', 'Redação', 'Matemática', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês', 'Filosofia', 'Sociologia'],
  '2º ano EM': ['Português', 'Literatura', 'Redação', 'Matemática', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês', 'Filosofia', 'Sociologia'],
  '3º ano EM': ['Português', 'Literatura', 'Redação', 'Matemática', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês', 'Filosofia', 'Sociologia'],

  // Cursinho / Pré-vestibular
  'Cursinho': ['Português', 'Literatura', 'Redação', 'Matemática', 'Física', 'Química', 'Biologia', 'História', 'Geografia', 'Inglês', 'Filosofia', 'Sociologia', 'Atualidades'],
}

/**
 * Retorna a lista de matérias ({value, label}) para uma série,
 * na ordem definida em MATERIAS_POR_SERIE.
 * Fallback para '6º ano EF' quando a série não for reconhecida.
 */
export function getMateriasPorSerie(grade: string | null | undefined): Array<{ value: string; label: string }> {
  const labels = MATERIAS_POR_SERIE[grade ?? ''] ?? MATERIAS_POR_SERIE['6º ano EF']
  const byLabel = new Map(MATERIAS.map((m) => [m.label, m]))
  return labels.flatMap((l) => {
    const m = byLabel.get(l)
    return m ? [m] : []
  })
}
