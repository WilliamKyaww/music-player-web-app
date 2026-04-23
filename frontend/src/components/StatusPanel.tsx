type StatusPanelProps = {
  title: string
  body: string
  tone?: 'neutral' | 'error'
}

export function StatusPanel({
  title,
  body,
  tone = 'neutral',
}: StatusPanelProps) {
  return (
    <section className={`status-panel status-panel--${tone}`} aria-live="polite">
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  )
}
