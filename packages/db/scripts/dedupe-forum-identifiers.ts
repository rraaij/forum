import postgres from "postgres";

type ForumIdentifierRow = {
  id: string;
  name: string;
  slug: string;
  abbreviation: string;
};

type IdentifierChanges = {
  id: string;
  before: Omit<ForumIdentifierRow, "id">;
  after: Omit<ForumIdentifierRow, "id">;
};

type UsedIdentifiers = {
  names: Set<string>;
  slugs: Set<string>;
  abbreviations: Set<string>;
};

const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB}`;
const client = postgres(connectionString, { max: 1 });
const dryRun = process.argv.includes("--dry-run");

/*
 * Return a case-insensitive unique value while keeping the original value for
 * the first row. Numeric suffixes make subsequent rows deterministic and keep
 * repeated script runs idempotent.
 */
function makeUniqueText(value: string, used: Set<string>, separator: string) {
  const normalized = value.trim();
  if (!used.has(normalized.toLocaleLowerCase())) {
    used.add(normalized.toLocaleLowerCase());
    return normalized;
  }

  for (let suffix = 2; suffix < 100_000; suffix += 1) {
    const candidate = `${normalized}${separator}${suffix}`;
    const key = candidate.toLocaleLowerCase();
    if (!used.has(key)) {
      used.add(key);
      return candidate;
    }
  }

  throw new Error(`Could not make "${value}" unique`);
}

/*
 * Abbreviations have a hard five-character database limit. Reserve enough
 * prefix space for the numeric suffix, producing values such as KLAA2/KLAA3.
 */
function makeUniqueAbbreviation(value: string, used: Set<string>) {
  const normalized = value.trim().toUpperCase().slice(0, 5);
  if (!used.has(normalized.toLocaleLowerCase())) {
    used.add(normalized.toLocaleLowerCase());
    return normalized;
  }

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const suffixText = String(suffix);
    const candidate =
      normalized.slice(0, Math.max(1, 5 - suffixText.length)) + suffixText;
    const key = candidate.toLocaleLowerCase();
    if (!used.has(key)) {
      used.add(key);
      return candidate;
    }
  }

  throw new Error(`Could not make abbreviation "${value}" unique`);
}

function planChanges(
  rows: ForumIdentifierRow[],
  used: UsedIdentifiers,
): IdentifierChanges[] {
  return rows.flatMap((row) => {
    const before = {
      name: row.name,
      slug: row.slug,
      abbreviation: row.abbreviation,
    };
    const after = {
      name: makeUniqueText(row.name, used.names, " "),
      slug: makeUniqueText(row.slug.toLowerCase(), used.slugs, "-"),
      abbreviation: makeUniqueAbbreviation(
        row.abbreviation,
        used.abbreviations,
      ),
    };

    const changed =
      before.name !== after.name ||
      before.slug !== after.slug ||
      before.abbreviation !== after.abbreviation;

    return changed ? [{ id: row.id, before, after }] : [];
  });
}

async function updateIdentifiers(
  sql: postgres.Sql | postgres.TransactionSql,
  table: "categories" | "subcategories",
  changes: IdentifierChanges[],
) {
  for (const change of changes) {
    // Table names are selected from a fixed union; values remain parameterized.
    if (table === "categories") {
      await sql`
        UPDATE categories
        SET
          name = ${change.after.name},
          slug = ${change.after.slug},
          abbreviation = ${change.after.abbreviation}
        WHERE id = ${change.id}
      `;
    } else {
      await sql`
        UPDATE subcategories
        SET
          name = ${change.after.name},
          slug = ${change.after.slug},
          abbreviation = ${change.after.abbreviation}
        WHERE id = ${change.id}
      `;
    }
  }
}

async function stageIdentifiers(
  sql: postgres.Sql | postgres.TransactionSql,
  table: "categories" | "subcategories",
  changes: IdentifierChanges[],
  temporaryAbbreviations: Map<string, string>,
) {
  /*
   * Move every changing row to temporary identifiers before assigning final
   * values. This avoids collisions when values shift in a chain, for example
   * KLAAG -> KLAA2 while another row still owns KLAA2.
   */
  for (const change of changes) {
    const temporaryAbbreviation = temporaryAbbreviations.get(change.id);
    if (!temporaryAbbreviation) {
      throw new Error(`Missing temporary abbreviation for ${change.id}`);
    }

    const temporaryName = `__dedupe_name_${change.id}`;
    const temporarySlug = `__dedupe_slug_${change.id}`;
    if (table === "categories") {
      await sql`
        UPDATE categories
        SET
          name = ${temporaryName},
          slug = ${temporarySlug},
          abbreviation = ${temporaryAbbreviation}
        WHERE id = ${change.id}
      `;
    } else {
      await sql`
        UPDATE subcategories
        SET
          name = ${temporaryName},
          slug = ${temporarySlug},
          abbreviation = ${temporaryAbbreviation}
        WHERE id = ${change.id}
      `;
    }
  }
}

async function main() {
  /*
   * Stable creation/id ordering decides which duplicate keeps the original
   * identifier. This makes cleanup predictable across all installations.
   */
  const categoryRows = await client<ForumIdentifierRow[]>`
    SELECT id, name, slug, abbreviation
    FROM categories
    ORDER BY created_at, id
  `;
  const subcategoryRows = await client<ForumIdentifierRow[]>`
    SELECT id, name, slug, abbreviation
    FROM subcategories
    ORDER BY created_at, id
  `;

  /*
   * Categories reserve their identifiers first, then subcategories share the
   * same sets. This guarantees uniqueness across both hierarchy levels.
   */
  const used: UsedIdentifiers = {
    names: new Set(),
    slugs: new Set(),
    abbreviations: new Set(),
  };
  const categoryChanges = planChanges(categoryRows, used);
  const subcategoryChanges = planChanges(subcategoryRows, used);
  const allChanges = [...categoryChanges, ...subcategoryChanges];

  /*
   * Temporary abbreviations must fit varchar(5) and avoid every current/final
   * value. Base-36 counters provide plenty of deterministic candidates.
   */
  const reservedAbbreviations = new Set(
    [
      ...categoryRows,
      ...subcategoryRows,
      ...allChanges.map((row) => row.after),
    ].map((row) => row.abbreviation.toLocaleLowerCase()),
  );
  const temporaryAbbreviations = new Map<string, string>();
  let temporaryCounter = 0;
  for (const change of allChanges) {
    let candidate = "";
    do {
      candidate = `Z${temporaryCounter.toString(36).toUpperCase().padStart(4, "0")}`;
      temporaryCounter += 1;
    } while (reservedAbbreviations.has(candidate.toLocaleLowerCase()));

    reservedAbbreviations.add(candidate.toLocaleLowerCase());
    temporaryAbbreviations.set(change.id, candidate);
  }

  for (const [table, changes] of [
    ["categories", categoryChanges],
    ["subcategories", subcategoryChanges],
  ] as const) {
    for (const change of changes) {
      console.log(
        `${dryRun ? "Would update" : "Updating"} ${table} ${change.id}:`,
        change.before,
        "->",
        change.after,
      );
    }
  }

  if (!dryRun) {
    await client.begin(async (transaction) => {
      await stageIdentifiers(
        transaction,
        "categories",
        categoryChanges,
        temporaryAbbreviations,
      );
      await stageIdentifiers(
        transaction,
        "subcategories",
        subcategoryChanges,
        temporaryAbbreviations,
      );
      await updateIdentifiers(transaction, "categories", categoryChanges);
      await updateIdentifiers(transaction, "subcategories", subcategoryChanges);
    });
  }

  console.log(
    `${dryRun ? "Planned" : "Applied"} ${categoryChanges.length + subcategoryChanges.length} identifier update(s).`,
  );
}

try {
  await main();
} finally {
  await client.end();
}
