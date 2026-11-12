import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import * as Schema from "effect/Schema"

import { collectionQuery } from "@/api/collections"
import { CollectionId } from "@/domain/ids"
import { CollectionView } from "@/features/collections/collection-view"

const decodeParams = Schema.decodeUnknownSync(
  Schema.Struct({ collectionId: CollectionId })
)

export const Route = createFileRoute("/collections/$collectionId")({
  params: {
    parse: decodeParams,
    stringify: ({ collectionId }) => ({ collectionId }),
  },
  component: CollectionPage,
})

function CollectionPage() {
  const { collectionId } = Route.useParams()
  const collection = useQuery(collectionQuery(collectionId))

  if (collection.isPending)
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>

  if (collection.isError)
    return (
      <p className="p-6 text-sm text-destructive">{collection.error.message}</p>
    )

  return <CollectionView key={collectionId} collection={collection.data} />
}
