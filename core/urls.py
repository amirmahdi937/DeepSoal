from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    
    # APIهای اصلی
    path('api/active-question/', views.ActiveQuestionView.as_view(), name='active-question'),
    path('api/answers/', views.AnswerListCreateView.as_view(), name='answer-list'),
    path('api/answers/<int:pk>/like/', views.AnswerLikeView.as_view(), name='answer-like'),
    
    # سیستم احراز هویت سفارشی
    path('api/auth/register/', views.custom_register_view, name='register'),
    path('api/auth/login/', views.custom_login_view, name='login'),
    path('api/auth/logout/', views.custom_logout_view, name='logout'),
    path('api/auth/user/', views.current_user_view, name='current-user'),
]
