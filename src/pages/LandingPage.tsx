import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────
   ALL STYLES INJECTED INLINE — single-file, zero external CSS
   ───────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

  :root {
    --bg-base:       #ffffff;
    --bg-raised:     #f9f9f9;
    --bg-card:       rgba(220,38,38,0.03);
    --bg-card-hover: rgba(220,38,38,0.06);
    --border:        rgba(220,38,38,0.15);
    --border-accent: rgba(220,38,38,0.35);
    --red-deep:      #b91c1c;
    --red:           #dc2626;
    --red-bright:    #ef4444;
    --red-glow:      rgba(220,38,38,0.15);
    --red-light:     #991b1b;
    --gold:          #f59e0b;
    --gold-light:    #fde68a;
    --white:         #ffffff;
    --gray-100:      #f3f4f6;
    --gray-300:      #6b7280;
    --gray-400:      #4b5563;
    --gray-500:      #9ca3af;
    --gray-600:      #d1d5db;
    --font-display:  'Playfair Display', Georgia, serif;
    --font-body:     'DM Sans', system-ui, sans-serif;
    --font-mono:     'DM Mono', 'Fira Code', monospace;
    --radius-sm:     8px;
    --radius-md:     14px;
    --radius-lg:     22px;
    --radius-xl:     32px;
    --shadow-red:    0 0 60px rgba(220,38,38,0.18), 0 0 120px rgba(220,38,38,0.08);
    --shadow-card:   0 4px 24px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3);
    --transition:    0.3s cubic-bezier(0.4,0,0.2,1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; overflow-x: hidden; }

  body {
    background: var(--bg-base);
    color: #1a1a1a;
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  img { max-width: 100%; display: block; }
  a { color: inherit; text-decoration: none; }
  button { cursor: pointer; border: none; background: none; font-family: inherit; }

  /* ── SCROLLBAR ── */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #f5f5f5; }
  ::-webkit-scrollbar-thumb { background: var(--red); border-radius: 99px; }

  /* ── LAYOUT ── */
  .ug-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 28px;
    width: 100%;
  }

  .ug-section { position: relative; overflow: hidden; }

  /* ── BACKGROUND MESH ── */
  .ug-mesh {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background:
      radial-gradient(ellipse 60% 60% at 15% 20%, rgba(220,38,38,0.08) 0%, transparent 70%),
      radial-gradient(ellipse 50% 50% at 85% 70%, rgba(220,38,38,0.04) 0%, transparent 70%),
      radial-gradient(ellipse 40% 40% at 50% 50%, rgba(245,158,11,0.02) 0%, transparent 70%);
  }

  .ug-grid-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background-image:
      linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 30%, black 20%, transparent 100%);
  }

  /* ── NOISE OVERLAY ── */
  .ug-noise {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size: 128px 128px;
  }

  /* ── NAV ── */
  .ug-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 999;
    transition: background var(--transition), backdrop-filter var(--transition), border-color var(--transition), padding var(--transition);
    padding: 0;
  }

  .ug-nav.scrolled {
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(220,38,38,0.2);
  }

  .ug-nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 76px;
    gap: 24px;
  }

  .ug-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a1a;
    flex-shrink: 0;
    transition: opacity var(--transition);
  }
  .ug-logo:hover { opacity: 0.85; }

  .ug-logo-mark {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, var(--red) 0%, var(--red-deep) 100%);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem;
    box-shadow: 0 0 20px var(--red-glow);
    flex-shrink: 0;
  }

  .ug-logo img {
    width: 40px; height: 40px;
    border-radius: 10px;
    object-fit: contain;
  }

  .ug-nav-links {
    display: flex;
    align-items: center;
    gap: 4px;
    list-style: none;
  }

  .ug-nav-links a {
    display: block;
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 500;
    color: #666;
    transition: color var(--transition), background var(--transition);
  }
  .ug-nav-links a:hover {
    color: #1a1a1a;
    background: rgba(220,38,38,0.08);
  }

  .ug-nav-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .ug-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 22px;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    transition: all var(--transition);
    position: relative;
    overflow: hidden;
  }
  .ug-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0);
    transition: background var(--transition);
  }
  .ug-btn:hover::after { background: rgba(255,255,255,0.06); }

  .ug-btn-ghost {
    background: transparent;
    color: #666;
    border: 1px solid rgba(0,0,0,0.12);
  }
  .ug-btn-ghost:hover {
    color: #1a1a1a;
    border-color: var(--red);
    background: rgba(220,38,38,0.08);
  }

  .ug-btn-primary {
    background: var(--red);
    color: var(--white);
    border: 1px solid transparent;
    box-shadow: 0 0 20px rgba(220,38,38,0.3);
  }
  .ug-btn-primary:hover {
    background: var(--red-bright);
    box-shadow: 0 0 35px rgba(220,38,38,0.5);
    transform: translateY(-1px);
  }

  .ug-btn-large {
    padding: 16px 36px;
    font-size: 1.05rem;
    border-radius: var(--radius-md);
  }

  .ug-btn-xl {
    padding: 18px 44px;
    font-size: 1.1rem;
    border-radius: var(--radius-md);
  }

  .ug-btn-outline {
    background: transparent;
    color: var(--red);
    border: 1px solid var(--red);
  }
  .ug-btn-outline:hover {
    background: rgba(220,38,38,0.1);
    border-color: var(--red-deep);
    color: #1a1a1a;
  }

  .ug-btn-gold {
    background: var(--gold);
    color: #1a0a00;
    border: 1px solid transparent;
    box-shadow: 0 0 20px rgba(245,158,11,0.25);
  }
  .ug-btn-gold:hover {
    background: var(--gold-light);
    box-shadow: 0 0 40px rgba(245,158,11,0.4);
    transform: translateY(-1px);
  }

  .ug-hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    padding: 8px;
    border-radius: var(--radius-sm);
    background: #f5f5f5;
    border: 1px solid rgba(0,0,0,0.1);
  }
  .ug-hamburger span {
    width: 22px; height: 2px;
    background: #1a1a1a;
    border-radius: 99px;
    transition: all var(--transition);
    display: block;
  }
  .ug-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .ug-hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
  .ug-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

  .ug-mobile-menu {
    position: fixed;
    inset: 0;
    z-index: 998;
    background: rgba(255,255,255,0.98);
    backdrop-filter: blur(24px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease;
  }
  .ug-mobile-menu.open { opacity: 1; pointer-events: all; }
  .ug-mobile-menu a {
    font-size: 1.75rem;
    font-family: var(--font-display);
    font-weight: 600;
    padding: 12px 32px;
    border-radius: var(--radius-md);
    color: #666;
    transition: color var(--transition), background var(--transition);
    text-align: center;
    width: 100%;
    max-width: 360px;
  }
  .ug-mobile-menu a:hover { color: #1a1a1a; background: rgba(220,38,38,0.08); }
  .ug-mobile-menu .ug-mobile-divider {
    width: 40px; height: 1px;
    background: rgba(0,0,0,0.1);
    margin: 8px 0;
  }

  /* ── BADGE ── */
  .ug-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    border-radius: 99px;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border: 1px solid var(--red);
    background: rgba(220,38,38,0.1);
    color: var(--red-deep);
    margin-bottom: 24px;
  }
  .ug-badge-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--red);
    animation: pulse-dot 2s infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.7); }
  }

  /* ── HERO ── */
  .ug-hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding: 140px 0 80px;
    position: relative;
    z-index: 1;
  }

  .ug-hero-bg {
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
  }

  .ug-hero-orb-1 {
    position: absolute;
    top: -20%;
    left: -10%;
    width: 70vw;
    height: 70vw;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%);
    animation: float-slow 12s ease-in-out infinite;
  }

  .ug-hero-orb-2 {
    position: absolute;
    bottom: -10%;
    right: -15%;
    width: 55vw;
    height: 55vw;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(127,29,29,0.08) 0%, transparent 70%);
    animation: float-slow 16s ease-in-out infinite reverse;
  }

  .ug-hero-orb-3 {
    position: absolute;
    top: 40%;
    left: 50%;
    width: 40vw;
    height: 40vw;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%);
    animation: float-slow 20s ease-in-out infinite 4s;
  }

  @keyframes float-slow {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(3%, -4%) scale(1.04); }
    66% { transform: translate(-2%, 3%) scale(0.97); }
  }

  .ug-hero-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }

  .ug-hero-label {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--red);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ug-hero-label::before {
    content: '';
    width: 32px; height: 1px;
    background: var(--red);
    display: block;
  }

  .ug-hero-title {
    font-family: var(--font-display);
    font-size: clamp(2.8rem, 5vw, 4.5rem);
    font-weight: 900;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: #0a0a0a;
    margin-bottom: 28px;
  }

  .ug-hero-title em {
    font-style: italic;
    background: linear-gradient(135deg, var(--red) 0%, var(--red-bright) 50%, var(--red-light) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .ug-hero-desc {
    font-size: 1.15rem;
    color: #555;
    line-height: 1.75;
    max-width: 500px;
    margin-bottom: 44px;
  }

  .ug-hero-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 56px;
  }

  .ug-hero-trust {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .ug-hero-trust-avatars {
    display: flex;
  }
  .ug-hero-trust-avatars span {
    width: 34px; height: 34px;
    border-radius: 50%;
    border: 2px solid var(--bg-base);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    margin-left: -10px;
    background: linear-gradient(135deg, var(--red-deep), var(--red));
    box-shadow: 0 0 10px rgba(220,38,38,0.2);
  }
  .ug-hero-trust-avatars span:first-child { margin-left: 0; background: linear-gradient(135deg, #1e3a5f, #2563eb); }
  .ug-hero-trust-avatars span:nth-child(2) { background: linear-gradient(135deg, #064e3b, #059669); }
  .ug-hero-trust-avatars span:nth-child(3) { background: linear-gradient(135deg, #451a03, var(--gold)); }

  .ug-hero-trust-text {
    font-size: 0.85rem;
    color: #666;
    line-height: 1.4;
  }
  .ug-hero-trust-text strong {
    display: block;
    color: #1a1a1a;
    font-weight: 600;
  }

  /* ── HERO VISUAL ── */
  .ug-hero-visual {
    position: relative;
  }

  .ug-dashboard-mockup {
    background: #fafafa;
    border: 1px solid rgba(220,38,38,0.2);
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    animation: mockup-float 8s ease-in-out infinite;
    position: relative;
  }
  @keyframes mockup-float {
    0%, 100% { transform: translateY(0) rotateX(0deg); }
    50% { transform: translateY(-12px) rotateX(1deg); }
  }

  .ug-mockup-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: #f5f5f5;
    border-bottom: 1px solid rgba(0,0,0,0.08);
  }
  .ug-mockup-dots { display: flex; gap: 7px; }
  .ug-mockup-dots span {
    width: 11px; height: 11px;
    border-radius: 50%;
    display: block;
  }
  .ug-mockup-dots span:nth-child(1) { background: #ff5f57; }
  .ug-mockup-dots span:nth-child(2) { background: #ffbd2e; }
  .ug-mockup-dots span:nth-child(3) { background: #28c840; }
  .ug-mockup-title {
    font-size: 0.75rem;
    color: #999;
    font-family: var(--font-mono);
  }

  .ug-mockup-body { padding: 20px; }

  .ug-mockup-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }
  .ug-mockup-heading {
    font-size: 0.9rem;
    font-weight: 700;
    color: #1a1a1a;
    font-family: var(--font-display);
  }
  .ug-mockup-badge {
    padding: 3px 10px;
    background: rgba(220,38,38,0.1);
    border: 1px solid var(--red);
    border-radius: 99px;
    font-size: 0.68rem;
    color: var(--red);
    font-weight: 600;
  }

  .ug-mockup-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }
  .ug-mockup-stat {
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: var(--radius-sm);
    padding: 12px;
  }
  .ug-mockup-stat-val {
    font-size: 1.3rem;
    font-weight: 700;
    color: #1a1a1a;
    font-family: var(--font-mono);
    line-height: 1;
    margin-bottom: 4px;
  }
  .ug-mockup-stat-label {
    font-size: 0.65rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .ug-mockup-chart {
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: var(--radius-sm);
    padding: 14px;
    margin-bottom: 14px;
  }
  .ug-mockup-chart-label {
    font-size: 0.7rem;
    color: #999;
    margin-bottom: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .ug-mockup-bars {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 60px;
  }
  .ug-mockup-bar {
    flex: 1;
    border-radius: 4px 4px 0 0;
    background: linear-gradient(180deg, var(--red) 0%, var(--red-deep) 100%);
    transition: height 0.3s;
    position: relative;
  }
  .ug-mockup-bar.gold {
    background: linear-gradient(180deg, var(--gold) 0%, #92400e 100%);
  }
  .ug-mockup-bar.dim {
    background: rgba(255,255,255,0.08);
  }

  .ug-mockup-events {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ug-mockup-event-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: var(--radius-sm);
  }
  .ug-mockup-event-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .ug-mockup-event-info { flex: 1; min-width: 0; }
  .ug-mockup-event-name {
    font-size: 0.72rem;
    font-weight: 600;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ug-mockup-event-meta {
    font-size: 0.62rem;
    color: #999;
  }
  .ug-mockup-event-badge {
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 0.6rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  /* floating cards */
  .ug-hero-float-1 {
    position: absolute;
    top: -28px;
    right: -28px;
    background: #fafafa;
    border: 1px solid rgba(220,38,38,0.2);
    border-radius: var(--radius-md);
    padding: 14px 18px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    animation: float-card-1 7s ease-in-out infinite;
    z-index: 2;
  }
  @keyframes float-card-1 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-6px, -8px); }
  }
  .ug-hero-float-2 {
    position: absolute;
    bottom: -24px;
    left: -24px;
    background: #fafafa;
    border: 1px solid rgba(220,38,38,0.2);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    animation: float-card-2 9s ease-in-out infinite 2s;
    z-index: 2;
  }
  @keyframes float-card-2 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(6px, 8px); }
  }
  .ug-float-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #999;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .ug-float-value {
    font-size: 1.4rem;
    font-weight: 700;
    font-family: var(--font-mono);
    color: #1a1a1a;
  }
  .ug-float-value.gold { color: var(--gold); }
  .ug-float-value.red { color: var(--red); }
  .ug-float-sub {
    font-size: 0.65rem;
    color: #999;
    margin-top: 2px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ug-float-up { color: #34d399; font-size: 0.7rem; }

  /* ── MARQUEE ── */
  .ug-marquee-section {
    position: relative;
    z-index: 1;
    padding: 32px 0;
    border-top: 1px solid rgba(0,0,0,0.08);
    border-bottom: 1px solid rgba(0,0,0,0.08);
    overflow: hidden;
  }
  .ug-marquee-track {
    display: flex;
    gap: 56px;
    animation: marquee-scroll 25s linear infinite;
    white-space: nowrap;
    width: max-content;
  }
  .ug-marquee-track:hover { animation-play-state: paused; }
  @keyframes marquee-scroll {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  .ug-marquee-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.82rem;
    font-weight: 600;
    color: #999;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    transition: color var(--transition);
    flex-shrink: 0;
  }
  .ug-marquee-item:hover { color: var(--red); }
  .ug-marquee-item svg, .ug-marquee-item span.icon { font-size: 1.1rem; }
  .ug-marquee-sep {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: var(--red);
    display: inline-block;
    flex-shrink: 0;
  }

  /* ── STATS ── */
  .ug-stats-section {
    position: relative;
    z-index: 1;
    padding: 100px 0;
  }
  .ug-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    background: rgba(0,0,0,0.08);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.08);
  }
  .ug-stat-cell {
    background: #fafafa;
    padding: 48px 36px;
    text-align: center;
    position: relative;
    transition: background var(--transition);
  }
  .ug-stat-cell:hover { background: #f5f5f5; }
  .ug-stat-cell::before {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--red), transparent);
    opacity: 0;
    transition: opacity var(--transition);
  }
  .ug-stat-cell:hover::before { opacity: 1; }
  .ug-stat-number {
    font-family: var(--font-display);
    font-size: 3.5rem;
    font-weight: 900;
    line-height: 1;
    color: #1a1a1a;
    margin-bottom: 12px;
    letter-spacing: -0.03em;
  }
  .ug-stat-number .ug-stat-suffix {
    font-size: 2rem;
    -webkit-text-fill-color: var(--red);
    font-style: italic;
  }
  .ug-stat-label {
    font-size: 0.85rem;
    color: #666;
    font-weight: 500;
  }
  .ug-stat-sub {
    font-size: 0.7rem;
    color: #999;
    margin-top: 4px;
  }

  /* ── SECTION HEADER ── */
  .ug-section-header {
    text-align: center;
    margin-bottom: 72px;
  }
  .ug-section-tag {
    display: inline-block;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--red);
    margin-bottom: 18px;
    position: relative;
    background: rgba(220,38,38,0.08);
    padding: 4px 12px;
    border-radius: 99px;
  }
  .ug-section-tag::before, .ug-section-tag::after {
    content: '—';
    margin: 0 8px;
    opacity: 0.5;
  }

  .ug-section-title {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #0a0a0a;
    margin-bottom: 20px;
  }
  .ug-section-title em {
    font-style: italic;
    color: var(--red);
  }

  .ug-section-desc {
    font-size: 1.05rem;
    color: #666;
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.75;
  }

  /* ── FEATURES ── */
  .ug-features-section {
    position: relative;
    z-index: 1;
    padding: 80px 0 120px;
  }

  .ug-features-tabs {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 56px;
    flex-wrap: wrap;
  }
  .ug-feat-tab {
    padding: 10px 22px;
    border-radius: 99px;
    font-size: 0.88rem;
    font-weight: 600;
    color: #666;
    border: 1px solid rgba(0,0,0,0.1);
    background: transparent;
    transition: all var(--transition);
  }
  .ug-feat-tab:hover { color: #1a1a1a; border-color: var(--red); background: rgba(220,38,38,0.05); }
  .ug-feat-tab.active {
    background: var(--red);
    color: #ffffff;
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(220,38,38,0.3);
  }

  .ug-features-showcase {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    align-items: start;
  }

  .ug-features-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ug-feature-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    cursor: pointer;
    background: #ffffff;
    user-select: none;
    pointer-events: auto;
  }
  .ug-feature-item:hover {
    background: rgba(220,38,38,0.05);
    border-color: rgba(220,38,38,0.2);
  }
  .ug-feature-item.active {
    background: rgba(220,38,38,0.1);
    border-color: var(--red);
    box-shadow: 0 4px 16px rgba(220,38,38,0.15);
  }

  .ug-feature-icon-wrap {
    width: 44px; height: 44px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    flex-shrink: 0;
    border: 1px solid rgba(0,0,0,0.08);
    background: #f5f5f5;
    transition: all var(--transition);
    color: var(--red);
  }
  .ug-feature-item.active .ug-feature-icon-wrap {
    background: rgba(220,38,38,0.12);
    border-color: var(--red);
    box-shadow: 0 0 16px rgba(220,38,38,0.2);
  }

  .ug-feature-text h4 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 4px;
    transition: color var(--transition);
  }
  .ug-feature-item.active .ug-feature-text h4 { color: var(--red); }
  .ug-feature-text p {
    font-size: 0.85rem;
    color: #777;
    line-height: 1.6;
  }

  .ug-feature-arrow {
    margin-left: auto;
    padding-left: 12px;
    color: #ccc;
    transition: all var(--transition);
    flex-shrink: 0;
    font-size: 1.1rem;
  }
  .ug-feature-item.active .ug-feature-arrow {
    color: var(--red);
    transform: translateX(4px);
  }

  .ug-feature-preview {
    position: sticky;
    top: 100px;
    z-index: 5;
    pointer-events: auto;
  }

  .ug-preview-card {
    background: #fafafa;
    border: 1px solid rgba(220,38,38,0.2);
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    min-height: 420px;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    opacity: 1 !important;
    visibility: visible !important;
  }

  .ug-preview-topbar {
    padding: 18px 24px;
    background: #f5f5f5;
    border-bottom: 1px solid rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .ug-preview-dots { display: flex; gap: 6px; }
  .ug-preview-dots span {
    width: 10px; height: 10px;
    border-radius: 50%;
    display: block;
  }
  .ug-preview-dots span:nth-child(1) { background: rgba(255,95,87,0.5); }
  .ug-preview-dots span:nth-child(2) { background: rgba(255,189,46,0.5); }
  .ug-preview-dots span:nth-child(3) { background: rgba(40,200,64,0.5); }
  .ug-preview-url {
    flex: 1;
    height: 28px;
    background: #ffffff;
    border-radius: 6px;
    border: 1px solid rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: #999;
    gap: 6px;
  }
  .ug-preview-lock { color: #34d399; font-size: 0.7rem; }

  .ug-preview-body { flex: 1; padding: 28px; }

  /* Preview Panels */
  .ug-panel { animation: panel-fade-in 0.4s ease forwards; }
  @keyframes panel-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Event Management Panel */
  .ug-event-panel-title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ug-event-cards-list { display: flex; flex-direction: column; gap: 10px; }
  .ug-event-card-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: var(--radius-sm);
    transition: border-color var(--transition);
  }
  .ug-event-card-item:hover { border-color: var(--red); }
  .ug-event-card-date {
    width: 42px; height: 44px;
    background: rgba(220,38,38,0.1);
    border: 1px solid var(--red);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .ug-event-card-mon { font-size: 0.55rem; text-transform: uppercase; color: var(--red); font-weight: 700; }
  .ug-event-card-day { font-size: 1rem; font-weight: 800; color: #1a1a1a; line-height: 1; }
  .ug-event-card-info { flex: 1; min-width: 0; }
  .ug-event-card-name { font-size: 0.8rem; font-weight: 700; color: #1a1a1a; }
  .ug-event-card-sub { font-size: 0.68rem; color: #999; }
  .ug-event-card-status {
    padding: 3px 10px;
    border-radius: 99px;
    font-size: 0.6rem;
    font-weight: 700;
    flex-shrink: 0;
  }
  .status-live { background: rgba(34,197,94,0.1); color: #22c55e; border: 1px solid #22c55e; }
  .status-upcoming { background: rgba(245,158,11,0.1); color: var(--gold); border: 1px solid var(--gold); }
  .status-done { background: rgba(0,0,0,0.05); color: #999; border: 1px solid rgba(0,0,0,0.1); }

  /* QR Panel */
  .ug-qr-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
    color: #1a1a1a;
  }
  .ug-qr-box {
    width: 140px; height: 140px;
    background: #ffffff;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  }
  .ug-qr-box::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: calc(var(--radius-md) + 4px);
    background: linear-gradient(45deg, var(--red), var(--gold), var(--red));
    z-index: -1;
    animation: qr-spin 4s linear infinite;
  }
  @keyframes qr-spin {
    from { filter: hue-rotate(0deg); }
    to { filter: hue-rotate(360deg); }
  }
  .ug-qr-svg { font-size: 5rem; }
  .ug-qr-scan-line {
    position: absolute;
    left: 6px; right: 6px;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--red), transparent);
    animation: scan-line 2s ease-in-out infinite;
  }
  @keyframes scan-line {
    0% { top: 10px; opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { top: calc(100% - 10px); opacity: 0; }
  }
  .ug-qr-info { font-size: 0.85rem; color: #666; }
  .ug-qr-count {
    font-family: var(--font-mono);
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
  }
  .ug-qr-count span { color: var(--red); }

  /* Analytics Panel */
  .ug-analytics-panel { display: flex; flex-direction: column; gap: 16px; }
  .ug-analytics-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .ug-analytics-card {
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: var(--radius-sm);
    padding: 14px;
  }
  .ug-analytics-card-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #999;
    margin-bottom: 8px;
    font-weight: 600;
  }
  .ug-analytics-card-val {
    font-size: 1.6rem;
    font-weight: 800;
    font-family: var(--font-mono);
    color: #1a1a1a;
    line-height: 1;
  }
  .ug-analytics-card-change {
    font-size: 0.7rem;
    margin-top: 4px;
    font-weight: 600;
  }
  .change-up { color: #34d399; }
  .change-down { color: var(--red-bright); }
  .ug-sparkline {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 32px;
    margin-top: 8px;
  }
  .ug-sparkline-bar {
    flex: 1;
    border-radius: 2px;
    background: rgba(220,38,38,0.1);
    transition: background var(--transition);
  }
  .ug-sparkline-bar.hi { background: var(--red); }

  /* Role Panel */
  .ug-roles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ug-role-chip {
    padding: 14px;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: var(--radius-sm);
    transition: all var(--transition);
  }
  .ug-role-chip:hover { border-color: var(--red); background: rgba(220,38,38,0.05); }
  .ug-role-chip-icon { font-size: 1.5rem; margin-bottom: 8px; }
  .ug-role-chip-name { font-size: 0.8rem; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
  .ug-role-chip-desc { font-size: 0.68rem; color: #777; line-height: 1.5; }

  /* ── HOW IT WORKS ── */
  .ug-how-section {
    position: relative;
    z-index: 1;
    padding: 100px 0 120px;
    background: linear-gradient(180deg, transparent, rgba(220,38,38,0.04) 50%, transparent);
  }

  .ug-steps-container {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    position: relative;
  }
  .ug-steps-container::before {
    content: '';
    position: absolute;
    top: 36px;
    left: calc(12.5% + 24px);
    right: calc(12.5% + 24px);
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-accent), var(--red), var(--border-accent), transparent);
    z-index: 0;
  }

  .ug-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 20px;
    position: relative;
    z-index: 1;
  }
  .ug-step-number {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: var(--bg-raised);
    border: 1px solid var(--border-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 900;
    color: var(--red);
    margin-bottom: 24px;
    position: relative;
    box-shadow: 0 0 30px var(--red-glow);
    transition: all var(--transition);
  }
  .ug-step-number::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(220,38,38,0.3), transparent 60%);
    z-index: -1;
  }
  .ug-step:hover .ug-step-number {
    transform: scale(1.1);
    box-shadow: 0 0 50px var(--red-glow);
  }
  .ug-step-icon {
    font-size: 1.6rem;
  }
  .ug-step-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 10px;
  }
  .ug-step-desc {
    font-size: 0.85rem;
    color: var(--gray-500);
    line-height: 1.65;
  }

  /* ── ROLES SECTION ── */
  .ug-roles-section {
    position: relative;
    z-index: 1;
    padding: 100px 0 120px;
  }

  .ug-roles-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  .ug-role-card {
    background: var(--bg-raised);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 32px 24px;
    transition: all var(--transition);
    position: relative;
    overflow: hidden;
    cursor: default;
  }
  .ug-role-card::before {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: var(--accent-color, var(--red));
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--transition);
  }
  .ug-role-card:hover::before { transform: scaleX(1); }
  .ug-role-card:hover {
    transform: translateY(-6px);
    border-color: var(--border-accent);
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px var(--red-glow);
  }

  .ug-role-card-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 99px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 20px;
    border: 1px solid;
  }
  .badge-admin { background: rgba(220,38,38,0.1); color: var(--red-light); border-color: var(--border-accent); }
  .badge-coord { background: rgba(59,130,246,0.1); color: #93c5fd; border-color: rgba(59,130,246,0.3); }
  .badge-eval { background: rgba(245,158,11,0.1); color: var(--gold-light); border-color: rgba(245,158,11,0.3); }
  .badge-vol { background: rgba(52,211,153,0.1); color: #6ee7b7; border-color: rgba(52,211,153,0.3); }

  .ug-role-emoji { font-size: 2.5rem; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; color: var(--red); }
  .ug-role-emoji i { font-size: 2.5rem; }
  .ug-role-card-title {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 10px;
  }
  .ug-role-card-desc {
    font-size: 0.85rem;
    color: var(--gray-500);
    line-height: 1.65;
    margin-bottom: 20px;
  }
  .ug-role-perms {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .ug-role-perm {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    color: var(--gray-400);
  }
  .ug-role-perm-check {
    width: 16px; height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.55rem;
    flex-shrink: 0;
    background: rgba(52,211,153,0.12);
    border: 1px solid rgba(52,211,153,0.3);
    color: #34d399;
  }

  /* ── TESTIMONIALS ── */
  .ug-testimonials-section {
    position: relative;
    z-index: 1;
    padding: 100px 0 120px;
    background: linear-gradient(180deg, transparent, rgba(220,38,38,0.04) 50%, transparent);
  }

  .ug-testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .ug-testimonial-card {
    background: #fafafa;
    border: 1px solid rgba(220,38,38,0.15);
    border-radius: var(--radius-lg);
    padding: 28px;
    transition: all var(--transition);
    position: relative;
  }
  .ug-testimonial-card:hover {
    border-color: var(--red);
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.08);
  }
  .ug-testimonial-card.featured {
    background: rgba(220,38,38,0.05);
    border-color: var(--red);
    box-shadow: 0 0 40px rgba(220,38,38,0.15);
  }

  .ug-testi-quote-icon {
    font-size: 2.5rem;
    line-height: 1;
    color: var(--red);
    opacity: 0.5;
    margin-bottom: 14px;
    font-family: Georgia, serif;
  }
  .ug-testi-stars { display: flex; gap: 3px; margin-bottom: 14px; }
  .ug-testi-stars span { color: var(--gold); font-size: 0.9rem; }

  .ug-testi-text {
    font-size: 0.9rem;
    color: #555;
    line-height: 1.75;
    font-style: italic;
    margin-bottom: 22px;
  }
  .ug-testi-author {
    display: flex;
    align-items: center;
    gap: 12px;
    border-top: 1px solid rgba(0,0,0,0.08);
    padding-top: 18px;
  }
  .ug-testi-avatar {
    width: 42px; height: 42px;
    border-radius: 50%;
    background: rgba(220,38,38,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--red);
    flex-shrink: 0;
    border: 2px solid var(--red);
  }
  .ug-testi-name { font-size: 0.88rem; font-weight: 700; color: #1a1a1a; }
  .ug-testi-role { font-size: 0.75rem; color: #999; }

  /* ── FAQ ── */
  .ug-faq-section {
    position: relative;
    z-index: 1;
    padding: 100px 0 120px;
  }
  .ug-faq-list {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ug-faq-item {
    background: #fafafa;
    border: 1px solid rgba(220,38,38,0.15);
    border-radius: var(--radius-md);
    overflow: visible;
    display: block;
    width: 100%;
  }
  .ug-faq-item.open {
    border-color: var(--red);
    background: rgba(220,38,38,0.05);
  }
  .ug-faq-question {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    text-align: left;
    font-size: 0.95rem;
    font-weight: 600;
    color: #1a1a1a;
    background: none;
    border: none;
    cursor: pointer;
    transition: color var(--transition);
    gap: 16px;
    pointer-events: auto;
    user-select: none;
  }
  .ug-faq-question:hover { color: var(--red); }
  .ug-faq-item.open .ug-faq-question { color: var(--red); }
  .ug-faq-chevron {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: #f5f5f5;
    border: 1px solid rgba(0,0,0,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all var(--transition);
    font-size: 0.75rem;
    color: #999;
  }
  .ug-faq-item.open .ug-faq-chevron {
    background: rgba(220,38,38,0.12);
    border-color: var(--red);
    color: var(--red);
    transform: rotate(180deg);
  }
  .ug-faq-answer {
    font-size: 0.88rem;
    color: #666;
    line-height: 1.8;
    padding: 0 24px;
    max-height: 0;
    overflow: hidden;
    display: none;
  }
  .ug-faq-item.open .ug-faq-answer {
    max-height: none;
    padding: 20px 24px;
    overflow: visible;
    display: block;
  }

  /* ── CTA SECTION ── */
  .ug-cta-section {
    position: relative;
    z-index: 1;
    padding: 120px 0;
    overflow: hidden;
  }
  .ug-cta-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(220,38,38,0.05) 0%, rgba(220,38,38,0.02) 50%, rgba(245,158,11,0.02) 100%);
    border-top: 1px solid rgba(220,38,38,0.15);
    border-bottom: 1px solid rgba(220,38,38,0.15);
  }
  .ug-cta-orb-1 {
    position: absolute;
    top: -50%;
    left: -20%;
    width: 80%;
    padding-top: 80%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .ug-cta-orb-2 {
    position: absolute;
    bottom: -50%;
    right: -20%;
    width: 80%;
    padding-top: 80%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%);
    pointer-events: none;
  }
  .ug-cta-inner {
    position: relative;
    z-index: 1;
    text-align: center;
    max-width: 680px;
    margin: 0 auto;
  }
  .ug-cta-title {
    font-family: var(--font-display);
    font-size: clamp(2.4rem, 5vw, 4rem);
    font-weight: 900;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: #0a0a0a;
    margin-bottom: 20px;
  }
  .ug-cta-title em {
    font-style: italic;
    color: var(--red);
  }
  .ug-cta-desc {
    font-size: 1.1rem;
    color: #666;
    margin-bottom: 44px;
    line-height: 1.75;
  }
  .ug-cta-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 44px;
  }
  .ug-cta-note {
    font-size: 0.82rem;
    color: #999;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .ug-cta-note span {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .ug-cta-note span::before { content: '✓'; color: #34d399; font-weight: 700; }

  /* ── FOOTER ── */
  .ug-footer {
    position: relative;
    z-index: 1;
    background: #0a0a0a;
    border-top: 1px solid rgba(220,38,38,0.3);
    padding: 72px 0 32px;
  }
  .ug-footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 48px;
    margin-bottom: 56px;
  }
  .ug-footer-brand { }
  .ug-footer-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 16px;
  }
  .ug-footer-logo-mark {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, var(--red), var(--red-deep));
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 16px var(--red-glow);
  }
  .ug-footer-tagline {
    font-size: 0.88rem;
    color: #ccc;
    line-height: 1.65;
    max-width: 280px;
    margin-bottom: 24px;
  }
  .ug-footer-social {
    display: flex;
    gap: 10px;
  }
  .ug-social-btn {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    transition: all var(--transition);
    color: #ccc;
  }
  .ug-social-btn:hover {
    background: var(--red);
    border-color: var(--red);
    color: #ffffff;
  }

  .ug-footer-col h5 {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #ffffff;
    margin-bottom: 18px;
  }
  .ug-footer-links {
    display: flex;
    flex-direction: column;
    gap: 10px;
    list-style: none;
  }
  .ug-footer-links a {
    font-size: 0.88rem;
    color: #ccc;
    transition: color var(--transition);
  }
  .ug-footer-links a:hover { color: #ffffff; }

  .ug-footer-bottom {
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }
  .ug-footer-copy {
    font-size: 0.82rem;
    color: #999;
  }
  .ug-footer-copy strong { color: #ffffff; }
  .ug-footer-links-row {
    display: flex;
    gap: 20px;
  }
  .ug-footer-links-row a {
    font-size: 0.82rem;
    color: #999;
    transition: color var(--transition);
  }
  .ug-footer-links-row a:hover { color: #ffffff; }

  /* ── SCROLL ANIMATION ── */
  .ug-animate {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .ug-animate.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .ug-animate-delay-1 { transition-delay: 0.1s; }
  .ug-animate-delay-2 { transition-delay: 0.2s; }
  .ug-animate-delay-3 { transition-delay: 0.3s; }
  .ug-animate-delay-4 { transition-delay: 0.4s; }

  /* ── GLOW DIVIDER ── */
  .ug-glow-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--border-accent) 20%, var(--red) 50%, var(--border-accent) 80%, transparent 100%);
    margin: 0;
    position: relative;
    z-index: 1;
  }
  .ug-glow-divider::after {
    content: '';
    position: absolute;
    inset: -4px 20%;
    background: inherit;
    filter: blur(6px);
    opacity: 0.5;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 1024px) {
    .ug-hero-inner { grid-template-columns: 1fr; gap: 48px; }
    .ug-hero-visual { display: none; }
    .ug-features-showcase { grid-template-columns: 1fr; }
    .ug-feature-preview { display: none; }
    .ug-roles-cards { grid-template-columns: repeat(2, 1fr); }
    .ug-testimonials-grid { grid-template-columns: repeat(2, 1fr); }
    .ug-footer-grid { grid-template-columns: 1fr 1fr; }
    .ug-steps-container { grid-template-columns: repeat(2, 1fr); gap: 32px; }
    .ug-steps-container::before { display: none; }
    .ug-stats-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 768px) {
    .ug-nav-links { display: none; }
    .ug-nav-actions { display: none; }
    .ug-hamburger { display: flex; }
    .ug-hero { padding: 120px 0 60px; }
    .ug-hero-title { font-size: 2.4rem; }
    .ug-roles-cards { grid-template-columns: 1fr; }
    .ug-testimonials-grid { grid-template-columns: 1fr; }
    .ug-footer-grid { grid-template-columns: 1fr; }
    .ug-footer-bottom { flex-direction: column; text-align: center; }
    .ug-cta-title { font-size: 2.2rem; }
    .ug-stats-grid { grid-template-columns: 1fr 1fr; }
    .ug-stat-cell { padding: 32px 20px; }
    .ug-stat-number { font-size: 2.5rem; }
  }

  @media (max-width: 480px) {
    .ug-container { padding: 0 16px; }
    .ug-hero-title { font-size: 2rem; }
    .ug-hero-actions { flex-direction: column; }
    .ug-btn-xl { width: 100%; }
    .ug-steps-container { grid-template-columns: 1fr; }
    .ug-features-tabs { display: none; }
    .ug-stats-grid { grid-template-columns: 1fr; }
    .ug-cta-actions { flex-direction: column; }
    .ug-cta-actions .ug-btn { width: 100%; }
  }
`;

/* ─────────────────────────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────────────────────────── */
const FEATURES_TABS = ['All Features', 'Events', 'Volunteers', 'Analytics'];

const FEATURES = [
  {
    icon: '<i class="fas fa-calendar-days"></i>',
    title: 'Event Management',
    desc: 'Create, schedule, and manage campus events with a powerful dashboard. Handle registrations, details, and timelines effortlessly.',
    tab: 'Events',
    panel: 'events',
  },
  {
    icon: '<i class="fas fa-qrcode"></i>',
    title: 'QR Code Check-in',
    desc: 'Instant participant check-in with unique QR codes. Eliminate paper lists and long queues at entry points.',
    tab: 'Events',
    panel: 'qr',
  },
  {
    icon: '<i class="fas fa-chart-line"></i>',
    title: 'Real-time Analytics',
    desc: 'Live dashboards showing registrations, attendance rates, and volunteer engagement — all in one place.',
    tab: 'Analytics',
    panel: 'analytics',
  },
  {
    icon: '<i class="fas fa-handshake"></i>',
    title: 'Volunteer Coordination',
    desc: 'Assign tasks, track progress, manage schedules, and communicate with your volunteer team seamlessly.',
    tab: 'Volunteers',
    panel: 'events',
  },
  {
    icon: '<i class="fas fa-lock"></i>',
    title: 'Role-based Access',
    desc: 'Granular permission system for Admins, Coordinators, Evaluators, and Volunteers. Everyone sees what they need.',
    tab: 'All Features',
    panel: 'roles',
  },
  {
    icon: '<i class="fas fa-trophy"></i>',
    title: 'Evaluation System',
    desc: "Comprehensive post-event evaluation tools for coordinators to assess success, gather feedback, and improve future events.",
    tab: 'Analytics',
    panel: 'analytics',
  },
];

const STEPS = [
  { num: '01', icon: '<i class="fas fa-pen-to-square"></i>', title: 'Register & Set Up', desc: 'Create your account and configure your organization profile in minutes.' },
  { num: '02', icon: '<i class="fas fa-calendar"></i>', title: 'Create Your Event', desc: 'Fill in event details, set capacity, assign coordinators, and go live.' },
  { num: '03', icon: '<i class="fas fa-users"></i>', title: 'Invite & Manage', desc: 'Participants register, volunteers join, QR codes are auto-generated.' },
  { num: '04', icon: '<i class="fas fa-chart-bar"></i>', title: 'Track & Evaluate', desc: 'Real-time check-in, live analytics, and post-event evaluation reports.' },
];

const ROLES = [
  {
    badge: 'badge-admin', icon: '<i class="fas fa-shield"></i>', title: 'Admin',
    desc: 'Full platform control. Manage all events, users, roles, and system-wide settings.',
    perms: ['Manage all users & roles', 'Create & delete events', 'View all analytics', 'System configuration'],
  },
  {
    badge: 'badge-coord', icon: '<i class="fas fa-clipboard-check"></i>', title: 'Coordinator',
    desc: 'Run events end-to-end. Create events, assign volunteers, and monitor attendance.',
    perms: ['Create & manage events', 'Assign volunteers', 'QR check-in access', 'Download reports'],
  },
  {
    badge: 'badge-eval', icon: '<i class="fas fa-clipboard-list"></i>', title: 'Evaluator',
    desc: 'Assess event quality and participant experience through structured evaluations.',
    perms: ['Access evaluation forms', 'View participant data', 'Submit assessments', 'Generate reports'],
  },
  {
    badge: 'badge-vol', icon: '<i class="fas fa-people-group"></i>', title: 'Volunteer',
    desc: 'Join events, complete assigned tasks, and track personal participation history.',
    perms: ['Browse open events', 'Register as volunteer', 'View assignments', 'Track own hours'],
  },
];

const TESTIMONIALS = [
  {
    text: "UniGuild completely transformed how we run our annual techfest. What used to take a team of 20 managing paper lists now runs like clockwork with just a handful of coordinators.",
    stars: 5,
    name: 'Priya Sharma', role: 'Student Union President, VIT University', initials: 'PS', featured: false,
  },
  {
    text: "The QR check-in feature alone saved us hours at our cultural fest. 800 participants checked in within 15 minutes flat. I can't imagine going back to the old way.",
    stars: 5,
    name: 'Rahul Menon', role: 'Event Coordinator, BITS Pilani', initials: 'RM', featured: true,
  },
  {
    text: "The analytics dashboard is incredibly powerful. Being able to see real-time registration numbers and volunteer engagement helps me make quick decisions during the event.",
    stars: 5,
    name: 'Ananya Reddy', role: 'Fest Director, IIT Hyderabad', initials: 'AR', featured: false,
  },
  {
    text: "Role-based access is a game changer. Volunteers only see what's relevant to them, evaluators get their tools, coordinators have full control — perfectly organized.",
    stars: 5,
    name: 'Kiran Patel', role: 'Volunteer Head, BITS Goa', initials: 'KP', featured: false,
  },
  {
    text: "We managed 12 concurrent sub-events across our engineering symposium with zero confusion. UniGuild's multi-event support is robust and intuitive.",
    stars: 5,
    name: 'Shreya Nair', role: 'Technical Secretary, NIT Warangal', initials: 'SN', featured: false,
  },
  {
    text: "The evaluation module lets us capture meaningful post-event data. Our sponsorship reports now have concrete numbers and coordinator assessments — very professional.",
    stars: 4,
    name: 'Arjun Pillai', role: 'Cultural Fest Lead, Amrita University', initials: 'AP', featured: false,
  },
];

const FAQS = [
  { q: 'Is UniGuild free to use?', a: 'UniGuild is free for students and organizations to get started. We offer extended features for larger events and organizations. Contact us to discuss your institution\'s needs.' },
  { q: 'How does the QR code check-in work?', a: 'Upon registration, each participant receives a unique QR code via email. At the event, coordinators use the UniGuild app to scan codes for instant check-in. The system updates attendance in real time.' },
  { q: 'Can we manage multiple events at the same time?', a: 'Absolutely. UniGuild supports concurrent event management. You can run multiple sub-events under a single parent event, each with its own coordinators, volunteers, and analytics.' },
  { q: 'How are volunteer roles and tasks assigned?', a: 'Coordinators can create task categories, set volunteer limits, and assign individuals to specific tasks. Volunteers receive notifications and can view their assignments on their dashboard.' },
  { q: 'Is our data secure on UniGuild?', a: 'Yes. We use industry-standard encryption for all data at rest and in transit. Access is strictly controlled via role-based permissions, and we never share your data with third parties.' },
  { q: 'Can participants get certificates after attending an event?', a: 'Yes! Coordinators can generate and send digital participation certificates to attendees after the event. Certificates are automatically personalized with participant details.' },
  { q: 'Does UniGuild work on mobile devices?', a: 'UniGuild is fully responsive and works on all modern browsers on desktop and mobile. Our QR scanning feature works seamlessly on mobile for on-ground coordinators.' },
];

const MARQUEE_ITEMS = [
  '<i class="fas fa-clipboard"></i> Event Management', '<i class="fas fa-qrcode"></i> QR Check-in', '<i class="fas fa-chart-line"></i> Live Analytics',
  '<i class="fas fa-users"></i> Volunteer Tracking', '<i class="fas fa-trophy"></i> Evaluations', '<i class="fas fa-lock"></i> Role-based Access',
  '<i class="fas fa-envelope"></i> Email Notifications', '<i class="fas fa-graduation-cap"></i> Campus Events', '<i class="fas fa-mobile"></i> Mobile Ready',
  '<i class="fas fa-clipboard"></i> Event Management', '<i class="fas fa-qrcode"></i> QR Check-in', '<i class="fas fa-chart-line"></i> Live Analytics',
  '<i class="fas fa-users"></i> Volunteer Tracking', '<i class="fas fa-trophy"></i> Evaluations', '<i class="fas fa-lock"></i> Role-based Access',
  '<i class="fas fa-envelope"></i> Email Notifications', '<i class="fas fa-graduation-cap"></i> Campus Events', '<i class="fas fa-mobile"></i> Mobile Ready',
];

/* ─────────────────────────────────────────────────────────────────
   PREVIEW PANELS
   ───────────────────────────────────────────────────────────────── */
function EventsPanel() {
  return (
    <div className="ug-panel">
      <div className="ug-event-panel-title">
        Upcoming Events
        <span className="ug-mockup-badge">3 Active</span>
      </div>
      <div className="ug-event-cards-list">
        {[
          { mon: 'Mar', day: '22', name: 'Tech Symposium 2025', sub: '142 registered · Hall A', status: 'status-live', label: 'LIVE' },
          { mon: 'Apr', day: '05', name: 'Cultural Night', sub: '89 registered · Auditorium', status: 'status-upcoming', label: 'Soon' },
          { mon: 'Apr', day: '18', name: 'Sports Carnival', sub: '220 registered · Ground', status: 'status-upcoming', label: 'Soon' },
          { mon: 'Feb', day: '14', name: 'Hackathon 2025', sub: '310 attended · Online', status: 'status-done', label: 'Done' },
        ].map((ev, i) => (
          <div className="ug-event-card-item" key={i}>
            <div className="ug-event-card-date">
              <span className="ug-event-card-mon">{ev.mon}</span>
              <span className="ug-event-card-day">{ev.day}</span>
            </div>
            <div className="ug-event-card-info">
              <div className="ug-event-card-name">{ev.name}</div>
              <div className="ug-event-card-sub">{ev.sub}</div>
            </div>
            <span className={`ug-event-card-status ${ev.status}`}>{ev.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QRPanel() {
  const [count, setCount] = useState(247);
  useEffect(() => {
    const t = setInterval(() => setCount(c => c + Math.floor(Math.random() * 3)), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ug-panel ug-qr-panel">
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
        Tech Symposium 2025
      </div>
      <div className="ug-qr-box">
        <div style={{ fontSize: '5rem', lineHeight: 1 }}>▩</div>
        <div className="ug-qr-scan-line" />
      </div>
      <div>
        <div className="ug-qr-count"><span>{count}</span> / 400</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>participants checked in</div>
      </div>
      <div style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', height: 6 }}>
        <div style={{ height: '100%', width: `${(count/400*100).toFixed(1)}%`, background: 'linear-gradient(90deg, var(--red-deep), var(--red))', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Check-in Rate', val: `${(count/400*100).toFixed(0)}%`, color: '#34d399' },
          { label: 'Avg. Wait', val: '< 30s', color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.val}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPanel() {
  return (
    <div className="ug-panel ug-analytics-panel">
      <div className="ug-analytics-row">
        {[
          { label: 'Total Registrations', val: '1,284', change: '+18%', up: true },
          { label: 'Attendance Rate', val: '91%', change: '+7%', up: true },
          { label: 'Volunteers Active', val: '48', change: '+12', up: true },
          { label: 'Avg Eval Score', val: '4.7', change: '-0.1', up: false },
        ].map((c, i) => (
          <div className="ug-analytics-card" key={i}>
            <div className="ug-analytics-card-label">{c.label}</div>
            <div className="ug-analytics-card-val">{c.val}</div>
            <div className={`ug-analytics-card-change ${c.up ? 'change-up' : 'change-down'}`}>
              {c.up ? '↑' : '↓'} {c.change} vs last event
            </div>
            <div className="ug-sparkline">
              {[30, 45, 38, 60, 72, 55, 80, 90, 75, 95].map((h, j) => (
                <div key={j} className={`ug-sparkline-bar${j > 6 ? ' hi' : ''}`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RolesPanel() {
  return (
    <div className="ug-panel">
      <div className="ug-event-panel-title" style={{ marginBottom: 16 }}>
        Access Control
        <span className="ug-mockup-badge">4 Roles</span>
      </div>
      <div className="ug-roles-grid">
        {[
          { icon: '🛡️', name: 'Admin', desc: 'Full system control & oversight' },
          { icon: '🎯', name: 'Coordinator', desc: 'End-to-end event management' },
          { icon: '📝', name: 'Evaluator', desc: 'Assess and score events' },
          { icon: '🤝', name: 'Volunteer', desc: 'Join tasks, track progress' },
        ].map((r, i) => (
          <div className="ug-role-chip" key={i}>
            <div className="ug-role-chip-icon">{r.icon}</div>
            <div className="ug-role-chip-name">{r.name}</div>
            <div className="ug-role-chip-desc">{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturePreviewPanel({ panel }) {
  switch (panel) {
    case 'qr': return <QRPanel />;
    case 'analytics': return <AnalyticsPanel />;
    case 'roles': return <RolesPanel />;
    default: return <EventsPanel />;
  }
}

/* ─────────────────────────────────────────────────────────────────
   COUNTER HOOK
   ───────────────────────────────────────────────────────────────── */
function useCounter(target, duration = 2000, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);
  return count;
}

/* ─────────────────────────────────────────────────────────────────
   SCROLL ANIMATION HOOK
   ───────────────────────────────────────────────────────────────── */
function useScrollAnimation() {
  useEffect(() => {
    const observeElements = () => {
      const els = document.querySelectorAll('.ug-animate:not(.active):not(.open)');
      const observer = new IntersectionObserver(
        (entries) => entries.forEach(e => {
          if (e.isIntersecting && !e.target.classList.contains('active') && !e.target.classList.contains('open')) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        }),
        { threshold: 0.12 }
      );
      els.forEach(el => observer.observe(el));
      return observer;
    };

    const observer = observeElements();
    return () => observer.disconnect();
  }, []);
}

/* ─────────────────────────────────────────────────────────────────
   STATS SECTION
   ───────────────────────────────────────────────────────────────── */
function StatsSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); observer.disconnect(); } }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const events = useCounter(2400, 2200, visible);
  const universities = useCounter(58, 1800, visible);
  const participants = useCounter(150000, 2400, visible);
  const checkins = useCounter(98, 1600, visible);

  const stats = [
    { num: events, suffix: '+', label: 'Events Managed', sub: 'Across all campuses' },
    { num: universities, suffix: '+', label: 'Universities', sub: 'Trust UniGuild' },
    { num: participants, suffix: '+', label: 'Participants', sub: 'Registered on platform' },
    { num: checkins, suffix: '%', label: 'Check-in Accuracy', sub: 'With QR technology' },
  ];

  return (
    <section className="ug-stats-section ug-section" ref={ref}>
      <div className="ug-container">
        <div className="ug-stats-grid ug-animate">
          {stats.map((s, i) => (
            <div className="ug-stat-cell" key={i}>
              <div className="ug-stat-number">
                {s.num.toLocaleString()}
                <span className="ug-stat-suffix">{s.suffix}</span>
              </div>
              <div className="ug-stat-label">{s.label}</div>
              <div className="ug-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All Features');
  const [activeFeature, setActiveFeature] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const navigate = useNavigate();

  // Inject styles
  useEffect(() => {
    const id = 'ug-landing-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = STYLES;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  // Nav scroll
  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Lock body when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useScrollAnimation();

  const filteredFeatures = activeTab === 'All Features'
    ? FEATURES
    : FEATURES.filter(f => f.tab === activeTab);

  const currentPanel = filteredFeatures[activeFeature]?.panel || 'events';

  return (
    <>
      {/* Global backgrounds */}
      <div className="ug-mesh" aria-hidden="true" />
      <div className="ug-grid-bg" aria-hidden="true" />
      <div className="ug-noise" aria-hidden="true" />

      {/* ── NAV ── */}
      <nav className={`ug-nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="ug-container">
          <div className="ug-nav-inner">
            <a href="#" className="ug-logo" onClick={() => setMobileOpen(false)}>
              <div className="ug-logo-mark">
                <img src="/uniguild.png" alt="UniGuild" />
              </div>
              UniGuild
            </a>

            <ul className="ug-nav-links">
              {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Roles', '#roles'], ['Testimonials', '#testimonials'], ['FAQ', '#faq']].map(([label, href]) => (
                <li key={label}><a href={href}>{label}</a></li>
              ))}
            </ul>

            <div className="ug-nav-actions">
              <Link to="/login" className="ug-btn ug-btn-ghost">Login</Link>
              <Link to="/register" className="ug-btn ug-btn-primary">Get Started →</Link>
            </div>

            <button
              className={`ug-hamburger${mobileOpen ? ' open' : ''}`}
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      <div className={`ug-mobile-menu${mobileOpen ? ' open' : ''}`}>
        {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Roles', '#roles'], ['Testimonials', '#testimonials'], ['FAQ', '#faq']].map(([label, href]) => (
          <a key={label} href={href} onClick={() => setMobileOpen(false)}>{label}</a>
        ))}
        <div className="ug-mobile-divider" />
        <Link to="/login" onClick={() => setMobileOpen(false)} style={{ fontSize: '1rem', color: 'var(--gray-400)' }}>Login</Link>
        <Link to="/register" onClick={() => setMobileOpen(false)} className="ug-btn ug-btn-primary" style={{ marginTop: 8, fontSize: '1rem', padding: '14px 32px', color: 'white' }}>
          Get Started Free →
        </Link>
      </div>

      <main>
        {/* ── HERO ── */}
        <section className="ug-hero ug-section">
          <div className="ug-hero-bg">
            <div className="ug-hero-orb-1" />
            <div className="ug-hero-orb-2" />
            <div className="ug-hero-orb-3" />
          </div>
          <div className="ug-container">
            <div className="ug-hero-inner">
              {/* Left */}
              <div>
                <div className="ug-badge">
                  <span className="ug-badge-dot" />
                  Campus Event Platform
                </div>
                <p className="ug-hero-label">Trusted by 58+ Universities</p>
                <h1 className="ug-hero-title">
                  Manage Campus Events <em>Effortlessly</em>
                </h1>
                <p className="ug-hero-desc">
                  The complete platform for organizing, tracking, and managing university events —
                  volunteers, participants, QR check-ins, and live analytics, all in one unified dashboard.
                </p>
                <div className="ug-hero-actions">
                  <Link to="/register" className="ug-btn ug-btn-primary ug-btn-xl" style={{ color: 'white' }}>
                    Get Started Free →
                  </Link>
                  <a href="#features" className="ug-btn ug-btn-outline ug-btn-large">
                    Explore Features
                  </a>
                </div>
                <div className="ug-hero-trust">
                  <div className="ug-hero-trust-avatars">
                    <span>PS</span><span>RM</span><span>AK</span>
                  </div>
                  <div className="ug-hero-trust-text">
                    <strong>2,400+ events managed</strong>
                    150,000+ participants served
                  </div>
                </div>
              </div>

              {/* Right – dashboard mockup */}
              <div className="ug-hero-visual">
                {/* Float cards */}
                <div className="ug-hero-float-1">
                  <div className="ug-float-label">Today's Check-ins</div>
                  <div className="ug-float-value gold">247</div>
                  <div className="ug-float-sub">
                    <span className="ug-float-up">↑ 18%</span> vs last event
                  </div>
                </div>
                <div className="ug-hero-float-2">
                  <div className="ug-float-label">Volunteers Active</div>
                  <div className="ug-float-value red">48</div>
                  <div className="ug-float-sub">
                    <span className="ug-float-up">↑ 12</span> new today
                  </div>
                </div>

                <div className="ug-dashboard-mockup">
                  <div className="ug-mockup-topbar">
                    <div className="ug-mockup-dots">
                      <span /><span /><span />
                    </div>
                    <div className="ug-mockup-title">dashboard.uniguild.app</div>
                    <div style={{ width: 60 }} />
                  </div>
                  <div className="ug-mockup-body">
                    <div className="ug-mockup-header-row">
                      <div className="ug-mockup-heading">Tech Symposium 2025</div>
                      <span className="ug-mockup-badge">● Live</span>
                    </div>
                    <div className="ug-mockup-stats">
                      {[
                        { val: '142', label: 'Checked In' },
                        { val: '48', label: 'Volunteers' },
                        { val: '91%', label: 'Attendance' },
                      ].map((s, i) => (
                        <div className="ug-mockup-stat" key={i}>
                          <div className="ug-mockup-stat-val">{s.val}</div>
                          <div className="ug-mockup-stat-label">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="ug-mockup-chart">
                      <div className="ug-mockup-chart-label">Check-in Over Time</div>
                      <div className="ug-mockup-bars">
                        {[30, 45, 60, 40, 80, 95, 70, 85, 100, 75].map((h, i) => (
                          <div
                            key={i}
                            className={`ug-mockup-bar${i === 5 ? ' gold' : i < 3 ? ' dim' : ''}`}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="ug-mockup-events">
                      {[
                        { color: '#34d399', name: 'Cultural Night', meta: 'Hall B · Apr 5', badge: 'Soon', bStyle: { background: 'rgba(52,211,153,0.12)', color: '#34d399' } },
                        { color: 'var(--gold)', name: 'Sports Carnival', meta: 'Ground · Apr 18', badge: 'Open', bStyle: { background: 'rgba(245,158,11,0.12)', color: 'var(--gold)' } },
                      ].map((ev, i) => (
                        <div className="ug-mockup-event-row" key={i}>
                          <div className="ug-mockup-event-dot" style={{ background: ev.color }} />
                          <div className="ug-mockup-event-info">
                            <div className="ug-mockup-event-name">{ev.name}</div>
                            <div className="ug-mockup-event-meta">{ev.meta}</div>
                          </div>
                          <span className="ug-mockup-event-badge" style={ev.bStyle}>{ev.badge}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── MARQUEE ── */}
        <div className="ug-marquee-section">
          <div className="ug-marquee-track">
            {MARQUEE_ITEMS.map((item, i) => (
              <React.Fragment key={i}>
                <div className="ug-marquee-item" dangerouslySetInnerHTML={{ __html: item }} />
                {i < MARQUEE_ITEMS.length - 1 && <span className="ug-marquee-sep" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── STATS ── */}
        <StatsSection />

        <div className="ug-glow-divider" />

        {/* ── FEATURES ── */}
        <section className="ug-features-section ug-section" id="features">
          <div className="ug-container">
            <div className="ug-section-header ug-animate">
              <div className="ug-section-tag">Features</div>
              <h2 className="ug-section-title">Everything You Need to<br /><em>Run Exceptional Events</em></h2>
              <p className="ug-section-desc">
                From creation to evaluation, UniGuild covers the full lifecycle of university event management.
              </p>
            </div>

            <div className="ug-features-tabs ug-animate">
              {FEATURES_TABS.map(tab => (
                <button
                  key={tab}
                  className={`ug-feat-tab${activeTab === tab ? ' active' : ''}`}
                  onClick={() => { setActiveTab(tab); setActiveFeature(0); }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="ug-features-showcase">
              <div className="ug-features-list">
                {filteredFeatures.map((f, i) => (
                  <div
                    key={f.title}
                    className={`ug-feature-item${activeFeature === i ? ' active' : ''}`}
                    onClick={() => setActiveFeature(i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveFeature(i); }}
                  >
                    <div className="ug-feature-icon-wrap" dangerouslySetInnerHTML={{ __html: f.icon }} />
                    <div className="ug-feature-text">
                      <h4>{f.title}</h4>
                      <p>{f.desc}</p>
                    </div>
                    <div className="ug-feature-arrow">›</div>
                  </div>
                ))}
              </div>

              <div className="ug-feature-preview">
                <div className="ug-preview-card">
                  <div className="ug-preview-topbar">
                    <div className="ug-preview-dots"><span /><span /><span /></div>
                    <div className="ug-preview-url">
                      <span className="ug-preview-lock">🔒</span>
                      app.uniguild.io / dashboard
                    </div>
                  </div>
                  <div className="ug-preview-body">
                    <FeaturePreviewPanel panel={currentPanel} key={currentPanel} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="ug-glow-divider" />

        {/* ── HOW IT WORKS ── */}
        <section className="ug-how-section ug-section" id="how-it-works">
          <div className="ug-container">
            <div className="ug-section-header ug-animate">
              <div className="ug-section-tag">Process</div>
              <h2 className="ug-section-title">Up and Running in<br /><em>Four Simple Steps</em></h2>
              <p className="ug-section-desc">
                No lengthy onboarding. No complex setup. Start managing events within minutes.
              </p>
            </div>
            <div className="ug-steps-container">
              {STEPS.map((step, i) => (
                <div key={i} className={`ug-step ug-animate ug-animate-delay-${i + 1}`}>
                  <div className="ug-step-number">
                    <span className="ug-step-icon" dangerouslySetInnerHTML={{ __html: step.icon }} />
                  </div>
                  <h3 className="ug-step-title">{step.title}</h3>
                  <p className="ug-step-desc">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="ug-glow-divider" />

        {/* ── ROLES ── */}
        <section className="ug-roles-section ug-section" id="roles">
          <div className="ug-container">
            <div className="ug-section-header ug-animate">
              <div className="ug-section-tag">Access Control</div>
              <h2 className="ug-section-title">Built for Every<br /><em>Role on Campus</em></h2>
              <p className="ug-section-desc">
                Granular role-based access ensures everyone has exactly what they need — and nothing they don't.
              </p>
            </div>
            <div className="ug-roles-cards">
              {ROLES.map((role, i) => (
                <div key={i} className={`ug-role-card ug-animate ug-animate-delay-${i + 1}`}>
                  <span className={`ug-role-card-badge ${role.badge}`}><span dangerouslySetInnerHTML={{ __html: role.icon }} /> {role.title}</span>
                  <span className="ug-role-emoji" dangerouslySetInnerHTML={{ __html: role.icon }} />
                  <h3 className="ug-role-card-title">{role.title}</h3>
                  <p className="ug-role-card-desc">{role.desc}</p>
                  <div className="ug-role-perms">
                    {role.perms.map((perm, j) => (
                      <div key={j} className="ug-role-perm">
                        <div className="ug-role-perm-check">✓</div>
                        {perm}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="ug-glow-divider" />

        {/* ── TESTIMONIALS ── */}
        <section className="ug-testimonials-section ug-section" id="testimonials">
          <div className="ug-container">
            <div className="ug-section-header ug-animate">
              <div className="ug-section-tag">Testimonials</div>
              <h2 className="ug-section-title">Loved by Event Coordinators<br /><em>Across India</em></h2>
              <p className="ug-section-desc">
                Hear what students and coordinators say about using UniGuild for their campus events.
              </p>
            </div>
            <div className="ug-testimonials-grid">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className={`ug-testimonial-card${t.featured ? ' featured' : ''} ug-animate ug-animate-delay-${(i % 3) + 1}`}>
                  <div className="ug-testi-quote-icon">"</div>
                  <div className="ug-testi-stars">
                    {Array.from({ length: t.stars }).map((_, j) => <span key={j}>★</span>)}
                  </div>
                  <p className="ug-testi-text">{t.text}</p>
                  <div className="ug-testi-author">
                    <div className="ug-testi-avatar">{t.initials}</div>
                    <div>
                      <div className="ug-testi-name">{t.name}</div>
                      <div className="ug-testi-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="ug-glow-divider" />

        {/* ── FAQ ── */}
        <section className="ug-faq-section ug-section" id="faq">
          <div className="ug-container">
            <div className="ug-section-header ug-animate">
              <div className="ug-section-tag">FAQ</div>
              <h2 className="ug-section-title">Frequently Asked<br /><em>Questions</em></h2>
              <p className="ug-section-desc">
                Everything you want to know about UniGuild, answered clearly.
              </p>
            </div>
            <div className="ug-faq-list">
              {FAQS.map((faq, i) => (
                <div key={faq.q} className={`ug-faq-item${openFaq === i ? ' open' : ''}`}>
                  <button
                    className="ug-faq-question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {faq.q}
                    <span className="ug-faq-chevron">▾</span>
                  </button>
                  <div className="ug-faq-answer">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="ug-cta-section ug-section">
          <div className="ug-cta-bg" />
          <div className="ug-cta-orb-1" />
          <div className="ug-cta-orb-2" />
          <div className="ug-container">
            <div className="ug-cta-inner ug-animate">
              <div className="ug-badge" style={{ marginBottom: 28 }}>
                <span className="ug-badge-dot" />
                Start Today — It's Free
              </div>
              <h2 className="ug-cta-title">
                Ready to Transform Your<br /><em>Campus Events?</em>
              </h2>
              <p className="ug-cta-desc">
                Join hundreds of event coordinators already using UniGuild to streamline their campus events.
                No credit card required. Set up in minutes.
              </p>
              <div className="ug-cta-actions">
                <Link to="/register" className="ug-btn ug-btn-primary ug-btn-xl">
                  Create Free Account →
                </Link>
                <a href="#features" className="ug-btn ug-btn-outline ug-btn-large">
                  Learn More
                </a>
              </div>
              <div className="ug-cta-note">
                <span>Free to start</span>
                <span>No credit card needed</span>
                <span>Set up in 5 minutes</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="ug-footer">
        <div className="ug-container">
          <div className="ug-footer-grid">
            <div className="ug-footer-brand">
              <div className="ug-footer-logo">
                <div className="ug-footer-logo-mark">🎓</div>
                UniGuild
              </div>
              <p className="ug-footer-tagline">
                The complete campus event management platform. Organize, coordinate, and evaluate university events with ease.
              </p>
              <div className="ug-footer-social">
                {['𝕏', 'in', 'gh', 'ig'].map((s, i) => (
                  <a key={i} href="#" className="ug-social-btn">{s}</a>
                ))}
              </div>
            </div>

            <div className="ug-footer-col">
              <h5>Platform</h5>
              <ul className="ug-footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How it Works</a></li>
                <li><a href="#roles">Roles</a></li>
                <li><a href="#">Browse Events</a></li>
                <li><Link to="/register">Get Started</Link></li>
              </ul>
            </div>

            <div className="ug-footer-col">
              <h5>Account</h5>
              <ul className="ug-footer-links">
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><a href="#">Settings</a></li>
              </ul>
            </div>

            <div className="ug-footer-col">
              <h5>Support</h5>
              <ul className="ug-footer-links">
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">Contact Us</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="ug-footer-bottom">
            <p className="ug-footer-copy">
              © 2025 <strong>UniGuild</strong>. All rights reserved. Built with ❤️ for campus communities.
            </p>
            <div className="ug-footer-links-row">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
