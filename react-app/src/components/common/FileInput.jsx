import clsx from 'clsx'

export const FileInput = ({ id, label, className, ...props }) => (
  <div className={clsx('space-y-2', className)}>
    {label && (
      <label className="text-sm font-medium text-zinc-200" htmlFor={id}>
        {label}
      </label>
    )}
    <input
      id={id}
      type="file"
      className="block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-100 hover:file:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      {...props}
    />
  </div>
)
