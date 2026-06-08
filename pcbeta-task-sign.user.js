/*
PCBeta daily task for Loon.

How to use:
1. Import:
   https://raw.githubusercontent.com/GUIEROOR/Myloon/refs/heads/main/pcbeta-task-sign.plugin
2. Enable MitM for i.pcbeta.com and bbs.pcbeta.com.
3. Open PCBeta once while Loon is enabled, so this script can save your Cookie.
4. The cron job will run once every day.

If Cookie capture does not work, paste your Cookie into CONFIG.manualCookie.
*/

const CONFIG = {
  debug: true,
  manualCookie: '',
  scriptUrl: 'https://raw.githubusercontent.com/GUIEROOR/Myloon/main/pcbeta-task-sign.user.js',
  pluginUrl: 'https://raw.githubusercontent.com/GUIEROOR/Myloon/refs/heads/main/pcbeta-task-sign.plugin',
  notifyOnSuccess: true,
  notifyOnFailure: true,
  notifyOnCookieUpdate: true,
  dailyTask: {
    id: 149,
    name: 'daily check-in',
    applyUrl: 'https://i.pcbeta.com/home.php?mod=task&do=apply&id=149',
  },
  replyTask: {
    id: 434,
    name: 'reply check-in reward',
    applyUrl: 'https://i.pcbeta.com/home.php?mod=task&do=apply&id=434',
    drawUrl: 'https://i.pcbeta.com/home.php?mod=task&do=draw&id=434',
    threadUrl: 'https://bbs.pcbeta.com/viewthread-2072737-1-1.html',
    tid: '2072737',
  },
  replyMessages: [
    '{date} check in',
    '{date} daily check in',
    '{date} sign in',
    '{date} report',
    '{date} task done',
  ],
};

const STORE = {
  cookie: 'pcbeta.loon.cookie',
  statePrefix: 'pcbeta.loon.state.',
};

const isLoon = typeof $httpClient !== 'undefined';
const request = typeof $request !== 'undefined' ? $request : null;

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function compactDate() {
  return todayKey().replace(/-/g, '');
}

function stateKey() {
  return `${STORE.statePrefix}${todayKey()}`;
}

function log(...args) {
  if (CONFIG.debug) {
    console.log('[PCBeta Loon]', ...args);
  }
}

function done(value = {}) {
  if (typeof $done === 'function') {
    $done(value);
  }
}

function notify(title, subtitle, body) {
  if (typeof $notification !== 'undefined') {
    $notification.post(title, subtitle || '', body || '');
  }
}

function readStore(key, fallback = '') {
  if (typeof $persistentStore === 'undefined') {
    return fallback;
  }
  return $persistentStore.read(key) || fallback;
}

function writeStore(key, value) {
  if (typeof $persistentStore === 'undefined') {
    return false;
  }
  return $persistentStore.write(String(value), key);
}

function readJson(key, fallback = {}) {
  try {
    return JSON.parse(readStore(key, '') || JSON.stringify(fallback));
  } catch (error) {
    log('Failed to parse stored JSON:', error);
    return fallback;
  }
}

function patchState(patch) {
  const next = Object.assign({}, readJson(stateKey(), {}), patch);
  writeStore(stateKey(), JSON.stringify(next));
  return next;
}

function getSavedCookie() {
  return CONFIG.manualCookie || readStore(STORE.cookie, '');
}

function parseCookie(cookie) {
  const result = {};
  String(cookie || '').split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index <= 0) {
      return;
    }

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) {
      result[key] = value;
    }
  });
  return result;
}

function stringifyCookie(cookieMap) {
  return Object.keys(cookieMap)
    .filter((key) => cookieMap[key] !== '')
    .map((key) => `${key}=${cookieMap[key]}`)
    .join('; ');
}

function mergeCookie(oldCookie, newCookie) {
  return stringifyCookie(Object.assign({}, parseCookie(oldCookie), parseCookie(newCookie)));
}

function getRequestCookie(headers) {
  const cookieHeader = Object.keys(headers || {}).find((key) => key.toLowerCase() === 'cookie');
  return cookieHeader ? headers[cookieHeader] : '';
}

function saveCookieFromRequest() {
  if (!request || !request.headers) {
    return false;
  }

  const cookie = getRequestCookie(request.headers);
  if (!cookie) {
    return false;
  }

  const oldCookie = readStore(STORE.cookie, '');
  const mergedCookie = mergeCookie(oldCookie, cookie);
  if (oldCookie === mergedCookie) {
    return true;
  }

  writeStore(STORE.cookie, mergedCookie);
  if (CONFIG.notifyOnCookieUpdate) {
    const cookieCount = Object.keys(parseCookie(mergedCookie)).length;
    notify('PCBeta Cookie saved', '', `Loon has merged ${cookieCount} Cookie items.`);
  }
  return true;
}

function normalizeHeaders(headers = {}) {
  const next = {};
  Object.keys(headers).forEach((key) => {
    next[key] = headers[key];
  });
  return next;
}

function httpRequest(method, url, options = {}) {
  return new Promise((resolve, reject) => {
    if (!isLoon) {
      reject(new Error('This script must run in Loon.'));
      return;
    }

    const headers = normalizeHeaders(options.headers);
    const cookie = getSavedCookie();
    if (cookie) {
      headers.Cookie = cookie;
    }

    const requestOptions = {
      url,
      headers: Object.assign({
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }, headers),
    };

    if (options.body) {
      requestOptions.body = options.body;
    }

    const callback = (error, response, body) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        status: Number(response && (response.status || response.statusCode)) || 0,
        headers: response && response.headers ? response.headers : {},
        body: body || '',
      });
    };

    if (method === 'POST') {
      $httpClient.post(requestOptions, callback);
    } else {
      $httpClient.get(requestOptions, callback);
    }
  });
}

function getText(body) {
  return String(body || '').replace(/\s+/g, ' ');
}

function htmlDecode(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function getHeader(headers, name) {
  const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : '';
}

function hasLoginProblem(text, response = {}) {
  const location = getHeader(response.headers, 'location');
  const normalizedText = getText(text);
  const normalizedLocation = String(location || '');

  return (
    /member\.php\?mod=logging&action=login|not logged/i.test(normalizedLocation) ||
    /member\.php\?mod=logging&action=login|not logged|\u8bf7\u5148\u767b\u5f55|\u5c1a\u672a\u767b\u5f55|\u62b1\u6b49\uff0c\u60a8\u5c1a\u672a\u767b\u5f55/i.test(normalizedText)
  );
}

function makeReplyMessage() {
  const index = new Date().getMinutes() % CONFIG.replyMessages.length;
  return CONFIG.replyMessages[index].replace(/\{date\}/g, compactDate());
}

function parseFormHash(html) {
  const patterns = [
    /name=["']formhash["']\s+value=["']([^"']+)["']/i,
    /formhash=([a-z0-9]+)/i,
    /["']formhash["']\s*:\s*["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return '';
}

function parseFastPostAction(html) {
  const formMatch = html.match(/<form[^>]+id=["']fastpostform["'][\s\S]*?>/i);
  if (!formMatch) {
    return '';
  }

  const actionMatch = formMatch[0].match(/action=["']([^"']+)["']/i);
  return actionMatch ? htmlDecode(actionMatch[1]) : '';
}

function absoluteUrl(url) {
  if (!url) {
    return '';
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith('/')) {
    return `https://bbs.pcbeta.com${url}`;
  }
  return `https://bbs.pcbeta.com/${url}`;
}

function buildReplyUrl(html) {
  const action = parseFastPostAction(html);
  if (action) {
    return absoluteUrl(action.replace(/&amp;/g, '&'));
  }

  return `https://bbs.pcbeta.com/forum.php?mod=post&action=reply&tid=${CONFIG.replyTask.tid}&replysubmit=yes&infloat=yes&handlekey=fastpost&inajax=1`;
}

function buildFormBody(values) {
  return Object.keys(values)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(values[key])}`)
    .join('&');
}

function isLikelySuccess(text) {
  return /success|succeed|item=done|task_apply_succeed|task_reward_succeed|\u6210\u529f|\u5b8c\u6210|\u5956\u52b1|\u606d\u559c|\u5df2\u7ecf\u5b8c\u6210|\u5df2\u53d1\u653e/i.test(text);
}

function isLikelyAlreadyDone(text) {
  return /already|\u5df2\u7ecf\u7533\u8bf7|\u5df2\u7ecf\u5b8c\u6210|\u5df2\u5b8c\u6210|\u4eca\u65e5|\u4eca\u5929/i.test(text);
}

function isReplyNeeded(text) {
  return /0%|not completed|\u56de\u590d\u4e3b\u9898|\u5c1a\u672a\u5b8c\u6210|\u4e0d\u662f\u8fdb\u884c\u4e2d\u7684\u4efb\u52a1/i.test(text);
}

async function applyTask(task) {
  const result = await httpRequest('GET', task.applyUrl);
  const text = getText(result.body);
  log(`Apply ${task.name}:`, result.status, text.slice(0, 160));

  if (hasLoginProblem(text, result)) {
    throw new Error('Cookie may be expired. Please open PCBeta once in Loon to refresh it.');
  }

  return isLikelySuccess(text) || isLikelyAlreadyDone(text) || result.status === 302;
}

async function drawReplyReward() {
  const result = await httpRequest('GET', CONFIG.replyTask.drawUrl);
  const text = getText(result.body);
  log('Draw reply reward:', result.status, text.slice(0, 180));

  if (hasLoginProblem(text, result)) {
    throw new Error('Cookie may be expired. Please open PCBeta once in Loon to refresh it.');
  }

  return {
    done: isLikelySuccess(text) || isLikelyAlreadyDone(text),
    shouldReply: isReplyNeeded(text),
    text,
  };
}

async function postReply() {
  const page = await httpRequest('GET', CONFIG.replyTask.threadUrl);
  const html = page.body || '';
  const text = getText(html);

  if (hasLoginProblem(text, page)) {
    throw new Error('Cookie may be expired. Please open PCBeta once in Loon to refresh it.');
  }

  const formhash = parseFormHash(html);
  if (!formhash) {
    throw new Error('Cannot find formhash on the reply thread. The page may require verification.');
  }

  const message = makeReplyMessage();
  const replyUrl = buildReplyUrl(html);
  const body = buildFormBody({
    formhash,
    message,
    subject: '',
    usesig: '1',
  });

  const result = await httpRequest('POST', replyUrl, {
    headers: {
      Origin: 'https://bbs.pcbeta.com',
      Referer: CONFIG.replyTask.threadUrl,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  });

  const responseText = getText(result.body);
  log('Post reply:', result.status, responseText.slice(0, 180));

  if (/error|\u9a8c\u8bc1\u7801|\u704c\u6c34|\u95f4\u9694|\u89c1\u4e60|\u975e\u6cd5|\u5931\u8d25|\u53d7\u9650/i.test(responseText)) {
    throw new Error(`Reply may have failed: ${responseText.slice(0, 80)}`);
  }

  patchState({
    replyPosted: true,
    lastReplyMessage: message,
  });

  return message;
}

async function runDailyTask() {
  const cookie = getSavedCookie();
  if (!cookie) {
    throw new Error('No PCBeta Cookie. Open PCBeta once with Loon enabled, or set CONFIG.manualCookie.');
  }

  const state = readJson(stateKey(), {});
  if (state.finished) {
    log('Already finished today.');
    return 'Already finished today.';
  }

  const dailyApplied = await applyTask(CONFIG.dailyTask);
  if (!dailyApplied) {
    throw new Error('Daily task apply status was not confirmed.');
  }
  patchState({ dailyDone: true });

  const replyTaskApplied = await applyTask(CONFIG.replyTask);
  if (!replyTaskApplied) {
    throw new Error('Reply task apply status was not confirmed.');
  }
  patchState({ replyTaskApplied: true });

  let draw = await drawReplyReward();
  let replyMessage = '';

  if (!draw.done && draw.shouldReply) {
    replyMessage = await postReply();
    draw = await drawReplyReward();
  }

  if (!draw.done) {
    throw new Error('Tasks were attempted, but reward status was not confirmed. Please check PCBeta manually.');
  }

  patchState({
    finished: true,
    finishedAt: Date.now(),
    replyRewardDone: true,
  });

  return replyMessage ? `Finished. Reply: ${replyMessage}` : 'Finished. Reward was already available.';
}

async function main() {
  if (request && saveCookieFromRequest()) {
    done({});
    return;
  }

  try {
    const message = await runDailyTask();
    if (CONFIG.notifyOnSuccess) {
      notify('PCBeta daily task', 'Success', message);
    }
    done({});
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    log('Failed:', message);
    if (CONFIG.notifyOnFailure) {
      notify('PCBeta daily task', 'Failed', message);
    }
    done({});
  }
}

main();
