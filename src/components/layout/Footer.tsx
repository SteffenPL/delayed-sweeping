export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-4">
        <p className="text-center text-sm text-muted-foreground">
          Based on the mathematical model from the delayed sweeping process manuscript.
          <br />
          <span className="text-xs opacity-80">
            Use mouse wheel on canvas to rotate shapes. Drag in free-drag mode to move constraint.
          </span>
        </p>
      </div>
    </footer>
  );
}
