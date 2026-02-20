import {
  AppShell,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from "@synthesis/ui";

export default function Home() {
  return (
    <AppShell activePath="/" pageTitle="Library">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Synthesis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Capture UI components and flows, then organize them into an
            AI-sorted reference library.
          </p>
          <div className="flex gap-2">
            <Button>Get Started</Button>
            <Button variant="outline">Learn More</Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
