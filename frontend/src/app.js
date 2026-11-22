import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const h = React.createElement;

function App() {
  const [url, setUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function shorten(event) {
    event.preventDefault();
    setStatus('');
    setShortUrl('');
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
      setStatus('Your link is ready to share.');
    } catch (error) {
      setStatus(error.message || 'Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
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
