import { env } from "cloudflare:workers"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import {
  Headers,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http"
import { createRemoteJWKSet, jwtVerify } from "jose"

import { OwnerId } from "@/domain/ids"

/** The owner of the MCP request: the `sub` of its verified access token. */
export class McpOwner extends Context.Service<
  McpOwner,
  { readonly owner: OwnerId }
>()("dynamic-report/McpOwner") {}

const clientId = env.WORKOS_CLIENT_ID

/** jose caches the keys and fetches them again when a new key id comes. */
const jwks = createRemoteJWKSet(
  new URL(`https://api.workos.com/sso/jwks/${clientId}`)
)

/**
 * The issuers of WorkOS access tokens: the two AuthKit session issuers,
 * and the AuthKit domain, which issues the tokens of OAuth clients.
 */
const issuers = (): Array<string> => [
  "https://api.workos.com/",
  `https://api.workos.com/user_management/${clientId}`,
  ...Option.toArray(
    Schema.decodeUnknownOption(Schema.String.check(Schema.isMinLength(1)))(
      env.WORKOS_AUTHKIT_DOMAIN
    ).pipe(Option.map((value) => new URL(value).origin))
  ),
]

const decodeSubject = Schema.decodeUnknownOption(
  Schema.Struct({ sub: OwnerId })
)

/** Verifies the token. None when the signature, issuer, expiry or `sub` is wrong. */
const verify = (token: string): Effect.Effect<Option.Option<OwnerId>> =>
  Effect.tryPromise(() => jwtVerify(token, jwks, { issuer: issuers() })).pipe(
    Effect.map(({ payload }) =>
      decodeSubject(payload).pipe(Option.map(({ sub }) => sub))
    ),
    Effect.orElseSucceed(() => Option.none<OwnerId>())
  )

// src/routes/mcp.ts adds the WWW-Authenticate discovery hint.
const unauthorized = HttpServerResponse.text("Unauthorized", { status: 401 })

/** Rejects a request without a valid AuthKit access token before MCP runs. */
export const CredentialMiddleware = HttpRouter.middleware<{
  provides: McpOwner
}>()((effect) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest

    const token = Headers.get(request.headers, "authorization").pipe(
      Option.flatMapNullishOr((value) => /^Bearer (\S+)$/.exec(value)?.[1])
    )

    if (Option.isNone(token)) return unauthorized

    const owner = yield* verify(token.value)

    if (Option.isNone(owner)) return unauthorized

    return yield* Effect.provideService(effect, McpOwner, {
      owner: owner.value,
    })
  })
)
