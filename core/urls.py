from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/active-question/', views.ActiveQuestionView.as_view(), name='active-question'),
    path('api/answers/', views.AnswerListCreateView.as_view(), name='answer-list'),
    path('api/answers/<int:pk>/like/', views.AnswerLikeView.as_view(), name='answer-like'),
    
    # مسیرهای جدید برای ثبت‌نام
    path('api/auth/register/', views.register_view, name='register'),
    path('api/auth/login/', views.login_view, name='login'),
    path('api/auth/logout/', views.logout_view, name='logout'),
    path('api/auth/user/', views.current_user_view, name='current-user'),
]
