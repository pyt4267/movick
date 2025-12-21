/* ========================================
   Movick - JavaScript
   TMDB API Integration
   ======================================== */

// ========================================
// 設定
// ========================================
const CONFIG = {
    API_KEY: '3816164f5e3c8b19d655814260e6b5f0',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE: 'https://image.tmdb.org/t/p',
    ITEMS_PER_PAGE: 20
};

// 多言語テキスト
const LANG = {
    'ja-JP': {
        loading: '読み込み中...',
        noResults: '結果が見つかりませんでした',
        noFavorites: 'お気に入りがありません',
        addFavoriteHint: '映画の詳細ページからお気に入りに追加できます',
        addToFavorites: 'お気に入りに追加',
        inFavorites: 'お気に入り済み',
        cast: 'キャスト',
        trailer: 'トレーラー',
        watchOn: '視聴可能',
        similar: '類似作品',
        reviews: 'レビュー',
        releasesIn: '公開まで',
        days: '日'
    },
    'en-US': {
        loading: 'Loading...',
        noResults: 'No results found',
        noFavorites: 'No favorites yet',
        addFavoriteHint: 'Add movies from detail page',
        addToFavorites: 'Add to Favorites',
        inFavorites: 'In Favorites',
        cast: 'Cast',
        trailer: 'Trailer',
        watchOn: 'Watch On',
        similar: 'Similar',
        reviews: 'Reviews',
        releasesIn: 'Releases in',
        days: 'days'
    }
};

// ========================================
// 状態管理
// ========================================
const state = {
    currentTab: 'popular',
    currentPage: 1,
    totalPages: 1,
    searchQuery: '',
    isLoading: false,
    movies: [],
    language: localStorage.getItem('movick_lang') || 'ja-JP',
    selectedGenre: '',
    genres: []
};

// ========================================
// DOM要素
// ========================================
const DOM = {
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    moviesGrid: document.getElementById('movies-grid'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    retryBtn: document.getElementById('retry-btn'),
    loadMore: document.getElementById('load-more'),
    modal: document.getElementById('modal'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.getElementById('modal-close'),
    tabs: document.querySelectorAll('.tab'),
    langSelect: document.getElementById('lang-select'),
    genreSelect: document.getElementById('genre-select')
};

// テキスト取得ヘルパー
function t(key) {
    return LANG[state.language]?.[key] || LANG['en-US'][key] || key;
}

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupEventListeners();
    loadGenres();
    loadMovies();

    // 言語セレクトの初期値
    if (DOM.langSelect) {
        DOM.langSelect.value = state.language;
    }
}

// ========================================
// イベントリスナー
// ========================================
function setupEventListeners() {
    // タブ切り替え
    DOM.tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // 検索
    DOM.searchBtn.addEventListener('click', handleSearch);
    DOM.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // もっと見る
    DOM.loadMore.addEventListener('click', loadMoreMovies);

    // リトライ
    DOM.retryBtn.addEventListener('click', loadMovies);

    // モーダル
    DOM.modalClose.addEventListener('click', closeModal);
    DOM.modal.addEventListener('click', (e) => {
        if (e.target === DOM.modal) closeModal();
    });

    // ESCキーでモーダル閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // 無限スクロール
    window.addEventListener('scroll', handleInfiniteScroll);

    // ダークモード切替
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // 保存されたテーマを適用
    const savedTheme = localStorage.getItem('movick_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    // 言語切替
    if (DOM.langSelect) {
        DOM.langSelect.addEventListener('change', (e) => {
            state.language = e.target.value;
            localStorage.setItem('movick_lang', state.language);
            state.currentPage = 1;
            loadGenres();
            loadMovies();
        });
    }

    // ジャンルフィルター
    if (DOM.genreSelect) {
        DOM.genreSelect.addEventListener('change', (e) => {
            state.selectedGenre = e.target.value;
            state.currentPage = 1;
            loadMovies();
        });
    }
}

// 無限スクロール処理
function handleInfiniteScroll() {
    if (state.isLoading || state.currentTab === 'favorites') return;

    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollY + windowHeight >= documentHeight - 500) {
        if (state.currentPage < state.totalPages) {
            state.currentPage++;
            loadMovies(true);
        }
    }
}

// テーマ切替
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('movick_theme', isLight ? 'light' : 'dark');

    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = isLight ? '🌙' : '☀️';
    }
}

// ========================================
// API呼び出し
// ========================================
async function fetchFromTMDB(endpoint, params = {}) {
    const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', CONFIG.API_KEY);
    url.searchParams.append('language', state.language);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    const response = await fetch(url);
    if (!response.ok) throw new Error('API Error');
    return response.json();
}

// ジャンル一覧を読み込む
async function loadGenres() {
    try {
        const data = await fetchFromTMDB('/genre/movie/list');
        state.genres = data.genres || [];

        if (DOM.genreSelect) {
            const defaultOption = state.language === 'ja-JP' ? '🎭 全てのジャンル' : '🎭 All Genres';
            DOM.genreSelect.innerHTML = `<option value="">${defaultOption}</option>`;
            state.genres.forEach(genre => {
                DOM.genreSelect.innerHTML += `<option value="${genre.id}">${genre.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Failed to load genres:', error);
    }
}

// ========================================
// データ読み込み
// ========================================
async function loadMovies(append = false) {
    if (state.isLoading) return;

    state.isLoading = true;
    showLoading(true);
    hideError();

    try {
        let data;

        // お気に入りタブの場合
        if (state.currentTab === 'favorites') {
            renderFavorites();
            return;
        }

        if (state.searchQuery) {
            // 検索モード
            data = await fetchFromTMDB('/search/multi', {
                query: state.searchQuery,
                page: state.currentPage
            });
        } else if (state.currentTab === 'tv') {
            // ドラマ
            const params = { page: state.currentPage };
            if (state.selectedGenre) params.with_genres = state.selectedGenre;
            data = await fetchFromTMDB('/discover/tv', params);
        } else if (state.selectedGenre) {
            // ジャンルフィルター
            data = await fetchFromTMDB('/discover/movie', {
                page: state.currentPage,
                with_genres: state.selectedGenre,
                sort_by: 'popularity.desc'
            });
        } else {
            // 映画カテゴリ
            data = await fetchFromTMDB(`/movie/${state.currentTab}`, {
                page: state.currentPage
            });
        }

        state.totalPages = data.total_pages;

        let movies = data.results.filter(item =>
            item.media_type !== 'person' && (item.poster_path || item.backdrop_path)
        );

        // 公開予定タブでは未公開映画のみ表示
        if (state.currentTab === 'upcoming') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            movies = movies.filter(item => {
                const releaseDate = new Date(item.release_date);
                return releaseDate >= today;
            });
        }

        if (append) {
            // 既存の映画とマージして重複排除
            const existingIds = new Set(state.movies.map(m => m.id));
            const uniqueNewMovies = movies.filter(m => !existingIds.has(m.id));
            state.movies = [...state.movies, ...uniqueNewMovies];
            renderMovies(uniqueNewMovies, true);
        } else {
            // 新規取得時も念のため重複排除
            const seen = new Set();
            state.movies = movies.filter(m => {
                if (seen.has(m.id)) return false;
                seen.add(m.id);
                return true;
            });
            renderMovies(state.movies, false);
        }
        updateLoadMoreButton();

    } catch (error) {
        console.error('Failed to load movies:', error);
        showError();
    } finally {
        state.isLoading = false;
        showLoading(false);
    }
}

function loadMoreMovies() {
    if (state.currentPage < state.totalPages) {
        state.currentPage++;
        loadMovies(true);
    }
}

// ========================================
// レンダリング
// ========================================
function renderMovies(moviesToRender, append = false) {
    if (!append) {
        DOM.moviesGrid.innerHTML = '';
    }

    if (moviesToRender.length === 0 && !append) {
        DOM.moviesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-secondary);">
                <p>🎬 結果が見つかりませんでした</p>
            </div>
        `;
        return;
    }

    moviesToRender.forEach(movie => {
        const card = createMovieCard(movie);
        DOM.moviesGrid.appendChild(card);
    });
}

function createMovieCard(movie) {
    const card = document.createElement('article');
    card.className = 'movie-card';

    const isTV = movie.media_type === 'tv' || movie.first_air_date;
    const title = movie.title || movie.name;
    const date = movie.release_date || movie.first_air_date;
    const year = date ? new Date(date).getFullYear() : '---';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const posterPath = movie.poster_path
        ? `${CONFIG.IMAGE_BASE}/w342${movie.poster_path}`
        : 'https://via.placeholder.com/342x513?text=No+Image';

    // 公開日カウントダウン（未来の日付の場合）
    let countdownHtml = '';
    if (date) {
        const releaseDate = new Date(date);
        const today = new Date();
        const daysUntil = Math.ceil((releaseDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0 && daysUntil <= 365) {
            countdownHtml = `<div class="countdown-badge">📅 ${t('releasesIn')} ${daysUntil}${t('days')}</div>`;
        }
    }

    card.innerHTML = `
        ${countdownHtml}
        <img src="${posterPath}" alt="${title}" class="movie-poster" loading="lazy">
        <div class="movie-info">
            <h3 class="movie-title">${escapeHtml(title)}</h3>
            <div class="movie-meta">
                <span class="movie-rating">⭐ ${rating}</span>
                <span class="movie-year">${year}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => openModal(movie.id, isTV ? 'tv' : 'movie'));

    return card;
}

// ========================================
// モーダル
// ========================================
async function openModal(id, type = 'movie') {
    DOM.modal.classList.remove('hidden');
    DOM.modalBody.innerHTML = '<div class="loading"><div class="spinner"></div><p>読み込み中...</p></div>';
    document.body.style.overflow = 'hidden';

    try {
        // まず日本語で取得
        let data = await fetchFromTMDB(`/${type}/${id}`, {
            append_to_response: 'credits,videos'
        });

        // 日本語の説明・タグラインがない場合、英語版を取得
        if (!data.overview || !data.tagline) {
            const enData = await fetchFromTMDBWithLang(`/${type}/${id}`, 'en-US');
            if (!data.overview) data.overview = enData.overview || '説明がありません';
            if (!data.tagline) data.tagline = enData.tagline || '';
        }

        // 日本語トレーラーがない場合、英語版を取得
        const hasJapaneseTrailer = data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        if (!hasJapaneseTrailer) {
            const enVideos = await fetchFromTMDBWithLang(`/${type}/${id}/videos`, 'en-US');
            if (enVideos.results) {
                data.videos = data.videos || { results: [] };
                data.videos.results = [...data.videos.results, ...enVideos.results];
            }
        }

        // 視聴プラットフォームを取得
        try {
            const watchProviders = await fetchFromTMDB(`/${type}/${id}/watch/providers`);
            data.watchProviders = watchProviders.results?.JP || watchProviders.results?.US || null;
        } catch (e) {
            data.watchProviders = null;
        }

        // レビューを取得
        try {
            const reviews = await fetchFromTMDB(`/${type}/${id}/reviews`);
            data.reviews = reviews.results?.slice(0, 3) || [];
        } catch (e) {
            data.reviews = [];
        }

        renderModalContent(data, type);
    } catch (error) {
        DOM.modalBody.innerHTML = '<p style="padding: 2rem; text-align: center;">詳細の取得に失敗しました</p>';
    }
}

// 言語指定でTMDB APIを呼び出す
async function fetchFromTMDBWithLang(endpoint, language) {
    const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', CONFIG.API_KEY);
    url.searchParams.append('language', language);

    const response = await fetch(url);
    if (!response.ok) throw new Error('API Error');
    return response.json();
}

function renderModalContent(data, type) {
    const title = data.title || data.name;
    const date = data.release_date || data.first_air_date;
    const year = date ? new Date(date).getFullYear() : '---';
    const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
    const runtime = data.runtime || (data.episode_run_time?.[0]) || 0;
    const movieId = data.id;

    const backdropPath = data.backdrop_path
        ? `${CONFIG.IMAGE_BASE}/w1280${data.backdrop_path}`
        : '';
    const posterPath = data.poster_path
        ? `${CONFIG.IMAGE_BASE}/w342${data.poster_path}`
        : 'https://via.placeholder.com/342x513?text=No+Image';

    // キャスト情報（上位6人）
    const cast = data.credits?.cast?.slice(0, 6) || [];
    const castHtml = cast.length > 0 ? `
        <div class="modal-section">
            <h3 class="section-title">🎭 キャスト</h3>
            <div class="cast-grid">
                ${cast.map(person => `
                    <div class="cast-item">
                        <img src="${person.profile_path
            ? `${CONFIG.IMAGE_BASE}/w185${person.profile_path}`
            : 'https://via.placeholder.com/185x278?text=No+Photo'}" 
                            alt="${person.name}" class="cast-photo">
                        <p class="cast-name">${escapeHtml(person.name)}</p>
                        <p class="cast-character">${escapeHtml(person.character || '')}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // トレーラー（YouTube）
    const trailer = data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const trailerHtml = trailer ? `
        <div class="modal-section">
            <h3 class="section-title">🎬 トレーラー</h3>
            <div class="trailer-container">
                <iframe 
                    src="https://www.youtube.com/embed/${trailer.key}" 
                    frameborder="0" 
                    allowfullscreen
                    class="trailer-iframe">
                </iframe>
            </div>
        </div>
    ` : '';

    // お気に入りチェック
    const isFavorite = checkFavorite(movieId, type);
    const favoriteBtn = `
        <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                onclick="toggleFavorite(${movieId}, '${type}', '${escapeHtml(title).replace(/'/g, "\\'")}', '${posterPath}')">
            ${isFavorite ? '❤️ お気に入り済み' : '🤍 お気に入りに追加'}
        </button>
    `;

    // 視聴プラットフォーム
    const providers = data.watchProviders;
    let watchHtml = '';
    if (providers) {
        const allProviders = [
            ...(providers.flatrate || []),
            ...(providers.rent || []),
            ...(providers.buy || [])
        ].slice(0, 6);

        if (allProviders.length > 0) {
            watchHtml = `
                <div class="modal-section">
                    <h3 class="section-title">📺 視聴可能</h3>
                    <div class="providers-grid">
                        ${allProviders.map(p => `
                            <div class="provider-item">
                                <img src="${CONFIG.IMAGE_BASE}/w92${p.logo_path}" 
                                     alt="${p.provider_name}" 
                                     class="provider-logo"
                                     title="${p.provider_name}">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    DOM.modalBody.innerHTML = `
        ${backdropPath ? `<div class="modal-backdrop" style="background-image: url('${backdropPath}')"></div>` : ''}
        <div class="modal-details">
            <img src="${posterPath}" alt="${title}" class="modal-poster">
            <div class="modal-info">
                <div class="modal-header-row">
                    <h2>${escapeHtml(title)}</h2>
                    ${favoriteBtn}
                </div>
                ${data.tagline ? `<p class="modal-tagline">${escapeHtml(data.tagline)}</p>` : ''}
                
                <div class="modal-stats">
                    <span class="modal-stat modal-rating">
                        <span class="icon">⭐</span> ${rating}
                    </span>
                    <span class="modal-stat">
                        <span class="icon">📅</span> ${year}
                    </span>
                    ${runtime ? `<span class="modal-stat"><span class="icon">⏱️</span> ${runtime}分</span>` : ''}
                </div>

                <div class="modal-genres">
                    ${data.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join('') || ''}
                </div>

                <p class="modal-overview">${data.overview || '説明がありません'}</p>
            </div>
        </div>

        ${trailerHtml}
        ${watchHtml}
        ${castHtml}

        <div class="modal-section" id="similar-section">
            <h3 class="section-title">🎯 ${t('similar')}</h3>
            <div class="similar-grid" id="similar-grid">
                <div class="loading"><div class="spinner"></div></div>
            </div>
        </div>

        ${data.reviews && data.reviews.length > 0 ? `
            <div class="modal-section">
                <h3 class="section-title">💬 ${t('reviews')}</h3>
                <div class="reviews-list">
                    ${data.reviews.map(review => `
                        <div class="review-item">
                            <div class="review-header">
                                <span class="review-author">${escapeHtml(review.author)}</span>
                                ${review.author_details?.rating ? `<span class="review-rating">⭐ ${review.author_details.rating}/10</span>` : ''}
                            </div>
                            <p class="review-content">${escapeHtml(review.content.slice(0, 300))}${review.content.length > 300 ? '...' : ''}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;

    // 類似作品を非同期で読み込み
    loadSimilarMovies(movieId, type);
}

// 類似作品を読み込む
async function loadSimilarMovies(id, type) {
    try {
        const data = await fetchFromTMDB(`/${type}/${id}/similar`);
        const similarGrid = document.getElementById('similar-grid');

        if (data.results && data.results.length > 0) {
            const movies = data.results.slice(0, 6).filter(m => m.poster_path);
            similarGrid.innerHTML = movies.map(movie => `
                <div class="similar-item" onclick="openModal(${movie.id}, '${type}')">
                    <img src="${CONFIG.IMAGE_BASE}/w185${movie.poster_path}" 
                         alt="${movie.title || movie.name}" 
                         class="similar-poster">
                    <p class="similar-title">${escapeHtml(movie.title || movie.name)}</p>
                </div>
            `).join('');
        } else {
            document.getElementById('similar-section').style.display = 'none';
        }
    } catch (error) {
        document.getElementById('similar-section').style.display = 'none';
    }
}

// ========================================
// お気に入り機能
// ========================================
function getFavorites() {
    const stored = localStorage.getItem('movick_favorites');
    return stored ? JSON.parse(stored) : [];
}

function saveFavorites(favorites) {
    localStorage.setItem('movick_favorites', JSON.stringify(favorites));
}

function checkFavorite(id, type) {
    const favorites = getFavorites();
    return favorites.some(f => f.id === id && f.type === type);
}

function toggleFavorite(id, type, title, poster) {
    let favorites = getFavorites();
    const index = favorites.findIndex(f => f.id === id && f.type === type);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.unshift({ id, type, title, poster, addedAt: Date.now() });
    }

    saveFavorites(favorites);

    // ボタンを更新
    const btn = document.querySelector('.favorite-btn');
    if (btn) {
        const isFav = index === -1;
        btn.classList.toggle('active', isFav);
        btn.innerHTML = isFav ? '❤️ お気に入り済み' : '🤍 お気に入りに追加';
    }

    // お気に入りタブがあれば更新
    if (state.currentTab === 'favorites') {
        renderFavorites();
    }
}

// お気に入り一覧をレンダリング
function renderFavorites() {
    const favorites = getFavorites();
    showLoading(false);
    DOM.loadMore.classList.add('hidden');

    if (favorites.length === 0) {
        DOM.moviesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-secondary);">
                <p style="font-size: 3rem; margin-bottom: 1rem;">❤️</p>
                <p>お気に入りがありません</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">映画の詳細ページからお気に入りに追加できます</p>
            </div>
        `;
        return;
    }

    DOM.moviesGrid.innerHTML = favorites.map(fav => `
        <article class="movie-card" onclick="openModal(${fav.id}, '${fav.type}')">
            <img src="${fav.poster}" alt="${escapeHtml(fav.title)}" class="movie-poster" loading="lazy">
            <div class="movie-info">
                <h3 class="movie-title">${escapeHtml(fav.title)}</h3>
                <div class="movie-meta">
                    <span class="movie-rating">${fav.type === 'tv' ? '📺' : '🎬'}</span>
                </div>
            </div>
        </article>
    `).join('');
}

function closeModal() {
    DOM.modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ========================================
// タブ切り替え
// ========================================
function switchTab(tabName) {
    state.currentTab = tabName;
    state.currentPage = 1;
    state.searchQuery = '';
    DOM.searchInput.value = '';

    DOM.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    loadMovies();
}

// ========================================
// 検索
// ========================================
function handleSearch() {
    const query = DOM.searchInput.value.trim();
    if (!query) return;

    state.searchQuery = query;
    state.currentPage = 1;

    // タブの選択解除
    DOM.tabs.forEach(tab => tab.classList.remove('active'));

    loadMovies();
}

// ========================================
// ユーティリティ
// ======================================== 
function showLoading(show) {
    DOM.loading.classList.toggle('hidden', !show);
}

function showError() {
    DOM.error.classList.remove('hidden');
}

function hideError() {
    DOM.error.classList.add('hidden');
}

function updateLoadMoreButton() {
    const hasMore = state.currentPage < state.totalPages;
    DOM.loadMore.classList.toggle('hidden', !hasMore);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
