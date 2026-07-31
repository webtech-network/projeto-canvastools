import axios from 'axios';

function parseLinkHeader(linkHeader) {
  if (!linkHeader) return {};
  const links = {};
  linkHeader.split(',').forEach((part) => {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      links[match[2]] = match[1];
    }
  });
  return links;
}

// Accepts either a bare domain (https://school.instructure.com, used by the
// web app's CANVAS_DOMAIN) or a domain already carrying /api/v1 (the CLI's
// long-standing CANVAS_API_URL convention) and normalizes to the bare domain.
function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '');
}

// An unhandled axios error carries the raw Bearer token twice: in
// `error.config.headers.Authorization`, and — via the Node http adapter —
// in `error.request._header`, the literal raw HTTP request line/headers as
// text. Both end up verbatim in Next.js's dev error overlay/console (and
// would in any other unredacted logger) if a Canvas call throws uncaught.
// Every rejection from this client goes through here first so a real access
// token never has a path to a log file.
function sanitizeAxiosError(error) {
  if (error?.config?.headers?.Authorization) {
    error.config.headers.Authorization = '[redacted]';
  }
  delete error?.request; // carries the raw request line/headers as text — not worth trying to scrub in place
  return error;
}

/**
 * Creates an axios instance for the Canvas API. Deliberately agnostic to how
 * the token was obtained (personal access token for the CLI, OAuth access
 * token for the web app): callers that hold an OAuth refresh token can pass
 * `onUnauthorized`, an async function returning a fresh access token, which
 * is invoked once on a 401 to self-heal a single request. It is not this
 * module's job to persist a refreshed token anywhere (e.g. a session cookie)
 * — that's the caller's concern.
 */
export function createClient({ baseUrl, token, onUnauthorized }) {
  let currentToken = token;

  const instance = axios.create({
    baseURL: `${normalizeBaseUrl(baseUrl)}/api/v1`,
  });

  instance.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${currentToken}`;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && onUnauthorized && !original._retried) {
        original._retried = true;
        try {
          const newToken = await onUnauthorized();
          if (!newToken) throw error;
          currentToken = newToken;
          return instance(original);
        } catch {
          return Promise.reject(sanitizeAxiosError(error));
        }
      }
      return Promise.reject(sanitizeAxiosError(error));
    },
  );

  return instance;
}

async function fetchAllPages(client, url, params) {
  let results = [];
  let nextUrl = url;
  let nextParams = params;

  while (nextUrl) {
    const response = await client.get(nextUrl, nextParams ? { params: nextParams } : undefined);
    results = results.concat(response.data);
    nextParams = undefined; // subsequent Link-header URLs already encode the original query params
    nextUrl = parseLinkHeader(response.headers.link).next || null;
  }

  return results;
}

export async function getSelf(client) {
  const response = await client.get('/users/self');
  return response.data;
}

export async function getCourse(client, courseId) {
  const response = await client.get(`/courses/${courseId}`);
  return response.data;
}

/**
 * Lists the instructor's courses. Defaults to active courses where the user
 * is enrolled as teacher, since this is an instructor-facing import tool;
 * pass enrollmentType: null to list every enrollment type instead (useful
 * for a TA-only account). Always requests include[]=favorites (for the
 * "is_favorite" filter in the UI), include[]=needs_grading_count (Canvas's
 * own server-computed pending-grading total per course, shown in the courses
 * table), and include[]=total_students (Canvas's own server-computed
 * enrollment count, used by the dashboard's student-count tile) — all valid
 * on this general /courses endpoint, not just the favorites-only one.
 */
export async function listCourses(client, { enrollmentType = 'teacher', enrollmentState = 'active' } = {}) {
  return fetchAllPages(client, '/courses', {
    per_page: 100,
    'include[]': ['favorites', 'needs_grading_count', 'total_students'],
    ...(enrollmentState ? { enrollment_state: enrollmentState } : {}),
    ...(enrollmentType ? { enrollment_type: enrollmentType } : {}),
  });
}

/**
 * Lists a course's assignments (Canvas's Assignment object includes
 * needs_grading_count, published, and quiz_id by default — no extra
 * include[] needed). `quiz_id` is only present for classic-quiz assignments
 * (submission_types: ['online_quiz']) — that's the field our question-import
 * flow needs. Don't confuse it with `is_quiz_assignment`, which flags New
 * Quizzes (LTI) assignments that this app's import endpoint cannot target.
 */
export async function listAssignments(client, courseId) {
  return fetchAllPages(client, `/courses/${courseId}/assignments`, { per_page: 100 });
}

export async function getQuiz(client, courseId, quizId) {
  const response = await client.get(`/courses/${courseId}/quizzes/${quizId}`);
  return response.data;
}

export async function createQuestion(client, courseId, quizId, payload) {
  const response = await client.post(`/courses/${courseId}/quizzes/${quizId}/questions`, payload);
  return response.data;
}

/**
 * Lists the current user's Inbox conversations (Canvas's messaging system),
 * optionally scoped with the same course-context filter Canvas's own Inbox
 * UI uses (`filter: ['course_123']`) — this doesn't mean a conversation
 * "belongs" to that course permanently, it means the conversation shares
 * that context with the current user, which is Canvas's own notion of
 * "messages for this course". Excludes archived conversations by default,
 * same as the default (no `scope`) Inbox view in Canvas's own UI.
 */
export async function listConversations(client, { filter, scope } = {}) {
  return fetchAllPages(client, '/conversations', {
    per_page: 50,
    ...(scope ? { scope } : {}),
    ...(filter && filter.length ? { 'filter[]': filter } : {}),
  });
}

/**
 * Fetches one conversation's full thread — unlike the list endpoint (whose
 * `last_message` is just a one-line synthesis), this returns a `messages`
 * array with every individual message's author, timestamp, full body, and
 * attachments. Fetched on demand (only when a row is expanded in the UI),
 * not eagerly for every conversation in a list.
 */
export async function getConversation(client, conversationId) {
  const response = await client.get(`/conversations/${conversationId}`);
  return response.data;
}

export async function archiveConversation(client, conversationId) {
  const response = await client.put(`/conversations/${conversationId}`, {
    conversation: { workflow_state: 'archived' },
  });
  return response.data;
}

export async function addCourseFavorite(client, courseId) {
  const response = await client.post(`/users/self/favorites/courses/${courseId}`);
  return response.data;
}

export async function removeCourseFavorite(client, courseId) {
  const response = await client.delete(`/users/self/favorites/courses/${courseId}`);
  return response.data;
}
