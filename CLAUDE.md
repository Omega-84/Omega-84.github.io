# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Varun Nayyar (Data Scientist). Static site built with Jekyll 4.3 + Gulp, hosted on GitHub Pages. Single-page layout with neumorphism dark theme.

## Development Commands

```bash
# Install dependencies (first time)
yarn install
bundle install

# Start local dev server (port 4000, live reload via BrowserSync)
yarn dev        # runs: gulp

# Production build
yarn prod       # runs: gulp build
```

## Architecture

**Single-page Jekyll site.** `_layouts/default.html` is the master template that conditionally includes partials from `_includes/`. Jekyll processes the templates using data from `_data/` YAML files to generate static HTML.

**Build pipeline:** Gulp compiles `_sass/main.scss` → `assets/css/main.min.css` and minifies `_js/app.js` + vendors → `assets/js/*.min.js`. Jekyll then generates the site HTML. BrowserSync serves and live-reloads during dev.

**Content is data-driven via `_data/`:**
- `projects.yml` — project cards (title, description, tags, links)
- `skills-*.yml` — skills grouped by category (languages, frameworks, tools, cloud)
- `timeline.yml` — education and work experience entries
- `_config.yml` — site-wide settings: social links, Google Analytics ID (`G-W6Y0MSV0H7`), feature toggles, typed carousel strings

**JavaScript (`_js/app.js`):** Vanilla JS handles the preloader, typing carousel (`TxtRotate` class), AOS scroll animations, animated stats counters, project tag filtering, navbar scroll behavior, and smooth scrolling. Third-party vendors (jQuery, AOS, particles.js) are in `_js/vendors/`.

**Styling (`_sass/main.scss`):** ~2400 lines; dark background (`#2b2d2f`), blue accent (`#3b82f6`), neumorphism card shadows, gradient text. Responsive breakpoints: mobile `48em`, tablet `62em`, desktop `75em`.

## Key Customization Points

| What to change | Where |
|---|---|
| Projects | `_data/projects.yml` |
| Skills | `_data/skills-*.yml` |
| Timeline / experience | `_data/timeline.yml` |
| Site config, social links | `_config.yml` |
| Particle animation | `assets/particles.json` |
| Resume PDF | `assets/resume.pdf` |
| Global styles | `_sass/main.scss` |
