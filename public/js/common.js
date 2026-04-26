const API_BASE = '/api';

async function api(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  try {
    const res = await fetch(API_BASE + url, { ...options, headers });
    const data = await res.json();
    if (data.code === 401) {
      removeToken();
      if (!url.includes('/login') && !url.includes('/register')) {
        window.location.href = '/login.html';
      }
      return data;
    }
    return data;
  } catch (err) {
    console.error('API请求错误:', err);
    return { code: 500, message: '网络连接失败' };
  }
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`;
}

function getToken() {
  return localStorage.getItem('token') || getCookie('token');
}

function saveToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
  removeCookie('token');
}

function removeCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg, type = 'info') {
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast-msg toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function showLoading(el) {
  el.innerHTML = '<div class="loading-spinner"><div></div><div></div><div></div><p>加载中...</p></div>';
}

function hideLoading(el, html) {
  el.innerHTML = html;
}

function getPageParam(key, defaultVal = 1) {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get(key)) || defaultVal;
}

let currentUser = null;

async function checkLogin() {
  const token = getToken();
  if (!token) return null;
  const res = await api('/user/profile');
  if (res.code === 200) {
    currentUser = res.data;
    return currentUser;
  }
  return null;
}

function formatContent(content) {
  if (!content) return '';
  let html = escapeHtml(content);
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  if (!html.startsWith('<p>')) html = '<p>' + html;
  if (!html.endsWith('</p>')) html += '</p>';
  return html;
}
