# Backend review checklist — Java / Spring Boot

This project layers `controller` → `service` → `repository` → `entity`/`dto` (see the
`java-backend` skill). Check changes against that shape and against the items below.

## Layering and architecture

- Controllers return DTOs, never JPA entities — leaking entities out of the controller
  couples the API contract to the persistence model and risks serializing lazy
  proxies/internal fields.
- Business logic lives in `@Service` classes, not in controllers or repositories.
  A controller method that does more than map request → service call → response is a sign
  logic leaked upward.
- Repositories are Spring Data interfaces (or thin `@Repository` classes) — no business
  logic inside them.
- Dependencies injected via constructor injection (`@RequiredArgsConstructor` + `final`
  fields), not field injection (`@Autowired` on a field) — constructor injection makes
  dependencies explicit and the class testable without reflection.
- No circular dependencies between services.

## Persistence / JPA

- Schema changes come with a Flyway migration (`src/main/resources/db/migration`,
  `V<n>__description.sql`) — never rely on Hibernate `ddl-auto` beyond local dev. Flag any
  change to an `@Entity` that isn't paired with a migration.
- Migration files are immutable once merged — a fix to an already-applied migration should
  be a new migration, not an edit to the old file.
- `@Transactional` boundaries are on service methods, not controllers, and are as narrow as
  correctness allows (holding a transaction open across an external HTTP call or a long
  loop is a common source of connection-pool exhaustion).
- Lazy-loading (`FetchType.LAZY`) collections aren't accessed outside a transaction/session
  (classic `LazyInitializationException` risk) — check that DTO mapping happens inside the
  transactional service method, not after it returns.
- N+1 query risk: a loop that triggers a repository call or lazy collection access per
  iteration — look for `@EntityGraph`, a fetch-join query, or a batch repository method
  instead.
- Entity equality/`equals`/`hashCode` don't rely on a mutable or auto-generated field in a
  way that breaks when the entity is used in a `Set` before being persisted.

## API design

- Endpoints versioned under `/api/`, consistent with existing routes.
- HTTP methods/status codes match semantics (POST→201 for creation, no 200 for a
  not-found, etc.).
- Request DTOs validated via `jakarta.validation` annotations (`@NotNull`, `@Size`, ...),
  not manual `if` checks scattered in the controller/service.
- Error responses are consistent (a shared exception handler / `@ControllerAdvice`),
  not ad-hoc `ResponseEntity` construction with leaked stack traces or raw exception
  messages.
- New/changed endpoints have matching OpenAPI annotations so springdoc-generated docs stay
  accurate.

## Security

- No secrets, connection strings, or credentials hardcoded or logged.
- Endpoints that should require authentication/authorization actually declare it — check
  this wasn't silently loosened by a refactor.
- User-supplied input used in a query goes through parameter binding (Spring Data
  method names, `@Param`, or a parameterized `@Query`) — never string-concatenated JPQL/SQL.
- No overly permissive CORS (`*`) introduced without a clear reason.

## Lombok / style

- `@Getter`/`@Setter`/`@RequiredArgsConstructor` used instead of hand-written boilerplate,
  but Lombok isn't used to hide a class that's grown too many responsibilities.
- `@Data` avoided on JPA entities (it generates `equals`/`hashCode`/`toString` over all
  fields, which is usually wrong for entities with relationships) — prefer explicit
  `@Getter`/`@Setter`.
- `Optional` used for "may be absent" return values instead of returning/accepting `null`
  from repository or service methods.

## Tests

- Repository behavior tested with `@DataJpaTest` against H2 (or Postgres via Testcontainers
  if that's in use), not mocked.
- Controller/service logic tested with `@WebMvcTest` or plain unit tests + Mockito — check
  the test actually asserts the acceptance criteria (status code *and* body shape *and*
  side effects), not just "it didn't throw".
- Tests don't depend on execution order or leak state (e.g. shared static fields, or
  assuming a previous test's DB rows).
