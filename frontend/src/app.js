import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './analytics.css';
import './chart.css';

const h = React.createElement;

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function App() {
  const [url, setUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function shorten(event) {
    event.preventDefault();
    setStatus('');
    setShortUrl('');
    setShortCode('');
    setAnalytics(null);
    setAnalyticsError('');
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
    try {
      new URL(normalizedUrl);
    } catch {
      setStatus('Enter a valid web address and try again.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longUrl: normalizedUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We couldn’t shorten that link.');
      setShortUrl(data.shortUrl);
      setShortCode(data.code);
      setStatus('Your link is ready to share.');
    } catch (error) {
      setStatus(error.message || 'Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const response = await fetch(`/analytics/${encodeURIComponent(shortCode)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load analytics.');
      setAnalytics(data);
    } catch (error) {
      setAnalyticsError(error.message || 'Could not load analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setStatus('Copy wasn’t available here. Select the link to copy it.');
    }
  }

  const dailyChart = analytics ? Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = localDateKey(date);
    const dayData = (analytics.dailyClicks || []).find((item) => item.day === key);
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      clicks: Number(dayData?.clicks || 0),
    };
  }) : [];
  const chartMax = Math.max(1, ...dailyChart.map((day) => day.clicks));

  return h('main', { className: 'page-shell' },
    h('div', { className: 'orb orb-peach' }), h('div', { className: 'orb orb-blue' }),
    h('div', { className: 'page-content' },
      h('nav', { className: 'nav' },
        h('a', { className: 'brand', href: '/', 'aria-label': 'Shortr home' }, h('span', { className: 'brand-mark' }, 's'), 'shortr'),
        h('div', { className: 'nav-links' },
          h('a', { href: '#how-it-works' }, 'How it works'),
          h('a', { className: 'nav-cta', href: '#shorten' }, 'Get started', h('span', null, '↗')))),
      h('section', { className: 'hero', id: 'shorten' },
        h('div', { className: 'eyebrow enter enter-1' }, h('span', { className: 'eyebrow-dot' }), 'A little link goes a long way'),
        h('h1', { className: 'enter enter-2' }, 'Long links?', h('br'), h('span', { className: 'accent' }, 'Gone in a click.')),
        h('p', { className: 'hero-copy enter enter-3' }, 'Make every link easier to share. Shorten it in a click, then send it anywhere.'),
        h('form', { className: 'shorten-form enter enter-4', onSubmit: shorten },
          h('label', { className: 'sr-only', htmlFor: 'long-url' }, 'Long URL'),
          h('span', { className: 'input-icon', 'aria-hidden': true }, '↗'),
          h('input', { id: 'long-url', type: 'text', inputMode: 'url', autoComplete: 'url', placeholder: 'Paste your long link here…', value: url, onChange: e => setUrl(e.target.value), required: true }),
          h('button', { type: 'submit', disabled: loading }, loading ? h(React.Fragment, null, h('span', { className: 'spinner' }), 'Shortening') : h(React.Fragment, null, 'Shorten link', h('span', { className: 'button-arrow' }, '→')))),
        status && h('div', { className: `feedback ${shortUrl ? 'success' : 'error'}`, role: 'status' }, status),
        shortUrl && h('div', { className: 'result-card' },
          h('div', { className: 'result-icon' }, '↗'),
          h('div', { className: 'result-text' }, h('span', null, 'YOUR SHORT LINK'), h('a', { href: shortUrl }, shortUrl)),
          h('button', { className: 'copy-button', type: 'button', onClick: copyLink }, copied ? 'Copied ✓' : 'Copy link')),
        h('div', { className: 'trust-note enter enter-4' }, h('span', null, '✳'), ' Fast, simple, and ready to share'),
        shortUrl && h('div', { className: 'analytics-wrap' },
          h('button', { className: 'analytics-toggle', type: 'button', onClick: loadAnalytics, disabled: analyticsLoading }, analyticsLoading ? 'Loading analytics…' : analytics ? 'Refresh analytics' : 'View analytics'),
          analyticsError && h('p', { className: 'analytics-error', role: 'status' }, analyticsError),
          analytics && h('div', { className: 'analytics-panel' },
            h('div', { className: 'analytics-stats' },
              h('div', null, h('strong', null, analytics.clickCount), h('span', null, 'total clicks')),
              h('div', null, h('strong', null, analytics.createdAt ? new Date(analytics.createdAt).toLocaleString() : '—'), h('span', null, 'created')),
              h('div', null, h('strong', null, analytics.lastClickedAt ? new Date(analytics.lastClickedAt).toLocaleString() : 'No clicks yet'), h('span', null, 'last click'))),
            h('div', { className: 'click-chart' },
              h('div', { className: 'chart-title' }, h('strong', null, 'Clicks over time'), h('span', null, 'Last 7 days')),
              h('div', { className: 'chart-bars' }, dailyChart.map((day, index) => {
                const height = day.clicks ? Math.max(10, (day.clicks / chartMax) * 100) : 3;
                return h('div', { className: 'chart-column', key: day.key, title: `${day.key}: ${day.clicks} clicks` },
                  h('span', { className: 'chart-value' }, day.clicks),
                  h('div', { className: 'chart-track' }, h('div', { className: 'chart-bar', style: { height: `${height}%`, animationDelay: `${index * 65}ms` } })),
                  h('span', { className: 'chart-day' }, day.label));
              }))),
            analytics.recentClicks.length > 0 && h('div', { className: 'recent-clicks' },
              h('span', null, 'RECENT CLICKS'),
              h('ul', null, analytics.recentClicks.map((timestamp, index) => h('li', { key: `${timestamp}-${index}` }, new Date(timestamp).toLocaleString())))))),
        h('div', { className: 'link-demo', 'aria-label': 'A long link becomes a short link' },
          h('div', { className: 'demo-long' }, h('span', { className: 'demo-link-icon' }, '↗'), h('span', null, 'yourwebsite.com/a/very/long/link')), 
          h('div', { className: 'demo-arrow' }, '↓'),
          h('div', { className: 'demo-short' }, h('span', { className: 'demo-spark' }, '✳'), h('span', null, 'shortr.link/hello')))),
      h('section', { className: 'how-section', id: 'how-it-works' },
        h('div', { className: 'section-heading' }, h('span', { className: 'section-kicker' }, 'THE SHORT VERSION'), h('h2', null, 'Three steps. One tiny link.'), h('p', null, 'Everything you need to get from long to lovely.')),
        h('div', { className: 'steps' },
          h('article', { className: 'step-card' }, h('span', { className: 'step-number' }, '01'), h('div', { className: 'step-icon peach' }, '↗'), h('h3', null, 'Drop your link'), h('p', null, 'Paste any long URL into the box above.')),
          h('article', { className: 'step-card' }, h('span', { className: 'step-number' }, '02'), h('div', { className: 'step-icon blue' }, '✳'), h('h3', null, 'Make it short'), h('p', null, 'One click gives you a neat, shareable link.')),
          h('article', { className: 'step-card' }, h('span', { className: 'step-number' }, '03'), h('div', { className: 'step-icon yellow' }, '↗'), h('h3', null, 'Send it anywhere'), h('p', null, 'Copy your new link and share it your way.')))),
      h('footer', { className: 'footer' }, h('a', { className: 'brand footer-brand', href: '/' }, h('span', { className: 'brand-mark' }, 's'), 'shortr'), h('span', null, 'Small links. Big possibilities.'), h('a', { href: '#shorten' }, 'Make a short link ↑'))));
}

createRoot(document.getElementById('root')).render(h(App));
