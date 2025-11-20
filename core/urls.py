from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/active-question/', views.ActiveQuestionView.as_view(), name='active-question'),
    path('api/answers/', views.AnswerListCreateView.as_view(), name='answer-list'),
    path('api/answers/<int:pk>/like/', views.AnswerLikeView.as_view(), name='answer-like'),
    
    # استفاده از URLهای django-allauth
    path('accounts/', include('allauth.urls')),
    
    # APIهای ساده برای فرانت‌اند
    path('api/auth/user/', views.current_user_view, name='current-user'),
]
