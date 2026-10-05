---
name: java-backend
description: Use when writing or scaffolding backend code for this project (Java REST API) - covers stack, project structure, and conventions to follow.
---

# Java Backend

Stack for this project's backend, per PRD.md:

- **Spring Boot 3** — REST API
- **Spring Data JPA** — persistence
- **Flyway** — DB schema migrations (never rely on Hibernate auto-DDL beyond local dev)
- **Postgres** in real environments, **H2** for local/test runs
- **Lombok** — reduce boilerplate (`@Getter`/`@Setter`/`@RequiredArgsConstructor`)
- **springdoc-openapi** — expose Swagger UI / OpenAPI spec from controllers
- **JUnit 5 + Mockito** — unit and slice tests (`@WebMvcTest`, `@DataJpaTest`)
- **Maven** — build tool

## Conventions
- Standard layering: `controller` → `service` → `repository` → `entity`/`dto`.
- Controllers return DTOs, never JPA entities directly.
- One Flyway migration file per schema change, in `src/main/resources/db/migration`, named `V<n>__description.sql`.
- REST endpoints versioned under `/api/` (e.g. `/api/notes/{date}`).
- Validation via `jakarta.validation` annotations on request DTOs.

## When implementing a user story
1. Check `PRD.md` at the repo root for the relevant story and acceptance criteria.
2. Add/update the entity and a Flyway migration if the schema changes.
3. Add repository method(s), service logic, then the controller endpoint.
4. Add a test (`@DataJpaTest` for repository, `@WebMvcTest` or unit test for controller/service) covering the acceptance criteria.
5. Update the OpenAPI-visible controller annotations/docs as needed.
