// Dynamic year replacement
document.querySelectorAll('[data-year]').forEach(el => {
  el.textContent = new Date().getFullYear();
});

// Initialize interactive comparison sliders
document.querySelectorAll('[data-compare]').forEach(container => {
  const slider = container.matches('.compare-slider') ? container : container.querySelector('.compare-slider');
  if (!slider) return;
  const handle = slider.querySelector('.compare-handle');
  let isDragging = false;

  const updatePosition = clientX => {
    const rect = slider.getBoundingClientRect();
    let x = clientX - rect.left;
    let percent = (x / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));
    slider.style.setProperty('--compare-pos', `${percent}%`);
    if (handle) {
      handle.setAttribute('aria-valuenow', Math.round(percent));
    }
  };

  const startDrag = e => {
    // Only drag if not clicking on expand button
    if (e.target.closest('.compare-expand-btn')) return;
    isDragging = true;
    updatePosition(e.touches ? e.touches[0].clientX : e.clientX);
    document.body.style.cursor = 'ew-resize';
  };

  const onDrag = e => {
    if (!isDragging) return;
    updatePosition(e.touches ? e.touches[0].clientX : e.clientX);
  };

  const stopDrag = () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
    }
  };

  slider.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);

  slider.addEventListener('touchstart', startDrag, { passive: true });
  window.addEventListener('touchmove', onDrag, { passive: true });
  window.addEventListener('touchend', stopDrag);

  if (handle) {
    handle.addEventListener('keydown', e => {
      let current = parseFloat(slider.style.getPropertyValue('--compare-pos') || '50');
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        current = Math.max(0, current - 5);
        slider.style.setProperty('--compare-pos', `${current}%`);
        handle.setAttribute('aria-valuenow', Math.round(current));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        current = Math.min(100, current + 5);
        slider.style.setProperty('--compare-pos', `${current}%`);
        handle.setAttribute('aria-valuenow', Math.round(current));
      }
    });
  }
});

// Interactive Pan & Zoom Lightbox for Engineering & FEA Plots
(() => {
  // Collect all expandable images across the page (excluding thumbnail cards inside links)
  const rawImages = Array.from(document.querySelectorAll(
    '.project-gallery img, .project-cover-image img, .project-cover img, .project-detail figure img, .compare-slide img, .detail-copy figure img'
  ));

  // Deduplicate and filter out images wrapped in navigational links
  const reviewImages = [...new Set(rawImages)].filter(img => !img.closest('a'));

  if (!reviewImages.length) return;

  // Inject visual cue badges onto figure containers if not present
  reviewImages.forEach(img => {
    const parentFigure = img.closest('figure, .project-cover, .project-cover-image');
    if (parentFigure && !parentFigure.querySelector('.zoom-hint-badge')) {
      const badge = document.createElement('span');
      badge.className = 'zoom-hint-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <span>Zoom</span>
      `;
      parentFigure.appendChild(badge);
    }
  });

  // Inject inspect button onto compare containers
  document.querySelectorAll('.compare-container').forEach(comp => {
    if (!comp.querySelector('.compare-expand-btn')) {
      const expandBtn = document.createElement('button');
      expandBtn.type = 'button';
      expandBtn.className = 'compare-expand-btn';
      expandBtn.setAttribute('aria-label', 'Open comparison plot in fullscreen zoom viewer');
      expandBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <span>Inspect Plot</span>
      `;
      comp.style.position = 'relative';
      comp.appendChild(expandBtn);

      expandBtn.addEventListener('click', e => {
        e.stopPropagation();
        const slideImg = comp.querySelector('.compare-slide img');
        if (slideImg) {
          const idx = reviewImages.indexOf(slideImg);
          openLightbox(slideImg, idx !== -1 ? idx : 0);
        }
      });
    }
  });

  // Create Lightbox DOM
  const dialog = document.createElement('dialog');
  dialog.className = 'image-lightbox';
  dialog.setAttribute('aria-label', 'Interactive Engineering Plot Zoom Viewer');

  dialog.innerHTML = `
    <div class="image-lightbox-wrapper">
      <header class="image-lightbox-header">
        <div class="image-lightbox-title-wrap">
          <span class="image-lightbox-counter"></span>
          <span class="image-lightbox-title"></span>
        </div>
        <div class="image-lightbox-toolbar">
          <div class="image-lightbox-zoom-tools">
            <button type="button" class="image-lightbox-btn" data-action="zoom-out" aria-label="Zoom out (-)" title="Zoom out (-)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
            <button type="button" class="image-lightbox-btn image-lightbox-zoom-val" data-action="zoom-reset" aria-label="Reset zoom (0 or R)" title="Reset zoom (0)">100%</button>
            <button type="button" class="image-lightbox-btn" data-action="zoom-in" aria-label="Zoom in (+)" title="Zoom in (+)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
          </div>
          <span class="image-lightbox-hint">Scroll to zoom · Drag to pan</span>
          <button type="button" class="image-lightbox-btn image-lightbox-close" data-action="close" aria-label="Close viewer (Esc)" title="Close (Esc)">✕</button>
        </div>
      </header>

      <div class="image-lightbox-viewport" id="lightbox-viewport">
        <button type="button" class="image-lightbox-nav image-lightbox-prev" data-action="prev" aria-label="Previous image (Left arrow)" title="Previous image">‹</button>
        <div class="image-lightbox-canvas">
          <img class="image-lightbox-image" src="" alt="" draggable="false">
        </div>
        <button type="button" class="image-lightbox-nav image-lightbox-next" data-action="next" aria-label="Next image (Right arrow)" title="Next image">›</button>
      </div>

      <footer class="image-lightbox-footer">
        <p class="image-lightbox-caption"></p>
      </footer>
    </div>
  `;

  document.body.appendChild(dialog);

  // Element references
  const viewport = dialog.querySelector('.image-lightbox-viewport');
  const canvas = dialog.querySelector('.image-lightbox-canvas');
  const fullImage = dialog.querySelector('.image-lightbox-image');
  const counter = dialog.querySelector('.image-lightbox-counter');
  const titleEl = dialog.querySelector('.image-lightbox-title');
  const captionEl = dialog.querySelector('.image-lightbox-caption');
  const zoomValBtn = dialog.querySelector('.image-lightbox-zoom-val');
  const zoomInBtn = dialog.querySelector('[data-action="zoom-in"]');
  const zoomOutBtn = dialog.querySelector('[data-action="zoom-out"]');
  const closeBtn = dialog.querySelector('[data-action="close"]');
  const prevBtn = dialog.querySelector('[data-action="prev"]');
  const nextBtn = dialog.querySelector('[data-action="next"]');

  // Pan & Zoom state
  const MIN_SCALE = 1.0;
  const MAX_SCALE = 5.0;
  let currentScale = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialPanX = 0;
  let initialPanY = 0;
  let activeIndex = 0;
  let returnFocus = null;

  // Touch gesture state
  let initialPinchDist = 0;
  let initialPinchScale = 1.0;
  let initialPinchPanX = 0;
  let initialPinchPanY = 0;
  let initialMidX = 0;
  let initialMidY = 0;
  let lastTapTime = 0;

  // Apply transform to canvas
  const applyTransform = (animate = false) => {
    canvas.style.transition = animate ? 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)' : 'none';
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;

    zoomValBtn.textContent = `${Math.round(currentScale * 100)}%`;
    if (currentScale > 1.02) {
      zoomValBtn.classList.add('is-zoomed');
      viewport.classList.remove('is-default-zoom');
    } else {
      zoomValBtn.classList.remove('is-zoomed');
      viewport.classList.add('is-default-zoom');
    }
  };

  // Set zoom scale with focal point
  const setZoom = (targetScale, focalX, focalY, animate = false) => {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
    const rect = viewport.getBoundingClientRect();

    const clientX = focalX !== undefined ? focalX : rect.left + rect.width / 2;
    const clientY = focalY !== undefined ? focalY : rect.top + rect.height / 2;

    const originX = clientX - (rect.left + rect.width / 2);
    const originY = clientY - (rect.top + rect.height / 2);

    if (clampedScale <= 1.001) {
      currentScale = 1.0;
      panX = 0;
      panY = 0;
    } else {
      const scaleRatio = clampedScale / currentScale;
      panX = originX - (originX - panX) * scaleRatio;
      panY = originY - (originY - panY) * scaleRatio;
      currentScale = clampedScale;
    }

    applyTransform(animate);
  };

  // Reset zoom to 1.0
  const resetZoom = (animate = true) => {
    currentScale = 1.0;
    panX = 0;
    panY = 0;
    applyTransform(animate);
  };

  // Show image at index
  const showImage = index => {
    resetZoom(false);
    activeIndex = (index + reviewImages.length) % reviewImages.length;
    const selected = reviewImages[activeIndex];
    const figureCaption = selected.closest('figure')?.querySelector('figcaption')?.textContent?.trim();

    fullImage.src = selected.currentSrc || selected.src;
    fullImage.alt = selected.alt || '';

    counter.textContent = `Figure ${activeIndex + 1} of ${reviewImages.length}`;
    titleEl.textContent = selected.alt || `Figure ${activeIndex + 1}`;
    captionEl.innerHTML = figureCaption || selected.alt || '';

    const hasMultiple = reviewImages.length > 1;
    prevBtn.hidden = !hasMultiple;
    nextBtn.hidden = !hasMultiple;
  };

  // Open Lightbox
  const openLightbox = (image, index) => {
    returnFocus = image;
    showImage(index);
    dialog.showModal();
    document.body.classList.add('lightbox-open');
    closeBtn.focus();
  };

  // Close Lightbox
  const closeLightbox = () => {
    dialog.close();
    document.body.classList.remove('lightbox-open');
    resetZoom(false);
    returnFocus?.focus();
  };

  // Attach click listeners to all review images
  reviewImages.forEach((image, index) => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `View and zoom high-resolution plot: ${image.alt}`);
    image.addEventListener('click', () => openLightbox(image, index));
    image.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(image, index);
      }
    });
  });

  // Mouse Wheel Zoom centered at cursor
  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
    setZoom(currentScale * zoomFactor, e.clientX, e.clientY, false);
  }, { passive: false });

  // Mouse Drag Panning
  viewport.addEventListener('mousedown', e => {
    if (e.target.closest('.image-lightbox-nav') || e.target.closest('.image-lightbox-btn')) return;
    if (e.button !== 0) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialPanX = panX;
    initialPanY = panY;
    viewport.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    panX = initialPanX + dx;
    panY = initialPanY + dy;
    applyTransform(false);
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      viewport.classList.remove('is-dragging');
    }
  });

  // Double-click to zoom in / reset
  viewport.addEventListener('dblclick', e => {
    if (e.target.closest('.image-lightbox-nav') || e.target.closest('.image-lightbox-btn')) return;
    if (currentScale > 1.2) {
      resetZoom(true);
    } else {
      setZoom(2.8, e.clientX, e.clientY, true);
    }
  });

  // Mobile Touch Gestures (Pinch-to-zoom & 1-finger pan & double-tap)
  viewport.addEventListener('touchstart', e => {
    if (e.target.closest('.image-lightbox-nav') || e.target.closest('.image-lightbox-btn')) return;

    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialPinchScale = currentScale;
      initialPinchPanX = panX;
      initialPinchPanY = panY;
      initialMidX = (t1.clientX + t2.clientX) / 2;
      initialMidY = (t1.clientY + t2.clientY) / 2;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      const t = e.touches[0];

      // Double tap check
      if (now - lastTapTime < 300) {
        e.preventDefault();
        if (currentScale > 1.2) {
          resetZoom(true);
        } else {
          setZoom(2.8, t.clientX, t.clientY, true);
        }
        lastTapTime = 0;
        return;
      }
      lastTapTime = now;

      isDragging = true;
      dragStartX = t.clientX;
      dragStartY = t.clientY;
      initialPanX = panX;
      initialPanY = panY;
    }
  }, { passive: false });

  viewport.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (initialPinchDist > 0) {
        const scaleRatio = dist / initialPinchDist;
        const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialPinchScale * scaleRatio));
        const rect = viewport.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const originX = midX - (rect.left + rect.width / 2);
        const originY = midY - (rect.top + rect.height / 2);

        if (targetScale <= 1.001) {
          currentScale = 1.0;
          panX = 0;
          panY = 0;
        } else {
          panX = originX - (originX - initialPinchPanX) * (targetScale / initialPinchScale) + (midX - initialMidX);
          panY = originY - (originY - initialPinchPanY) * (targetScale / initialPinchScale) + (midY - initialMidY);
          currentScale = targetScale;
        }
        applyTransform(false);
      }
    } else if (e.touches.length === 1 && isDragging && currentScale > 1.01) {
      e.preventDefault();
      const t = e.touches[0];
      panX = initialPanX + (t.clientX - dragStartX);
      panY = initialPanY + (t.clientY - dragStartY);
      applyTransform(false);
    }
  }, { passive: false });

  viewport.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
      initialPinchDist = 0;
    }
    if (e.touches.length === 0) {
      isDragging = false;
      if (currentScale <= 1.02) {
        resetZoom(true);
      }
    }
  });

  // Toolbar Button Click Listeners
  zoomInBtn.addEventListener('click', () => setZoom(currentScale * 1.35, undefined, undefined, true));
  zoomOutBtn.addEventListener('click', () => setZoom(currentScale * 0.75, undefined, undefined, true));
  zoomValBtn.addEventListener('click', () => resetZoom(true));
  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => showImage(activeIndex - 1));
  nextBtn.addEventListener('click', () => showImage(activeIndex + 1));

  // Dialog backdrop click to close
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeLightbox();
  });

  // Dialog cancel event (Esc key)
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeLightbox();
  });

  // Keyboard Navigation & Shortcuts
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      showImage(activeIndex - 1);
    } else if (event.key === 'ArrowRight') {
      showImage(activeIndex + 1);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setZoom(currentScale * 1.3, undefined, undefined, true);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      setZoom(currentScale * 0.77, undefined, undefined, true);
    } else if (event.key === '0' || event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      resetZoom(true);
    }
  });
})();
