import { captions } from '@/captions'

export function PlaceholderPage({ title }: { title: string }): JSX.Element {
  return (
    <div className="grid h-full min-h-0 place-items-center px-6 text-center">
      <div>
        <h1 className="text-xl font-semibold tracking-normal text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{captions.routes.overview.placeholder}</p>
      </div>
    </div>
  )
}
