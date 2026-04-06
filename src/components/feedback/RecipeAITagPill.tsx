interface RecipeAITagPillProps {
  tag: string
}

export function RecipeAITagPill({ tag }: RecipeAITagPillProps) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-accent/10 border border-accent/40 text-text/70">
      {tag}
    </span>
  )
}
