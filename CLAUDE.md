# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Vite-based Development (v2 directory)
- **Development server**: `cd v2 && npm run dev` - Starts development server on port 3000
- **Build**: `cd v2 && npm run build` - Builds for production to `dist/` directory  
- **Preview**: `cd v2 && npm run preview` - Preview production build locally

### Python Utilities
- **Extract PowerPoint slides**: `python extract_slides.py` - Extracts images from PowerPoint presentations
- **Review presentation**: `python review_presentation.py` - Uses Playwright to test the live presentation

## Architecture Overview

This is a NIL (Name, Image, Likeness) Gameplan presentation project with multiple implementation approaches:

### Project Structure
- **Root level**: Basic HTML/CSS/JS presentation (`index.html`, `styles.css`, `script.js`)
- **v2/**: Modern Vite-based implementation with enhanced features
- **images/**: Original extracted images from PowerPoint
- **slides/**: Additional slide-specific images
- **Python scripts**: Utilities for PowerPoint extraction and automated testing

### Key Components

**Main Presentation Files:**
- `index.html` - Basic presentation with login and 28 slides about NIL Gameplan funding
- `index-complete.html` - Complete version with all content
- `index-v2.html` - Enhanced version
- `v2/index.html` - Vite-based modern implementation

**V2 Enhanced Features:**
- Uses Vite for modern development workflow
- Includes dependencies: GSAP, Three.js, Chart.js, Swiper
- Modular architecture with `src/js/main.js` and `src/styles/main.css`
- Multiple presentation formats (complete.html, pages.html, pdf-viewer.html, etc.)

### Login Credentials
- Username: `MyNILGamePlan`
- Password: `NIL2025!`

### Content Focus
The presentation covers NIL Gameplan's business model including:
- NIL market education and support for families
- Sports agency services
- Proprietary insurance products
- Revenue forecasting and business opportunities

## Development Notes

- The Vite config uses base path `/nil-gameplan/` for deployment
- Python scripts require `python-pptx` and `playwright` dependencies
- Multiple HTML versions exist for different presentation approaches
- Image assets are duplicated across `images/` and `slides/` directories for different implementations