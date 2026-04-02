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
