type SearchBarProps = {
  query: string
  onQueryChange: (value: string) => void
  isLoading: boolean
}

export function SearchBar({ query, onQueryChange, isLoading }: SearchBarProps) {
  return (
    <label className="search-panel" htmlFor="search-input">
      <div className="search-panel__row">
        <svg
          className="search-panel__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M10.5 4a6.5 6.5 0 1 0 4.05 11.59l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
            fill="currentColor"
          />
        </svg>

        <input
          id="search-input"
          className="search-panel__input"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search songs, artists, or albums"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="search-panel__meta">
          {query.trim().length > 0 && query.trim().length < 2 ? (
            <span className="search-panel__hint">Keep typing</span>
          ) : isLoading ? (
            <span className="search-panel__hint search-panel__hint--loading">
              Searching
            </span>
          ) : null}
        </div>
      </div>
    </label>
  )
}
