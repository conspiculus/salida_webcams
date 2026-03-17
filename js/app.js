(async function () {
  const res = await fetch('cameras.json');
  const config = await res.json();

  document.getElementById('title').textContent = config.title || 'Webcam Dashboard';
  document.title = config.title || 'Webcam Dashboard';

  const grid = document.getElementById('grid');
  const count = config.cameras.length;

  if (count <= 2) {
    grid.style.gridTemplateRows = '1fr';
  }

  config.cameras.forEach((cam) => {
    const tile = createTile(cam, config.refreshInterval || 5000);
    grid.appendChild(tile);
  });

  document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  function resolveType(cam) {
    if (cam.type && cam.type !== 'auto') return cam.type;

    const url = cam.url.toLowerCase();
    if (url.includes('.m3u8')) return 'hls';
    if (url.includes('mjpg') || url.includes('mjpeg')) return 'mjpeg';
    if (url.match(/\.(jpg|jpeg|png|gif|bmp|webp)(\?|$)/)) return 'image';
    if (url.match(/\.(mp4|webm|ogg)(\?|$)/)) return 'video';
    if (url.includes('embed') || url.includes('iframe')) return 'iframe';

    return 'mjpeg';
  }

  function createTile(cam, refreshInterval) {
    const tile = document.createElement('div');
    tile.className = 'tile';

    const label = document.createElement('div');
    label.className = 'tile-label';
    label.textContent = cam.label || 'Camera';
    tile.appendChild(label);

    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'tile-error hidden';
    tile.appendChild(errorOverlay);

    const type = resolveType(cam);

    switch (type) {
      case 'mjpeg':
        renderMjpeg(tile, cam);
        break;
      case 'hls':
        renderHls(tile, cam);
        break;
      case 'image':
        renderImage(tile, cam, refreshInterval);
        break;
      case 'video':
        renderVideo(tile, cam);
        break;
      case 'iframe':
        renderIframe(tile, cam);
        break;
      default:
        renderMjpeg(tile, cam);
    }

    tile._cam = cam;
    tile._refreshInterval = refreshInterval;

    return tile;
  }

  function renderMjpeg(tile, cam) {
    const img = document.createElement('img');
    img.src = cam.url;
    img.alt = cam.label || 'Camera';
    img.onerror = () => showTileError(tile, 'Stream unavailable');
    tile.appendChild(img);
  }

  function renderHls(tile, cam) {
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.controls = false;

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hls.loadSource(cam.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) showTileError(tile, 'HLS stream error');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = cam.url;
    } else {
      showTileError(tile, 'HLS not supported');
      return;
    }

    tile.appendChild(video);
  }

  function renderImage(tile, cam, refreshInterval) {
    const img = document.createElement('img');
    const separator = cam.url.includes('?') ? '&' : '?';
    img.src = cam.url + separator + '_t=' + Date.now();
    img.alt = cam.label || 'Camera';
    img.onerror = () => showTileError(tile, 'Image unavailable');
    tile.appendChild(img);

    if (refreshInterval > 0) {
      setInterval(() => {
        const sep = cam.url.includes('?') ? '&' : '?';
        img.src = cam.url + sep + '_t=' + Date.now();
      }, refreshInterval);
    }
  }

  function renderIframe(tile, cam) {
    const iframe = document.createElement('iframe');
    iframe.src = cam.url;
    iframe.allow = 'autoplay; fullscreen';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    tile.appendChild(iframe);
  }

  function renderVideo(tile, cam) {
    const video = document.createElement('video');
    video.src = cam.url;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
    video.onerror = () => showTileError(tile, 'Video unavailable');
    tile.appendChild(video);
  }

  function showTileError(tile, message) {
    const overlay = tile.querySelector('.tile-error');
    overlay.textContent = message;
    overlay.classList.remove('hidden');

    setTimeout(() => {
      overlay.classList.add('hidden');
      retryTile(tile);
    }, 10000);
  }

  function retryTile(tile) {
    const media = tile.querySelector('img, video, iframe');
    if (media) media.remove();

    const cam = tile._cam;
    const refreshInterval = tile._refreshInterval;
    const type = resolveType(cam);

    switch (type) {
      case 'mjpeg':
        renderMjpeg(tile, cam);
        break;
      case 'hls':
        renderHls(tile, cam);
        break;
      case 'image':
        renderImage(tile, cam, refreshInterval);
        break;
      case 'video':
        renderVideo(tile, cam);
        break;
      case 'iframe':
        renderIframe(tile, cam);
        break;
    }
  }
})();
