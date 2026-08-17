document.querySelectorAll('[data-year]').forEach(el => {
  el.textContent = new Date().getFullYear();
});

const reviewImages = [...document.querySelectorAll('.project-gallery img, .project-cover-image img')];

if (reviewImages.length) {
  const dialog = document.createElement('dialog');
  dialog.className = 'image-lightbox';
  dialog.setAttribute('aria-label', 'Project image viewer');

  const frame = document.createElement('div');
  frame.className = 'image-lightbox-frame';

  const closeButton = document.createElement('button');
  closeButton.className = 'image-lightbox-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close image viewer');
  closeButton.textContent = '×';

  const previousButton = document.createElement('button');
  previousButton.className = 'image-lightbox-nav image-lightbox-prev';
  previousButton.type = 'button';
  previousButton.setAttribute('aria-label', 'Previous image');
  previousButton.textContent = '‹';

  const nextButton = document.createElement('button');
  nextButton.className = 'image-lightbox-nav image-lightbox-next';
  nextButton.type = 'button';
  nextButton.setAttribute('aria-label', 'Next image');
  nextButton.textContent = '›';

  const fullImage = document.createElement('img');
  fullImage.className = 'image-lightbox-image';
  fullImage.alt = '';

  const caption = document.createElement('p');
  caption.className = 'image-lightbox-caption';

  frame.append(closeButton, previousButton, fullImage, nextButton, caption);
  dialog.append(frame);
  document.body.append(dialog);

  let activeIndex = 0;
  let returnFocus = null;

  const showImage = index => {
    activeIndex = (index + reviewImages.length) % reviewImages.length;
    const selected = reviewImages[activeIndex];
    const figureCaption = selected.closest('figure')?.querySelector('figcaption')?.textContent?.trim();
    fullImage.src = selected.currentSrc || selected.src;
    fullImage.alt = selected.alt;
    caption.textContent = figureCaption || selected.alt;
    const hasMultiple = reviewImages.length > 1;
    previousButton.hidden = !hasMultiple;
    nextButton.hidden = !hasMultiple;
  };

  const openLightbox = (image, index) => {
    returnFocus = image;
    showImage(index);
    dialog.showModal();
    document.body.classList.add('lightbox-open');
    closeButton.focus();
  };

  const closeLightbox = () => {
    dialog.close();
    document.body.classList.remove('lightbox-open');
    returnFocus?.focus();
  };

  reviewImages.forEach((image, index) => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `View full-size image: ${image.alt}`);
    image.addEventListener('click', () => openLightbox(image, index));
    image.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(image, index);
      }
    });
  });

  closeButton.addEventListener('click', closeLightbox);
  previousButton.addEventListener('click', () => showImage(activeIndex - 1));
  nextButton.addEventListener('click', () => showImage(activeIndex + 1));
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeLightbox();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeLightbox();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') showImage(activeIndex - 1);
    if (event.key === 'ArrowRight') showImage(activeIndex + 1);
  });
}
