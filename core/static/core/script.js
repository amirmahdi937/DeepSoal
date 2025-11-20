const API_BASE = 'https://deepsoal.onrender.com';

// وضعیت برنامه
let appState = {
    currentUser: null,
    activeQuestion: null,
    answers: [],
    stats: null,
    searchResults: null,
    currentView: 'home'
};

// المنت‌های اصلی DOM
const elements = {
    // المنت‌های اصلی
    questionContainer: document.getElementById('question-container'),
    answersContainer: document.getElementById('answers-container'),
    answerForm: document.getElementById('answer-form'),
    answerText: document.getElementById('answer-text'),
    authStatus: document.getElementById('auth-status'),
    authForms: document.getElementById('auth-forms'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    
    // المنت‌های جدید
    statsContainer: document.getElementById('stats-container'),
    searchContainer: document.getElementById('search-container'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    profileContainer: document.getElementById('profile-container'),
    mainContent: document.getElementById('main-content'),
    navigation: document.getElementById('navigation')
};

// توابع اصلی
async function loadActiveQuestion() {
    try {
        showLoading(elements.questionContainer);
        const response = await fetch(`${API_BASE}/api/active-question/`);
        
        if (response.ok) {
            const question = await response.json();
            appState.activeQuestion = question;
            
            if (question) {
                elements.questionContainer.innerHTML = `
                    <div class="question-card">
                        <div class="question-text">${escapeHtml(question.question_text)}</div>
                        ${question.category ? `<div class="badge" style="background: ${question.category.color}; margin-top: 10px;">${question.category.name}</div>` : ''}
                    </div>
                `;
            } else {
                elements.questionContainer.innerHTML = `
                    <div class="question-card">
                        <div class="question-text">📝 در حال حاضر سوال فعالی وجود ندارد. لطفاً بعداً مراجعه کنید.</div>
                    </div>
                `;
            }
        } else {
            showError(elements.questionContainer, 'خطا در بارگذاری سوال');
        }
    } catch (error) {
        console.error('Error loading question:', error);
        showError(elements.questionContainer, 'خطا در ارتباط با سرور');
    }
}

async function loadAnswers() {
    try {
        showLoading(elements.answersContainer);
        const response = await fetch(`${API_BASE}/api/answers/`);
        
        if (response.ok) {
            const answers = await response.json();
            appState.answers = answers;
            renderAnswers(answers, elements.answersContainer);
        } else {
            showError(elements.answersContainer, 'خطا در بارگذاری پاسخ‌ها');
        }
    } catch (error) {
        console.error('Error loading answers:', error);
        showError(elements.answersContainer, 'خطا در ارتباط با سرور');
    }
}

function renderAnswers(answers, container) {
    container.innerHTML = '';
    
    if (answers.length === 0) {
        container.innerHTML = `
            <div class="answer-card">
                <div class="answer-text" style="text-align: center; color: var(--gray);">
                    🎯 هنوز پاسخی ثبت نشده است. اولین نفر باشید که به این سوال پاسخ می‌دهید!
                </div>
            </div>
        `;
        return;
    }
    
    answers.forEach(answer => {
        const answerElement = document.createElement('div');
        answerElement.className = 'answer-card';
        answerElement.innerHTML = `
            <div class="answer-header">
                <span class="answer-user" onclick="viewUserProfile(${answer.user.id})" style="cursor: pointer;">
                    👤 ${escapeHtml(answer.user.username)}
                </span>
                <span class="answer-time">🕒 ${new Date(answer.created_at).toLocaleString('fa-IR')}</span>
            </div>
            <div class="answer-text">${escapeHtml(answer.answer_text)}</div>
            <div class="answer-actions">
                <button class="like-btn ${answer.user_has_liked ? 'liked' : ''}" 
                        onclick="likeAnswer(${answer.id})">
                    ❤ ${answer.total_likes}
                </button>
                <button class="share-btn" onclick="shareAnswer(${answer.id})">
                    🔗 اشتراک‌گذاری
                </button>
                <button class="profile-btn" onclick="viewUserProfile(${answer.user.id})">
                    👁️ مشاهده پروفایل
                </button>
            </div>
        `;
        container.appendChild(answerElement);
    });
}

// سیستم آمار
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/stats/`);
        
        if (response.ok) {
            const stats = await response.json();
            appState.stats = stats;
            renderStats(stats);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function renderStats(stats) {
    if (!elements.statsContainer) return;
    
    elements.statsContainer.innerHTML = `
        <div class="stats-bar">
            <div class="stat-card">
                <span class="stat-number">${stats.total_users}</span>
                <span class="stat-label">👥 کاربران</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.total_questions}</span>
                <span class="stat-label">❓ سوالات</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.total_answers}</span>
                <span class="stat-label">💬 پاسخ‌ها</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.total_likes}</span>
                <span class="stat-label">❤️ لایک‌ها</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.active_users_today}</span>
                <span class="stat-label">🔥 فعال امروز</span>
            </div>
        </div>
    `;
}

// سیستم جستجو
async function handleSearch(event) {
    if (event) event.preventDefault();
    
    const query = elements.searchInput ? elements.searchInput.value.trim() : '';
    
    if (!query) {
        showNotification('لطفا عبارت جستجو را وارد کنید', 'warning');
        return;
    }

    try {
        showLoading(elements.searchResults);
        const response = await fetch(`${API_BASE}/api/search/?search=${encodeURIComponent(query)}`);
        
        if (response.ok) {
            const results = await response.json();
            appState.searchResults = results;
            renderSearchResults(results);
        } else {
            showError(elements.searchResults, 'خطا در جستجو');
        }
    } catch (error) {
        console.error('Search error:', error);
        showError(elements.searchResults, 'خطا در ارتباط با سرور');
    }
}

function renderSearchResults(results) {
    if (!elements.searchResults) return;
    
    if (results.length === 0) {
        elements.searchResults.innerHTML = `
            <div class="answer-card">
                <div class="answer-text" style="text-align: center; color: var(--gray);">
                    🔍 هیچ نتیجه‌ای برای جستجوی شما یافت نشد.
                </div>
            </div>
        `;
        return;
    }
    
    elements.searchResults.innerHTML = `
        <div style="margin-bottom: 16px; color: var(--gray);">
            📊 ${results.length} نتیجه یافت شد
        </div>
    `;
    
    renderAnswers(results, elements.searchResults);
}

// سیستم پروفایل
async function viewUserProfile(userId) {
    try {
        showView('profile');
        showLoading(elements.profileContainer);
        
        const response = await fetch(`${API_BASE}/api/profile/${userId}/`);
        
        if (response.ok) {
            const profile = await response.json();
            renderUserProfile(profile);
        } else {
            showError(elements.profileContainer, 'خطا در بارگذاری پروفایل');
        }
    } catch (error) {
        console.error('Profile error:', error);
        showError(elements.profileContainer, 'خطا در ارتباط با سرور');
    }
}

async function viewMyProfile() {
    if (!appState.currentUser) {
        showNotification('برای مشاهده پروفایل باید وارد شوید', 'warning');
        return;
    }
    
    try {
        showView('profile');
        showLoading(elements.profileContainer);
        
        const response = await fetch(`${API_BASE}/api/profile/`);
        
        if (response.ok) {
            const profile = await response.json();
            renderUserProfile(profile, true);
        } else {
            showError(elements.profileContainer, 'خطا در بارگذاری پروفایل');
        }
    } catch (error) {
        console.error('Profile error:', error);
        showError(elements.profileContainer, 'خطا در ارتباط با سرور');
    }
}

function renderUserProfile(profile, isMyProfile = false) {
    if (!elements.profileContainer) return;
    
    const user = profile.user;
    const userProfile = profile;
    
    elements.profileContainer.innerHTML = `
        <div class="profile-card">
            <div class="profile-header">
                <div class="profile-avatar">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <div class="profile-info">
                    <h2>${escapeHtml(user.username)}</h2>
                    <p style="color: var(--gray); margin-bottom: 8px;">${user.email}</p>
                    ${userProfile.bio ? `<p style="color: var(--gray-light); font-size: 0.9rem;">${escapeHtml(userProfile.bio)}</p>` : ''}
                    ${userProfile.location ? `<p style="color: var(--gray); font-size: 0.8rem; margin-top: 5px;">📍 ${escapeHtml(userProfile.location)}</p>` : ''}
                    ${userProfile.website ? `<p style="color: var(--primary); font-size: 0.8rem; margin-top: 5px;">🌐 ${escapeHtml(userProfile.website)}</p>` : ''}
                </div>
            </div>
            
            <div class="profile-stats">
                <div class="profile-stat">
                    <span class="profile-stat-number">${userProfile.total_answers}</span>
                    <span class="profile-stat-label">پاسخ‌ها</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-number">${userProfile.total_likes_received}</span>
                    <span class="profile-stat-label">لایک دریافتی</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-number">${userProfile.reputation}</span>
                    <span class="profile-stat-label">اعتبار</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-number">${new Date(userProfile.joined_date).toLocaleDateString('fa-IR')}</span>
                    <span class="profile-stat-label">تاریخ عضویت</span>
                </div>
            </div>
            
            ${isMyProfile ? `
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="showView('home')">
                        ← بازگشت به صفحه اصلی
                    </button>
                </div>
            ` : `
                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="showView('home')">
                        ← بازگشت
                    </button>
                </div>
            `}
        </div>
        
        ${userProfile.recent_answers && userProfile.recent_answers.length > 0 ? `
            <div style="margin-top: 24px;">
                <h3 style="color: var(--light); margin-bottom: 16px;">📝 آخرین پاسخ‌ها</h3>
                <div id="profile-answers"></div>
            </div>
        ` : ''}
    `;
    
    if (userProfile.recent_answers && userProfile.recent_answers.length > 0) {
        renderAnswers(userProfile.recent_answers, document.getElementById('profile-answers'));
    }
}

// سیستم ثبت‌نام و لاگین
async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'در حال ثبت‌نام...';

    try {
        const data = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password1')
        };

        // اعتبارسنجی
        if (formData.get('password1') !== formData.get('password2')) {
            showNotification('رمز عبور و تکرار آن مطابقت ندارند', 'error');
            return;
        }

        if (data.password.length < 6) {
            showNotification('رمز عبور باید حداقل ۶ کاراکتر باشد', 'error');
            return;
        }

        const response = await fetch(`${API_BASE}/api/auth/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification('✅ ثبت‌نام موفقیت‌آمیز! خوش آمدید.', 'success');
            appState.currentUser = result.user;
            showAuthenticatedState(result.user);
            hideAuthForms();
            // رفرش محتوا
            setTimeout(() => {
                loadAnswers();
                loadStats();
            }, 1000);
        } else {
            showNotification(result.error || 'خطا در ثبت‌نام', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'در حال ورود...';

    try {
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        const response = await fetch(`${API_BASE}/api/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification('✅ ورود موفقیت‌آمیز! خوش آمدید.', 'success');
            appState.currentUser = result.user;
            showAuthenticatedState(result.user);
            hideAuthForms();
            // رفرش محتوا
            setTimeout(() => {
                loadAnswers();
                loadStats();
            }, 1000);
        } else {
            showNotification(result.error || 'خطا در ورود', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleLogout() {
    try {
        showNotification('در حال خروج...', 'info');
        
        const response = await fetch(`${API_BASE}/api/auth/logout/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            }
        });

        if (response.ok) {
            showNotification('👋 با موفقیت خارج شدید', 'success');
            appState.currentUser = null;
            showUnauthenticatedState();
            // رفرش محتوا
            setTimeout(() => {
                loadAnswers();
                loadStats();
            }, 500);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('خطا در خروج', 'error');
    }
}

// بررسی وضعیت احراز هویت
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/user/`, {
            credentials: 'include'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.authenticated) {
                appState.currentUser = result.user;
                showAuthenticatedState(result.user);
            } else {
                showUnauthenticatedState();
            }
        } else {
            showUnauthenticatedState();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showUnauthenticatedState();
    }
}

function showAuthenticatedState(user) {
    if (!elements.authStatus) return;
    
    elements.authStatus.innerHTML = `
        <div style="text-align: center;">
            <p>🎉 سلام <strong style="color: var(--primary);">${escapeHtml(user.username)}</strong>! خوش آمدید</p>
            <p style="font-size: 0.8rem; color: var(--gray); margin: 5px 0 15px 0;">حالا می‌تونی به سوال پاسخ بدی و پست‌ها رو لایک کنی</p>
            <div class="auth-buttons">
                <button onclick="viewMyProfile()" class="btn btn-secondary">👤 پروفایل من</button>
                <button onclick="handleLogout()" class="btn btn-secondary">🚪 خروج</button>
            </div>
        </div>
    `;
    
    if (elements.answerForm) {
        elements.answerForm.style.display = 'block';
    }
}

function showUnauthenticatedState() {
    if (!elements.authStatus) return;
    
    elements.authStatus.innerHTML = `
        <div style="text-align: center;">
            <p>🔐 برای پاسخ دادن و لایک کردن باید وارد شوید</p>
            <div class="auth-buttons">
                <button onclick="showAuthForms('login')" class="btn">🔑 ورود</button>
                <button onclick="showAuthForms('register')" class="btn btn-secondary">📝 ثبت‌نام</button>
            </div>
        </div>
    `;
    
    if (elements.answerForm) {
        elements.answerForm.style.display = 'none';
    }
}

// سیستم ناوبری
function showView(viewName) {
    appState.currentView = viewName;
    
    // مخفی کردن همه بخش‌ها
    const sections = ['home', 'search', 'profile'];
    sections.forEach(section => {
        const element = document.getElementById(`${section}-view`);
        if (element) element.style.display = 'none';
    });
    
    // نمایش بخش انتخاب شده
    const currentSection = document.getElementById(`${viewName}-view`);
    if (currentSection) currentSection.style.display = 'block';
    
    // آپدیت ناوبری
    updateNavigation(viewName);
}

function updateNavigation(currentView) {
    if (!elements.navigation) return;
    
    elements.navigation.innerHTML = `
        <div class="auth-buttons">
            <button onclick="showView('home')" class="btn ${currentView === 'home' ? '' : 'btn-secondary'}">
                🏠 صفحه اصلی
            </button>
            <button onclick="showView('search')" class="btn ${currentView === 'search' ? '' : 'btn-secondary'}">
                🔍 جستجو
            </button>
            ${appState.currentUser ? `
                <button onclick="viewMyProfile()" class="btn ${currentView === 'profile' ? '' : 'btn-secondary'}">
                    👤 پروفایل من
                </button>
            ` : ''}
        </div>
    `;
}

// ارسال پاسخ
async function submitAnswer(event) {
    event.preventDefault();
    
    const answerText = elements.answerText.value.trim();
    if (!answerText) {
        showNotification('📝 لطفا پاسخ خود را وارد کنید', 'error');
        return;
    }

    if (!appState.currentUser) {
        showNotification('🔐 برای ارسال پاسخ باید وارد شوید', 'error');
        showUnauthenticatedState();
        return;
    }

    const submitBtn = elements.answerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = '📤 در حال ارسال...';

    try {
        const response = await fetch(`${API_BASE}/api/answers/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ answer_text: answerText })
        });

        if (response.ok) {
            elements.answerText.value = '';
            showNotification('✅ پاسخ شما با موفقیت ثبت شد!', 'success');
            // رفرش لیست پاسخ‌ها
            setTimeout(() => {
                loadAnswers();
                loadStats();
            }, 500);
        } else if (response.status === 401) {
            showNotification('🔐 لطفا دوباره وارد شوید', 'error');
            checkAuthStatus();
        } else {
            const error = await response.json();
            showNotification(error.detail || 'خطا در ارسال پاسخ', 'error');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        showNotification('📡 خطا در ارتباط با سرور', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// لایک کردن پاسخ
async function likeAnswer(answerId) {
    if (!appState.currentUser) {
        showNotification('🔐 برای لایک کردن باید وارد شوید', 'error');
        showUnauthenticatedState();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/answers/${answerId}/like/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            }
        });

        if (response.ok) {
            // رفرش لیست پاسخ‌ها
            loadAnswers();
        } else if (response.status === 401) {
            showNotification('🔐 لطفا دوباره وارد شوید', 'error');
            checkAuthStatus();
        }
    } catch (error) {
        console.error('Error liking answer:', error);
        showNotification('📡 خطا در ارتباط با سرور', 'error');
    }
}

// اشتراک‌گذاری پاسخ
function shareAnswer(answerId) {
    const shareUrl = `${window.location.origin}/#answer-${answerId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'پاسخ در DeepSoal',
            text: 'این پاسخ رو در DeepSoal ببینید',
            url: shareUrl
        });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification('🔗 لینک پاسخ در کلیپ‌بورد کپی شد!', 'success');
        });
    } else {
        prompt('📋 لینک پاسخ را کپی کنید:', shareUrl);
    }
}

// توابع کمکی
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showLoading(container) {
    if (!container) return;
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--gray);">
            <div style="display: inline-block; animation: pulse 1.5s infinite;">⏳</div>
            <div>در حال بارگذاری...</div>
        </div>
    `;
}

function showError(container, message) {
    if (!container) return;
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--error);">
            <div>❌ ${message}</div>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        z-index: 1000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        font-size: 0.9rem;
        max-width: 300px;
        box-shadow: var(--shadow-xl);
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function showAuthForms(formType) {
    if (!elements.authForms) return;
    
    elements.authForms.style.display = 'block';
    
    if (formType === 'login') {
        elements.loginForm.style.display = 'block';
        elements.registerForm.style.display = 'none';
    } else {
        elements.loginForm.style.display = 'none';
        elements.registerForm.style.display = 'block';
    }
}

function hideAuthForms() {
    if (elements.authForms) {
        elements.authForms.style.display = 'none';
    }
}

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', function() {
    // بارگذاری اولیه
    loadActiveQuestion();
    loadAnswers();
    loadStats();
    checkAuthStatus();
    
    // event listenerها
    if (elements.answerForm) {
        elements.answerForm.addEventListener('submit', submitAnswer);
    }
    
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }
    
    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', handleRegister);
    }
    
    if (elements.searchInput) {
        elements.searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    // مخفی کردن فرم‌های auth در ابتدا
    if (elements.authForms) {
        elements.authForms.style.display = 'none';
    }
    
    // تنظیم ناوبری
    updateNavigation('home');
});

// توابع global
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.likeAnswer = likeAnswer;
window.shareAnswer = shareAnswer;
window.showAuthForms = showAuthForms;
window.hideAuthForms = hideAuthForms;
window.viewUserProfile = viewUserProfile;
window.viewMyProfile = viewMyProfile;
window.showView = showView;
window.handleSearch = handleSearch;
