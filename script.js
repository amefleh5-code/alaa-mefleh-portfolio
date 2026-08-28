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

// Click-to-Zoom Lightbox Image Viewer
(() => {
  const rawImages = Array.from(document.querySelectorAll(
    '.project-gallery img, .project-cover-image img, .project-cover img, .project-detail figure img, .detail-copy figure img, main figure img'
  ));

  const reviewImages = [...new Set(rawImages)].filter(img => !img.closest('a'));
  if (!reviewImages.length) return;

  // Build Lightbox dialog
  const dialog = document.createElement('dialog');
  dialog.className = 'image-lightbox';
  dialog.setAttribute('aria-label', 'Image preview and zoom');

  const closeButton = document.createElement('button');
  closeButton.className = 'image-lightbox-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close image viewer');
  closeButton.textContent = '×';

  const prevButton = document.createElement('button');
  prevButton.className = 'image-lightbox-nav image-lightbox-prev';
  prevButton.type = 'button';
  prevButton.setAttribute('aria-label', 'Previous image');
  prevButton.textContent = '‹';

  const nextButton = document.createElement('button');
  nextButton.className = 'image-lightbox-nav image-lightbox-next';
  nextButton.type = 'button';
  nextButton.setAttribute('aria-label', 'Next image');
  nextButton.textContent = '›';

  const wrapper = document.createElement('div');
  wrapper.className = 'image-lightbox-wrapper';

  const image = document.createElement('img');
  image.className = 'image-lightbox-img';
  image.alt = '';
  image.draggable = false;

  const caption = document.createElement('p');
  caption.className = 'image-lightbox-caption';

  wrapper.appendChild(image);
  dialog.append(closeButton, prevButton, wrapper, nextButton, caption);
  document.body.appendChild(dialog);

  let activeIndex = 0;
  let returnFocus = null;

  // Zoom and Pan state
  let isZoomed = false;
  let zoomScale = 1;
  const DEFAULT_ZOOM = 2.5;
  const MAX_ZOOM = 5.0;
  let panX = 0;
  let panY = 0;

  // Drag tracking
  let isPointerDown = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startPanX = 0;
  let startPanY = 0;
  let hasMoved = false;

  // Touch tracking for pinch
  let touchStartDist = 0;
  let touchStartScale = 1;
  let lastTapTime = 0;

  const updateTransform = (animated = true) => {
    image.style.transition = animated ? 'transform 0.25s cubic-bezier(0.2, 0, 0.1, 1)' : 'none';
    if (zoomScale <= 1.01) {
      isZoomed = false;
      image.classList.remove('is-zoomed', 'is-dragging');
      image.style.transform = 'translate(0px, 0px) scale(1)';
    } else {
      isZoomed = true;
      image.classList.add('is-zoomed');
      image.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
    }
  };

  const resetZoom = (animated = false) => {
    isZoomed = false;
    zoomScale = 1;
    panX = 0;
    panY = 0;
    isPointerDown = false;
    hasMoved = false;
    updateTransform(animated);
  };

  const zoomToPoint = (targetScale, clientX, clientY, animated = true) => {
    const rect = image.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const offsetX = clientX - centerX;
    const offsetY = clientY - centerY;

    zoomScale = Math.min(MAX_ZOOM, Math.max(1, targetScale));

    if (zoomScale <= 1.01) {
      resetZoom(animated);
      return;
    }

    // Center the zoom right around where user clicked
    panX = -offsetX * (zoomScale - 1);
    panY = -offsetY * (zoomScale - 1);

    // Constrain panning within image view bounds
    const maxPanX = (rect.width * (zoomScale - 1)) / 2 + 80;
    const maxPanY = (rect.height * (zoomScale - 1)) / 2 + 80;
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY));

    updateTransform(animated);
  };

  const toggleZoom = (clientX, clientY) => {
    if (isZoomed) {
      resetZoom(true);
    } else {
      zoomToPoint(DEFAULT_ZOOM, clientX, clientY, true);
    }
  };

  const showImage = index => {
    resetZoom(false);
    activeIndex = (index + reviewImages.length) % reviewImages.length;
    const selected = reviewImages[activeIndex];
    const figureCaption = selected.closest('figure')?.querySelector('figcaption')?.textContent?.trim();

    image.src = selected.currentSrc || selected.src;
    image.alt = selected.alt || '';
    caption.textContent = figureCaption || selected.alt || '';

    const hasMultiple = reviewImages.length > 1;
    prevButton.hidden = !hasMultiple;
    nextButton.hidden = !hasMultiple;
  };

  const openLightbox = (imgElement, index) => {
    returnFocus = imgElement;
    showImage(index);
    dialog.showModal();
    document.body.classList.add('lightbox-open');
    closeButton.focus();
  };

  const closeLightbox = () => {
    dialog.close();
    document.body.classList.remove('lightbox-open');
    resetZoom(false);
    returnFocus?.focus();
  };

  // Attach click to review images on the page
  reviewImages.forEach((img, index) => {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `View image: ${img.alt || 'Project figure'}`);
    img.addEventListener('click', () => openLightbox(img, index));
    img.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(img, index);
      }
    });
  });

  // Mouse interaction on lightbox image: Click to zoom in / Drag to pan
  image.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    isPointerDown = true;
    hasMoved = false;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startPanX = panX;
    startPanY = panY;
    if (isZoomed) {
      image.classList.add('is-dragging');
    }
  });

  window.addEventListener('mousemove', e => {
    if (!isPointerDown) return;
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    if (Math.hypot(dx, dy) > 5) {
      hasMoved = true;
    }
    if (isZoomed && hasMoved) {
      panX = startPanX + dx;
      panY = startPanY + dy;
      updateTransform(false);
    }
  });

  window.addEventListener('mouseup', e => {
    if (!isPointerDown) return;
    isPointerDown = false;
    image.classList.remove('is-dragging');

    // If it was a click (not a drag), toggle zoom
    if (!hasMoved && (e.target === image || e.target === wrapper)) {
      toggleZoom(e.clientX, e.clientY);
    }
  });

  // Mouse wheel zoom
  wrapper.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.82;
    const targetScale = zoomScale * zoomFactor;
    if (targetScale <= 1.05) {
      resetZoom(true);
    } else {
      zoomToPoint(targetScale, e.clientX, e.clientY, false);
    }
  }, { passive: false });

  // Mobile Touch Gestures (tap to zoom, double tap, drag to pan, pinch to zoom)
  wrapper.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      isPointerDown = true;
      hasMoved = false;
      startPointerX = e.touches[0].clientX;
      startPointerY = e.touches[0].clientY;
      startPanX = panX;
      startPanY = panY;
    } else if (e.touches.length === 2) {
      touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartScale = zoomScale;
    }
  }, { passive: true });

  wrapper.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && isPointerDown && isZoomed) {
      const dx = e.touches[0].clientX - startPointerX;
      const dy = e.touches[0].clientY - startPointerY;
      if (Math.hypot(dx, dy) > 5) {
        hasMoved = true;
        panX = startPanX + dx;
        panY = startPanY + dy;
        updateTransform(false);
      }
    } else if (e.touches.length === 2 && touchStartDist > 0) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = touchStartScale * (currentDist / touchStartDist);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomToPoint(newScale, midX, midY, false);
    }
  }, { passive: true });

  wrapper.addEventListener('touchend', e => {
    if (e.touches.length === 0) {
      isPointerDown = false;
      touchStartDist = 0;
      if (!hasMoved) {
        const now = Date.now();
        if (now - lastTapTime < 300) {
          toggleZoom(startPointerX, startPointerY);
          lastTapTime = 0;
        } else {
          lastTapTime = now;
          if (!isZoomed) {
            toggleZoom(startPointerX, startPointerY);
          } else {
            resetZoom(true);
          }
        }
      }
    }
  });

  // Lightbox navigation and close buttons
  closeButton.addEventListener('click', closeLightbox);
  prevButton.addEventListener('click', () => showImage(activeIndex - 1));
  nextButton.addEventListener('click', () => showImage(activeIndex + 1));

  // Click on background closes lightbox
  dialog.addEventListener('click', e => {
    if (e.target === dialog || (e.target === wrapper && !isZoomed && !hasMoved)) {
      closeLightbox();
    }
  });

  dialog.addEventListener('cancel', e => {
    e.preventDefault();
    closeLightbox();
  });

  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') {
      showImage(activeIndex - 1);
    } else if (e.key === 'ArrowRight') {
      showImage(activeIndex + 1);
    } else if (e.key === 'Escape') {
      closeLightbox();
    }
  });
})();
