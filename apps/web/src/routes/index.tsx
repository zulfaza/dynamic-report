import { createFileRoute } from "@tanstack/react-router"

import { Mascot } from "@/components/mascot"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col gap-2 text-sm text-muted-foreground">
        <Mascot pose="wave" size={128} className="-ml-2" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dynamic Report
        </h1>
        <p>
          Collections hold your data. Each has typed properties, like a Notion
          database.
        </p>
        <p>
          Dashboards show that data. Each panel runs a query and draws a stat,
          chart or table.
        </p>
        <p>
          Start with “Load sample data” in the sidebar, or add a collection with
          +.
        </p>
      </div>
    </main>
  )
}
