import clsx from 'clsx'

export const RangeSlider = ({ id, label, value, suffix, className, ...props }) => (
  <div className={clsx('space-y-2', className)}>
    {label && (
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-zinc-200" htmlFor={id}>
          {label}
        </label>
        <span className="text-sm text-zinc-300">
          {value}{suffix}
        </span>
      </div>
    )}
    <input
      id={id}
      type="range"
      value={value}
      className="w-full accent-violet-400"
      {...props}
    />
  </div>
)
