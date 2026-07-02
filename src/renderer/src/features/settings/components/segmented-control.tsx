interface SegmentedOption {
  label: string
  value: string
}

interface SegmentedControlProps {
  value: string
  options: SegmentedOption[]
  onChange: (value: string) => void
}

export function SegmentedControl({ value, options, onChange }: SegmentedControlProps): JSX.Element {
  return (
    <div className="inline-flex rounded-lg border border-input bg-background p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
