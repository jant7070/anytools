import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
}

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    'bg-violet-500 text-white hover:bg-violet-400 active:bg-violet-500/90 disabled:bg-zinc-800 disabled:text-zinc-400',
  secondary:
    'bg-zinc-900 text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800 active:bg-zinc-900 disabled:bg-zinc-900/60 disabled:text-zinc-500',
  ghost:
    'bg-transparent text-zinc-100 hover:bg-zinc-900 active:bg-zinc-900/80 disabled:text-zinc-500',
}

export const Button = ({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) => {
  return (
    <button
      {...props}
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
        'disabled:cursor-not-allowed',
        variantClassName[variant],
        className,
      ].join(' ')}
    />
  )
}

