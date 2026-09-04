---
name: cypher-for-citation-graphs
description: Use when writing Cypher against the Cited citation-graph schema. Provides the schema, idempotent write patterns, and canonical read patterns for centrality, gap analysis, competitor diffing, and path queries.
type: skill
---

# cypher-for-citation-graphs

A Tessl Skill for the Cited project. Teaches an agent how to write correct, idempotent, performant Cypher against the citation-graph schema described below.

**Hard rule.** Every recommendation in Cited must be derived from a Cypher query against this schema. If you find yourself producing advice without a Cypher source, stop and write one.

## Schema

### Nodes

| Label | Key | Properties |
|---|---|---|
| `Brand` | `url` (unique) | `name`, `url`, `is_subject` (bool), `category`, `positioning` |
| `Source` | `url` (unique) | `url`, `domain`, `title`, `type` (`article` \| `reddit` \| `youtube` \| `listicle` \| `docs` \| `other`) |
| `Topic` | `name` (unique) | `name` |
| `Query` | `text` (unique) | `text`, `intent` (`comparison` \| `best_of` \| `alternatives` \| `use_case` \| `feature`) |
| `ModelResponse` | (no natural key — created per (analysis, query, model)) | `model`, `text`, `captured_at` |
| `Analysis` | `id` (unique) | `id`, `root_url`, `started_at`, `status` |

### Relationships

| Pattern | Properties |
|---|---|
| `(Analysis)-[:ABOUT]->(Brand)` | — |
| `(Analysis)-[:RAN]->(Query)` | — |
| `(Query)-[:ASKED_TO]->(ModelResponse)` | — |
| `(ModelResponse)-[:MENTIONS]->(Brand)` | `rank` (int), `sentiment` (string) |
| `(ModelResponse)-[:CITES]->(Source)` | — |
| `(Source)-[:DISCUSSES]->(Topic)` | — |
| `(Brand)-[:ASSOCIATED_WITH]->(Topic)` | `strength` (float 0–1) |
| `(Brand)-[:COMPETES_WITH]->(Brand)` | — |

### Constraints (run on startup)

```cypher
CREATE CONSTRAINT brand_url    IF NOT EXISTS FOR (b:Brand)    REQUIRE b.url IS UNIQUE;
CREATE CONSTRAINT source_url   IF NOT EXISTS FOR (s:Source)   REQUIRE s.url IS UNIQUE;
CREATE CONSTRAINT query_text   IF NOT EXISTS FOR (q:Query)    REQUIRE q.text IS UNIQUE;
CREATE CONSTRAINT analysis_id  IF NOT EXISTS FOR (a:Analysis) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT topic_name   IF NOT EXISTS FOR (t:Topic)    REQUIRE t.name IS UNIQUE;
```

## Write patterns (idempotent — always `MERGE`, never `CREATE` for entities that may recur)

### Upsert a brand

```cypher
MERGE (b:Brand {url: $url})
ON CREATE SET b.name = $name, b.is_subject = $is_subject, b.category = $category, b.positioning = $positioning
ON MATCH  SET b.name = coalesce(b.name, $name),
              b.category = coalesce(b.category, $category)
```

### Bulk-write an analysis with `UNWIND`

```cypher
MERGE (a:Analysis {id: $aid})
ON CREATE SET a.root_url = $root_url, a.started_at = datetime(), a.status = 'querying'

WITH a
MERGE (subject:Brand {url: $subject_url})
ON CREATE SET subject.name = $subject_name, subject.is_subject = true,
              subject.category = $category, subject.positioning = $positioning
MERGE (a)-[:ABOUT]->(subject)

WITH a
UNWIND $queries AS qrow
  MERGE (q:Query {text: qrow.text})
  ON CREATE SET q.intent = qrow.intent
  MERGE (a)-[:RAN]->(q)
```

### Write a (query, model) response with mentions, citations, topics

```cypher
MATCH (a:Analysis {id: $aid})
MATCH (q:Query {text: $query_text})
CREATE (mr:ModelResponse {model: $model, text: $text, captured_at: datetime()})
MERGE (q)-[:ASKED_TO]->(mr)

WITH mr
UNWIND $mentions AS m
  MERGE (b:Brand {url: coalesce(m.url, 'brand://' + toLower(m.name))})
  ON CREATE SET b.name = m.name, b.is_subject = false
  MERGE (mr)-[r:MENTIONS]->(b)
  ON CREATE SET r.rank = m.rank, r.sentiment = m.sentiment

WITH mr
UNWIND $citations AS c
  MERGE (s:Source {url: c.url})
  ON CREATE SET s.title = c.title, s.domain = c.domain, s.type = c.type
  MERGE (mr)-[:CITES]->(s)

WITH mr
UNWIND $topics AS tname
  MERGE (t:Topic {name: tname})
  WITH t, mr
  MATCH (mr)-[:CITES]->(s:Source)
  MERGE (s)-[:DISCUSSES]->(t)
```

### Derive `COMPETES_WITH` from co-mention

```cypher
MATCH (subject:Brand {is_subject: true})<-[:MENTIONS]-(mr:ModelResponse)-[:MENTIONS]->(other:Brand)
WHERE other <> subject
WITH subject, other, count(*) AS co_mentions
WHERE co_mentions >= 2
MERGE (subject)-[:COMPETES_WITH]->(other)
```

## Read patterns

### 1. Source centrality (most-cited sources for this analysis)

```cypher
MATCH (a:Analysis {id: $aid})-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:CITES]->(s:Source)
RETURN s.url AS url, s.domain AS domain, s.title AS title, count(DISTINCT mr) AS citations
ORDER BY citations DESC
LIMIT 25
```

### 2. Competitor citation gap (sources citing competitors but never the subject)

```cypher
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:CITES]->(s:Source)
WHERE NOT EXISTS {
  MATCH (mr2:ModelResponse)-[:CITES]->(s)
  MATCH (mr2)-[:MENTIONS]->(subject)
}
WITH s, count(DISTINCT mr) AS leverage
ORDER BY leverage DESC
LIMIT 20
RETURN s.url AS url, s.title AS title, s.domain AS domain, leverage
```

### 3. Topic gap (topics competitors own that the subject doesn't)

```cypher
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:CITES]->(s:Source)-[:DISCUSSES]->(t:Topic)
MATCH (mr)-[:MENTIONS]->(competitor:Brand)
WHERE competitor <> subject
WITH t, count(DISTINCT competitor) AS competitor_breadth, count(DISTINCT s) AS source_breadth
WHERE NOT EXISTS {
  MATCH (subject)-[:ASSOCIATED_WITH]->(t)
}
RETURN t.name AS topic, competitor_breadth, source_breadth
ORDER BY source_breadth DESC, competitor_breadth DESC
LIMIT 20
```

### 4. Competitor diff (brands ranked above the subject in responses)

```cypher
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)
MATCH (mr)-[r1:MENTIONS]->(subject)
MATCH (mr)-[r2:MENTIONS]->(other:Brand)
WHERE other <> subject AND r2.rank < r1.rank
RETURN other.name AS competitor, count(*) AS times_ranked_above
ORDER BY times_ranked_above DESC
LIMIT 10
```

### 5. Shortest path from subject brand to a top-cited source

```cypher
MATCH (subject:Brand {is_subject: true}), (s:Source {url: $source_url})
MATCH p = shortestPath((subject)-[*..6]-(s))
RETURN [n IN nodes(p) | coalesce(n.name, n.url, n.text, n.model)] AS path,
       length(p) AS hops
```

### 6. Outreach targets (high-centrality sources missing the subject)

```cypher
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:CITES]->(s:Source)
WITH subject, s, count(DISTINCT mr) AS centrality
WHERE NOT EXISTS {
  MATCH (mr2:ModelResponse)-[:CITES]->(s)
  MATCH (mr2)-[:MENTIONS]->(subject)
}
RETURN s.url AS url, s.domain AS domain, s.title AS title, centrality
ORDER BY centrality DESC
LIMIT 10
```

## Conventions when generating Cypher

1. **Scope every read to an `Analysis`** via `$aid` unless you explicitly want cross-analysis aggregates.
2. **Parameterise everything.** Never string-concat user data into a query.
3. **Use `MERGE` for entities**, `CREATE` only for `ModelResponse` (no natural key).
4. **Prefer `count(DISTINCT mr)` over `count(*)`** when a source can be cited by many mentions in one response.
5. **Return shapes the recommendation layer can consume directly** — name your aliases and don't return whole nodes when properties suffice.
6. **Cap with `LIMIT`.** This is a live demo; unbounded queries are a bug.

## Provenance contract

Every recommendation returned by Cited must include:

```json
{
  "cypher": "<the exact query that was run>",
  "params": { "...": "..." },
  "result": [ /* the raw rows */ ]
}
```

If you can't fill in `result`, you haven't actually run the query. Don't ship the recommendation.
