const API_BASE = 'https://deepsoal.onrender.com';

// المنت‌های اصلی DOM
const elements = {
    questionContainer: document.getElementById('question-container'),
    answersContainer: document.getElementById('answers-container'),
    answerForm: document.getElementById('answer-form'),
    answerText: document.getElementById('answer-text'),
    authorName: document.getElementById('author-name'),
    statsContainer: document.getElementById('stats-container'),
    searchContainer: document.getElementById('search-container'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results')
};

// وضعیت برنامه
let appState = {
    activeQuestion: null,
    answers: [],
    stats: null,
    currentView: 'home'
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
                        <div style="margin-top: 15px; color: var(--gray); font-size: 0.9rem;">
                            📊 ${question.total_answers} پاسخ
                        </div>
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
                <span class="answer-user">👤 ${escapeHtml(answer.author_name)}</span>
                <span class="answer-time">🕒 ${answer.time_since}</span>
            </div>
            <div class="answer-text">${escapeHtml(answer.answer_text)}</div>
            <div class="answer-actions">
                <button class="like-btn" onclick="likeAnswer(${answer.id})">
                    ❤ ${answer.likes}
                </button>
                <button class="share-btn" onclick="shareAnswer(${answer.id})">
                    🔗 اشتراک‌گذاری
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

// ارسال پاسخ
async function submitAnswer(event) {
    event.preventDefault();
    
    const answerText = elements.answerText.value.trim();
    const authorName = elements.authorName ? elements.authorName.value.trim() : 'ناشناس';
    
    if (!answerText) {
        showNotification('📝 لطفا پاسخ خود را وارد کنید', 'error');
        return;
    }

    if (!authorName) {
        showNotification('👤 لطفا نام خود را وارد کنید', 'error');
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
            },
            body: JSON.stringify({ 
                answer_text: answerText,
                author_name: authorName
            })
        });

        if (response.ok) {
            elements.answerText.value = '';
            if (elements.authorName) elements.authorName.value = '';
            showNotification('✅ پاسخ شما با موفقیت ثبت شد!', 'success');
            // رفرش لیست پاسخ‌ها
            setTimeout(() => {
                loadAnswers();
                loadStats();
            }, 500);
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
    try {
        const response = await fetch(`${API_BASE}/api/answers/${answerId}/like/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification('❤️ لایک شما ثبت شد!', 'success');
            // رفرش لیست پاسخ‌ها
            loadAnswers();
            loadStats();
        } else {
            showNotification(result.error || 'خطا در ثبت لایک', 'error');
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
        background: ${type === 'success' ? 'var(--success)' : 
                      type === 'error' ? 'var(--error)' : 
                      type === 'warning' ? 'var(--warning)' : 'var(--primary)'};
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

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', function() {
    // بارگذاری اولیه
    loadActiveQuestion();
    loadAnswers();
    loadStats();
    
    // event listenerها
    if (elements.answerForm) {
        elements.answerForm.addEventListener('submit', submitAnswer);
    }
    
    if (elements.searchInput) {
        elements.searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                handleSearch();
            }
        });
    }
});

// توابع global
window.submitAnswer = submitAnswer;
window.likeAnswer = likeAnswer;
window.shareAnswer = shareAnswer;
window.handleSearch = handleSearch;
