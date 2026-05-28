// State Management
let exhibitors = [...DEFAULT_EXHIBITORS];
let plannerData = {
  favorites: new Set(),
  visited: new Set(),
  memos: {}
};

let selectedId = null;
let zoom = 1.0;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

let currentTab = 'all';
let currentFilter = 'all';
let searchQuery = '';

// DOM Elements
const mapViewport = document.getElementById('map-viewport');
const searchInput = document.getElementById('search-input');
const exhibitorsList = document.getElementById('exhibitors-list');
const detailPanel = document.getElementById('detail-panel');
const dialog = document.getElementById('memo-dialog');
const dialogText = document.getElementById('memo-text');
const toast = document.getElementById('toast');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  loadPlannerData();
  initTheme();
  // Set default view for mobile
  document.body.classList.add('show-map-view');
  renderSVGMap();
  renderExhibitorsList();
  setupEventListeners();
  showToast('코엑스 부스 배치도가 로드되었습니다.');
  setTimeout(fitMapToViewport, 100);
});

// Load from LocalStorage
function loadPlannerData() {
  const stored = localStorage.getItem('teaworld2026_planner');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      plannerData.favorites = new Set(parsed.favorites || []);
      plannerData.visited = new Set(parsed.visited || []);
      plannerData.memos = parsed.memos || {};
    } catch (e) {
      console.error('로컬 데이터를 불러오는 중 오류 발생:', e);
    }
  }
}

// Save to LocalStorage
function savePlannerData() {
  const exportable = {
    favorites: Array.from(plannerData.favorites),
    visited: Array.from(plannerData.visited),
    memos: plannerData.memos
  };
  localStorage.setItem('teaworld2026_planner', JSON.stringify(exportable));
}

// Theme Configuration
// Theme Configuration
function initTheme() {
  const themeBtn = document.getElementById('theme-btn');
  const mobileThemeBtn = document.getElementById('mobile-theme-btn');
  
  let currentTheme = localStorage.getItem('teaworld2026_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeUI(currentTheme);
  
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
  if (mobileThemeBtn) {
    mobileThemeBtn.addEventListener('click', toggleTheme);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem('teaworld2026_theme', nextTheme);
  updateThemeUI(nextTheme);
}

function updateThemeUI(theme) {
  const sunIcon = document.getElementById('theme-sun-icon');
  const moonIcon = document.getElementById('theme-moon-icon');
  const mobileSunIcon = document.getElementById('mobile-theme-sun-icon');
  const mobileMoonIcon = document.getElementById('mobile-theme-moon-icon');
  const mobileThemeText = document.getElementById('mobile-theme-text');
  
  if (theme === 'light') {
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
    if (mobileSunIcon) mobileSunIcon.style.display = 'none';
    if (mobileMoonIcon) mobileMoonIcon.style.display = 'block';
    if (mobileThemeText) mobileThemeText.textContent = '라이트 모드 (다크 모드로 전환)';
  } else {
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
    if (mobileSunIcon) mobileSunIcon.style.display = 'block';
    if (mobileMoonIcon) mobileMoonIcon.style.display = 'none';
    if (mobileThemeText) mobileThemeText.textContent = '다크 모드 (라이트 모드로 전환)';
  }
}

// Auto-fit SVG map to viewport (Landscape -> width, Portrait -> height)
function fitMapToViewport() {
  if (!mapViewport) return;
  const containerWidth = mapViewport.clientWidth;
  const containerHeight = mapViewport.clientHeight;
  if (!containerWidth || !containerHeight) return;

  const svgWidth = 960;
  const svgHeight = 640;

  if (containerWidth > containerHeight) {
    zoom = containerWidth / svgWidth;
  } else {
    zoom = containerHeight / svgHeight;
  }

  panX = 0;
  panY = 0;
  applyZoomPan();
}

// Draw SVG Floor Plan
function renderSVGMap() {
  // Clear previous SVG
  mapViewport.innerHTML = '';
  
  // Set dimensions based on data coordinate spread
  const svgWidth = 960;
  const svgHeight = 640;
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', svgWidth);
  svg.setAttribute('height', svgHeight);
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  svg.setAttribute('class', 'exhibition-map');
  svg.setAttribute('id', 'exhibition-svg');
  svg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  
  // Add Grid Background Pattern for Techy/Premium Aesthetic
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  pattern.setAttribute('id', 'map-grid-pattern');
  pattern.setAttribute('width', '20');
  pattern.setAttribute('height', '20');
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  
  const gridPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  gridPath.setAttribute('d', 'M 20 0 L 0 0 0 20');
  gridPath.setAttribute('class', 'map-grid');
  
  pattern.appendChild(gridPath);
  defs.appendChild(pattern);
  svg.appendChild(defs);
  
  const gridRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  gridRect.setAttribute('width', '100%');
  gridRect.setAttribute('height', '100%');
  gridRect.setAttribute('fill', 'url(#map-grid-pattern)');
  svg.appendChild(gridRect);

  // Add Wall Outlines
  const wall = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  wall.setAttribute('x', '15');
  wall.setAttribute('y', '15');
  wall.setAttribute('width', svgWidth - 30);
  wall.setAttribute('height', svgHeight - 30);
  wall.setAttribute('fill', 'none');
  wall.setAttribute('stroke', 'var(--border-color)');
  wall.setAttribute('stroke-width', '2');
  wall.setAttribute('rx', '10');
  svg.appendChild(wall);

  // Note: Aisles (passages) are represented as clean empty space in the grid layout.

  // Render Structural Pillars
  if (typeof PILLARS !== 'undefined') {
    PILLARS.forEach((pillar, index) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      const w = pillar.width || 26;
      const h = pillar.height || 20;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', pillar.x);
      rect.setAttribute('y', pillar.y);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
      rect.setAttribute('class', 'map-pillar');
      rect.setAttribute('rx', '4');
      rect.setAttribute('ry', '4');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pillar.x + w / 2);
      text.setAttribute('y', pillar.y + h / 2);
      text.setAttribute('class', 'booth-label unassigned');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.textContent = "기둥";
      
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `기둥 (Pillar ${index + 1})`;
      rect.appendChild(title);
      
      g.appendChild(rect);
      g.appendChild(text);
      svg.appendChild(g);
    });
  }

  // Render Booths
  exhibitors.forEach(booth => {
    const isStarred = plannerData.favorites.has(booth.id);
    const isVisited = plannerData.visited.has(booth.id);
    const isFacility = booth.id.startsWith("입구") || booth.id.startsWith("출구") || booth.id === "등록대";
    
    // Group for rect + text
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Rect
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', booth.x);
    rect.setAttribute('y', booth.y);
    rect.setAttribute('width', booth.width);
    rect.setAttribute('height', booth.height);
    
    const isUnassigned = booth.name === '미배정 부스';
    rect.setAttribute('class', `booth-rect ${isUnassigned ? 'unassigned' : ''} ${isFacility ? 'facility' : ''} ${selectedId === booth.id ? 'active' : ''} ${isStarred ? 'starred' : ''} ${isVisited ? 'visited' : ''}`);
    
    // Set Section for color mapping
    const isSpecialZone = booth.id === '무대' || booth.id === '휴게' || booth.id === '체험' || isFacility;
    rect.setAttribute('data-section', isFacility ? 'SPECIAL' : (isSpecialZone ? 'SPECIAL' : booth.section));
    rect.setAttribute('data-id', booth.id);
    
    // Custom Tooltip Title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = isFacility ? booth.name : `[${booth.id}] ${booth.name}${isStarred ? ' (★ 즐겨찾기)' : ''}${isVisited ? ' (✓ 방문완료)' : ''}`;
    rect.appendChild(title);
    
    // Text Label Background for special stages/cafes (to make it readable)
    if (isSpecialZone && !isFacility) {
      const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      textBg.setAttribute('x', booth.x + 4);
      textBg.setAttribute('y', booth.y + booth.height/2 - 10);
      textBg.setAttribute('width', booth.width - 8);
      textBg.setAttribute('height', '20');
      textBg.setAttribute('class', 'booth-label-bg');
      g.appendChild(textBg);
    }
    
    // Text Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', `booth-label ${isUnassigned ? 'unassigned' : ''} ${isFacility ? 'facility' : ''}`);
    
    const idSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    idSpan.setAttribute('x', booth.x + booth.width / 2);
    idSpan.textContent = isFacility ? booth.name : booth.id;
    text.appendChild(idSpan);

    if (isFacility) {
      text.setAttribute('y', booth.y + booth.height / 2);
    } else if (!isUnassigned && booth.id !== '무대') {
      idSpan.setAttribute('dy', '-2');
      
      const nameSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      nameSpan.setAttribute('x', booth.x + booth.width / 2);
      nameSpan.setAttribute('dy', '10');
      nameSpan.setAttribute('class', 'booth-label-name');
      
      // Clean and truncate name (removing slash details and parenthesized sub-names)
      const maxLen = booth.width >= 50 ? 8 : (booth.width >= 40 ? 6 : 4);
      let displayName = booth.name.split('/')[0].split('(')[0].trim();
      if (displayName.length > maxLen) {
        displayName = displayName.substring(0, maxLen);
      }
      nameSpan.textContent = displayName;
      text.appendChild(nameSpan);
      
      text.setAttribute('y', booth.y + booth.height / 2 - 3);
    } else {
      text.setAttribute('y', booth.y + booth.height / 2);
      
      if (booth.id === '무대') {
        idSpan.setAttribute('dy', '-6');
        
        const nameSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        nameSpan.setAttribute('x', booth.x + booth.width / 2);
        nameSpan.setAttribute('dy', '14');
        nameSpan.setAttribute('class', 'booth-label-name special');
        nameSpan.textContent = "메인 무대";
        text.appendChild(nameSpan);
        
        text.setAttribute('y', booth.y + booth.height / 2 - 4);
      }
    }
    
    // Add event listeners on rect click/double-click/double-tap
    if (!isFacility) {
      let lastClickTime = 0;
      rect.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentTime = Date.now();
        const isDoubleClick = (currentTime - lastClickTime < 300);
        lastClickTime = currentTime;
        
        selectBooth(booth.id);
        if (isDoubleClick) {
          showBoothInList(booth.id);
        }
      });
      
      // Also register dblclick for desktop mouse double-click
      rect.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        selectBooth(booth.id);
        showBoothInList(booth.id);
      });
    }
    
    g.appendChild(rect);
    g.appendChild(text);
    svg.appendChild(g);
  });
  
  mapViewport.appendChild(svg);
}

// Select a booth, update details panel, sync map class
function selectBooth(id) {
  selectedId = id;
  
  // Highlight rect in SVG
  const rects = document.querySelectorAll('.booth-rect');
  rects.forEach(r => {
    r.classList.remove('active');
    if (r.getAttribute('data-id') === id) {
      r.classList.add('active');
    }
  });
  
  // Update sidebar list highlight
  const cards = document.querySelectorAll('.exhibitor-card');
  cards.forEach(c => {
    c.classList.remove('active');
    if (c.getAttribute('data-id') === id) {
      c.classList.add('active');
    }
  });
  
  // Update details drawer
  const booth = exhibitors.find(b => b.id === id);
  if (booth) {
    renderDetailPanel(booth);
  }
}

// Show selected booth in the list view, scroll it into view and highlight it
function showBoothInList(id) {
  // 1. Reset filters/search to ensure the booth is visible in the list
  searchQuery = '';
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Set tab filter to 'all'
  currentTab = 'all';
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    if (btn.getAttribute('data-tab') === 'all') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // 2. Rerender list
  renderExhibitorsList();
  
  // 3. Switch tab to list on mobile
  switchTab('list');
  
  // 4. Find the card and scroll it into view, flash highlight it
  setTimeout(() => {
    const targetCard = document.querySelector(`.exhibitor-card[data-id="${id}"]`);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: 'auto', block: 'center' });
      
      // Apply temporary visual flash
      targetCard.classList.remove('flash-highlight');
      void targetCard.offsetWidth; // trigger reflow
      targetCard.classList.add('flash-highlight');
      
      // Toast message to guide the user
      showToast(`[${id}] 부스로 이동했습니다. 즐겨찾기/방문완료를 등록해 보세요!`);
      
      // Clean up class after animation
      setTimeout(() => {
        targetCard.classList.remove('flash-highlight');
      }, 2000);
    }
  }, 100);
}

// Render detail panel contents
function renderDetailPanel(booth) {
  const isStarred = plannerData.favorites.has(booth.id);
  const isVisited = plannerData.visited.has(booth.id);
  
  detailPanel.style.display = 'block';
  detailPanel.classList.add('active');
  
  const badge = document.getElementById('detail-booth-id');
  badge.textContent = booth.id;
  
  // Set badge background color based on section
  const sectionColors = {
    A: 'var(--color-sec-a)',
    B: 'var(--color-sec-b)',
    C: 'var(--color-sec-c)',
    D: 'var(--color-sec-d)',
    E: 'var(--color-sec-e)',
    F: 'var(--color-sec-f)',
    G: 'var(--color-sec-g)',
    H: 'var(--color-sec-h)',
    SPECIAL: 'var(--color-sec-special)'
  };
  const isSpecial = booth.id === '무대' || booth.id === '휴게' || booth.id === '체험';
  badge.style.backgroundColor = sectionColors[isSpecial ? 'SPECIAL' : booth.section];
  
  document.getElementById('detail-title').textContent = booth.name;
  
  const gridCoords = document.getElementById('detail-grid-coords');
  if (gridCoords) {
    gridCoords.textContent = `그리드 좌표: (${booth.gridX}, ${booth.gridY}) | 크기: ${booth.gridW}x${booth.gridH}`;
  }
  
  // Render buttons states
  const starBtn = document.getElementById('detail-star-btn');
  const visitBtn = document.getElementById('detail-visit-btn');
  
  if (isStarred) {
    starBtn.textContent = '★ 별표 취소';
    starBtn.style.borderColor = 'var(--color-star)';
    starBtn.style.color = 'var(--color-star)';
  } else {
    starBtn.textContent = '☆ 즐겨찾기';
    starBtn.style.borderColor = 'var(--border-color)';
    starBtn.style.color = 'var(--text-main)';
  }
  
  if (isVisited) {
    visitBtn.textContent = '✓ 방문취소';
    visitBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
    visitBtn.style.borderColor = 'var(--color-sec-a)';
  } else {
    visitBtn.textContent = '✓ 방문 완료';
    visitBtn.style.backgroundColor = 'var(--btn-secondary)';
    visitBtn.style.borderColor = 'var(--border-color)';
  }
  
  // Render Memo
  const memoContent = document.getElementById('detail-memo-content');
  const memoText = plannerData.memos[booth.id];
  
  if (memoText && memoText.trim() !== '') {
    memoContent.innerHTML = `<div class="detail-memo-text">${escapeHTML(memoText)}</div>`;
  } else {
    memoContent.innerHTML = `<div class="detail-memo-empty">작성된 메모가 없습니다. <span>+ 추가하기</span></div>`;
  }
}

// Render Exhibitor List in Sidebar
function renderExhibitorsList() {
  exhibitorsList.innerHTML = '';
  
  // Filtered array
  const filtered = exhibitors.filter(b => {
    // Exclude facility IDs from list entirely
    const isFacility = b.id.startsWith("입구") || b.id.startsWith("출구") || b.id === "등록대";
    if (isFacility) return false;

    // Exclude unassigned empty booths from the list by default
    // to avoid cluttering, but keep them if they are searched, starred, visited, or have notes
    const isUnassigned = b.name === '미배정 부스';
    const hasMemo = plannerData.memos[b.id] && plannerData.memos[b.id].trim() !== '';
    const isStarred = plannerData.favorites.has(b.id);
    const isVisited = plannerData.visited.has(b.id);
    
    if (isUnassigned && searchQuery.trim() === '' && !hasMemo && !isStarred && !isVisited) {
      return false;
    }

    // 1. Tab filter
    if (currentTab === 'starred' && !plannerData.favorites.has(b.id)) return false;
    if (currentTab === 'visited' && !plannerData.visited.has(b.id)) return false;
    
    // 2. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchId = b.id.toLowerCase().includes(q);
      const matchName = b.name.toLowerCase().includes(q);
      if (!matchId && !matchName) return false;
    }
    
    return true;
  });
  
  // Sort exhibitors: Special stages at bottom, alphabetical booth code order otherwise
  filtered.sort((x, y) => {
    const isXSpecial = ['무대', '휴게', '체험'].includes(x.id);
    const isYSpecial = ['무대', '휴게', '체험'].includes(y.id);
    if (isXSpecial && !isYSpecial) return 1;
    if (!isXSpecial && isYSpecial) return -1;

    const isXUnassigned = x.name === '미배정 부스';
    const isYUnassigned = y.name === '미배정 부스';
    if (isXUnassigned && !isYUnassigned) return 1;
    if (!isXUnassigned && isYUnassigned) return -1;
    
    if (isXUnassigned && isYUnassigned) {
      // Sort vacant booths by ID (A1, A2...)
      const secX = x.id.charAt(0);
      const secY = y.id.charAt(0);
      if (secX !== secY) return secX.localeCompare(secY);
      const numX = parseInt(x.id.substring(1)) || 0;
      const numY = parseInt(y.id.substring(1)) || 0;
      return numX - numY;
    }
    
    // Sort standard occupied booths alphabetically by name (이름순)
    return x.name.localeCompare(y.name, 'ko');
  });
  
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      <p>필터링 조건에 부합하는 부스가 없습니다.</p>
    `;
    exhibitorsList.appendChild(empty);
    return;
  }
  
  // Create Cards
  filtered.forEach(booth => {
    const isStarred = plannerData.favorites.has(booth.id);
    const isVisited = plannerData.visited.has(booth.id);
    const card = document.createElement('div');
    card.className = `exhibitor-card ${selectedId === booth.id ? 'active' : ''} ${isStarred ? 'starred' : ''} ${isVisited ? 'visited' : ''}`;
    card.setAttribute('data-id', booth.id);
    
    const badgeBg = {
      A: 'var(--color-sec-a)',
      B: 'var(--color-sec-b)',
      C: 'var(--color-sec-c)',
      D: 'var(--color-sec-d)',
      E: 'var(--color-sec-e)',
      F: 'var(--color-sec-f)',
      G: 'var(--color-sec-g)',
      H: 'var(--color-sec-h)',
      SPECIAL: 'var(--color-sec-special)'
    };
    const isSpecial = ['무대', '휴게', '체험'].includes(booth.id);
    const badgeColor = badgeBg[isSpecial ? 'SPECIAL' : booth.section];
    
    let memoPreviewHtml = '';
    const memo = plannerData.memos[booth.id];
    if (memo && memo.trim() !== '') {
      memoPreviewHtml = `<div class="exhibitor-card-memo-preview">📝 ${escapeHTML(memo)}</div>`;
    }
    
    card.innerHTML = `
      <div class="exhibitor-card-top">
        <span class="booth-badge" style="background-color: ${badgeColor};">${booth.id}</span>
        <div class="exhibitor-card-title">${booth.name}</div>
      </div>
      <div style="font-size: 0.65rem; color: var(--text-muted); opacity: 0.8; margin-top: 0.15rem;">
        그리드: (${booth.gridX}, ${booth.gridY}) | 크기: ${booth.gridW}x${booth.gridH}
      </div>
      ${memoPreviewHtml}
    `;
    
    let lastClickTime = 0;
    card.addEventListener('click', () => {
      const currentTime = Date.now();
      const isDoubleClick = (currentTime - lastClickTime < 300);
      lastClickTime = currentTime;
      
      selectBooth(booth.id);
      
      if (window.innerWidth <= 768) {
        if (isDoubleClick) {
          switchTab('map');
          void mapViewport.offsetWidth; // Force synchronous reflow
          setTimeout(() => {
            centerOnBooth(booth);
          }, 50);
        }
      } else {
        // On desktop/tablet, single click centers it immediately
        centerOnBooth(booth);
      }
    });
    
    // Desktop dblclick fallback
    card.addEventListener('dblclick', () => {
      selectBooth(booth.id);
      if (window.innerWidth <= 768) {
        switchTab('map');
        void mapViewport.offsetWidth; // Force synchronous reflow
        setTimeout(() => {
          centerOnBooth(booth);
        }, 50);
      } else {
        centerOnBooth(booth);
      }
    });
    
    exhibitorsList.appendChild(card);
  });
}

// Auto scroll and center the SVG map on selection (relative to SVG center)
function centerOnBooth(booth) {
  const svgWidth = 960;
  const svgHeight = 640;
  
  // Reset any browser native scroll position to avoid math misalignment
  if (mapViewport) {
    mapViewport.scrollLeft = 0;
    mapViewport.scrollTop = 0;
  }
  
  // Calculate center of target booth
  const boothCenterX = booth.x + booth.width / 2;
  const boothCenterY = booth.y + booth.height / 2;
  
  let offsetY = 0;
  // Set higher zoom factor on focus (2.0 for mobile, 1.8 for desktop)
  if (window.innerWidth <= 768) {
    zoom = 2.0;
    // Offset Y upward on mobile because the bottom detail sheet covers the lower screen
    offsetY = 120; 
  } else {
    zoom = 1.8;
    offsetY = 0;
  }
  
  // Move map viewport coordinates so the booth centers
  panX = - (boothCenterX - svgWidth / 2) * zoom;
  panY = - (boothCenterY - svgHeight / 2) * zoom - offsetY;
  
  const svg = document.getElementById('exhibition-svg');
  if (svg) {
    svg.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    svg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    setTimeout(() => {
      svg.style.transition = 'transform 0.1s ease-out'; // revert transition to fast drag feel
    }, 300);
  }
}

// Responsive layout tab switcher for mobile viewports
// Responsive layout tab switcher for mobile viewports
function switchTab(tab) {
  const navMapBtn = document.getElementById('nav-map-btn');
  const navListBtn = document.getElementById('nav-list-btn');
  const navSettingsBtn = document.getElementById('nav-settings-btn');
  
  document.body.classList.remove('show-map-view', 'show-list-view', 'show-settings-view');
  if (navMapBtn) navMapBtn.classList.remove('active');
  if (navListBtn) navListBtn.classList.remove('active');
  if (navSettingsBtn) navSettingsBtn.classList.remove('active');
  
  if (tab === 'map') {
    document.body.classList.add('show-map-view');
    if (navMapBtn) navMapBtn.classList.add('active');
    // Force reflow and auto-fit map after a short delay
    void mapViewport.offsetWidth;
    setTimeout(fitMapToViewport, 50);
  } else if (tab === 'list') {
    document.body.classList.add('show-list-view');
    if (navListBtn) navListBtn.classList.add('active');
    // Keep details panel open when switching to the list view
  } else if (tab === 'settings') {
    document.body.classList.add('show-settings-view');
    if (navSettingsBtn) navSettingsBtn.classList.add('active');
    detailPanel.classList.remove('active'); // collapse details on settings view
  }
}

// Setup Interaction Events
function setupEventListeners() {
  // Mobile Nav Tab Events
  const navMapBtn = document.getElementById('nav-map-btn');
  const navListBtn = document.getElementById('nav-list-btn');
  const navSettingsBtn = document.getElementById('nav-settings-btn');
  if (navMapBtn) navMapBtn.addEventListener('click', () => switchTab('map'));
  if (navListBtn) navListBtn.addEventListener('click', () => switchTab('list'));
  if (navSettingsBtn) navSettingsBtn.addEventListener('click', () => switchTab('settings'));
  
  // Close details bottom sheet button
  const closeDetailBtn = document.getElementById('close-detail-btn');
  if (closeDetailBtn) {
    closeDetailBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      detailPanel.classList.remove('active');
    });
  }

  // Search
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderExhibitorsList();
  });
  
  // Tabs (All, Starred, Visited)
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-tab');
      renderExhibitorsList();
    });
  });
  
  // Detail Panel: Star Toggle
  document.getElementById('detail-star-btn').addEventListener('click', () => {
    if (!selectedId) return;
    
    if (plannerData.favorites.has(selectedId)) {
      plannerData.favorites.delete(selectedId);
      showToast(`[${selectedId}] 즐겨찾기를 해제했습니다.`);
    } else {
      plannerData.favorites.add(selectedId);
      showToast(`[${selectedId}] 가고 싶은 부스로 저장 완료! ★`);
    }
    
    savePlannerData();
    updateBoothVisuals(selectedId);
    renderExhibitorsList();
    
    // Refresh Panel
    const b = exhibitors.find(x => x.id === selectedId);
    renderDetailPanel(b);
  });
  
  // Detail Panel: Visit Toggle
  document.getElementById('detail-visit-btn').addEventListener('click', () => {
    if (!selectedId) return;
    
    if (plannerData.visited.has(selectedId)) {
      plannerData.visited.delete(selectedId);
      showToast(`[${selectedId}] 방문 상태를 초기화했습니다.`);
    } else {
      plannerData.visited.add(selectedId);
      showToast(`[${selectedId}] 방문 완료 체크 완료! ✓`);
    }
    
    savePlannerData();
    updateBoothVisuals(selectedId);
    renderExhibitorsList();
    
    // Refresh Panel
    const b = exhibitors.find(x => x.id === selectedId);
    renderDetailPanel(b);
  });
  
  // Detail Panel: Open Memo Modal
  document.getElementById('detail-edit-memo').addEventListener('click', openMemoDialog);
  detailPanel.addEventListener('click', (e) => {
    if (e.target.closest('.detail-memo-empty')) {
      openMemoDialog();
    }
  });
  
  // Dialog Actions
  document.getElementById('memo-save').addEventListener('click', () => {
    if (!selectedId) return;
    
    const text = dialogText.value;
    plannerData.memos[selectedId] = text;
    savePlannerData();
    
    dialog.close();
    
    // Re-render
    const b = exhibitors.find(x => x.id === selectedId);
    renderDetailPanel(b);
    renderExhibitorsList();
    showToast(`[${selectedId}] 메모를 저장했습니다.`);
  });
  
  document.getElementById('memo-cancel').addEventListener('click', () => {
    dialog.close();
  });
  
  // Zoom Buttons
  document.getElementById('zoom-in').addEventListener('click', () => {
    zoom = Math.min(3.0, zoom + 0.2);
    applyZoomPan();
  });
  
  document.getElementById('zoom-out').addEventListener('click', () => {
    zoom = Math.max(0.1, zoom - 0.2);
    applyZoomPan();
  });
  
  document.getElementById('zoom-reset').addEventListener('click', () => {
    fitMapToViewport();
    showToast('지도 배율이 자동 맞춤으로 초기화되었습니다.');
  });
  
  // Window Resize Listener for dynamic auto-fit
  window.addEventListener('resize', fitMapToViewport);
  
  // SVG Panning (Drag and move)
  mapViewport.addEventListener('mousedown', (e) => {
    // Only drag with left click
    if (e.button !== 0) return;
    
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    e.preventDefault();
  });
  
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyZoomPan();
  });
  
  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  // Also support touch for mobile
  mapViewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX - panX;
      startY = e.touches[0].clientY - panY;
    }
  });
  
  window.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    panX = e.touches[0].clientX - startX;
    panY = e.touches[0].clientY - startY;
    applyZoomPan();
  });
  
  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Export Data JSON (Desktop & Mobile)
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  const mobileExportBtn = document.getElementById('mobile-export-btn');
  if (mobileExportBtn) mobileExportBtn.addEventListener('click', exportData);
  
  // Import Data JSON (Desktop & Mobile)
  const importBtn = document.getElementById('import-btn');
  const mobileImportBtn = document.getElementById('mobile-import-btn');
  const importFile = document.getElementById('import-file');
  
  const triggerImport = () => {
    if (importFile) importFile.click();
  };
  
  if (importBtn) importBtn.addEventListener('click', triggerImport);
  if (mobileImportBtn) mobileImportBtn.addEventListener('click', triggerImport);
  
  if (importFile) importFile.addEventListener('change', importData);
}

// Update single booth styling on SVG map
function updateBoothVisuals(id) {
  const rect = document.querySelector(`.booth-rect[data-id="${id}"]`);
  if (rect) {
    const booth = exhibitors.find(x => x.id === id);
    const isUnassigned = booth && booth.name === '미배정 부스';
    const isStarred = plannerData.favorites.has(id);
    const isVisited = plannerData.visited.has(id);
    
    rect.className.baseVal = `booth-rect ${isUnassigned ? 'unassigned' : ''} ${selectedId === id ? 'active' : ''} ${isStarred ? 'starred' : ''} ${isVisited ? 'visited' : ''}`;
  }
}

// Pan & Zoom Applier
function applyZoomPan() {
  const svg = document.getElementById('exhibition-svg');
  if (svg) {
    svg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }
}

// Open Dialog
function openMemoDialog() {
  if (!selectedId) return;
  
  const b = exhibitors.find(x => x.id === selectedId);
  document.getElementById('memo-dialog-title').textContent = `[${b.id}] ${b.name} 메모 작성`;
  
  dialogText.value = plannerData.memos[selectedId] || '';
  dialog.showModal();
}

// Show Toast Alert
let toastTimeout;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Export Planner Info
function exportData() {
  const exportable = {
    favorites: Array.from(plannerData.favorites),
    visited: Array.from(plannerData.visited),
    memos: plannerData.memos
  };
  
  const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `teaworld2026_planner_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('플래너 데이터 백업 파일이 다운로드되었습니다.');
}

// Import Planner Info
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      
      // Simple validation
      if (parsed.favorites && Array.isArray(parsed.favorites)) {
        plannerData.favorites = new Set(parsed.favorites);
      }
      if (parsed.visited && Array.isArray(parsed.visited)) {
        plannerData.visited = new Set(parsed.visited);
      }
      if (parsed.memos && typeof parsed.memos === 'object') {
        plannerData.memos = parsed.memos;
      }
      
      savePlannerData();
      
      // Re-render views
      renderSVGMap();
      renderExhibitorsList();
      if (selectedId) {
        const b = exhibitors.find(x => x.id === selectedId);
        if (b) renderDetailPanel(b);
      }
      
      showToast('플래너 데이터를 성공적으로 복구했습니다!');
    } catch (err) {
      alert('백업 파일 형식이 올바르지 않습니다.');
    }
  };
  
  reader.readAsText(file);
  e.target.value = ''; // clear file input
}

// Escape HTML utility
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
