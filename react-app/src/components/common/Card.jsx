import clsx from 'clsx'

export const Card = ({ className, ...props }) => (
  <div
    {...props}
    className={clsx('rounded-xl bg-zinc-950 ring-1 ring-zinc-800/80 shadow-sm', className)}
  />
)

