// FuOverflow MLN122 Helper - Pro Edition
// Dev by thanh duyvp
// Universal: Runs on both /threads/ and /forums/
// Features: Full HD Images, Auto Community Answers (Big Red), "Đã Học" Tracker & Global Synchronized Zoom
(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  //  CENTRAL STORAGE FOR LEARNED EXAMS & QUESTIONS & GLOBAL ZOOM
  // ══════════════════════════════════════════════════════════════
  const STORAGE_KEY = 'fuo_mln122_master_learned';
  const ZOOM_STORAGE_KEY = 'fuo_mln122_global_zoom';
  const HEIGHT_STORAGE_KEY = 'fuo_mln122_img_height';

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function hasExtensionStorage() {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
  }

  // Page HTML and thread data come from forum users, so escape before using innerHTML.
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getAllLearnedData() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return isPlainObject(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveAllLearnedData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[FuOverflow Helper] Không ghi được localStorage:', e);
    }

    // Separate from localStorage so a quota failure there cannot block the backup.
    if (!hasExtensionStorage()) return;
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: data }).catch(() => {});
    } catch (e) {
      // Extension was reloaded while this page stayed open.
    }
  }

  // Merge the extension backup back in; for each thread the newest record wins.
  async function restoreLearnedData() {
    if (!hasExtensionStorage()) return;
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const backup = stored[STORAGE_KEY];
      if (!isPlainObject(backup)) return;

      const merged = getAllLearnedData();
      let changed = false;
      Object.entries(backup).forEach(([threadId, record]) => {
        if (!isPlainObject(record)) return;
        const current = merged[threadId];
        if (!current || (record.lastUpdated || 0) > (current.lastUpdated || 0)) {
          merged[threadId] = record;
          changed = true;
        }
      });
      if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('[FuOverflow Helper] Không khôi phục được tiến độ:', e);
    }
  }

  function getStoredGlobalZoom() {
    try {
      const z = parseInt(localStorage.getItem(ZOOM_STORAGE_KEY), 10);
      return (z && z >= 50 && z <= 400) ? z : 140; // Default 140% for optimal readability
    } catch (e) {
      return 140;
    }
  }

  function saveStoredGlobalZoom(zoom) {
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, zoom.toString());
    } catch (e) {}
  }

  function getStoredImgHeight() {
    try {
      const h = parseInt(localStorage.getItem(HEIGHT_STORAGE_KEY), 10);
      return (h && h >= 160 && h <= 800) ? h : 290; // Default 290px balances question visibility and cuts blank white bottom
    } catch (e) {
      return 290;
    }
  }

  function saveStoredImgHeight(height) {
    try {
      localStorage.setItem(HEIGHT_STORAGE_KEY, height.toString());
    } catch (e) {}
  }

  function getCurrentThreadId() {
    const m = window.location.pathname.match(/\/threads\/([^/]+)/);
    return m ? m[1] : null;
  }

  // ══════════════════════════════════════════════════════════════
  //  ROUTE 1: FORUM THREAD LIST (/forums/)
  // ══════════════════════════════════════════════════════════════
  // The forum list does not know a thread's question count until the thread is opened.
  function setForumBadge(badge, isAll, learnedCount, total) {
    if (isAll) {
      badge.className = 'fuo-forum-badge learned';
      badge.textContent = total > 0 ? `✔ Đã học xong (${total} câu)` : '✔ Đã học xong';
    } else if (learnedCount > 0) {
      badge.className = 'fuo-forum-badge learning';
      badge.textContent = `⏳ Đang học: ${learnedCount}/${total > 0 ? total : '?'}`;
    } else {
      badge.className = 'fuo-forum-badge unlearned';
      badge.textContent = '○ Chưa học';
    }
  }

  function initForumListPage() {
    const threadRows = document.querySelectorAll('.structItem--thread');
    if (threadRows.length === 0) return;

    const allData = getAllLearnedData();

    threadRows.forEach(row => {
      const titleLink = row.querySelector('.structItem-title a[data-tp-primary]');
      if (!titleLink) return;

      const title = titleLink.textContent.trim();
      const href = titleLink.getAttribute('href') || '';
      const m = href.match(/\/threads\/([^/]+)/);
      if (!m) return;
      const threadId = m[1];

      if (!title.toLowerCase().includes('mln122') && !window.location.pathname.toLowerCase().includes('mln122')) {
        return;
      }

      if (row.querySelector('.fuo-forum-injected')) return;

      const container = document.createElement('span');
      container.className = 'fuo-forum-injected';

      const threadRecord = isPlainObject(allData[threadId])
        ? allData[threadId]
        : { total: 0, learned: [], allLearned: false };
      const learnedCount = Array.isArray(threadRecord.learned) ? threadRecord.learned.length : 0;
      const isAll = threadRecord.allLearned || (threadRecord.total > 0 && learnedCount >= threadRecord.total);

      const badge = document.createElement('span');
      setForumBadge(badge, isAll, learnedCount, threadRecord.total);

      const toggleBtn = document.createElement('button');
      toggleBtn.className = `fuo-forum-quick-btn ${isAll ? 'active' : ''}`;
      toggleBtn.textContent = isAll ? 'Bỏ tick' : '✔ Tick đã học đề này';
      toggleBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();

        const curData = getAllLearnedData();
        const curRec = isPlainObject(curData[threadId])
          ? curData[threadId]
          : { title: title, total: 0, learned: [], allLearned: false };
        const newAll = !curRec.allLearned;

        curRec.title = title;
        curRec.allLearned = newAll;
        // Question numbers are unknown here; the thread view expands allLearned when opened.
        curRec.learned = [];
        curRec.lastUpdated = Date.now();
        curData[threadId] = curRec;
        saveAllLearnedData(curData);

        setForumBadge(badge, newAll, 0, curRec.total);
        if (newAll) {
          toggleBtn.className = 'fuo-forum-quick-btn active';
          toggleBtn.textContent = 'Bỏ tick';
        } else {
          toggleBtn.className = 'fuo-forum-quick-btn';
          toggleBtn.textContent = '✔ Tick đã học đề này';
        }
      };

      container.appendChild(badge);
      container.appendChild(toggleBtn);

      const titleCell = row.querySelector('.structItem-title');
      if (titleCell) titleCell.appendChild(container);
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  ROUTE 2: THREAD STUDY VIEWER (/threads/)
  // ══════════════════════════════════════════════════════════════
  let state = {
    threadId: null,
    threadTitle: '',
    questions: [],
    learnedMap: {},
    globalZoom: 140, // Single master zoom level for ALL images
    imgHeight: 290,  // Compact height to cut off blank white space while keeping all options visible
    currentFilter: 'all', // all | unlearned | learned
    isScanning: false,
    scannedCount: 0,
    scanController: null
  };

  function initThreadLauncher() {
    if (document.getElementById('fuo-mln-launcher')) return;

    const attachments = document.querySelectorAll('.file.file--linked');
    if (attachments.length === 0) return;

    const btn = document.createElement('div');
    btn.id = 'fuo-mln-launcher';
    btn.title = 'FuOverflow MLN122 Pro • Dev by thanh duyvp';
    btn.innerHTML = `🎓 <span>Mở Tool MLN122 (Ảnh Full HD + ĐA Đỏ)</span> <span style="font-size:11px;opacity:0.8;font-weight:normal;margin-left:2px;">• thanh duyvp</span>`;
    btn.onclick = launchOverlay;
    document.body.appendChild(btn);
  }

  function parseQuestionNumber(name) {
    const match = name.match(/(?<![A-Za-z])Q(\d+)/i) || name.match(/câu\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  // Each number is a card id and learned-state key, so numbers must be unique within a thread.
  function assignQuestionNumbers(names) {
    const used = new Set();
    const explicit = names.map(name => {
      const num = parseQuestionNumber(name);
      if (num === null || used.has(num)) return null;
      used.add(num);
      return num;
    });

    let nextFree = 1;
    return explicit.map(num => {
      if (num !== null) return num;
      while (used.has(nextFree)) nextFree++;
      used.add(nextFree);
      return nextFree;
    });
  }

  // JS \b only understands ASCII, so Vietnamese word edges need Unicode lookarounds.
  const WORD_START = '(?<![\\p{L}\\p{N}])';
  const WORD_END = '(?![\\p{L}\\p{N}])';
  const VOTE_SEPARATOR = '(?:\\s*(?:[,+&/\\-]|và|va|and)\\s*|\\s+)';

  const ANSWER_LABEL_RE = new RegExp(`${WORD_START}(?:đáp\\s*án|dap\\s*an|đ/a|đa|da)${WORD_END}\\s*:?`, 'giu');
  const ALL_ANSWERS_RE = new RegExp(`${WORD_START}(?:tất\\s*cả|tat\\s*ca|all|cả\\s*4|ca\\s*4)${WORD_END}`, 'iu');
  const COMBO_VOTE_RE = new RegExp(
    `${WORD_START}([A-D])${VOTE_SEPARATOR}([A-D])(?:${VOTE_SEPARATOR}([A-D]))?(?:${VOTE_SEPARATOR}([A-D]))?${WORD_END}`,
    'iu'
  );
  const COMPACT_VOTE_RE = new RegExp(`${WORD_START}([A-D]{2,4})${WORD_END}`, 'u');
  const SINGLE_VOTE_RES = [
    new RegExp(`${WORD_START}(?:chọn|chon|vote|là|la|chắc|chac)\\s*:?\\s*([A-D])${WORD_END}`, 'iu'),
    new RegExp(`${WORD_START}([A-D])\\s*(?:nha|nhé|nhe|đúng|dung|chính\\s*xác)${WORD_END}`, 'iu'),
    /(?:^|[\s(])([A-D])(?:[).\s]|$)/iu
  ];

  function extractSingleVote(clean) {
    for (const pattern of SINGLE_VOTE_RES) {
      const match = clean.match(pattern);
      if (match) return match[1].toUpperCase();
    }
    return null;
  }

  // Requiring ascending letters keeps "AC" while rejecting words such as "BA", "DA", "BAD", "ADD".
  // Lowercase is accepted only when the letters are the whole comment.
  function extractCompactVote(clean) {
    const raw = /^[a-d]{2,4}$/i.test(clean) ? clean : (clean.match(COMPACT_VOTE_RE) || [])[1];
    if (!raw) return null;
    const letters = raw.toUpperCase().split('');
    const isAscending = letters.every((letter, i) => i === 0 || letter > letters[i - 1]);
    return isAscending ? letters : null;
  }

  // Extract single OR multiple answers from a comment (e.g. "A, C", "A và D", "AC", "A B C", "tất cả")
  function extractVotesFromText(text) {
    if (!text) return [];
    // NFC keeps "ả" as one letter; decomposed text would expose a bare "a" to the patterns below.
    const normalized = text.normalize('NFC').trim();

    if (ALL_ANSWERS_RE.test(normalized)) {
      return ['A', 'B', 'C', 'D'];
    }

    // "da"/"đa" mean "đáp án" here. Drop the label so it is never read as the letters D and A.
    const clean = normalized.replace(ANSWER_LABEL_RE, ' ').trim();

    const comboMatch = clean.match(COMBO_VOTE_RE);
    if (comboMatch) {
      const letters = comboMatch.slice(1).filter(Boolean).map(letter => letter.toUpperCase());
      const unique = [...new Set(letters)];
      if (unique.length >= 2) return unique.sort();
    }

    const compact = extractCompactVote(clean);
    if (compact) return compact;

    const single = extractSingleVote(clean);
    return single ? [single] : [];
  }

  function resolveHttpUrl(href) {
    if (!href) return '';
    try {
      const url = new URL(href, window.location.origin);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (e) {
      return '';
    }
  }

  function resolveSameOriginUrl(href) {
    const resolved = resolveHttpUrl(href);
    return resolved && new URL(resolved).origin === window.location.origin ? resolved : '';
  }

  function collectQuestionsFromDOM() {
    const fileEls = Array.from(document.querySelectorAll('.file.file--linked'));
    const names = fileEls.map((el, idx) => {
      const nameEl = el.querySelector('.file-name');
      return nameEl ? nameEl.getAttribute('title') || nameEl.textContent : `Câu ${idx + 1}`;
    });
    const numbers = assignQuestionNumbers(names);

    const questions = fileEls.map((el, idx) => {
      const previewA = el.querySelector('a.file-preview');
      return {
        num: numbers[idx],
        name: names[idx],
        hdUrl: previewA ? resolveHttpUrl(previewA.getAttribute('href')) : '',
        sidebarUrl: previewA ? resolveSameOriginUrl(previewA.getAttribute('data-lb-sidebar-href')) : '',
        communityAnswer: null,
        winners: [],
        isTie: false,
        votes: { A: 0, B: 0, C: 0, D: 0 },
        totalComments: 0,
        status: 'pending',
        error: null
      };
    });

    questions.sort((a, b) => a.num - b.num);
    return questions;
  }

  function loadThreadLearnedState(questions) {
    const threadId = getCurrentThreadId();
    if (!threadId) return {};
    const rec = getAllLearnedData()[threadId];
    const map = {};
    if (!isPlainObject(rec)) return map;

    // Ignore numbers that do not exist in this thread (old records assumed 60 questions).
    const learned = new Set(Array.isArray(rec.learned) ? rec.learned : []);
    questions.forEach(q => {
      if (rec.allLearned || learned.has(q.num)) map[q.num] = true;
    });
    return map;
  }

  function syncThreadLearnedState() {
    const threadId = state.threadId || getCurrentThreadId();
    if (!threadId) return;

    const all = getAllLearnedData();
    const learnedArr = Object.keys(state.learnedMap).map(n => parseInt(n)).sort((a,b)=>a-b);
    const total = state.questions.length;
    const allLearned = total > 0 && learnedArr.length >= total;

    all[threadId] = {
      title: state.threadTitle || document.title,
      total: total,
      learned: learnedArr,
      allLearned: allLearned,
      lastUpdated: Date.now()
    };
    saveAllLearnedData(all);
  }

  // ══════════════════════════════════════════════════════════════
  //  SCRAPING COMMUNITY COMMENTS (Same-Origin Fetch)
  // ══════════════════════════════════════════════════════════════
  const COMMENT_SELECTOR = '.message-body, .comment-content, .comment, [data-comment-id], .js-comment';

  function resetQuestionResult(q) {
    q.votes = { A: 0, B: 0, C: 0, D: 0 };
    q.totalComments = 0;
    q.winners = [];
    q.communityAnswer = null;
    q.isTie = false;
    q.error = null;
  }

  // One voter = one vote. The author is used only when its element wraps exactly this comment;
  // otherwise a page-level data-author would merge every comment into a single vote.
  function getVoterKey(commentEl, comments, index) {
    const authorEl = commentEl.closest('[data-author]');
    const author = authorEl ? authorEl.getAttribute('data-author') : '';
    const isOwnWrapper = authorEl && comments.filter(c => authorEl.contains(c)).length === 1;
    return author && isOwnWrapper ? `author:${author}` : `comment:${index}`;
  }

  async function scrapeQuestionAnswer(q, signal) {
    resetQuestionResult(q);

    if (!q.sidebarUrl) {
      q.status = 'done';
      state.scannedCount++;
      updateProgressUI();
      updateQuestionUI(q);
      return;
    }

    q.status = 'loading';
    updateQuestionUI(q);

    try {
      const res = await fetch(q.sidebarUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/html, */*'
        },
        credentials: 'same-origin',
        signal
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let htmlText = '';
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        htmlText = (json.html && json.html.content) || JSON.stringify(json);
      } else {
        htmlText = await res.text();
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      if (signal.aborted) return;

      // Keep only the innermost match so a wrapper and its content are not both counted.
      const commentEls = Array.from(doc.querySelectorAll(COMMENT_SELECTOR))
        .filter(el => !el.querySelector(COMMENT_SELECTOR));
      const votesByVoter = new Map();

      // If a voter comments again, the latest comment replaces the earlier vote.
      function recordVote(voterKey, text) {
        const letters = extractVotesFromText(text);
        if (letters.length > 0) votesByVoter.set(voterKey, letters);
      }

      if (commentEls.length > 0) {
        commentEls.forEach((cEl, index) => {
          recordVote(getVoterKey(cEl, commentEls, index), cEl.textContent);
        });
      } else {
        const lines = htmlText.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('comment') || line.includes('message')) {
            const stripped = line.replace(/<[^>]*>/g, '').trim();
            recordVote(`line:${index}`, stripped);
          }
        });
      }

      const votes = { A: 0, B: 0, C: 0, D: 0 };
      let multiVoteCount = 0;
      votesByVoter.forEach(letters => {
        if (letters.length > 1) multiVoteCount++;
        letters.forEach(l => { votes[l]++; });
      });
      const count = votesByVoter.size;

      q.votes = votes;
      q.totalComments = count;

      let maxVotes = 0;
      ['A', 'B', 'C', 'D'].forEach(opt => {
        if (votes[opt] > maxVotes) {
          maxVotes = votes[opt];
        }
      });

      // Multi-winner determination: handles ties, multiple choices (A, C), and multi-select questions
      let winners = [];
      if (maxVotes > 0) {
        ['A', 'B', 'C', 'D'].forEach(opt => {
          if (votes[opt] === maxVotes) {
            winners.push(opt);
          } else if (multiVoteCount > 0 && votes[opt] >= 2 && votes[opt] >= Math.round(maxVotes * 0.7)) {
            // Include secondary answer if users explicitly voted combinations
            winners.push(opt);
          }
        });
      }

      q.winners = winners;
      q.communityAnswer = winners.length > 0 ? winners.join(', ') : null;
      // Several top answers with no combined vote is a tie, not a multi-select question.
      q.isTie = winners.length > 1 && multiVoteCount === 0;
      q.status = 'done';
    } catch (err) {
      if (signal.aborted) return;
      console.error(`Lỗi quét câu ${q.num}:`, err);
      resetQuestionResult(q);
      q.error = err.message || 'không xác định';
      q.status = 'error';
    }

    state.scannedCount++;
    updateProgressUI();
    updateQuestionUI(q);
  }

  async function runScraping(questions) {
    // A new scan replaces any running one, so workers never overlap on the same questions.
    if (state.scanController) state.scanController.abort();
    const controller = new AbortController();
    state.scanController = controller;

    state.isScanning = true;
    state.scannedCount = 0;
    updateProgressUI();

    const poolLimit = 4;
    const queue = [...questions];

    async function worker() {
      while (queue.length > 0 && !controller.signal.aborted) {
        const q = queue.shift();
        await scrapeQuestionAnswer(q, controller.signal);
        await new Promise(r => setTimeout(r, 80));
      }
    }

    const workers = Array.from({ length: poolLimit }, () => worker());
    await Promise.all(workers);

    if (state.scanController !== controller) return;
    state.scanController = null;
    state.isScanning = false;
    updateProgressUI();
  }

  function cancelScraping() {
    if (state.scanController) state.scanController.abort();
    state.scanController = null;
    state.isScanning = false;
  }

  // ══════════════════════════════════════════════════════════════
  //  GLOBAL SYNCHRONIZED ZOOM & POSITION SYNC
  //  "khi nhấn zoom thì sẽ zoom cái ảnh đó và tất cả ảnh trong trang cũng zoom mức đó vị trí đó"
  // ══════════════════════════════════════════════════════════════
  let isSyncingScroll = false;

  function setGlobalZoom(newZoom, sourceContainer = null) {
    let zoomVal = typeof newZoom === 'number' ? newZoom : parseInt(newZoom, 10);
    if (isNaN(zoomVal)) zoomVal = 140;
    zoomVal = Math.max(50, Math.min(400, zoomVal));

    state.globalZoom = zoomVal;
    saveStoredGlobalZoom(zoomVal);

    // Calculate source container's current scroll ratio if available
    let ratioX = 0;
    let ratioY = 0;
    if (sourceContainer) {
      const maxX = sourceContainer.scrollWidth - sourceContainer.clientWidth;
      const maxY = sourceContainer.scrollHeight - sourceContainer.clientHeight;
      ratioX = maxX > 0 ? (sourceContainer.scrollLeft / maxX) : 0;
      ratioY = maxY > 0 ? (sourceContainer.scrollTop / maxY) : 0;
    }

    // 1. Update style.width for ALL question images
    const allImgs = document.querySelectorAll('.fuo-img-scrollable img');
    allImgs.forEach(img => {
      img.style.width = `${zoomVal}%`;
    });

    // 2. Update all Zoom text badges across every card
    document.querySelectorAll('.fuo-zoom-level-text').forEach(el => {
      el.textContent = `${zoomVal}%`;
    });

    // 3. Update top header global zoom badge
    const headerZoomEl = document.getElementById('fuo-header-zoom-text');
    if (headerZoomEl) headerZoomEl.textContent = `${zoomVal}%`;

    // 4. Synchronize scroll position across all image containers to "vị trí đó"
    requestAnimationFrame(() => {
      syncAllContainersScroll(ratioX, ratioY, sourceContainer);
    });
  }

  function adjustGlobalZoom(delta, sourceContainer = null) {
    setGlobalZoom(state.globalZoom + delta, sourceContainer);
  }

  function syncAllContainersScroll(ratioX, ratioY, source = null) {
    if (isSyncingScroll) return;
    isSyncingScroll = true;

    // Read every size first, then write, to avoid a forced layout per image.
    const targets = Array.from(document.querySelectorAll('.fuo-img-scrollable'))
      .filter(c => c !== source)
      .map(c => ({
        container: c,
        maxX: c.scrollWidth - c.clientWidth,
        maxY: c.scrollHeight - c.clientHeight
      }));

    targets.forEach(({ container, maxX, maxY }) => {
      if (maxX > 0) container.scrollLeft = Math.round(ratioX * maxX);
      if (maxY > 0) container.scrollTop = Math.round(ratioY * maxY);
    });

    setTimeout(() => {
      isSyncingScroll = false;
    }, 40);
  }

  // Set & Synchronize Image Container Height (Cắt bớt phần trắng dưới ảnh)
  function setImgHeight(height) {
    let h = typeof height === 'number' ? height : parseInt(height, 10);
    if (isNaN(h)) h = 290;
    state.imgHeight = h;
    saveStoredImgHeight(h);

    document.documentElement.style.setProperty('--fuo-img-height', `${h}px`);
    const overlay = document.getElementById('fuo-mln-overlay');
    if (overlay) {
      overlay.style.setProperty('--fuo-img-height', `${h}px`);
    }

    // Update active class on height buttons
    document.querySelectorAll('[data-action="set-height"]').forEach(btn => {
      const bHeight = parseInt(btn.dataset.height, 10);
      if (bHeight === h) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  // Scroll events can fire faster than frames; sync at most once per frame.
  let scrollSyncSource = null;
  function scheduleScrollSync(container) {
    const isFramePending = scrollSyncSource !== null;
    scrollSyncSource = container;
    if (isFramePending) return;

    requestAnimationFrame(() => {
      const source = scrollSyncSource;
      scrollSyncSource = null;
      const maxX = source.scrollWidth - source.clientWidth;
      const maxY = source.scrollHeight - source.clientHeight;
      const ratioX = maxX > 0 ? (source.scrollLeft / maxX) : 0;
      const ratioY = maxY > 0 ? (source.scrollTop / maxY) : 0;
      syncAllContainersScroll(ratioX, ratioY, source);
    });
  }

  // One shared listener: a per-image window listener would leak on every overlay open.
  let activePanContainer = null;
  window.addEventListener('mouseup', () => {
    if (!activePanContainer) return;
    activePanContainer.classList.remove('fuo-is-dragging');
    activePanContainer = null;
  });

  // Bind scroll & drag-to-pan handlers on scrollable containers
  function setupScrollableContainer(container) {
    if (!container || container.dataset.fuoBound === 'true') return;
    container.dataset.fuoBound = 'true';

    // Synchronize scroll on scroll
    container.addEventListener('scroll', () => {
      if (isSyncingScroll) return;
      scheduleScrollSync(container);
    }, { passive: true });

    // Drag-to-pan implementation
    let startX = 0;
    let startY = 0;
    let initialScrollLeft = 0;
    let initialScrollTop = 0;

    container.addEventListener('mousedown', (e) => {
      // Ignore if clicking on button or right-click
      if (e.button !== 0) return;
      activePanContainer = container;
      container.classList.add('fuo-is-dragging');
      startX = e.pageX - container.offsetLeft;
      startY = e.pageY - container.offsetTop;
      initialScrollLeft = container.scrollLeft;
      initialScrollTop = container.scrollTop;
    });

    container.addEventListener('mousemove', (e) => {
      if (activePanContainer !== container) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const y = e.pageY - container.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      container.scrollLeft = initialScrollLeft - walkX;
      container.scrollTop = initialScrollTop - walkY;
    });

    // Mousewheel Ctrl+Zoom support inside question container
    container.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 15 : -15;
        adjustGlobalZoom(delta, container);
      }
    }, { passive: false });
  }

  // ══════════════════════════════════════════════════════════════
  //  LEARNED TRACKER LOGIC
  // ══════════════════════════════════════════════════════════════
  function toggleLearned(qNum) {
    if (state.learnedMap[qNum]) {
      delete state.learnedMap[qNum];
    } else {
      state.learnedMap[qNum] = true;
    }
    syncThreadLearnedState();

    const isLearned = !!state.learnedMap[qNum];
    const card = document.getElementById(`fuo-card-${qNum}`);
    const btn = document.getElementById(`fuo-learn-btn-${qNum}`);

    if (card) {
      if (isLearned) card.classList.add('is-learned');
      else card.classList.remove('is-learned');
    }
    if (btn) {
      if (isLearned) {
        btn.classList.add('active');
        btn.innerHTML = `✔ <span>Đã học</span>`;
      } else {
        btn.classList.remove('active');
        btn.innerHTML = `○ <span>Chưa học</span>`;
      }
    }

    updateLearnedCounterUI();
    applyFilterUI();
  }

  function toggleAllExamLearned() {
    const total = state.questions.length;
    const learnedCount = Object.keys(state.learnedMap).length;
    const markAll = learnedCount < total;

    if (markAll) {
      state.questions.forEach(q => { state.learnedMap[q.num] = true; });
    } else {
      state.learnedMap = {};
    }
    syncThreadLearnedState();

    state.questions.forEach(q => {
      const isL = !!state.learnedMap[q.num];
      const card = document.getElementById(`fuo-card-${q.num}`);
      const btn = document.getElementById(`fuo-learn-btn-${q.num}`);
      if (card) {
        if (isL) card.classList.add('is-learned');
        else card.classList.remove('is-learned');
      }
      if (btn) {
        if (isL) {
          btn.classList.add('active');
          btn.innerHTML = `✔ <span>Đã học</span>`;
        } else {
          btn.classList.remove('active');
          btn.innerHTML = `○ <span>Chưa học</span>`;
        }
      }
    });

    updateLearnedCounterUI();
    applyFilterUI();
  }

  function setFilter(filter) {
    state.currentFilter = filter;
    document.querySelectorAll('.fuo-filter-btn').forEach(btn => {
      if (btn.dataset.filter === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    applyFilterUI();
  }

  function applyFilterUI() {
    state.questions.forEach(q => {
      const card = document.getElementById(`fuo-card-${q.num}`);
      if (!card) return;
      const isLearned = !!state.learnedMap[q.num];

      if (state.currentFilter === 'all') {
        card.style.display = '';
      } else if (state.currentFilter === 'learned') {
        card.style.display = isLearned ? '' : 'none';
      } else if (state.currentFilter === 'unlearned') {
        card.style.display = isLearned ? 'none' : '';
      }
    });
  }

  function updateLearnedCounterUI() {
    const learnedCount = Object.keys(state.learnedMap).length;
    const total = state.questions.length;
    const pct = total > 0 ? Math.round((learnedCount / total) * 100) : 0;
    const badge = document.getElementById('fuo-learned-counter');
    if (badge) {
      badge.innerHTML = `✔ Đã học: <strong>${learnedCount}/${total}</strong> (${pct}%)`;
    }

    const toggleAllBtn = document.getElementById('fuo-toggle-all-btn');
    if (toggleAllBtn) {
      if (total > 0 && learnedCount >= total) {
        toggleAllBtn.className = 'fuo-btn fuo-btn-green';
        toggleAllBtn.textContent = '✔ Đã Thuộc Hết Đề Này!';
      } else {
        toggleAllBtn.className = 'fuo-btn';
        toggleAllBtn.textContent = '✔ Đánh Dấu Học Hết Cả Đề';
      }
    }

    const btnAll = document.querySelector('.fuo-filter-btn[data-filter="all"]');
    const btnUn = document.querySelector('.fuo-filter-btn[data-filter="unlearned"]');
    const btnLe = document.querySelector('.fuo-filter-btn[data-filter="learned"]');
    if (btnAll) btnAll.textContent = `Tất cả (${total})`;
    if (btnUn) btnUn.textContent = `Chưa học (${total - learnedCount})`;
    if (btnLe) btnLe.textContent = `Đã học (${learnedCount})`;
  }

  // ══════════════════════════════════════════════════════════════
  //  LIGHTBOX MODAL FOR SINGLE EXPANDED VIEW
  // ══════════════════════════════════════════════════════════════
  let currentModalZoom = 130;
  function openFullscreenZoom(url) {
    currentModalZoom = 130;
    let modal = document.getElementById('fuo-zoom-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fuo-zoom-modal';
      document.body.appendChild(modal);

      modal.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 20 : -20;
        adjustModalZoom(delta);
      }, { passive: false });
    }

    modal.innerHTML = `
      <div class="fuo-modal-bar">
        <button class="fuo-btn" data-action="modal-zoom-out">🔍 −</button>
        <span id="fuo-modal-zoom-text" style="font-size:13px;color:#93c5fd;font-weight:800;line-height:28px">130%</span>
        <button class="fuo-btn" data-action="modal-zoom-in">🔍 +</button>
        <button class="fuo-btn" data-action="modal-zoom-reset">⟲ 100%</button>
        <button class="fuo-btn fuo-btn-red" data-action="modal-close">✕ Đóng</button>
      </div>
      <img id="fuo-modal-img" src="${escapeHtml(url)}" alt="Zoomed HD Question" style="width:130%" />
    `;

    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }

  function adjustModalZoom(delta) {
    if (delta === 0) currentModalZoom = 100;
    else currentModalZoom = Math.max(50, Math.min(450, currentModalZoom + delta));

    const img = document.getElementById('fuo-modal-img');
    const txt = document.getElementById('fuo-modal-zoom-text');
    if (img) img.style.width = `${currentModalZoom}%`;
    if (txt) txt.textContent = `${currentModalZoom}%`;
  }

  // ══════════════════════════════════════════════════════════════
  //  LAUNCH OVERLAY & RENDER UI
  // ══════════════════════════════════════════════════════════════
  function getExtensionVersion() {
    try {
      return chrome.runtime.getManifest().version;
    } catch (e) {
      return '';
    }
  }

  function closeOverlay() {
    cancelScraping();
    document.getElementById('fuo-mln-overlay')?.remove();
    document.body.classList.remove('fuo-overlay-open');
    const launcher = document.getElementById('fuo-mln-launcher');
    if (launcher) launcher.style.display = 'flex';
  }

  function launchOverlay() {
    if (document.getElementById('fuo-mln-overlay')) return;

    state.threadId = getCurrentThreadId();
    state.threadTitle = document.title.replace(' | FuOverflow Community', '').trim();
    state.questions = collectQuestionsFromDOM();
    state.learnedMap = loadThreadLearnedState(state.questions);
    state.globalZoom = getStoredGlobalZoom();
    state.imgHeight = getStoredImgHeight();

    if (state.questions.length === 0) {
      alert('Không tìm thấy câu hỏi dạng ảnh trên trang này!');
      return;
    }

    // Correct records saved before the real count was known, so the forum list shows it too.
    const savedRecord = getAllLearnedData()[state.threadId];
    if (isPlainObject(savedRecord) && savedRecord.total !== state.questions.length) {
      syncThreadLearnedState();
    }

    // Hide floating launcher button so it never covers question content
    document.body.classList.add('fuo-overlay-open');
    const launcher = document.getElementById('fuo-mln-launcher');
    if (launcher) launcher.style.display = 'none';

    const overlay = document.createElement('div');
    overlay.id = 'fuo-mln-overlay';

    overlay.innerHTML = `
      <div class="fuo-header">
        <span style="font-size:22px">🎓</span>
        <div>
          <div class="fuo-header-title">${escapeHtml(state.threadTitle)}</div>
          <div style="font-size:11px;color:var(--fuo-muted)">FuOverflow MLN122 Pro Helper v${escapeHtml(getExtensionVersion())} • <span style="color:#60a5fa;font-weight:600">dev by thanh duyvp</span></div>
        </div>
        <span class="fuo-badge">${state.questions.length} Câu Hỏi</span>
        <span class="fuo-learned-counter" id="fuo-learned-counter">✔ Đã học: 0/${state.questions.length}</span>
        
        <!-- Keyboard Navigation Hint -->
        <span class="fuo-kb-hint" title="Nhấn mũi tên ↓ trên bàn phím để chuyển câu (căn giữa màn hình)"><kbd>↓</kbd> <kbd>↑</kbd> Chuyển câu (Căn giữa)</span>

        <!-- Quick Action: Mark whole exam as learned -->
        <button class="fuo-btn" id="fuo-toggle-all-btn" data-action="toggle-all-learned">✔ Đánh Dấu Học Hết Cả Đề</button>

        <!-- Filter Tabs in Header -->
        <div class="fuo-filter-row">
          <button class="fuo-filter-btn active" data-filter="all">Tất cả (${state.questions.length})</button>
          <button class="fuo-filter-btn" data-filter="unlearned">Chưa học</button>
          <button class="fuo-filter-btn" data-filter="learned">Đã học</button>
        </div>

        <!-- GLOBAL SYNCHRONIZED ZOOM BAR IN HEADER -->
        <div class="fuo-header-zoom-bar">
          <span style="font-size:12px;font-weight:700;color:#93c5fd">🔍 Zoom:</span>
          <button class="fuo-zoom-btn" data-action="global-zoom-out" title="Thu nhỏ tất cả ảnh">−</button>
          <span class="fuo-zoom-level-text" id="fuo-header-zoom-text">${state.globalZoom}%</span>
          <button class="fuo-zoom-btn" data-action="global-zoom-in" title="Phóng to tất cả ảnh">+</button>
          <button class="fuo-zoom-btn" data-action="global-zoom-val" data-val="140">140%</button>
          <button class="fuo-zoom-btn" data-action="global-zoom-val" data-val="175">175%</button>
          <button class="fuo-zoom-btn" data-action="global-zoom-val" data-val="100">⟲ 100%</button>
        </div>

        <!-- HEIGHT CONTROL BAR IN HEADER (Cắt bớt phần trắng dưới ảnh) -->
        <div class="fuo-header-zoom-bar">
          <span style="font-size:12px;font-weight:700;color:#86efac">↕ Khung ảnh:</span>
          <button class="fuo-zoom-btn ${state.imgHeight===240?'active':''}" data-action="set-height" data-height="240" title="Cực gọn (240px)">Gọn 240px</button>
          <button class="fuo-zoom-btn ${state.imgHeight===290?'active':''}" data-action="set-height" data-height="290" title="Chuẩn hiển thị đầy đủ câu và đáp án, cắt trắng thừa (290px)">Chuẩn 290px</button>
          <button class="fuo-zoom-btn ${state.imgHeight===360?'active':''}" data-action="set-height" data-height="360" title="Vừa (360px)">360px</button>
          <button class="fuo-zoom-btn ${state.imgHeight===480?'active':''}" data-action="set-height" data-height="480" title="Mở rộng (480px)">Mở rộng</button>
        </div>

        <div class="fuo-progress">
          <span id="fuo-progress-text">Đang quét đáp án...</span>
          <button class="fuo-btn fuo-btn-red" data-action="rescan">🔄 Quét Lại</button>
          <button class="fuo-btn" data-action="export">💾 Xuất JSON</button>
          <button class="fuo-btn-close" data-action="close">✕</button>
        </div>
      </div>

      <div class="fuo-content">
        <div class="fuo-questions-wrap" id="fuo-q-container">
          <!-- Question cards rendered here -->
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Apply stored height and zoom styles immediately
    setImgHeight(state.imgHeight);

    overlay.addEventListener('click', handleOverlayClick);

    renderQuestionsUI();
    updateLearnedCounterUI();

    // Start auto-scraping answers
    runScraping(state.questions);
  }

  // ══════════════════════════════════════════════════════════════
  //  MASTER EVENT DELEGATION
  // ══════════════════════════════════════════════════════════════
  function handleOverlayClick(e) {
    const target = e.target.closest('[data-action], [data-filter]');
    if (!target) return;

    const action = target.dataset.action;

    // Filter clicks
    if (target.dataset.filter) {
      setFilter(target.dataset.filter);
      return;
    }

    // Top action buttons
    if (action === 'close') {
      closeOverlay();
      return;
    }
    if (action === 'rescan') {
      runScraping(state.questions);
      return;
    }
    if (action === 'export') {
      exportResultsJSON();
      return;
    }
    if (action === 'toggle-all-learned') {
      toggleAllExamLearned();
      return;
    }

    // Header Global Zoom
    if (action === 'global-zoom-in') {
      adjustGlobalZoom(20);
      return;
    }
    if (action === 'global-zoom-out') {
      adjustGlobalZoom(-20);
      return;
    }
    if (action === 'global-zoom-val') {
      const val = parseInt(target.dataset.val, 10);
      setGlobalZoom(val);
      return;
    }

    // Per-Card Zoom Buttons -> Updates ALL Images and synchronizes position!
    if (action === 'zoom-in') {
      const container = target.closest('.fuo-q-card')?.querySelector('.fuo-img-scrollable');
      adjustGlobalZoom(25, container);
      return;
    }
    if (action === 'zoom-in-max') {
      const container = target.closest('.fuo-q-card')?.querySelector('.fuo-img-scrollable');
      setGlobalZoom(180, container);
      return;
    }
    if (action === 'zoom-out') {
      const container = target.closest('.fuo-q-card')?.querySelector('.fuo-img-scrollable');
      adjustGlobalZoom(-25, container);
      return;
    }
    if (action === 'zoom-reset') {
      const container = target.closest('.fuo-q-card')?.querySelector('.fuo-img-scrollable');
      setGlobalZoom(100, container);
      return;
    }
    if (action === 'zoom-fullscreen') {
      const url = target.dataset.url;
      if (url) openFullscreenZoom(url);
      return;
    }

    // Single Question Toggle Learned
    if (action === 'toggle-learned') {
      const qNum = parseInt(target.dataset.q, 10);
      toggleLearned(qNum);
      return;
    }

    // Height Adjustment (Cắt bớt khoảng trắng bên dưới ảnh)
    if (action === 'set-height') {
      const h = parseInt(target.dataset.height, 10);
      setImgHeight(h);
      return;
    }
  }

  // Fullscreen modal click handler
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('fuo-zoom-modal');
    if (!modal) return;

    const action = e.target.dataset.action;
    if (action === 'modal-close') { modal.remove(); return; }
    if (action === 'modal-zoom-in') { adjustModalZoom(25); return; }
    if (action === 'modal-zoom-out') { adjustModalZoom(-25); return; }
    if (action === 'modal-zoom-reset') { adjustModalZoom(0); return; }
  });

  // ══════════════════════════════════════════════════════════════
  //  KEYBOARD NAVIGATION (ArrowDown / ArrowUp)
  //  "mỗi lần nhấn mũi tên đi xuống trên bàn phím là 1 câu hỏi"
  // ══════════════════════════════════════════════════════════════
  function getVisibleCards() {
    return Array.from(document.querySelectorAll('.fuo-q-card')).filter(card => {
      return card.style.display !== 'none' && card.offsetParent !== null;
    });
  }

  function scrollToQuestionCard(card) {
    if (!card) return;
    const container = document.getElementById('fuo-q-container');
    if (!container) return;

    // Highlight focused card
    document.querySelectorAll('.fuo-q-card.fuo-focused-card').forEach(c => {
      c.classList.remove('fuo-focused-card');
    });
    card.classList.add('fuo-focused-card');

    // Perfect vertical centering in viewport so card is never cut off!
    const containerH = container.clientHeight;
    const cardH = card.offsetHeight;
    const centerOffset = Math.max(20, Math.floor((containerH - cardH) / 2));
    const targetScroll = Math.max(0, card.offsetTop - centerOffset);

    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });

    setTimeout(() => {
      card.classList.remove('fuo-focused-card');
    }, 1200);
  }

  function navigateQuestion(direction) {
    const container = document.getElementById('fuo-q-container');
    if (!container) return;

    const cards = getVisibleCards();
    if (cards.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const viewportCenterY = containerRect.top + containerRect.height / 2;

    // Find the card closest to the vertical center of the container
    let closestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;
      const dist = Math.abs(cardCenterY - viewportCenterY);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }

    let targetIdx = closestIdx;
    if (direction > 0) {
      targetIdx = Math.min(cards.length - 1, closestIdx + 1);
    } else {
      targetIdx = Math.max(0, closestIdx - 1);
    }

    scrollToQuestionCard(cards[targetIdx]);
  }

  // Global keydown listener for seamless navigation
  window.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('fuo-mln-overlay');
    if (!overlay) return;

    // Skip if user is in an input / textarea
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
      return;
    }

    // Modal takes precedence for Escape
    const modal = document.getElementById('fuo-zoom-modal');
    if (modal) {
      if (e.key === 'Escape') {
        modal.remove();
        e.preventDefault();
      }
      return;
    }

    // Down arrow or PageDown: Next question (Centered in viewport)
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      navigateQuestion(1);
      return;
    }

    // Up arrow or PageUp: Previous question (Centered in viewport)
    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      navigateQuestion(-1);
      return;
    }

    // Escape closes overlay safely
    if (e.key === 'Escape') {
      e.preventDefault();
      closeOverlay();
      return;
    }
  });

  // Render question cards with Full HD images & Synchronized Zoom Toolbars
  function renderQuestionsUI() {
    const container = document.getElementById('fuo-q-container');
    container.innerHTML = '';

    state.questions.forEach(q => {
      const isLearned = !!state.learnedMap[q.num];
      const card = document.createElement('div');
      card.className = `fuo-q-card ${isLearned ? 'is-learned' : ''}`;
      card.id = `fuo-card-${q.num}`;

      card.innerHTML = `
        <div class="fuo-q-header">
          <span class="fuo-q-num">Câu ${q.num}</span>
          <span class="fuo-q-title">${escapeHtml(q.name)}</span>
          
          <button class="fuo-toggle-learned-btn ${isLearned ? 'active' : ''}" 
                  id="fuo-learn-btn-${q.num}" 
                  data-action="toggle-learned"
                  data-q="${q.num}">
            ${isLearned ? '✔ <span>Đã học</span>' : '○ <span>Chưa học</span>'}
          </button>
        </div>
        <div class="fuo-q-body">
          <!-- LEFT: Image with Synchronized Zoom Toolbar -->
          <div class="fuo-img-wrapper">
            <div class="fuo-zoom-toolbar">
              <span style="color:var(--fuo-muted);font-weight:700">🔍 Zoom:</span>
              <button class="fuo-zoom-btn" data-action="zoom-out" title="Thu nhỏ tất cả ảnh">− 25%</button>
              <span class="fuo-zoom-level-text" id="fuo-zoom-text-${q.num}">${state.globalZoom}%</span>
              <button class="fuo-zoom-btn" data-action="zoom-in" title="Phóng to tất cả ảnh">+ 25%</button>
              <button class="fuo-zoom-btn" data-action="zoom-in-max" title="Zoom 180% tất cả ảnh">180%</button>
              <button class="fuo-zoom-btn" data-action="zoom-reset" title="Về 100% tất cả ảnh">⟲ 100%</button>

              <span style="margin-left:8px;color:var(--fuo-muted);font-weight:700">↕ Khung ảnh:</span>
              <button class="fuo-zoom-btn ${state.imgHeight===240?'active':''}" data-action="set-height" data-height="240" title="Cắt ngắn (240px)">240px</button>
              <button class="fuo-zoom-btn ${state.imgHeight===290?'active':''}" data-action="set-height" data-height="290" title="Chuẩn tối ưu câu & đáp án (290px)">Chuẩn 290px</button>
              <button class="fuo-zoom-btn ${state.imgHeight===360?'active':''}" data-action="set-height" data-height="360" title="Vừa thoải mái (360px)">360px</button>

              <button class="fuo-zoom-btn" style="margin-left:auto" data-action="zoom-fullscreen" data-url="${escapeHtml(q.hdUrl)}">⛶ Toàn Màn Hình</button>
            </div>
            <div class="fuo-img-scrollable" title="Kéo để di chuyển • Ctrl+Lăn chuột để Zoom">
              <img id="fuo-img-${q.num}" src="${escapeHtml(q.hdUrl)}" alt="Câu ${q.num} Full HD" loading="lazy" style="width:${state.globalZoom}%" />
            </div>
          </div>

          <!-- RIGHT: Pure Big Red Community Most-Voted Answer (NO ABCD buttons) -->
          <div class="fuo-side-panel">
            <div class="fuo-com-box loading" id="fuo-com-box-${q.num}">
              <div class="fuo-com-tag" id="fuo-com-tag-${q.num}">🔴 ĐA CỘNG ĐỒNG</div>
              <div class="fuo-com-letter" id="fuo-com-letter-${q.num}">⏳</div>
              <div class="fuo-com-votes" id="fuo-com-votes-${q.num}">Đang tải bình luận...</div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);

      // Setup scroll & drag sync for this container
      const scrollable = card.querySelector('.fuo-img-scrollable');
      setupScrollableContainer(scrollable);
    });
  }

  // Update card UI after scraping answer (Supports Single & Multi-Select Answers)
  function updateQuestionUI(q) {
    const box = document.getElementById(`fuo-com-box-${q.num}`);
    const tagEl = document.getElementById(`fuo-com-tag-${q.num}`);
    const letterEl = document.getElementById(`fuo-com-letter-${q.num}`);
    const votesEl = document.getElementById(`fuo-com-votes-${q.num}`);
    if (!box) return;

    if (q.status === 'loading') {
      box.className = 'fuo-com-box loading';
      if (tagEl) tagEl.textContent = '🔴 ĐA CỘNG ĐỒNG';
      letterEl.textContent = '⏳';
      votesEl.textContent = 'Đang quét bình luận...';
      return;
    }

    if (q.status === 'error') {
      box.className = 'fuo-com-box loading';
      if (tagEl) tagEl.textContent = '🔴 ĐA CỘNG ĐỒNG';
      letterEl.textContent = '⚠';
      letterEl.style.fontSize = '44px';
      votesEl.textContent = `Lỗi tải bình luận (${q.error}). Bấm Quét Lại để thử lại.`;
      return;
    }

    if (q.winners && q.winners.length > 0) {
      box.className = 'fuo-com-box';
      const isMulti = q.winners.length > 1;

      if (tagEl) {
        if (q.isTie) {
          tagEl.textContent = '🔴 ĐỒNG PHIẾU';
        } else {
          tagEl.textContent = isMulti ? `🔴 CHỌN NHIỀU ĐÁP ÁN (${q.winners.length} ĐA)` : '🔴 ĐA CHỌN NHIỀU NHẤT';
        }
      }

      // Display winning letter(s): "D" or "A , C" or "A , B , D"
      letterEl.textContent = q.winners.join(' , ');

      // Adjust letter font size dynamically for multiple answers
      if (q.winners.length === 1) {
        letterEl.style.fontSize = '46px';
      } else if (q.winners.length === 2) {
        letterEl.style.fontSize = '32px';
      } else {
        letterEl.style.fontSize = '24px';
      }

      // Highlight winning letter(s) in vote pills
      votesEl.innerHTML = ['A', 'B', 'C', 'D'].map(opt => {
        const isWin = q.winners.includes(opt);
        return `<span class="fuo-vote-pill ${isWin ? 'winner' : ''}">${opt}: ${q.votes[opt]}</span>`;
      }).join('');
    } else {
      box.className = 'fuo-com-box loading';
      if (tagEl) tagEl.textContent = '🔴 ĐA CỘNG ĐỒNG';
      letterEl.textContent = '–';
      letterEl.style.fontSize = '44px';
      votesEl.textContent = 'Chưa có bình luận';
    }
  }

  function updateProgressUI() {
    const textEl = document.getElementById('fuo-progress-text');
    if (!textEl) return;
    if (state.isScanning) {
      textEl.innerHTML = `⚡ Đang quét: <strong>${state.scannedCount}/${state.questions.length}</strong> câu`;
      return;
    }

    const total = state.questions.length;
    const failed = state.questions.filter(q => q.status === 'error').length;
    if (failed > 0) {
      textEl.innerHTML = `⚠ Quét được <strong>${total - failed}/${total}</strong> câu, <strong>${failed}</strong> câu bị lỗi`;
    } else {
      textEl.innerHTML = `✅ Đã quét xong <strong>${total}/${total}</strong> câu!`;
    }
  }

  function exportResultsJSON() {
    const answers = {};
    const votesData = {};
    state.questions.forEach(q => {
      answers[q.num] = q.communityAnswer;
      votesData[q.num] = q.votes;
    });

    const data = JSON.stringify({
      threadId: state.threadId,
      threadTitle: state.threadTitle,
      threadUrl: window.location.href,
      dev: 'thanh duyvp',
      totalQuestions: state.questions.length,
      learnedQuestions: Object.keys(state.learnedMap).map(n=>parseInt(n)),
      communityAnswers: answers,
      voteDetails: votesData
    }, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `MLN122_${state.threadId || 'exam'}_answers.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  // ══════════════════════════════════════════════════════════════
  //  INIT DISPATCHER
  // ══════════════════════════════════════════════════════════════
  function init() {
    console.log('%c[FuOverflow MLN122 Pro]%c dev by thanh duyvp', 'color: #38bdf8; font-weight: bold; font-size: 12px;', 'color: #a855f7; font-weight: bold;');
    const path = window.location.pathname;
    if (path.includes('/threads/')) {
      initThreadLauncher();
    } else if (path.includes('/forums/')) {
      initForumListPage();
    }
  }

  restoreLearnedData().then(init);

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

})();
