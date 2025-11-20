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
    searchResults: document.getElementById('search-results'),
    allAnswersContainer: document.getElementById('all-answers-container')
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
            
            if (question && question.id) {
                elements.questionContainer.innerHTML = `
                    <div class="question-card">
                        <div class="question-text">${escapeHtml(question.question_text)}</div>
                        ${question.category ? `<div class="badge secondary" style="margin-top: 15px;">${question.category.name}</div>` : ''}
                        <div style="margin-top: 15px; color: var(--gray-light); font-size: 0.9rem;">
                            ${question.total_answers} پاسخ ثبت شده
                        </div>
                    </div>
                `;
            } else {
                elements.questionContainer.innerHTML = `
                    <div class="question-card">
                        <div class="question-text">در حال حاضر سوال فعالی وجود ندارد. لطفا بعدا مراجعه کنید.</div>
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
            showError(elements.answersContainer, 'خطا در بارگذاری پاسخ ها');
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
                <div class="answer-text" style="text-align: center; color: var(--gray-light);">
                    هنوز پاسخی ثبت نشده است. اولین نفری باشید که به این سوال پاسخ می دهید!
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
                <span class="answer-user">${escapeHtml(answer.author_name)}</span>
                <span class="answer-time">${answer.time_since}</span>
            </div>
            <div class="answer-text">${escapeHtml(answer.answer_text)}</div>
            <div class="answer-actions">
                <button class="like-btn" onclick="likeAnswer(${answer.id})">
                    پسندیدم ${answer.likes}
                </button>
                <button class="share-btn" onclick="shareAnswer(${answer.id})">
                    اشتراک گذاری
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
                <span class="stat-label">سوالات</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.total_answers}</span>
                <span class="stat-label">پاسخ ها</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.total_likes}</span>
                <span class="stat-label">لایک ها</span>
            </div>
            <div class="stat-card">
                <span class="stat-number">${stats.active_users_today}</span>
                <span class="stat-label">فعال امروز</span>
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
        showNotification('لطفا پاسخ خود را وارد کنید', 'error');
        return;
    }

    if (answerText.length < 5) {
        showNotification('پاسخ باید حداقل ۵ کاراکتر باشد', 'error');
        return;
    }

    const submitBtn = elements.answerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'در حال ارسال...';
    submitBtn.classList.add('loading');

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

        const result = await response.json();

        if (response.ok) {
            elements.answerText.value = '';
            if (elements.authorName) elements.authorName.value = '';
            showNotification('پاسخ شما با موفقیت ثبت شد!', 'success');
            
            // رفرش لیست پاسخ ها و آمار
            setTimeout(() => {
                loadAnswers();
                loadStats();
                loadActiveQuestion();
            }, 500);
        } else {
            showNotification(result.detail || 'خطا در ارسال پاسخ', 'error');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.classList.remove('loading');
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
            showNotification('لایک شما ثبت شد!', 'success');
            // رفرش لیست پاسخ ها
            loadAnswers();
            loadStats();
        } else {
            showNotification(result.error || 'خطا در ثبت لایک', 'error');
        }
    } catch (error) {
        console.error('Error liking answer:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    }
}

// اشتراک گذاری پاسخ
function shareAnswer(answerId) {
    const shareUrl = `${window.location.origin}/#answer-${answerId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'پاسخ در DeepSoal',
            text: 'این پاسخ را در DeepSoal ببینید',
            url: shareUrl
        });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification('لینک پاسخ در کلیپ بورد کپی شد!', 'success');
        });
    } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showNotification('لینک پاسخ کپی شد!', 'success');
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

    if (query.length < 2) {
        showNotification('عبارت جستجو باید حداقل ۲ کاراکتر باشد', 'warning');
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
                <div class="answer-text" style="text-align: center; color: var(--gray-light);">
                    هیچ نتیجه ای برای جستجوی شما یافت نشد.
                </div>
            </div>
        `;
        return;
    }
    
    elements.searchResults.innerHTML = `
        <div style="margin-bottom: 20px; color: var(--gray-light); font-size: 0.9rem;">
            ${results.length} نتیجه یافت شد
        </div>
    `;
    
    renderAnswers(results, elements.searchResults);
}

// بارگذاری همه پاسخ ها
async function loadAllAnswers() {
    const container = elements.allAnswersContainer;
    if (!container) return;

    try {
        showLoading(container);
        const response = await fetch(`${API_BASE}/api/all-answers/`);
        
        if (response.ok) {
            const answers = await response.json();
            renderAllAnswers(answers, container);
        } else {
            showError(container, 'خطا در بارگذاری پاسخ ها');
        }
    } catch (error) {
        console.error('Error loading all answers:', error);
        showError(container, 'خطا در ارتباط با سرور');
    }
}

function renderAllAnswers(answers, container) {
    container.innerHTML = '';
    
    if (answers.length === 0) {
        container.innerHTML = `
            <div class="answer-card">
                <div class="answer-text" style="text-align: center; color: var(--gray-light);">
                    هیچ پاسخی در سیستم ثبت نشده است.
                </div>
            </div>
        `;
        return;
    }

    // گروه بندی پاسخ ها بر اساس سوال
    const answersByQuestion = {};
    answers.forEach(answer => {
        const questionId = answer.question.id;
        if (!answersByQuestion[questionId]) {
            answersByQuestion[questionId] = {
                question: answer.question,
                answers: []
            };
        }
        answersByQuestion[questionId].answers.push(answer);
    });

    // نمایش پاسخ ها گروه بندی شده
    Object.values(answersByQuestion).forEach(group => {
        const questionSection = document.createElement('div');
        questionSection.className = 'question-card';
        questionSection.style.marginBottom = '30px';
        
        questionSection.innerHTML = `
            <div class="question-text" style="font-weight: 500; margin-bottom: 15px;">
                ${escapeHtml(group.question.question_text)}
            </div>
            ${group.question.category ? `
                <div class="badge secondary" style="margin-bottom: 15px;">
                    ${group.question.category.name}
                </div>
            ` : ''}
            <div style="color: var(--gray-light); font-size: 0.9rem; margin-bottom: 15px;">
                ${group.answers.length} پاسخ
            </div>
        `;

        group.answers.forEach(answer => {
            const answerElement = document.createElement('div');
            answerElement.className = 'answer-card';
            answerElement.style.marginBottom = '10px';
            answerElement.innerHTML = `
                <div class="answer-header">
                    <span class="answer-user">${escapeHtml(answer.author_name)}</span>
                    <span class="answer-time">${answer.time_since}</span>
                </div>
                <div class="answer-text">${escapeHtml(answer.answer_text)}</div>
                <div class="answer-actions">
                    <button class="like-btn" onclick="likeAnswer(${answer.id})">
                        پسندیدم ${answer.likes}
                    </button>
                    <button class="share-btn" onclick="shareAnswer(${answer.id})">
                        اشتراک گذاری
                    </button>
                </div>
            `;
            questionSection.appendChild(answerElement);
        });

        container.appendChild(questionSection);
    });
}

// مدیریت ناوبری
function showView(viewName) {
    appState.currentView = viewName;
    
    // مخفی کردن همه بخش ها
    const sections = ['home', 'search', 'all-answers'];
    sections.forEach(section => {
        const element = document.getElementById(`${section}-view`);
        if (element) element.style.display = 'none';
    });
    
    // نمایش بخش انتخاب شده
    const currentSection = document.getElementById(`${viewName}-view`);
    if (currentSection) currentSection.style.display = 'block';
    
    // آپدیت دکمه های ناوبری
    updateNavigation(viewName);
    
    // بارگذاری محتوای خاص هر بخش
    if (viewName === 'all-answers') {
        loadAllAnswers();
    } else if (viewName === 'home') {
        loadAnswers();
    }
}

function updateNavigation(currentView) {
    const buttons = document.querySelectorAll('.navigation button');
    buttons.forEach(btn => {
        if (btn.textContent.includes('صفحه اصلی') && currentView === 'home') {
            btn.className = 'btn';
        } else if (btn.textContent.includes('جستجو') && currentView === 'search') {
            btn.className = 'btn';
        } else if (btn.textContent.includes('همه پاسخ ها') && currentView === 'all-answers') {
            btn.className = 'btn';
        } else {
            btn.className = 'btn btn-secondary';
        }
    });
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
        <div style="text-align: center; padding: 40px; color: var(--gray-light);">
            <div style="display: inline-block; animation: pulse 1.5s infinite; width: 20px; height: 20px; border: 2px solid var(--primary); border-top: 2px solid transparent; border-radius: 50%;"></div>
            <div style="margin-top: 10px;">در حال بارگذاری...</div>
        </div>
    `;
}

function showError(container, message) {
    if (!container) return;
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--error);">
            <div>${message}</div>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
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

// راه اندازی اولیه
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
    
    // تنظیم ناوبری
    updateNavigation('home');
});

// توابع global
window.submitAnswer = submitAnswer;
window.likeAnswer = likeAnswer;
window.shareAnswer = shareAnswer;
window.handleSearch = handleSearch;
window.showView = showView;
window.loadAllAnswers = loadAllAnswers;
