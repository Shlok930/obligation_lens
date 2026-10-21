export function buildDependencyNodes(commitments) {
  return commitments.flatMap((commitment) => [
    { type: 'commitment', id: commitment.id, label: commitment.title, commitmentId: commitment.id, completed: commitment.status === 'completed' },
    ...(commitment.actions ?? []).map((action) => ({ type: 'action', id: action.id, label: action.title, commitmentId: commitment.id, completed: Boolean(action.completed), dueDate: action.dueDate })),
  ])
}

export function dependencyKey(item) { return `${item.type}:${item.id}` }

export function analyzeDependencies(nodes, relationships) {
  const nodeMap = new Map(nodes.map((node) => [dependencyKey(node), node]))
  const edges = relationships.filter((edge) => nodeMap.has(dependencyKey(edge.prerequisite)) && nodeMap.has(dependencyKey(edge.dependent)))
  const outgoing = new Map(nodes.map((node) => [dependencyKey(node), []]))
  const incoming = new Map(nodes.map((node) => [dependencyKey(node), []]))
  edges.forEach((edge) => {
    outgoing.get(dependencyKey(edge.prerequisite)).push(edge)
    incoming.get(dependencyKey(edge.dependent)).push(edge)
  })
  const getClosure = (start, map) => {
    const found = new Set()
    const queue = [...(map.get(start) ?? [])].map((edge) => map === outgoing ? dependencyKey(edge.dependent) : dependencyKey(edge.prerequisite))
    while (queue.length) {
      const key = queue.shift()
      if (found.has(key)) continue
      found.add(key)
      for (const edge of map.get(key) ?? []) queue.push(dependencyKey(map === outgoing ? edge.dependent : edge.prerequisite))
    }
    return found
  }
  const blocked = edges.filter((edge) => {
    const prerequisite = nodeMap.get(dependencyKey(edge.prerequisite))
    const dependent = nodeMap.get(dependencyKey(edge.dependent))
    return !prerequisite.completed && !dependent.completed
  })
  const chainDepth = (key, visiting = new Set()) => {
    if (visiting.has(key)) return 0
    const nextVisiting = new Set(visiting).add(key)
    const prerequisites = incoming.get(key) ?? []
    return prerequisites.length ? 1 + Math.max(...prerequisites.map((edge) => chainDepth(dependencyKey(edge.prerequisite), nextVisiting))) : 0
  }
  return {
    nodes,
    edges,
    blocked,
    metrics: { nodes: nodes.length, relationships: edges.length, blocked: blocked.length, longestChain: Math.max(0, ...nodes.map((node) => chainDepth(dependencyKey(node)))) },
    prerequisitesFor: (item) => [...getClosure(dependencyKey(item), incoming)].map((key) => nodeMap.get(key)).filter(Boolean),
    dependentsFor: (item) => [...getClosure(dependencyKey(item), outgoing)].map((key) => nodeMap.get(key)).filter(Boolean),
  }
}

export function wouldCreateDependencyCycle(relationships, prerequisite, dependent) {
  const from = dependencyKey(dependent)
  const target = dependencyKey(prerequisite)
  if (from === target) return true
  const outgoing = new Map()
  relationships.forEach((edge) => {
    const key = dependencyKey(edge.prerequisite)
    outgoing.set(key, [...(outgoing.get(key) ?? []), dependencyKey(edge.dependent)])
  })
  const pending = [from]
  const visited = new Set()
  while (pending.length) {
    const key = pending.pop()
    if (key === from) return true
    if (visited.has(key)) continue
    visited.add(key)
    pending.push(...(outgoing.get(key) ?? []))
  }
  return false
}
