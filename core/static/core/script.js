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
    registerForm: document.getElementById('register-form'),
    showLogin: document.getElementById('show-login'),
    showRegister: document.getElementById('show-register')
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

// سیستم ثبت‌نام و لاگین
async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE}/api/auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            showNotification('ورود موفقیت‌آمیز بود!', 'success');
            checkAuthStatus();
            toggleAuthForms(false);
        } else {
            const error = await response.json();
            showNotification(error.detail || 'خطا در ورود', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password1: formData.get('password1'),
        password2: formData.get('password2')
    };

    if (data.password1 !== data.password2) {
        showNotification('رمز عبور و تکرار آن مطابقت ندارند', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification('ثبت‌نام موفقیت‌آمیز! لطفا ایمیل خود را تأیید کنید.', 'success');
            toggleAuthForms(true); // برگشت به فرم لاگین
        } else {
            const error = await response.json();
            const errorMessage = Object.values(error).flat().join(' ') || 'خطا در ثبت‌نام';
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    }
}

async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/logout/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });

        if (response.ok) {
            showNotification('خروج موفقیت‌آمیز بود', 'success');
            checkAuthStatus();
        }
    } catch (error) {
        console.error('Logout error:', error);
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
    toggleAuthForms(false);
}

function showUnauthenticatedState() {
    elements.authStatus.innerHTML = `
        <div style="text-align: center;">
            <p>برای ارسال پاسخ باید وارد شوید</p>
            <div class="auth-buttons">
                <button id="show-login-btn" class="btn">ورود</button>
                <button id="show-register-btn" class="btn btn-secondary">ثبت‌نام</button>
            </div>
        </div>
    `;
    
    // اضافه کردن event listener برای دکمه‌های جدید
    setTimeout(() => {
        document.getElementById('show-login-btn').addEventListener('click', () => toggleAuthForms(true));
        document.getElementById('show-register-btn').addEventListener('click', () => toggleAuthForms(false));
    }, 100);
    
    if (elements.answerForm) {
        elements.answerForm.style.display = 'none';
    }
}

function toggleAuthForms(showLogin) {
    if (!elements.authForms) return;
    
    if (showLogin) {
        elements.authForms.style.display = 'block';
        elements.loginForm.style.display = 'block';
        elements.registerForm.style.display = 'none';
    } else {
        elements.authForms.style.display = 'block';
        elements.loginForm.style.display = 'none';
        elements.registerForm.style.display = 'block';
    }
}

// توابع کمکی
function escapeHtml(unsafe) {
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
        transform: translateX(100%);
        transition: transform 0.3s ease;
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
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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
    toggleAuthForms(false);
    if (elements.authForms) {
        elements.authForms.style.display = 'none';
    }
});

// توابع موجود قبلی (برای سازگاری)
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

function shareAnswer(answerId) {
    const shareUrl = `${window.location.origin}/#answer-${answerId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('لینک پاسخ در کلیپ‌بورد کپی شد!', 'success');
    }).catch(() => {
        // Fallback برای مرورگرهای قدیمی
        prompt('لینک پاسخ را کپی کنید:', shareUrl);
    });
}
