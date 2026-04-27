import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export const Card = ({ className = '', ...props }: CardProps) => {
  return (
    <div
      {...props}
      className={[
        'rounded-xl bg-zinc-950 ring-1 ring-zinc-800/80 shadow-sm',
        className,
      ].join(' ')}
    />
  )
}

