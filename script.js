// =========================================================
// SIGNAL — mobile social feed
// Auth + posts + likes are backed by Firebase (real accounts,
// real saved data). Stories/comments/share are still a visual
// demo layer — not wired to a database yet.
// =========================================================

let currentUser = null;
let unsubscribePosts = null;

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------
     Element references
  --------------------------------------------------- */
  const authScreen   = document.getElementById('authScreen');
  const appShell      = document.querySelector('.app');

  const authTabs      = document.querySelectorAll('.auth-tab');
  const loginForm      = document.getElementById('loginForm');
  const signupForm    = document.getElementById('signupForm');
  const loginError    = document.getElementById('loginError');
  const signupError    = document.getElementById('signupError');

  const postList      = document.getElementById('postList');
  const emptyState    = document.getElementById('emptyState');
  const endOfFeed      = document.getElementById('endOfFeed');

  const toastEl      = document.getElementById('toast');

  const searchToggle  = document.getElementById('searchToggle');
  const searchBar      = document.getElementById('searchBar');
  const searchInput    = document.getElementById('searchInput');

  const bellBtn        = document.getElementById('bellBtn');

  const composeBtn      = document.getElementById('composeBtn');
  const composeOverlay  = document.getElementById('composeOverlay');
  const composeCancel  = document.getElementById('composeCancel');
  const composeSubmit  = document.getElementById('composeSubmit');
  const composeText    = document.getElementById('composeText');
  const charCount      = document.getElementById('charCount');

  const profileBtn    = document.getElementById('profileBtn');
  const navAvatar      = document.getElementById('navAvatar');
  const accountOverlay = document.getElementById('accountOverlay');
  const accountClose  = document.getElementById('accountClose');
  const accountAvatar = document.getElementById('accountAvatar');
  const accountName    = document.getElementById('accountName');
  const accountEmail  = document.getElementById('accountEmail');
  const logoutBtn      = document.getElementById('logoutBtn');

  const storyViewer    = document.getElementById('storyViewer');
  const storyClose    = document.getElementById('storyClose');
  const viewerAvatar  = document.getElementById('viewerAvatar');
  const viewerName    = document.getElementById('viewerName');
  const viewerBody    = document.getElementById('viewerBody');
  const progressBarWrap = document.querySelector('.story-progress');

  /* ---------------------------------------------------
     Toast helper
  --------------------------------------------------- */
  let toastTimer = null;
  function showToast(message){
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 1800);
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function initialOf(name){
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
  }

  function timeAgo(timestamp){
    if (!timestamp || !timestamp.toDate) return 'just now';
    const diffMs = Date.now() - timestamp.toDate().getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  /* =====================================================
     AUTH — sign up, log in, log out, auth-state gating
  ===================================================== */

  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      authTabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const isLogin = tab.dataset.tab === 'login';
      loginForm.style.display = isLogin ? 'flex' : 'none';
      signupForm.style.display = isLogin ? 'none' : 'flex';
      loginError.textContent = '';
      signupError.textContent = '';
    });
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    auth.signInWithEmailAndPassword(email, password)
      .catch(err => { loginError.textContent = friendlyAuthError(err); });
  });

  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signupError.textContent = '';
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    auth.createUserWithEmailAndPassword(email, password)
      .then(cred => cred.user.updateProfile({ displayName: name }))
      .catch(err => { signupError.textContent = friendlyAuthError(err); });
  });

  function friendlyAuthError(err){
    const map = {
      'auth/email-already-in-use': 'That email already has an account — try logging in.',
      'auth/invalid-email': 'That email address doesn\u2019t look right.',
      'auth/weak-password': 'Password needs to be at least 6 characters.',
      'auth/user-not-found': 'No account with that email — try signing up.',
      'auth/wrong-password': 'Wrong password — try again.',
      'auth/invalid-credential': 'Email or password is incorrect.',
      'auth/too-many-requests': 'Too many attempts — wait a moment and try again.'
    };
    return map[err.code] || 'Something went wrong — try again.';
  }

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      authScreen.style.display = 'none';
      appShell.style.display = 'flex';
      const initial = initialOf(user.displayName || user.email);
      navAvatar.textContent = initial;
      accountAvatar.textContent = initial;
      accountName.textContent = user.displayName || 'signal user';
      accountEmail.textContent = user.email || '';
      subscribeToPosts();
    } else {
      authScreen.style.display = 'flex';
      appShell.style.display = 'none';
      loginForm.reset();
      signupForm.reset();
      if (unsubscribePosts) { unsubscribePosts(); unsubscribePosts = null; }
      postList.innerHTML = '';
    }
  });

  profileBtn.addEventListener('click', () => accountOverlay.classList.add('is-open'));
  accountClose.addEventListener('click', () => accountOverlay.classList.remove('is-open'));
  accountOverlay.addEventListener('click', (e) => {
    if (e.target === accountOverlay) accountOverlay.classList.remove('is-open');
  });
  logoutBtn.addEventListener('click', () => {
    auth.signOut();
    accountOverlay.classList.remove('is-open');
  });

  /* =====================================================
     POSTS — live from Firestore
  ===================================================== */

  function subscribeToPosts(){
    if (unsubscribePosts) unsubscribePosts();
    unsubscribePosts = db.collection('posts')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        postList.innerHTML = '';
        if (snapshot.empty) {
          emptyState.style.display = 'block';
          endOfFeed.style.display = 'none';
          return;
        }
        emptyState.style.display = 'none';
        endOfFeed.style.display = 'block';
        snapshot.forEach(doc => renderPost(doc.id, doc.data()));
        filterPosts(searchInput.value.trim().toLowerCase());
      }, err => {
        console.error(err);
        showToast('Could not load posts — check your connection');
      });
  }

  function renderPost(id, data){
    const likedBy = data.likedBy || [];
    const isLiked = !!(currentUser && likedBy.includes(currentUser.uid));
    const name = data.name || 'unknown';
    const initial = initialOf(name);

    const article = document.createElement('article');
    article.className = 'post';
    article.dataset.user = name.toLowerCase();
    article.dataset.caption = (data.text || '').toLowerCase();

    article.innerHTML = `
      <div class="post-head">
        <div class="post-avatar" style="background:linear-gradient(135deg,#D8FF5E,#8B7CFF)">${escapeHtml(initial)}</div>
        <div class="post-who">
          <span class="post-name">${escapeHtml(name)}</span>
          <span class="post-time">${timeAgo(data.createdAt)}</span>
        </div>
      </div>
      <div class="post-actions" style="margin-top:0;">
        <button class="act-btn like-btn${isLiked ? ' is-liked' : ''}" aria-pressed="${isLiked}" aria-label="Like">
          <svg class="ic-heart" viewBox="0 0 24 24" fill="none"><path d="M12 20.5s-7.5-4.6-10-9.3C.6 8 2 4.3 5.7 3.6 8.2 3.1 10.4 4.4 12 6.7c1.6-2.3 3.8-3.6 6.3-3.1 3.7.7 5.1 4.4 3.7 7.6-2.5 4.7-10 9.3-10 9.3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
          <span class="like-count">${likedBy.length}</span>
        </button>
        <button class="act-btn comment-btn" aria-label="Comment">
          <svg viewBox="0 0 24 24" fill="none"><path d="M21 12a8 8 0 1 1-3.2-6.4L21 4l-1 4.2A7.96 7.96 0 0 1 21 12Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
          <span>0</span>
        </button>
        <button class="act-btn share-btn" aria-label="Share">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <p class="post-caption"><span class="post-name">${escapeHtml(name)}</span> ${escapeHtml(data.text || '')}</p>
    `;

    article.querySelector('.like-btn').addEventListener('click', () => toggleLike(id, likedBy));
    article.querySelector('.comment-btn').addEventListener('click', () => showToast('Comments are coming in a future update'));
    article.querySelector('.share-btn').addEventListener('click', () => showToast('Link copied to clipboard'));

    postList.appendChild(article);
  }

  function toggleLike(postId, likedBy){
    if (!currentUser) return;
    const ref = db.collection('posts').doc(postId);
    const uid = currentUser.uid;
    const action = likedBy.includes(uid)
      ? firebase.firestore.FieldValue.arrayRemove(uid)
      : firebase.firestore.FieldValue.arrayUnion(uid);
    ref.update({ likedBy: action }).catch(() => showToast('Could not update like — try again'));
  }

  /* ---------------------------------------------------
     Search filter (client-side, over rendered posts)
  --------------------------------------------------- */
  function filterPosts(query){
    document.querySelectorAll('.post').forEach(post => {
      const matches = !query || post.dataset.user.includes(query) || post.dataset.caption.includes(query);
      post.style.display = matches ? '' : 'none';
    });
  }

  searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('is-open');
    if (searchBar.classList.contains('is-open')) {
      setTimeout(() => searchInput.focus(), 200);
    } else {
      searchInput.value = '';
      filterPosts('');
    }
  });
  searchInput.addEventListener('input', (e) => filterPosts(e.target.value.trim().toLowerCase()));

  bellBtn.addEventListener('click', () => {
    const badge = bellBtn.querySelector('.badge');
    if (badge) badge.remove();
    showToast('You\u2019re all caught up on notifications');
  });

  /* =====================================================
     COMPOSE — writes a new post to Firestore
  ===================================================== */

  function openCompose(){
    composeOverlay.classList.add('is-open');
    setTimeout(() => composeText.focus(), 250);
  }
  function closeCompose(){
    composeOverlay.classList.remove('is-open');
    composeText.value = '';
    charCount.textContent = '0 / 240';
    composeSubmit.disabled = true;
  }

  composeBtn.addEventListener('click', openCompose);
  composeCancel.addEventListener('click', closeCompose);
  composeOverlay.addEventListener('click', (e) => { if (e.target === composeOverlay) closeCompose(); });

  composeText.addEventListener('input', () => {
    const len = composeText.value.length;
    charCount.textContent = `${len} / 240`;
    composeSubmit.disabled = len === 0;
  });

  composeSubmit.addEventListener('click', () => {
    const text = composeText.value.trim();
    if (!text || !currentUser) return;
    composeSubmit.disabled = true;
    db.collection('posts').add({
      uid: currentUser.uid,
      name: currentUser.displayName || (currentUser.email || 'user').split('@')[0],
      text: text,
      likedBy: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => { closeCompose(); showToast('Posted'); })
    .catch(() => { showToast('Could not post — try again'); composeSubmit.disabled = false; });
  });

  /* =====================================================
     BOTTOM NAV — active state (Home / Explore / Activity)
  ===================================================== */
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const view = btn.dataset.view;
      if (view !== 'home') showToast(view.charAt(0).toUpperCase() + view.slice(1) + ' — coming soon');
    });
  });

  /* =====================================================
     STORIES — still a visual demo, not backed by data yet
  ===================================================== */
  document.querySelectorAll('.story:not(.story--self)').forEach(story => {
    story.addEventListener('click', () => {
      const name = story.dataset.name;
      const avatarBg = story.querySelector('.story-avatar').style.background;
      viewerName.textContent = name.toLowerCase();
      viewerAvatar.style.background = avatarBg;
      viewerBody.style.background = avatarBg;
      viewerBody.textContent = name.charAt(0);
      storyViewer.classList.add('is-open');
      progressBarWrap.classList.remove('is-running');
      void progressBarWrap.offsetWidth;
      progressBarWrap.classList.add('is-running');
      clearTimeout(storyViewer._timer);
      storyViewer._timer = setTimeout(closeStory, 4000);
    });
  });

  const selfStory = document.querySelector('.story--self');
  if (selfStory) selfStory.addEventListener('click', openCompose);

  function closeStory(){
    storyViewer.classList.remove('is-open');
    progressBarWrap.classList.remove('is-running');
    clearTimeout(storyViewer._timer);
  }
  storyClose.addEventListener('click', closeStory);
  storyViewer.addEventListener('click', (e) => { if (e.target === storyViewer) closeStory(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeCompose(); closeStory(); accountOverlay.classList.remove('is-open'); }
  });

});
