'use client'

import { useState } from 'react'

const BASE_URL = 'https://junto-edu.netlify.app'

export function ShareChildButton({
  childName,
  accessToken,
}: {
  childName: string
  accessToken: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault() // evita navegar pelo Link pai
    e.stopPropagation()

    const link = `${BASE_URL}/tutor/acesso/${accessToken}`
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Fallback para ambientes sem permissão de clipboard
      const el = document.createElement('textarea')
      el.value = link
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <button
      onClick={handleShare}
      title={`Compartilhar acesso de ${childName}`}
      className={[
        'shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
        copied
          ? 'bg-[#1D9E75] text-white'
          : 'bg-gray-100 text-gray-500 hover:bg-[#1D9E75]/10 hover:text-[#1D9E75]',
      ].join(' ')}
    >
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
          </svg>
          Copiado!
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M7.25 3.688a8.035 8.035 0 0 1 1-.188c.323-.036.643-.053.96-.053h.04a3 3 0 0 1 2.962 3.37l-.16 1.2a.75.75 0 0 1-1.485-.198l.16-1.2A1.5 1.5 0 0 0 9.25 5h-.04c-.29 0-.582.015-.872.047a6.533 6.533 0 0 0-.87.16L7.25 3.688Z" />
            <path fillRule="evenodd" d="M4.5 4a.75.75 0 0 1 .75.75v.583a8.5 8.5 0 0 1 1.04-.206A9.456 9.456 0 0 1 7.5 5h2a3 3 0 0 1 2.984 3.337l-.39 3.5A3 3 0 0 1 9.11 14.5H6.89a3 3 0 0 1-2.984-2.663l-.39-3.5A3 3 0 0 1 6.5 5H4.75A.75.75 0 0 1 4 4.25V4a.75.75 0 0 1 .5-.75ZM6.5 6.5a1.5 1.5 0 0 0-1.492 1.669l.39 3.5A1.5 1.5 0 0 0 6.89 13h2.22a1.5 1.5 0 0 0 1.492-1.331l.39-3.5A1.5 1.5 0 0 0 9.5 6.5h-3Z" clipRule="evenodd" />
          </svg>
          Compartilhar
        </>
      )}
    </button>
  )
}
