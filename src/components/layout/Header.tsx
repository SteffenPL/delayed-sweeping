export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">
            Delayed Sweeping Simulator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Interactive visualization of the delayed convex sweeping process
          </p>
        </div>
      </div>
    </header>
  );
}
