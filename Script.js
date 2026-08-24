// =========================================================
// SIGNAL — mobile social feed interactions
// =========================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------
     Toast helper
  --------------------------------------------------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(message){
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 1800);
  }

  /* ---------------------------------------------------
     Search bar toggle
  --------------------------------------------------- */
  const searchToggle = document.getElementById('searchToggle');
  const searchBar = document.getElementById('searchBar');
  const searchInput = document.getElementById('searchInput');

  searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('is-open');
    if (searchBar.classList.contains('is-open')) {
      setTimeout(() => searchInput.focus(), 200);
    } else {
      searchInput.value = '';
      filterPosts('');
    }
  });

  searchInput.addEventListener('input', (e) => {
    filterPosts(e.target.value.trim().toLowerCase());
  });

  function filterPosts(query){
    const posts = document.querySelectorAll('.post');
    posts.forEach(post => {
      const user = post.dataset.user.toLowerCase();
      const caption = post.dataset.caption.toLowerCase();
      const matches = !query || user.includes(query) || caption.includes(query);
      post.style.display = matches ? '' : 'none';
    });
  }

  /* ---------------------------------------------------
     Notification bell
  --------------------------------------------------- */
  const bellBtn = document.getElementById('bellBtn');
  bellBtn.addEventListener('click', () => {
    const badge = bellBtn.querySelector('.badge');
    if (badge) badge.remove();
    showToast('You\'re all caught up on notifications');
  });

  /* ---------------------------------------------------
     Like button — toggle state, animate, update count
  --------------------------------------------------- */
  document.querySelectorAll('.like-btn').forEach(btn => {
    const countEl = btn.querySelector('.like-count');
    btn.addEventListener('click', () => {
      const liked = btn.classList.toggle('is-liked');
      btn.setAttribute('aria-pressed', String(liked));
      let count = parseInt(countEl.textContent, 10) || 0;
      count = liked ? count + 1 : count - 1;
      countEl.textContent = count;
      // restart pop animation
      btn.classList.remove('is-liked');
      void btn.offsetWidth;
      if (liked) btn.classList.add('is-liked');
    });
  });

  /* ---------------------------------------------------
     Save / bookmark button
  --------------------------------------------------- */
  document.querySelectorAll('.save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const saved = btn.classList.toggle('is-saved');
      btn.setAttribute('aria-pressed', String(saved));
      showToast(saved ? 'Saved to your collection' : 'Removed from collection');
    });
  });

  /* ---------------------------------------------------
     Comment button — placeholder interaction
  --------------------------------------------------- */
  document.querySelectorAll('.comment-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Comments open here'));
  });

  /* ---------------------------------------------------
     Share button
  --------------------------------------------------- */
  document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Link copied to clipboard'));
  });

  /* ---------------------------------------------------
     Bottom nav — active state switching
  --------------------------------------------------- */
  const navBtns = document.querySelectorAll('.nav-btn[data-view]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const view = btn.dataset.view;
      if (view !== 'home') {
        showToast(view.charAt(0).toUpperCase() + view.slice(1) + ' — coming soon');
      }
    });
  });

  /* ---------------------------------------------------
     Compose modal
  --------------------------------------------------- */
  const composeBtn = document.getElementById('composeBtn');
  const composeOverlay = document.getElementById('composeOverlay');
  const composeCancel = document.getElementById('composeCancel');
  const composeSubmit = document.getElementById('composeSubmit');
  const composeText = document.getElementById('composeText');
  const charCount = document.getElementById('charCount');

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
  composeOverlay.addEventListener('click', (e) => {
    if (e.target === composeOverlay) closeCompose();
  });

  composeText.addEventListener('input', () => {
    const len = composeText.value.length;
    charCount.textContent = `${len} / 240`;
    composeSubmit.disabled = len === 0;
  });

  composeSubmit.addEventListener('click', () => {
    if (!composeText.value.trim()) return;
    prependNewPost(composeText.value.trim());
    closeCompose();
    showToast('Posted');
  });

  function prependNewPost(text){
    const postList = document.getElementById('postList');
    const article = document.createElement('article');
    article.className = 'post';
    article.dataset.user = 'you';
    article.dataset.caption = text.toLowerCase();

    article.innerHTML = `
      <div class="post-head">
        <div class="post-avatar" style="background:linear-gradient(135deg,#D8FF5E,#8B7CFF)">Y</div>
        <div class="post-who">
          <span class="post-name">you</span>
          <span class="post-time">just now</span>
        </div>
        <button class="icon-btn small" aria-label="More options">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>
        </button>
      </div>
      <div class="post-actions" style="margin-top:0;">
        <button class="act-btn like-btn" aria-pressed="false" aria-label="Like">
          <svg class="ic-heart" viewBox="0 0 24 24" fill="none"><path d="M12 20.5s-7.5-4.6-10-9.3C.6 8 2 4.3 5.7 3.6 8.2 3.1 10.4 4.4 12 6.7c1.6-2.3 3.8-3.6 6.3-3.1 3.7.7 5.1 4.4 3.7 7.6-2.5 4.7-10 9.3-10 9.3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
          <span class="like-count">0</span>
        </button>
        <button class="act-btn comment-btn" aria-label="Comment">
          <svg viewBox="0 0 24 24" fill="none"><path d="M21 12a8 8 0 1 1-3.2-6.4L21 4l-1 4.2A7.96 7.96 0 0 1 21 12Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
          <span>0</span>
        </button>
        <button class="act-btn share-btn" aria-label="Share">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="act-btn save-btn" aria-pressed="false" aria-label="Save" style="margin-left:auto">
          <svg class="ic-bookmark" viewBox="0 0 24 24" fill="none"><path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <p class="post-caption"><span class="post-name">you</span> ${escapeHtml(text)}</p>
    `;

    postList.prepend(article);

    // wire up the new buttons
    article.querySelector('.like-btn').addEventListener('click', function(){
      const countEl = this.querySelector('.like-count');
      const liked = this.classList.toggle('is-liked');
      this.setAttribute('aria-pressed', String(liked));
      let count = parseInt(countEl.textContent, 10) || 0;
      countEl.textContent = liked ? count + 1 : count - 1;
    });
    article.querySelector('.save-btn').addEventListener('click', function(){
      const saved = this.classList.toggle('is-saved');
      showToast(saved ? 'Saved to your collection' : 'Removed from collection');
    });
    article.querySelector('.comment-btn').addEventListener('click', () => showToast('Comments open here'));
    article.querySelector('.share-btn').addEventListener('click', () => showToast('Link copied to clipboard'));
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------------------------------------------
     Story viewer
  --------------------------------------------------- */
  const storyViewer = document.getElementById('storyViewer');
  const storyClose = document.getElementById('storyClose');
  const viewerAvatar = document.getElementById('viewerAvatar');
  const viewerName = document.getElementById('viewerName');
  const viewerBody = document.getElementById('viewerBody');
  const progressBarWrap = document.querySelector('.story-progress');

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

  document.querySelector('.story--self').addEventListener('click', () => {
    openCompose();
  });

  function closeStory(){
    storyViewer.classList.remove('is-open');
    progressBarWrap.classList.remove('is-running');
    clearTimeout(storyViewer._timer);
  }
  storyClose.addEventListener('click', closeStory);
  storyViewer.addEventListener('click', (e) => {
    if (e.target === storyViewer) closeStory();
  });

  /* ---------------------------------------------------
     Escape key closes modal / story
  --------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCompose();
      closeStory();
    }
  });

});
