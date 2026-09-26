import type { ReactNode } from 'react'

/** Vite stub so SeoDashboardView can import next/link. */
export default function Link({
  href,
  children,
  ...rest
}: {
  href: string
  children?: ReactNode
  className?: string
}) {
  return (
    <a href={href} onClick={(e) => e.preventDefault()} {...rest}>
      {children}
    </a>
  )
}
