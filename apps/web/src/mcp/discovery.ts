import { env } from "cloudflare:workers"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

/**
 * RFC 9728 discovery for the MCP server. WorkOS AuthKit is the
 * authorization server: a client signs the user in there, and sends the
 * AuthKit access token to `/mcp` as a Bearer token.
 */

const HttpsUrl = Schema.String.check(Schema.isPattern(/^https:\/\/\S+$/))

/**
 * The AuthKit domain from WORKOS_AUTHKIT_DOMAIN, as an origin. It is none
 * when the secret is missing or is not an https URL.
 */
const authorizationServer = (): Option.Option<string> =>
  Schema.decodeUnknownOption(HttpsUrl)(env.WORKOS_AUTHKIT_DOMAIN).pipe(
    Option.map((value) => new URL(value).origin)
  )

/** Where a client finds the metadata of the MCP server at `origin`. */
export function metadataUrl(origin: string) {
  return `${origin}/.well-known/oauth-protected-resource/mcp`
}

/** Serves the metadata for the origin the client used. */
export function serveMcpResourceMetadata({ request }: { request: Request }) {
  const origin = new URL(request.url).origin
  const server = authorizationServer()

  if (Option.isNone(server))
    return Response.json(
      {
        error: "server_error",
        error_description:
          "WORKOS_AUTHKIT_DOMAIN is not set. Set it to the AuthKit domain, for example https://<name>.authkit.app.",
      },
      { status: 500 }
    )

  return Response.json(
    {
      resource: `${origin}/mcp`,
      resource_name: "Dynamic Report MCP",
      authorization_servers: [server.value],
      bearer_methods_supported: ["header"],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    }
  )
}
