const API_BASE = 'https://deepsoal.onrender.com';

// المنت‌های اصلی DOM
const elements = {
    questionContainer: document.getElementById('question-container'),
    answersContainer: document.getElementById('answers-container'),
    answerForm: document.getElementById('answer-form'),
    answerText: document.getElementById('answer-text'),
    authStatus: document.getElementById('auth-status'),
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn')
};

// توابع اصلی
async function loadActiveQuestion() {
    try {
        const response = await fetch(`${API_BASE}/api/active-question/`);
        const question = await response.json();
        
        if (question) {
            elements.questionContainer.innerHTML = `
                <div class="question-card">
                    <div class="question-text">${question.question_text}</div>
                </div>
            `;
        } else {
            elements.questionContainer.innerHTML = '<p>No active question at the moment.</p>';
        }
    } catch (error) {
        console.error('Error loading question:', error);
    }
}

async function loadAnswers() {
    try {
        const response = await fetch(`${API_BASE}/api/answers/`);
        const answers = await response.json();
        
        elements.answersContainer.innerHTML = '';
        answers.forEach(answer => {
            const answerElement = document.createElement('div');
            answerElement.className = 'answer-card fade-in';
            answerElement.innerHTML = `
                <div class="answer-header">
                    <span>ارسال شده توسط: ${answer.user.username}</span>
                    <span>${new Date(answer.created_at).toLocaleString('fa-IR')}</span>
                </div>
                <div class="answer-text">${answer.answer_text}</div>
                <div class="answer-actions">
                    <button class="like-btn ${answer.user_has_liked ? 'liked' : ''}" 
                            onclick="likeAnswer(${answer.id})">
                        ❤ ${answer.total_likes}
                    </button>
                    <button class="share-btn" onclick="shareAnswer(${answer.id})">
                        اشتراک‌گذاری
                    </button>
                </div>
            `;
            elements.answersContainer.appendChild(answerElement);
        });
    } catch (error) {
        console.error('Error loading answers:', error);
    }
}

async function submitAnswer(event) {
    event.preventDefault();
    
    const answerText = elements.answerText.value.trim();
    if (!answerText) return;

    const submitBtn = elements.answerForm.querySelector('button[type="submit"]');
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
            loadAnswers();
        } else {
            alert('Error submitting answer. Please login.');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ارسال پاسخ';
    }
}

async function likeAnswer(answerId) {
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
            alert('Please login to like answers.');
        }
    } catch (error) {
        console.error('Error liking answer:', error);
    }
}

function shareAnswer(answerId) {
    const shareUrl = `${window.location.origin}/answer/${answerId}/`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('لینک پاسخ در کلیپ‌بورد کپی شد!');
    });
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

function checkAuthStatus() {
    // این یک چک ساده است. در عمل باید از API استفاده کنی.
    fetch(`${API_BASE}/api/answers/`)
        .then(response => {
            if (response.status === 401) {
                elements.authStatus.innerHTML = `
                    <p>برای ارسال پاسخ باید وارد شوید.</p>
                    <a href="/admin/login/?next=/" class="login-btn">ورود / ثبت‌نام</a>
                `;
                elements.answerForm.style.display = 'none';
            } else {
                elements.authStatus.innerHTML = `
                    <p>شما وارد شده‌اید. می‌توانید پاسخ دهید.</p>
                    <a href="/admin/logout/?next=/" class="logout-btn">خروج</a>
                `;
                elements.answerForm.style.display = 'block';
            }
        });
}

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', function() {
    loadActiveQuestion();
    loadAnswers();
    checkAuthStatus();
    
    if (elements.answerForm) {
        elements.answerForm.addEventListener('submit', submitAnswer);
    }
});
