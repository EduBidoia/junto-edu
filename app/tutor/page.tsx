import { redirect } from 'next/navigation'

// A rota do tutor agora é /tutor/[childId]
export default function TutorIndexPage() {
  redirect('/dashboard')
}
