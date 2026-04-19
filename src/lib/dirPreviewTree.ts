/** Build UTF-8 tree lines from archive-relative paths (e.g. `Photos/2024/01`). */

type Trie = Map<string, Trie>;

function insertPaths(root: Trie, paths: string[]) {
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    let n = root;
    for (const part of parts) {
      if (!n.has(part)) n.set(part, new Map());
      n = n.get(part)!;
    }
  }
}

export function buildDirectoryTreeLines(rootLabel: string, paths: string[]): string[] {
  const root: Trie = new Map();
  insertPaths(root, paths);

  const out: string[] = [`${rootLabel}/`];

  function walk(node: Trie, indent: string) {
    const keys = [...node.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
    keys.forEach((key, i) => {
      const isLast = i === keys.length - 1;
      const branch = isLast ? "└── " : "├── ";
      out.push(`${indent}${branch}${key}`);
      const child = node.get(key)!;
      const childIndent = indent + (isLast ? "    " : "│   ");
      walk(child, childIndent);
    });
  }

  walk(root, "");
  return out;
}
