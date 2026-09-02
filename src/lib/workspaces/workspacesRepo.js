import { dbGetAll, dbGet, dbPut, dbDelete, dbUpdate, STORE_WORKSPACES, STORE_WORKSPACE_LINKS } from '../indexedDb';

// The Base workspace is deliberately NOT a stored record — it's a synthetic
// constant that always exists, on every device, with no sync/merge
// questions to answer (does it exist before the first sync? what if a merge
// drops it?). It's implicitly associated with every resource: nothing is
// ever written to STORE_WORKSPACE_LINKS with workspaceId === BASE_WORKSPACE_ID,
// and every scope-filtering call site treats "Base is active" as "no filter".
export const BASE_WORKSPACE_ID = 'base';
export const BASE_WORKSPACE = {
  id: BASE_WORKSPACE_ID,
  name: 'Base',
  color: null,
  isBase: true,
  editable: false,
};

function assertNotBase(id) {
  if (id === BASE_WORKSPACE_ID) {
    throw new Error('O workspace Base não pode ser editado, excluído, nem ter itens associados explicitamente — ele já inclui todos os itens por padrão.');
  }
}

// Base always first, never filtered out (it isn't a real record, so it has
// no deletedAt to check).
export async function listWorkspaces() {
  const stored = await dbGetAll(STORE_WORKSPACES);
  return [BASE_WORKSPACE, ...stored.filter((w) => !w.deletedAt)];
}

export async function getWorkspace(id) {
  if (id === BASE_WORKSPACE_ID) return BASE_WORKSPACE;
  return dbGet(STORE_WORKSPACES, id);
}

export async function createWorkspace({ name, color = null }) {
  const now = Date.now();
  const workspace = {
    id: crypto.randomUUID(),
    name,
    color,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await dbPut(STORE_WORKSPACES, workspace);
  return workspace;
}

// Atomic read-modify-write — see tasksRepo.js's updateTask for why.
export async function updateWorkspace(id, patch) {
  assertNotBase(id);
  const updated = await dbUpdate(STORE_WORKSPACES, id, (existing) =>
    existing ? { ...existing, ...patch, updatedAt: Date.now() } : undefined,
  );
  return updated ?? null;
}

// Soft delete — see tasksRepo.js's deleteTask for why. Links pointing at a
// deleted workspace are deliberately left in place (no cascade), same
// principle as deleteProject not deleting a project's tasks: at this app's
// personal scale, an orphaned link costs nothing and never resurfaces,
// since listWorkspaces() above already excludes the deleted workspace.
export async function deleteWorkspace(id) {
  assertNotBase(id);
  return updateWorkspace(id, { deletedAt: Date.now() });
}

// Replace, not merge — see tasksRepo.js's replaceAllTasks. Called only from
// workspaces/workspacesDriveSync.js's pull path. The Base workspace is never
// part of this array (it's synthetic — see BASE_WORKSPACE above).
export async function replaceAllWorkspaces(workspacesArray) {
  const existing = await dbGetAll(STORE_WORKSPACES);
  await Promise.all(existing.map((w) => dbDelete(STORE_WORKSPACES, w.id)));
  const now = Date.now();
  await Promise.all(
    workspacesArray
      .filter((w) => w.id !== BASE_WORKSPACE_ID)
      .map((w) =>
        dbPut(STORE_WORKSPACES, {
          id: typeof w.id === 'string' && w.id ? w.id : crypto.randomUUID(),
          name: w.name || '',
          color: w.color ?? null,
          deletedAt: w.deletedAt ?? null,
          createdAt: w.createdAt ?? now,
          updatedAt: w.updatedAt ?? now,
        }),
      ),
  );
  return workspacesArray.length;
}

function linkId(workspaceId, resourceType, resourceId) {
  return `${workspaceId}:${resourceType}:${resourceId}`;
}

export async function listAllLinks() {
  return dbGetAll(STORE_WORKSPACE_LINKS);
}

export async function listLinksByWorkspace(workspaceId) {
  const links = await dbGetAll(STORE_WORKSPACE_LINKS);
  return links.filter((l) => l.workspaceId === workspaceId && !l.deletedAt);
}

export async function listLinksByResource(resourceType, resourceId) {
  const links = await dbGetAll(STORE_WORKSPACE_LINKS);
  return links.filter((l) => l.resourceType === resourceType && l.resourceId === String(resourceId) && !l.deletedAt);
}

// Resolves the complete set of workspaces a resource belongs to in a single
// call — upserts a link for every workspaceId newly present, tombstones
// every currently-active link no longer present. Every UI mutation point
// (ProjectFormModal.jsx's multi-select, ResourceWorkspacesModal.jsx) should
// go through this rather than calling addLink/removeLink in a loop, so a
// single edit produces one coherent batch of writes (and one sync nudge)
// instead of N.
export async function setResourceWorkspaces(resourceType, resourceId, workspaceIds) {
  const id = String(resourceId);
  const target = new Set(workspaceIds.filter((w) => w !== BASE_WORKSPACE_ID));
  const current = await listLinksByResource(resourceType, id);
  const currentByWorkspace = new Map(current.map((l) => [l.workspaceId, l]));
  const now = Date.now();

  const toRemove = current.filter((l) => !target.has(l.workspaceId));
  const toAdd = [...target].filter((workspaceId) => !currentByWorkspace.has(workspaceId));

  await Promise.all(
    toRemove.map((l) => dbPut(STORE_WORKSPACE_LINKS, { ...l, deletedAt: now, updatedAt: now })),
  );
  await Promise.all(
    toAdd.map((workspaceId) =>
      dbPut(STORE_WORKSPACE_LINKS, {
        id: linkId(workspaceId, resourceType, id),
        workspaceId,
        resourceType,
        resourceId: id,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
    ),
  );
  return target.size;
}

// The mirror image of setResourceWorkspaces above — resolves the complete
// set of resources (of one type) a workspace contains, in a single call.
// Backs WorkspaceResourcesModal.jsx's tabbed "Projetos"/"Cursos" picker,
// which manages membership from the workspace's side rather than one
// resource at a time.
export async function setWorkspaceResources(workspaceId, resourceType, resourceIds) {
  assertNotBase(workspaceId);
  const target = new Set(resourceIds.map(String));
  const current = (await listLinksByWorkspace(workspaceId)).filter((l) => l.resourceType === resourceType);
  const currentByResource = new Map(current.map((l) => [l.resourceId, l]));
  const now = Date.now();

  const toRemove = current.filter((l) => !target.has(l.resourceId));
  const toAdd = [...target].filter((resourceId) => !currentByResource.has(resourceId));

  await Promise.all(toRemove.map((l) => dbPut(STORE_WORKSPACE_LINKS, { ...l, deletedAt: now, updatedAt: now })));
  await Promise.all(
    toAdd.map((resourceId) =>
      dbPut(STORE_WORKSPACE_LINKS, {
        id: linkId(workspaceId, resourceType, resourceId),
        workspaceId,
        resourceType,
        resourceId,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
    ),
  );
  return target.size;
}

// Replace, not merge — same reasoning as replaceAllWorkspaces above. Called
// only from workspaces/workspacesDriveSync.js's pull path.
export async function replaceAllLinks(linksArray) {
  const existing = await dbGetAll(STORE_WORKSPACE_LINKS);
  await Promise.all(existing.map((l) => dbDelete(STORE_WORKSPACE_LINKS, l.id)));
  const now = Date.now();
  await Promise.all(
    linksArray.map((l) =>
      dbPut(STORE_WORKSPACE_LINKS, {
        id: l.id || linkId(l.workspaceId, l.resourceType, l.resourceId),
        workspaceId: l.workspaceId,
        resourceType: l.resourceType,
        resourceId: String(l.resourceId),
        deletedAt: l.deletedAt ?? null,
        createdAt: l.createdAt ?? now,
        updatedAt: l.updatedAt ?? now,
      }),
    ),
  );
  return linksArray.length;
}
