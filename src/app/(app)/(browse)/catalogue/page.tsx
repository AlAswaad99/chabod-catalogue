// The catalogue list itself is rendered by the (browse) layout, which stays
// mounted across navigations. This page is just the tablet split-view's empty
// right-hand pane (hidden on phone and desktop by BrowseShell).
export default function CataloguePage() {
  return <p className="type-body text-muted-foreground">Choose a song to read.</p>;
}
