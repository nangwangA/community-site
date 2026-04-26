function greetingByHour() {
  const hour = new Date().getHours();
  if (hour < 6) return '深夜';
  if (hour < 12) return '早上';
  if (hour < 18) return '下午';
  return '晚上';
}

function buildAvatarColor(name) {
  const palette = ['#5b7187', '#7e6a9f', '#8a6b5f', '#6f8c76', '#607d8b', '#9b7b59'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i) * (i + 3);
  return palette[Math.abs(hash) % palette.length];
}

function renderNavbar(activePage, user) {
  const displayName = user ? (user.nickname || user.username || '用户') : '访客';
  const avatarChar = displayName.charAt(0).toUpperCase();
  const avatarColor = buildAvatarColor(displayName);
  const extraText = user ? `${greetingByHour()}好${user.role === 1 ? ' · 管理员' : ''}` : '未登录';

  let avatarHtml = `<div class="user-avatar-sm" style="background:${avatarColor}">${avatarChar}</div>`;
  if (user && user.avatar) {
    avatarHtml = `<div class="user-avatar-sm has-image" style="background-image:url('${escapeAttr(user.avatar)}');background-color:#fff"></div>`;
  }

  const menuItems = [
    { key: 'home', label: '首页', href: '/index.html' },
    { key: 'publish', label: '写文章', href: '/publish.html' },
    { key: 'search', label: '搜索', href: '/search.html' }
  ];

  if (user) {
    menuItems.push({ key: 'profile', label: '个人中心', href: '/profile.html' });
    if (user.role === 1) menuItems.push({ key: 'admin', label: '管理后台', href: '/admin.html' });
    menuItems.push({ key: 'logout', label: '退出', href: '#' });
  } else {
    menuItems.push({ key: 'login', label: '登录', href: '/login.html' });
    menuItems.push({ key: 'register', label: '注册', href: '/register.html' });
  }

  let menuHtml = '';
  for (const item of menuItems) {
    const cls = item.key === activePage ? 'active' : '';
    if (item.key === 'logout') {
      menuHtml += `<a href="#" class="${cls}" onclick="doLogout();return false;">${item.label}</a>`;
    } else {
      menuHtml += `<a href="${item.href}" class="${cls}">${item.label}</a>`;
    }
  }

  return `
<header class="nav">
  <div class="container nav-inner">
    <div class="brand-wrap">
      <a class="brand" href="/index.html">轻社区</a>
      <a class="user-chip" href="${user ? '/profile.html' : '/login.html'}" title="${user ? '进入个人中心' : '去登录'}">
        ${avatarHtml}
        <div class="user-meta">
          <div class="user-name">${displayName}</div>
          <div class="user-extra">${extraText}</div>
        </div>
      </a>
    </div>
    <nav class="menu">${menuHtml}</nav>
    <button class="menu-toggle" onclick="document.querySelector('.menu').classList.toggle('show')">☰</button>
  </div>
</header>`;
}

function renderFooter() {
  return `
<footer>
  <div class="container footer-inner">
    <div class="footer-brand">✦ 轻社区</div>
    <p class="footer-slogan">记录文字，分享日常 · 用文字温暖彼此</p>
    <div class="footer-links">
      <a href="/index.html">首页</a>
      <a href="/search.html">搜索</a>
      <a href="/publish.html">写文章</a>
      <a href="/profile.html">个人中心</a>
      <a href="/admin.html">管理后台</a>
    </div>
    <div class="socials">
      <span>📝 随笔</span><span>🌿 日常</span><span>✨ 治愈</span><span>💬 杂谈</span><span>📚 读书</span><span>🎨 创作</span>
    </div>
    <div class="foot-divider"></div>
    <p class="foot-note">
      © 2026 轻社区 · 图文分享平台<br>
      本站内容均为用户原创 · 请遵守相关法律法规<br>
      用心记录每一刻美好时光
    </p>
  </div>
</footer>`;
}

function doLogout() {
  removeToken();
  showToast('已退出登录', 'info');
  setTimeout(() => window.location.href = '/index.html', 800);
}
