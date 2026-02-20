import { Button } from "@synthesis/ui";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
          S
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Synthesis</h1>
        <p className="max-w-md text-center text-muted-foreground">
          Capture UI components and flows, then organize them into an AI-sorted
          reference library.
        </p>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <a href="/sign-up">Get Started</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/sign-in">Sign In</a>
        </Button>
      </div>
    </div>
  );
}
