const API_BASE = 'https://deepsoal.onrender.com';

// المنت‌های اصلی DOM
const elements = {
    questionContainer: document.getElementById('question-container'),
    answersContainer: document.getElementById('answers-container'),
    answerForm: document.getElementById('answer-form'),
    answerText: document.getElementById('answer-text'),
    authStatus: document.getElementById('auth-status'),
    authForms: document.getElementById('auth-forms'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form')
};

// وضعیت برنامه
let appState = {
    currentUser: null,
    activeQuestion: null,
    answers: []
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
                    </div>
                `;
            } else {
                elements.questionContainer.innerHTML = `
                    <div class="question-card">
                        <div class="question-text">در حال حاضر سوال فعالی وجود ندارد.</div>
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
            
            elements.answersContainer.innerHTML = '';
            
            if (answers.length === 0) {
                elements.answersContainer.innerHTML = `
                    <div class="answer-card">
                        <div class="answer-text" style="text-align: center; color: var(--gray);">
                            هنوز پاسخی ثبت نشده است. اولین نفر باشید!
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
                        <span class="answer-user">${escapeHtml(answer.user.username)}</span>
                        <span class="answer-time">${new Date(answer.created_at).toLocaleString('fa-IR')}</span>
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
                    </div>
                `;
                elements.answersContainer.appendChild(answerElement);
            });
        } else {
            showError(elements.answersContainer, 'خطا در بارگذاری پاسخ‌ها');
        }
    } catch (error) {
        console.error('Error loading answers:', error);
        showError(elements.answersContainer, 'خطا در ارتباط با سرور');
    }
}

// سیستم ثبت‌نام و لاگین - نسخه ساده و کارآمد
async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'در حال ورود...';
    showNotification('در حال ورود...', 'info');

    try {
        // استفاده از سیستم ساده Django auth
        const response = await fetch(`${API_BASE}/accounts/login/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            body: formData
        });

        if (response.ok) {
            showNotification('ورود موفقیت‌آمیز بود!', 'success');
            // رفرش صفحه برای اعمال تغییرات
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showNotification('نام کاربری یا رمز عبور اشتباه است', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'در حال ثبت‌نام...';
    showNotification('در حال ثبت‌نام...', 'info');

    try {
        // استفاده از سیستم ساده Django auth
        const response = await fetch(`${API_BASE}/accounts/signup/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            body: formData
        });

        if (response.ok) {
            showNotification('ثبت‌نام موفقیت‌آمیز!', 'success');
            // رفرش صفحه برای اعمال تغییرات
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showNotification('خطا در ثبت‌نام - از نام کاربری و ایمیل دیگر استفاده کنید', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleLogout() {
    showNotification('در حال خروج...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/accounts/logout/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });

        if (response.ok) {
            showNotification('خروج موفقیت‌آمیز بود', 'success');
            // رفرش صفحه
            setTimeout(() => {
                window.location.reload();
            }, 1000);
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
            const user = await response.json();
            appState.currentUser = user;
            showAuthenticatedState(user);
        } else {
            showUnauthenticatedState();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showUnauthenticatedState();
    }
}

function showAuthenticatedState(user) {
    elements.authStatus.innerHTML = `
        <div style="text-align: center;">
            <p>👋 سلام <strong>${escapeHtml(user.username)}</strong>! خوش آمدید</p>
            <div class="auth-buttons">
                <button onclick="handleLogout()" class="btn btn-secondary">خروج</button>
            </div>
        </div>
    `;
    
    if (elements.answerForm) {
        elements.answerForm.style.display = 'block';
    }
    if (elements.authForms) {
        elements.authForms.style.display = 'none';
    }
}

function showUnauthenticatedState() {
    elements.authStatus.innerHTML = `
        <div style="text-align: center;">
            <p>برای ارسال پاسخ باید وارد شوید</p>
            <div class="auth-buttons">
                <button onclick="showAuthForms('login')" class="btn">ورود</button>
                <button onclick="showAuthForms('register')" class="btn btn-secondary">ثبت‌نام</button>
            </div>
        </div>
    `;
    
    if (elements.answerForm) {
        elements.answerForm.style.display = 'none';
    }
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

// ارسال پاسخ
async function submitAnswer(event) {
    event.preventDefault();
    
    const answerText = elements.answerText.value.trim();
    if (!answerText) {
        showNotification('لطفا پاسخ خود را وارد کنید', 'error');
        return;
    }

    const submitBtn = elements.answerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'در حال ارسال...';

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
            showNotification('پاسخ شما با موفقیت ثبت شد!', 'success');
            loadAnswers();
        } else if (response.status === 401) {
            showNotification('برای ارسال پاسخ باید وارد شوید', 'error');
            showUnauthenticatedState();
        } else {
            showNotification('خطا در ارسال پاسخ', 'error');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// لایک کردن پاسخ
async function likeAnswer(answerId) {
    if (!appState.currentUser) {
        showNotification('برای لایک کردن باید وارد شوید', 'error');
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
            loadAnswers();
        } else if (response.status === 401) {
            showNotification('لطفا دوباره وارد شوید', 'error');
            checkAuthStatus();
        }
    } catch (error) {
        console.error('Error liking answer:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    }
}

// اشتراک‌گذاری پاسخ
function shareAnswer(answerId) {
    const shareUrl = `${window.location.origin}/#answer-${answerId}`;
    
    if (navigator.share) {
        // استفاده از Web Share API در موبایل
        navigator.share({
            title: 'پاسخ در DeepSoal',
            text: 'این پاسخ رو در DeepSoal ببینید',
            url: shareUrl
        });
    } else if (navigator.clipboard) {
        // کپی به کلیپ‌بورد
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification('لینک پاسخ در کلیپ‌بورد کپی شد!', 'success');
        });
    } else {
        // Fallback برای مرورگرهای قدیمی
        prompt('لینک پاسخ را کپی کنید:', shareUrl);
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
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--gray);">
            <div style="display: inline-block; animation: pulse 1.5s infinite;">⏳</div>
            <div>در حال بارگذاری...</div>
        </div>
    `;
}

function showError(container, message) {
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--error);">
            <div>❌ ${message}</div>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    // ایجاد نوتیفیکیشن زیبا
    const notification = document.createElement('div');
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
        ${type === 'success' ? 'background: var(--success);' : ''}
        ${type === 'error' ? 'background: var(--error);' : ''}
        ${type === 'info' ? 'background: var(--primary);' : ''}
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // انیمیشن نمایش
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    
    // حذف خودکار
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

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', function() {
    // بارگذاری اولیه
    loadActiveQuestion();
    loadAnswers();
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
    
    // مخفی کردن فرم‌های auth در ابتدا
    if (elements.authForms) {
        elements.authForms.style.display = 'none';
    }
    
    // اضافه کردن دکمه بستن به فرم‌ها
    const forms = [elements.loginForm, elements.registerForm];
    forms.forEach(form => {
        if (form) {
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.textContent = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                background: none;
                border: none;
                color: var(--gray);
                font-size: 1.5rem;
                cursor: pointer;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            `;
            closeBtn.onclick = hideAuthForms;
            form.style.position = 'relative';
            form.appendChild(closeBtn);
        }
    });
});

// توابع global برای استفاده در HTML
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.likeAnswer = likeAnswer;
window.shareAnswer = shareAnswer;
window.showAuthForms = showAuthForms;
window.hideAuthForms = hideAuthForms;
window.toggleAuthForms = showAuthForms; // برای سازگاری با کد قبلی
